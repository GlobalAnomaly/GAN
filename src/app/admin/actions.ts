"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/admin/auth";
import {
  addCandidates,
  getCandidate,
  removeCandidate,
  updateCandidate,
  type Candidate,
} from "@/lib/admin/store";
import { normalizeUrl } from "@/lib/bot/normalize-url";
import {
  QuotaTracker,
  getVideoDetails,
  listChannelUploads,
  resolveChannelId,
  searchVideos,
  type YouTubeVideo,
} from "@/lib/bot/youtube";
import { DEFAULT_MODEL, generateJson, isAvailable } from "@/lib/bot/ollama";
import { matchKnownEvent, referenceBlock } from "@/lib/bot/known-events";
import { requestStop, startRun, type RunSource } from "@/lib/bot/runner";
import {
  classifyPrompt,
  draftAccountPrompt,
  translatePrompt,
  LANG_NAMES,
  CLASSIFICATION_SCHEMA,
  DRAFT_SCHEMA,
  TRANSLATION_SCHEMA,
  type ClassificationResult,
  type DraftAccount,
  type Lang,
  type SourceMaterial,
  type Translation,
} from "@/lib/bot/prompts";
import {
  validateAccount,
  validateTranslation,
  type Finding,
} from "@/lib/bot/validate-account";

/**
 * Every button in the admin panel lands here. These run on the server, so the
 * YouTube key, the Ollama connection and the Supabase service role stay out of
 * the browser entirely.
 */

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function signIn(_prev: unknown, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!process.env.ADMIN_PASSWORD) {
    // Two different situations, and the old message only described one of them.
    // On a deployed site it told the reader to edit .env.local, which is
    // gitignored, never deployed, and cannot possibly help there. Worse, doing
    // the equivalent in the host's dashboard would produce a panel that looks
    // functional and silently does nothing: the review inbox is a JSON file on
    // the local disk and Ollama runs on the operator's machine.
    const deployed = process.env.NODE_ENV === "production" && !!process.env.VERCEL;

    return {
      error: deployed
        ? "The admin panel only runs on the machine that holds the bot. It cannot " +
          "work here: the review inbox is a local file and the model runs locally, " +
          "so it stays closed on the deployed site by design. Use it at " +
          "localhost:3000/admin instead."
        : "ADMIN_PASSWORD is not set, or the server started before it was. Add it " +
          "to .env.local, then stop and restart npm run dev: a Fast Refresh will " +
          "not pick up a change to the environment.",
    };
  }

  if (!(await checkPassword(password))) {
    return { error: "That password is not right." };
  }

  const token = await sessionToken();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Fetch from YouTube
// ---------------------------------------------------------------------------

function toCandidateRow(
  v: YouTubeVideo,
  sourceLabel: string,
): Omit<Candidate, "status" | "fetched_at" | "id"> {
  return {
    normalized_url: normalizeUrl(v.watchUrl).key,
    watch_url: v.watchUrl,
    embed_url: v.embedUrl,
    media_type: v.isShort ? "short" : "youtube",
    title: v.title,
    description: v.description,
    channel: v.channelTitle,
    published_at: v.publishedAt,
    thumbnail_url: v.thumbnailUrl,
    duration_seconds: v.durationSeconds,
    language: v.defaultLanguage,
    has_captions: v.hasCaptions,
    source_label: sourceLabel,
  };
}

export interface FetchState {
  error?: string;
  message?: string;
  quotaUsed?: number;
}

