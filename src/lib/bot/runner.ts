/**
 * The overnight run.
 *
 * Press start, go to bed, wake up to a full review queue. This is the mode the
 * archive is actually populated in: everything else is one video at a time
 * with a human present, which does not fill an empty database.
 *
 * Design rules, all learned from what an unattended job gets wrong:
 *
 *   - One bad item must never kill the run. Every step is caught per item, the
 *     failure is logged, and the loop moves on. Waking up to "crashed at item
 *     3 of 400" is the worst possible outcome.
 *   - Nothing is ever published. The run fills the review inbox and stops
 *     there, exactly like the manual path.
 *   - Stop is checked between every item, so pressing it takes effect within
 *     one draft rather than at the end.
 *   - Quota exhaustion and a stopped Ollama are expected conditions overnight,
 *     not crashes. Both end the run cleanly with an explanation.
 *   - State lives on disk, so closing the browser does not affect the run and
 *     the progress page can be reopened at any point.
 *
 * The run lives in the Node process of the admin server. That is fine for a
 * panel running on your own machine, which is where the model is anyway. It
 * does mean editing project files mid-run restarts the dev server and kills
 * the job, so do the edits before starting, not at 3am.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { addCandidates, listCandidates, updateCandidate } from "@/lib/admin/store";
import { matchKnownEvent, referenceBlock } from "@/lib/bot/known-events";
import { normalizeUrl } from "@/lib/bot/normalize-url";
import { generateJson, isAvailable } from "@/lib/bot/ollama";
import {
  classifyPrompt,
  draftAccountPrompt,
  translatePrompt,
  CLASSIFICATION_SCHEMA,
  DRAFT_SCHEMA,
  TRANSLATION_SCHEMA,
  LANG_NAMES,
  type ClassificationResult,
  type DraftAccount,
  type Lang,
  type SourceMaterial,
  type Translation,
} from "@/lib/bot/prompts";
import { validateAccount, validateTranslation } from "@/lib/bot/validate-account";
import {
  QuotaTracker,
  getVideoDetails,
  listChannelUploads,
  resolveChannelId,
  searchVideos,
  type YouTubeVideo,
} from "@/lib/bot/youtube";

const STATE_PATH = resolve(process.cwd(), ".data/run.json");

export interface RunSource {
  /**
   * `video` is a single pasted link, and it exists because it is the obvious
   * thing to put in a source list. Without it a URL fell through to `search`,
   * which sent the whole link to YouTube as literal search text: 100 units each
   * and nothing useful back. `videos.list` costs 1.
   */
  type: "channel" | "search" | "video";
  value: string;
  max: number;
}

export interface RunConfig {
  sources: RunSource[];
  since?: string;
  translate: boolean;
  model: string;
  /** Hard ceiling on drafts, so an overnight run cannot surprise you. */
  maxDrafts: number;
}

export type RunStatus =
  | "idle"
  | "fetching"
  | "drafting"
  | "stopping"
  | "done"
  | "error";

export interface RunLogEntry {
  at: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface RunState {
  id: string;
  status: RunStatus;
  config: RunConfig | null;
  started_at: string | null;
  finished_at: string | null;
  current: string | null;
  totals: {
    found: number;
    queued: number;
    drafted: number;
    blocked: number;
    failed: number;
    quota_used: number;
  };
  log: RunLogEntry[];
  error?: string;
}

const EMPTY: RunState = {
  id: "",
  status: "idle",
  config: null,
  started_at: null,
  finished_at: null,
  current: null,
  totals: { found: 0, queued: 0, drafted: 0, blocked: 0, failed: 0, quota_used: 0 },
  log: [],
};

/**
 * The live run, held in the process. `stop` is read by the loop between items;
 * the disk file is the record the UI reads.
 */
let active: { id: string; stop: boolean } | null = null;

async function readState(): Promise<RunState> {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8")) as RunState;
  } catch {
    return { ...EMPTY };
  }
}

