import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ClassificationResult, DraftAccount, Lang, Translation } from "@/lib/bot/prompts";
import type { Finding } from "@/lib/bot/validate-account";

/**
 * The review inbox's storage.
 *
 * A JSON file on your own machine, not a database table. That matches where
 * this actually runs: the bot and the admin panel live on your PC (the model
 * needs your GPU), and only approved entries travel to Supabase for the public
 * site to serve. Nothing here is ever exposed to a visitor.
 *
 * It moves into the `ingestion_log` and review-inbox tables when the admin
 * panel is deployed rather than run locally.
 */

const STORE_PATH = resolve(process.cwd(), ".data/inbox.json");

export type CandidateStatus = "new" | "drafted" | "approved" | "dismissed";

export interface DraftRecord {
  account: DraftAccount;
  classification: ClassificationResult | null;
  translations: Partial<Record<Lang, Translation>>;
  validation: { ok: boolean; errors: Finding[]; warnings: Finding[] };
  generated_at: string;
  model: string;
}

export interface Candidate {
  id: string;
  normalized_url: string;
  watch_url: string;
  embed_url: string;
  media_type: "youtube" | "short";
  title: string;
  description: string;
  channel: string;
  published_at: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  language: string | null;
  source_label: string;
  fetched_at: string;
  status: CandidateStatus;
  draft?: DraftRecord;
  /** Set when approved, so the panel can link straight to the live case. */
  published_slug?: string;
}

interface StoreShape {
  candidates: Candidate[];
  /**
   * Every URL ever seen, including dismissed ones, so a later fetch never
   * offers the same clip twice. Kept separate from `candidates` because a
   * dismissed candidate is removed from the list but must stay remembered.
   */
  seen: Record<string, { first_seen: string; outcome: string }>;
}

const EMPTY: StoreShape = { candidates: [], seen: {} };

export async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      candidates: parsed.candidates ?? [],
      seen: parsed.seen ?? {},
    };
  } catch {
    // No file yet. A first run starting empty is the normal case.
    return { ...EMPTY };
  }
}

export async function writeStore(store: StoreShape): Promise<void> {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listCandidates(
  status?: CandidateStatus,
): Promise<Candidate[]> {
  const store = await readStore();
  const rows = status
    ? store.candidates.filter((c) => c.status === status)
    : store.candidates;

  return rows
    .slice()
    .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const store = await readStore();
  return store.candidates.find((c) => c.id === id) ?? null;
}

export async function updateCandidate(
  id: string,
  patch: Partial<Candidate>,
): Promise<Candidate | null> {
  const store = await readStore();
  const index = store.candidates.findIndex((c) => c.id === id);
  if (index === -1) return null;

  store.candidates[index] = { ...store.candidates[index], ...patch };
  await writeStore(store);
  return store.candidates[index];
}

export async function removeCandidate(
  id: string,
  outcome: string,
): Promise<void> {
  const store = await readStore();
  const row = store.candidates.find((c) => c.id === id);

  store.candidates = store.candidates.filter((c) => c.id !== id);

  // The URL stays in `seen` forever, so a dismissed clip never comes back.
  if (row) {
    store.seen[row.normalized_url] = {
      first_seen: store.seen[row.normalized_url]?.first_seen ?? row.fetched_at,
      outcome,
    };
  }

  await writeStore(store);
}

export interface AddResult {
  added: number;
  skipped: number;
}

export async function addCandidates(
  incoming: Omit<Candidate, "status" | "fetched_at" | "id">[],
): Promise<AddResult> {
  const store = await readStore();
  const now = new Date().toISOString();

  let added = 0;
  let skipped = 0;

  for (const row of incoming) {
    if (store.seen[row.normalized_url]) {
      skipped += 1;
      continue;
    }

    store.candidates.push({
      ...row,
      id: encodeURIComponent(row.normalized_url),
      status: "new",
      fetched_at: now,
    });
    store.seen[row.normalized_url] = { first_seen: now, outcome: "pending" };
    added += 1;
  }

  await writeStore(store);
  return { added, skipped };
}

export async function counts() {
  const store = await readStore();
  const byStatus = { new: 0, drafted: 0, approved: 0, dismissed: 0 };
  for (const c of store.candidates) byStatus[c.status] += 1;

  return {
    ...byStatus,
    total: store.candidates.length,
    seen: Object.keys(store.seen).length,
  };
}