export async function fetchFromYouTube(
  _prev: FetchState | null,
  formData: FormData,
): Promise<FetchState> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      error:
        "YOUTUBE_API_KEY is not set. Add it to .env.local and restart the server. See bot/README.md for how to get one.",
    };
  }

  const mode = String(formData.get("mode") ?? "channel");
  const value = String(formData.get("value") ?? "").trim();
  const since = String(formData.get("since") ?? "").trim();
  const max = Math.min(500, Math.max(1, Number(formData.get("max") ?? 50)));

  if (!value) {
    return { error: "Enter a channel or a search term." };
  }

  const quota = new QuotaTracker();

  try {
    let videos: YouTubeVideo[] = [];
    let label = "";

    if (mode === "channel") {
      const channel = await resolveChannelId(value, { apiKey, quota });
      if (!channel) {
        return { error: `No channel found for "${value}".` };
      }
      label = channel.title;
      videos = await listChannelUploads(channel.channelId, {
        apiKey,
        quota,
        since: since ? `${since}T00:00:00Z` : undefined,
        max,
      });
    } else if (mode === "url") {
      const n = normalizeUrl(value);
      if (n.platform !== "youtube" || !n.videoId) {
        return { error: "That does not look like a YouTube video link." };
      }
      label = "Pasted link";
      videos = await getVideoDetails([n.videoId], { apiKey, quota });
    } else {
      label = `Search: ${value}`;
      videos = await searchVideos(value, {
        apiKey,
        quota,
        publishedAfter: since ? `${since}T00:00:00Z` : undefined,
        maxResults: max,
      });
    }

    // An uploader who turned embedding off has said no. Respect it rather than
    // attaching a player that shows "video unavailable" on the case page.
    const embeddable = videos.filter((v) => v.embeddable);
    const blocked = videos.length - embeddable.length;

    const { added, skipped } = await addCandidates(
      embeddable.map((v) => toCandidateRow(v, label)),
    );

    revalidatePath("/admin");
    revalidatePath("/admin/inbox");

    const parts = [`Found ${videos.length}.`, `${added} new.`];
    if (skipped) parts.push(`${skipped} already seen.`);
    if (blocked) parts.push(`${blocked} cannot be embedded, so left out.`);

    return { message: parts.join(" "), quotaUsed: quota.used };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "The fetch failed.",
      quotaUsed: quota.used,
    };
  }
}

// ---------------------------------------------------------------------------
// Draft with the local model
// ---------------------------------------------------------------------------

const LANGS: Lang[] = ["fr", "pt", "es"];

export interface DraftState {
  error?: string;
  message?: string;
}