async function writeState(state: RunState): Promise<void> {
  await mkdir(dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function getRunState(): Promise<RunState> {
  const state = await readState();

  // A run recorded as live with no process behind it means the server was
  // restarted mid-run. Reporting it as still going would be a lie the user
  // acts on, so it is corrected on read.
  const live = active?.id === state.id;
  if (!live && ["fetching", "drafting", "stopping"].includes(state.status)) {
    return {
      ...state,
      status: "error",
      error:
        "The server restarted while this run was going, so it stopped. Anything already drafted is safe in the inbox.",
      finished_at: state.finished_at ?? new Date().toISOString(),
    };
  }

  return state;
}

export function isRunning(state: RunState): boolean {
  return ["fetching", "drafting", "stopping"].includes(state.status);
}

export async function requestStop(): Promise<void> {
  if (active) active.stop = true;

  const state = await readState();
  if (isRunning(state)) {
    await writeState({ ...state, status: "stopping" });
  }
}

/** Keeps the log readable: the tail is what matters after eight hours. */
const LOG_LIMIT = 400;

class Run {
  private state: RunState;

  constructor(config: RunConfig) {
    this.state = {
      ...EMPTY,
      id: `run-${Date.now()}`,
      status: "fetching",
      config,
      started_at: new Date().toISOString(),
      totals: { ...EMPTY.totals },
      log: [],
    };
  }

  get id() {
    return this.state.id;
  }

  private async log(level: RunLogEntry["level"], message: string) {
    this.state.log.push({ at: new Date().toISOString(), level, message });
    if (this.state.log.length > LOG_LIMIT) {
      this.state.log = this.state.log.slice(-LOG_LIMIT);
    }
    await writeState(this.state);
  }

  private async save() {
    await writeState(this.state);
  }

  private get stopped() {
    return active?.stop === true;
  }

  async execute(): Promise<void> {
    const config = this.state.config!;

    try {
      await this.fetchAll(config);
      if (!this.stopped) await this.draftAll(config);

      this.state.status = this.stopped ? "done" : "done";
      this.state.current = null;
      this.state.finished_at = new Date().toISOString();
      await this.log(
        "info",
        this.stopped
          ? "Stopped on request. Everything drafted so far is in the inbox."
          : "Run finished.",
      );
    } catch (err) {
      this.state.status = "error";
      this.state.error = err instanceof Error ? err.message : String(err);
      this.state.finished_at = new Date().toISOString();
      await this.log("error", this.state.error);
    } finally {
      active = null;
      await this.save();
    }
  }

  // -------------------------------------------------------------------------

  private async fetchAll(config: RunConfig) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set.");

    const quota = new QuotaTracker();

    for (const source of config.sources) {
      if (this.stopped) return;

      this.state.current = `Looking through ${source.value}`;
      await this.save();

      try {
        let videos: YouTubeVideo[] = [];

        if (source.type === "channel") {
          const channel = await resolveChannelId(source.value, { apiKey, quota });
          if (!channel) {
            await this.log("warn", `No channel found for ${source.value}.`);
            continue;
          }
          videos = await listChannelUploads(channel.channelId, {
            apiKey,
            quota,
            since: config.since ? `${config.since}T00:00:00Z` : undefined,
            max: source.max,
          });
        } else if (source.type === "video") {
          const normalized = normalizeUrl(source.value);
          if (normalized.platform !== "youtube" || !normalized.videoId) {
            await this.log("warn", `Not a YouTube video link: ${source.value}`);
            continue;
          }
          videos = await getVideoDetails([normalized.videoId], { apiKey, quota });
          if (videos.length === 0) {
            // Deleted, private, or region-blocked. Worth saying which link,
            // because a silent skip in a list of thirty is invisible.
            await this.log("warn", `YouTube returned nothing for ${source.value}`);
          }
        } else {
          videos = await searchVideos(source.value, {
            apiKey,
            quota,
            publishedAfter: config.since ? `${config.since}T00:00:00Z` : undefined,
            maxResults: source.max,
          });
        }

        const embeddable = videos.filter((v) => v.embeddable);

        const { added, skipped } = await addCandidates(
          embeddable.map((v) => ({
            normalized_url: normalizeUrl(v.watchUrl).key,
            watch_url: v.watchUrl,
            embed_url: v.embedUrl,
            media_type: v.isShort ? ("short" as const) : ("youtube" as const),
            title: v.title,
            description: v.description,
            channel: v.channelTitle,
            published_at: v.publishedAt,
            thumbnail_url: v.thumbnailUrl,
            duration_seconds: v.durationSeconds,
            language: v.defaultLanguage,
            has_captions: v.hasCaptions,
            source_label: source.value,
          })),
        );

        this.state.totals.found += videos.length;
        this.state.totals.queued += added;
        this.state.totals.quota_used = quota.used;

        await this.log(
          "info",
          `${source.value}: ${videos.length} found, ${added} new, ${skipped} already seen.`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        // Quota exhaustion ends fetching but not the run: whatever is already
        // queued is still worth drafting through the night.
        if (message.includes("quota")) {
          await this.log("warn", `${message} Moving on to drafting.`);
          return;
        }

        await this.log("error", `${source.value} failed: ${message}`);
      }
    }
  }

  // -------------------------------------------------------------------------

  private async draftAll(config: RunConfig) {
    this.state.status = "drafting";
    await this.save();

    if (!(await isAvailable())) {
      throw new Error(
        "Ollama is not running, so nothing can be drafted. Anything fetched is waiting in the inbox.",
      );
    }

    const queue = (await listCandidates("new")).slice(0, config.maxDrafts);

    await this.log("info", `Drafting ${queue.length} of them.`);

    // A handful of failures across a night is normal: odd videos, empty
    // descriptions, a model that rambled. A long unbroken streak is different,
    // and means something systemic broke (Ollama died, the model was deleted,
    // the disk filled). Grinding through 400 items to produce 400 identical
    // errors helps nobody, so the run gives up and says so.
    const GIVE_UP_AFTER = 10;
    let consecutiveFailures = 0;

    for (const [index, candidate] of queue.entries()) {
      if (this.stopped) return;

      this.state.current = `${index + 1} of ${queue.length}: ${candidate.title.slice(0, 70)}`;
      await this.save();

      try {
        await this.draftOne(candidate.id, config);
        consecutiveFailures = 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        this.state.totals.failed += 1;
        consecutiveFailures += 1;

        // Marked rather than left as "new", so the next run skips it instead
        // of spending another model call on the same broken item.
        await updateCandidate(candidate.id, {
          status: "failed",
          failure: { at: new Date().toISOString(), message },
        });

        await this.log("error", `Skipped ${candidate.title.slice(0, 55)}: ${message}`);

        if (consecutiveFailures >= GIVE_UP_AFTER) {
          throw new Error(
            `${GIVE_UP_AFTER} in a row failed, so something is wrong beyond the videos themselves. ` +
              `Stopping rather than burning the night on it. Last error: ${message}`,
          );
        }
      }
    }
  }

  private async draftOne(id: string, config: RunConfig) {
    const candidates = await listCandidates();
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return;

    const match = matchKnownEvent(candidate.title, candidate.description);

    const source: SourceMaterial = {
      sourceName: `YouTube: ${candidate.channel}`,
      sourceUrl: candidate.watch_url,
      knownTitle: candidate.title,
      knownDate: candidate.published_at,
      text: `Video title: ${candidate.title}\n\nUploader description:\n${candidate.description || "(none)"}`,
      reference: match ? referenceBlock(match) : undefined,
    };

    const groundingText = [source.text, source.reference].filter(Boolean).join("\n\n");

    const account = await generateJson<DraftAccount>(draftAccountPrompt(source), {
      model: config.model,
      temperature: 0.2,
      schema: DRAFT_SCHEMA,
    });

    const firstCheck = validateAccount(account, { sourceText: groundingText });

    let classification: ClassificationResult | null = null;
    let validation = firstCheck;
    const translations: Partial<Record<Lang, Translation>> = {};
    const extra = [];

    // A draft that already breaks a hard rule is left for the reviewer rather
    // than spending three more model calls on classification and translation.
    // Over a night that saves hours.
    if (firstCheck.ok) {
      classification = await generateJson<ClassificationResult>(
        classifyPrompt(account, source),
        { model: config.model, temperature: 0.1, schema: CLASSIFICATION_SCHEMA },
      );

      validation = validateAccount(account, {
        sourceText: groundingText,
        classification: classification.classification,
      });

      if (config.translate && validation.ok) {
        for (const lang of ["fr", "pt", "es"] as Lang[]) {
          if (this.stopped) break;

          try {
            const t = await generateJson<Translation>(
              translatePrompt(account, classification.classification_reason, lang),
              { model: config.model, temperature: 0.2, schema: TRANSLATION_SCHEMA },
            );

            const check = validateTranslation(
              account,
              t as unknown as Record<string, string>,
              lang,
            );

            if (check.errors.length === 0) {
              translations[lang] = t;
              extra.push(...check.warnings);
            } else {
              extra.push(
                ...check.errors.map((f) => ({
                  ...f,
                  severity: "warn" as const,
                  message: `${LANG_NAMES[lang]} translation was discarded: ${f.message}`,
                })),
              );
            }
          } catch (err) {
            // A failed translation must not cost the English account.
            extra.push({
              severity: "warn" as const,
              rule: "translation-failed",
              message: `${LANG_NAMES[lang]} translation failed: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      }
    }

    await updateCandidate(id, {
      status: "drafted",
      draft: {
        account,
        classification,
        translations,
        validation: {
          ok: validation.ok,
          errors: validation.errors,
          warnings: [...validation.warnings, ...extra],
        },
        generated_at: new Date().toISOString(),
        model: config.model,
        matched_event: match
          ? {
              id: match.event.id,
              name: match.event.name,
              matched_on: match.matchedOn,
              authority: match.event.authority,
              canonical_slug: match.event.canonical_slug,
              documents: match.event.documents ?? [],
            }
          : undefined,
      },
    });

    if (validation.ok) this.state.totals.drafted += 1;
    else this.state.totals.blocked += 1;

    await this.save();
  }
}

/**
 * Sets a run up and hands it back unstarted.
 *
 * Shared by the two callers because they need opposite things from it. A web
 * action must return immediately or the request times out; a terminal command
 * must wait or the process exits and takes the run with it.
 */
async function prepare(
  config: RunConfig,
  { force = false }: { force?: boolean } = {},
): Promise<{ error?: string; run?: Run }> {
  const existing = await getRunState();

  // `active` is process memory, so a state file saying "fetching" with no
  // `active` beside it means the previous run died with its process: a dev
  // server restart, a crash, or a closed terminal. That is a stale record
  // rather than a live run, and refusing to start because of it would leave the
  // bot permanently blocked by a file.
  if (isRunning(existing)) {
    if (active) {
      return { error: "A run is already going. Stop it before starting another." };
    }
    if (!force) {
      return {
        error:
          `The state file says a run is in progress (started ${existing.started_at ?? "unknown"}), ` +
          "but no run is executing in this process, so it died with whatever " +
          "started it. Pass --force to discard that record and start fresh.",
      };
    }
  }

  if (config.sources.length === 0) {
    return { error: "Add at least one channel or search to look through." };
  }

  const run = new Run(config);
  active = { id: run.id, stop: false };

  await writeState({
    ...EMPTY,
    id: run.id,
    status: "fetching",
    config,
    started_at: new Date().toISOString(),
    totals: { ...EMPTY.totals },
    log: [
      {
        at: new Date().toISOString(),
        level: "info",
        message: "Started. Nothing will be published; everything lands in the inbox.",
      },
    ],
  });

  return { run };
}

/**
 * Fire and forget, for the admin panel.
 *
 * The run outlives the request but not the server: saving any file in dev
 * restarts Next and kills it mid-flight. For an unattended overnight run use
 * `runToCompletion` from a terminal instead.
 */
export async function startRun(config: RunConfig): Promise<{ error?: string }> {
  const { error, run } = await prepare(config);
  if (error || !run) return { error };

  void run.execute();
  return {};
}

/**
 * Runs to the end and resolves when it is done, for the CLI.
 *
 * This is the one to use overnight. It owns its own process, so it does not care
 * what the dev server is doing, and nothing restarts it when a file is saved.
 */
export async function runToCompletion(
  config: RunConfig,
  opts: { force?: boolean } = {},
): Promise<{ error?: string; state?: RunState }> {
  const { error, run } = await prepare(config, opts);
  if (error || !run) return { error };

  await run.execute();
  return { state: await getRunState() };
}
