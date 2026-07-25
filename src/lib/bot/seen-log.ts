/**
 * The ingestion memory, file-backed for now.
 *
 * Records every URL the bot has ever encountered, including the ones you
 * rejected, so nothing is ever put in front of you twice. This is a local JSON
 * file today and becomes the `ingestion_log` table once Supabase is connected.
 * The interface is deliberately the same shape as that table so the swap is a
 * change of storage, not of logic.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type Outcome = "published" | "merged" | "dismissed" | "pending";

export interface SeenEntry {
  normalized_url: string;
  source: string;
  first_seen: string;
  outcome: Outcome;
  notes?: string;
}

export class SeenLog {
  private map = new Map<string, SeenEntry>();

  private constructor(private readonly path: string) {}

  static async open(path: string): Promise<SeenLog> {
    const log = new SeenLog(path);
    try {
      const raw = await readFile(path, "utf8");
      for (const entry of JSON.parse(raw) as SeenEntry[]) {
        log.map.set(entry.normalized_url, entry);
      }
    } catch {
      // No log yet. A first run starting from empty is the normal case.
    }
    return log;
  }

  has(normalizedUrl: string): boolean {
    return this.map.has(normalizedUrl);
  }

  get(normalizedUrl: string): SeenEntry | undefined {
    return this.map.get(normalizedUrl);
  }

  /** Returns false when the URL was already known, so callers can count skips. */
  add(entry: SeenEntry): boolean {
    if (this.map.has(entry.normalized_url)) return false;
    this.map.set(entry.normalized_url, entry);
    return true;
  }

  setOutcome(normalizedUrl: string, outcome: Outcome) {
    const existing = this.map.get(normalizedUrl);
    if (existing) existing.outcome = outcome;
  }

  get size() {
    return this.map.size;
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(
      this.path,
      JSON.stringify([...this.map.values()], null, 2),
      "utf8",
    );
  }
}