export async function draftCandidate(
  _prev: DraftState | null,
  formData: FormData,
): Promise<DraftState> {
  const id = String(formData.get("id") ?? "");
  const model = String(formData.get("model") ?? DEFAULT_MODEL);
  const translate = formData.get("translate") === "on";
  const transcript = String(formData.get("transcript") ?? "").trim();

  const candidate = await getCandidate(id);
  if (!candidate) return { error: "That candidate is no longer in the inbox." };

  if (!(await isAvailable())) {
    return {
      error:
        "Ollama is not running. Start the Ollama app, or run `ollama serve`, then try again.",
    };
  }

  // Look the material up in the archive's reference before drafting. A
  // documentary about Roswell that never says "1947" should not produce an
  // account claiming the date is unknown, but the date must arrive as a
  // sourced fact rather than as something the model remembered.
  const match = matchKnownEvent(
    candidate.title,
    candidate.description,
    transcript,
  );

  const source: SourceMaterial = {
    sourceName: `YouTube: ${candidate.channel}`,
    sourceUrl: candidate.watch_url,
    knownTitle: candidate.title,
    knownDate: candidate.published_at,
    text: [
      `Video title: ${candidate.title}`,
      ``,
      `Uploader description:`,
      candidate.description || "(none)",
      // A transcript changes the account completely: names and dates spoken
      // aloud stop being unsupported guesses and become quotable material.
      transcript ? `\nTranscript:\n${transcript}` : "",
    ].join("\n"),
    reference: match ? referenceBlock(match) : undefined,
  };

  try {
    const account = await generateJson<DraftAccount>(
      draftAccountPrompt(source),
      { model, temperature: 0.2, schema: DRAFT_SCHEMA },
    );

    // Checked before classifying: a draft that breaks a hard rule needs
    // regenerating anyway, and classifying then translating it would spend
    // three more model calls producing output nobody can use.
    // The grounding check must see the reference too, or the very facts we
    // deliberately supplied would be flagged as invented.
    const groundingText = [source.text, source.reference]
      .filter(Boolean)
      .join("\n\n");

    const firstCheck = validateAccount(account, { sourceText: groundingText });

    let classification: ClassificationResult | null = null;
    let validation = firstCheck;
    const translations: Partial<Record<Lang, Translation>> = {};
    const extraFindings: Finding[] = [];

    if (firstCheck.ok) {
      classification = await generateJson<ClassificationResult>(
        classifyPrompt(account, source),
        { model, temperature: 0.1, schema: CLASSIFICATION_SCHEMA },
      );

      validation = validateAccount(account, {
        sourceText: groundingText,
        classification: classification.classification,
      });

      if (translate && validation.ok) {
        for (const lang of LANGS) {
          const t = await generateJson<Translation>(
            translatePrompt(account, classification.classification_reason, lang),
            { model, temperature: 0.2, schema: TRANSLATION_SCHEMA },
          );

          const check = validateTranslation(
            account,
            t as unknown as Record<string, string>,
            lang,
          );

          // A translation that dropped a section or carries an em dash is not
          // publishable, and keeping it would let a broken version reach the
          // site alongside a sound English account. It is discarded and
          // reported instead, so the English can still go out.
          if (check.errors.length === 0) {
            translations[lang] = t;
            extraFindings.push(...check.warnings);
          } else {
            // Reported as warnings, not errors: the translation is already
            // gone, so it cannot block an English account that is itself
            // sound. Blocking here would mean one bad French paragraph
            // holding up a case that is otherwise ready.
            extraFindings.push(
              ...check.errors.map((f) => ({
                ...f,
                severity: "warn" as const,
                message: `${LANG_NAMES[lang]} translation was discarded: ${f.message}`,
              })),
              ...check.warnings,
            );
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
          // Reflects the English account only. Broken translations are
          // discarded above rather than blocking, so nothing here is fatal
          // that the reviewer cannot see and fix in the fields below.
          ok: validation.ok,
          errors: validation.errors,
          warnings: [...validation.warnings, ...extraFindings],
        },
        generated_at: new Date().toISOString(),
        model,
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

    revalidatePath(`/admin/inbox/${id}`);
    revalidatePath("/admin/inbox");
    revalidatePath("/admin");

    return { message: "Draft written." };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "The model call failed.",
    };
  }
}

// ---------------------------------------------------------------------------
// Approve and dismiss
// ---------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    // Combining accent marks, written as escapes rather than literal
    // characters so re-encoding the file cannot corrupt the range.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface ApproveState {
  error?: string;
  message?: string;
}

export async function approveCandidate(
  _prev: ApproveState | null,
  formData: FormData,
): Promise<ApproveState> {
  const id = String(formData.get("id") ?? "");
  const candidate = await getCandidate(id);

  if (!candidate?.draft) return { error: "There is no draft to approve." };

  // The reviewer's edits win over whatever the model produced.
  const edited: DraftAccount = {
    ...candidate.draft.account,
    headline: String(formData.get("headline") ?? candidate.draft.account.headline),
    summary: String(formData.get("summary") ?? ""),
    body_footage: String(formData.get("body_footage") ?? ""),
    body_testimony: String(formData.get("body_testimony") ?? ""),
    body_status: String(formData.get("body_status") ?? ""),
    body_unknown: String(formData.get("body_unknown") ?? ""),
  };

  const classification = String(formData.get("classification") ?? "unverified");
  const classificationReason = String(formData.get("classification_reason") ?? "");

  const matched = candidate.draft.matched_event;

  // The rules apply to a human's edit too. Nothing bypasses the checks. The
  // reference counts as source here as well, so an established date the
  // reviewer kept is not flagged as unsupported.
  const check = validateAccount(edited, {
    sourceText: [
      candidate.title,
      candidate.description,
      matched ? `${matched.name} ${matched.authority}` : "",
    ].join("\n"),
    classification,
  });

  if (!check.ok) {
    return {
      error: `Cannot publish yet: ${check.errors
        .map((e) => e.message)
        .join(" ")}`,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local, then restart.",
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const mergeInto = String(formData.get("merge_into") ?? "").trim();

  // A second video about Rendlesham belongs on the Rendlesham case as another
  // angle, not in a rival entry. Merging keeps one strong case instead of two
  // thin ones, which is also what the reader wants.
  const slug = mergeInto || slugify(edited.headline) || `case-${Date.now()}`;

  try {
    let caseId: string;

    if (mergeInto) {
      const { data: existing, error: findError } = await db
        .from("cases")
        .select("id")
        .eq("slug", mergeInto)
        .maybeSingle();

      if (findError) return { error: `Supabase rejected it: ${findError.message}` };
      if (!existing) {
        return {
          error: `No case with the slug "${mergeInto}" exists to merge into.`,
        };
      }
      caseId = existing.id as string;
    } else {
      const { data: row, error } = await db
        .from("cases")
        .upsert(
          {
            title: edited.headline,
            slug,
            summary: edited.summary,
            body_footage: edited.body_footage,
            body_testimony: edited.body_testimony,
            body_status: edited.body_status,
            body_unknown: edited.body_unknown,
            date_of_event: edited.date_of_event,
            date_precision: edited.date_precision,
            location_name: edited.location_name,
            continent: edited.continent,
            country: edited.country,
            location_unknown: !edited.location_name && !edited.country,
            classification,
            classification_reason: classificationReason,
            published: true,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();

      if (error) return { error: `Supabase rejected it: ${error.message}` };
      caseId = row!.id as string;
    }

    // Existing media is left alone when merging: this clip is an extra angle,
    // and the case's primary footage should not be displaced by it.
    const { count: mediaCount } = await db
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId);

    await db.from("media").insert({
      case_id: caseId,
      type: candidate.media_type,
      embed_url: candidate.embed_url,
      thumbnail_url: candidate.thumbnail_url,
      caption: candidate.title,
      role: mediaCount ? "additional" : "primary",
      sort_order: mediaCount ?? 0,
    });

    const { count: sourceCount } = await db
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId);

    await db.from("sources").insert({
      case_id: caseId,
      source_name: `YouTube: ${candidate.channel}`,
      source_url: candidate.watch_url,
      source_type: "witness",
      sort_order: sourceCount ?? 0,
    });

    // A major event should carry its official archives from the first draft
    // rather than waiting for someone to remember them.
    if (matched?.documents.length) {
      const { data: already } = await db
        .from("documents")
        .select("source_url")
        .eq("case_id", caseId);

      const have = new Set((already ?? []).map((d) => String(d.source_url)));
      const missing = matched.documents.filter((d) => !have.has(d.url));

      if (missing.length) {
        await db.from("documents").insert(
          missing.map((d, i) => ({
            case_id: caseId,
            title: d.title,
            source_url: d.url,
            source_note: `Primary archive for ${matched.name}.`,
            sort_order: have.size + i,
          })),
        );
      }
    }

    // Translations only if every section survived the check.
    for (const [lang, t] of Object.entries(candidate.draft.translations)) {
      if (!t) continue;
      await db.from("case_translations").upsert(
        {
          case_id: caseId,
          lang,
          title: t.title,
          summary: t.summary,
          body_footage: t.body_footage,
          body_testimony: t.body_testimony,
          body_status: t.body_status,
          body_unknown: t.body_unknown,
          is_machine: true,
        },
        { onConflict: "case_id,lang" },
      );
    }

    await removeCandidate(id, "published");

    revalidatePath("/admin/inbox");
    revalidatePath("/admin");
    revalidatePath("/cases");
    revalidatePath(`/cases/${slug}`);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Publishing failed.",
    };
  }

  redirect(`/admin/inbox?published=${encodeURIComponent(slug)}`);
}

/**
 * Throw a draft away and put the candidate back in the queue.
 *
 * Needed whenever the prompts change, the reference gains an event, or a
 * different model is worth trying. Without it a stale draft is stuck, since
 * the drafting form only appears when no draft exists.
 */
export async function redraftCandidate(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  await updateCandidate(id, { status: "new", draft: undefined });

  revalidatePath(`/admin/inbox/${id}`);
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  redirect(`/admin/inbox/${id}`);
}

// ---------------------------------------------------------------------------
// The overnight run
// ---------------------------------------------------------------------------

export interface RunActionState {
  error?: string;
  message?: string;
}

export async function startRunAction(
  _prev: RunActionState | null,
  formData: FormData,
): Promise<RunActionState> {
  const raw = String(formData.get("sources") ?? "");

  // One source per line. "@channel" is a channel, anything else is a search,
  // which keeps the form to a single box rather than a builder UI.
  const sources: RunSource[] = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: line.startsWith("@") || line.startsWith("UC") ? "channel" : "search",
      value: line,
      max: Math.min(500, Math.max(1, Number(formData.get("per_source") ?? 50))),
    }));

  const result = await startRun({
    sources,
    since: String(formData.get("since") ?? "").trim() || undefined,
    translate: formData.get("translate") === "on",
    model: String(formData.get("model") ?? DEFAULT_MODEL),
    maxDrafts: Math.min(
      2000,
      Math.max(1, Number(formData.get("max_drafts") ?? 200)),
    ),
  });

  if (result.error) return { error: result.error };

  revalidatePath("/admin/run");
  return { message: "Running. You can close this page; it keeps going." };
}

export async function stopRunAction() {
  await requestStop();
  revalidatePath("/admin/run");
}

export async function dismissCandidate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await removeCandidate(id, "dismissed");
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  redirect("/admin/inbox");
}
