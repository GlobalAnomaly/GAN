/**
 * Build event clusters from the extracted reports.
 *
 * Blocks, scores, keeps the links above the measured LINK threshold, then groups
 * them with the drift guard in cluster.ts. Writes .pipeline/clusters.jsonl ready
 * for the Supabase loader, and prints what the result actually looks like, because
 * a clustering run that reports only "done" tells us nothing about whether it
 * worked.
 *
 * The number to watch is multi-source clusters. That is the corroboration claim
 * the site is built to make, and it is the one thing no competitor shows.
 *
 * Run: npx tsx --max-old-space-size=6144 scripts/ingest/build-clusters.ts
 */

import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import {
  blockKeysWithYearEdges,
  scorePair,
  LINK_THRESHOLD,
  SUGGEST_THRESHOLD,
  type MatchableReport,
} from "@/lib/ingest/match";
import { buildClusters, type Pair } from "@/lib/ingest/cluster";

const INPUT = ".pipeline/ufocat.jsonl";
const OUT_CLUSTERS = ".pipeline/clusters.jsonl";
const OUT_SUGGESTIONS = ".pipeline/suggestions.jsonl";
const MAX_BLOCK = 400;

interface Row extends MatchableReport {
  cited_source: string | null;
  location_raw: string | null;
}

async function load(): Promise<Row[]> {
  const rows: Row[] = [];
  const rl = createInterface({
    input: createReadStream(INPUT, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    rows.push({
      id: r.source_ref,
      occurred_at: r.occurred_at,
      date_precision: r.date_precision,
      lat: r.lat,
      lng: r.lng,
      location_raw: r.location_raw,
      country: r.country,
      shape: r.shape,
      observers: r.observers,
      time_raw: r.time_raw ?? null,
      source_key: r.cited_source ?? "unknown",
      cited_source: r.cited_source ?? null,
    });
  }
  return rows;
}

async function main() {
  const started = Date.now();
  const rows = await load();
  console.log(`loaded ${rows.length.toLocaleString()} reports`);

  const byId = new Map(rows.map((r) => [r.id, r]));

  const blocks = new Map<string, string[]>();
  for (const r of rows) {
    for (const k of blockKeysWithYearEdges(r)) {
      const l = blocks.get(k);
      if (l) l.push(r.id);
      else blocks.set(k, [r.id]);
    }
  }
  console.log(`blocks: ${blocks.size.toLocaleString()}`);

  const links = new Map<string, Pair>();
  const suggestions = new Map<string, Pair>();
  let comparisons = 0;
  let oversized = 0;

  for (const ids of blocks.values()) {
    if (ids.length < 2) continue;
    if (ids.length > MAX_BLOCK) {
      oversized++;
      continue;
    }
    for (let i = 0; i < ids.length; i++) {
      const a = byId.get(ids[i])!;
      for (let j = i + 1; j < ids.length; j++) {
        const b = byId.get(ids[j])!;
        comparisons++;
        const { score } = scorePair(a, b);
        if (score < SUGGEST_THRESHOLD) continue;

        const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
        const target = score >= LINK_THRESHOLD ? links : suggestions;
        const prev = target.get(key);
        if (!prev || score > prev.score) {
          target.set(key, { a: a.id, b: b.id, score });
        }
      }
    }
  }

  console.log(
    `compared ${comparisons.toLocaleString()} pairs` +
      (oversized ? `, skipped ${oversized} oversized blocks` : ""),
  );
  console.log(`links (>= ${LINK_THRESHOLD}): ${links.size.toLocaleString()}`);
  console.log(
    `suggestions (>= ${SUGGEST_THRESHOLD}): ${suggestions.size.toLocaleString()}`,
  );

  const { clusters, refused } = buildClusters(rows, [...links.values()]);

  const multi = clusters.filter((c) => c.members.length > 1);
  const corroborated = clusters.filter((c) => c.source_count > 1);

  console.log(`\n=== clusters ===`);
  console.log(`total                    ${clusters.length.toLocaleString()}`);
  console.log(`  single-report          ${(clusters.length - multi.length).toLocaleString()}`);
  console.log(`  multi-report           ${multi.length.toLocaleString()}`);
  console.log(
    `  **multi-SOURCE**       ${corroborated.length.toLocaleString()}` +
      `   <- the corroboration claim`,
  );
  console.log(`merges refused as drift  ${refused.length.toLocaleString()}  (sent to review)`);

  const sizes = new Map<number, number>();
  for (const c of clusters) sizes.set(c.members.length, (sizes.get(c.members.length) ?? 0) + 1);
  console.log(
    `\nsize distribution: ` +
      [...sizes.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(0, 8)
        .map(([k, v]) => `${k}:${v.toLocaleString()}`)
        .join("  "),
  );
  console.log(`largest cluster: ${Math.max(...clusters.map((c) => c.members.length))} reports`);

  const spans = multi.map((c) => c.span_km).sort((a, b) => a - b);
  if (spans.length) {
    const pct = (p: number) => spans[Math.floor(spans.length * p)] ?? 0;
    console.log(
      `multi-report spread km: median ${pct(0.5).toFixed(1)}, ` +
        `90th ${pct(0.9).toFixed(1)}, max ${spans[spans.length - 1].toFixed(1)}`,
    );
  }

  console.log(`\n=== best-corroborated clusters ===`);
  for (const c of [...corroborated]
    .sort((a, b) => b.source_count - a.source_count)
    .slice(0, 8)) {
    const names = c.members
      .slice(0, 1)
      .map((id) => byId.get(id)!.location_raw ?? "?");
    console.log(
      `  ${String(c.source_count).padStart(3)} sources, ` +
        `${String(c.members.length).padStart(3)} reports  ${c.occurred_at}  ${names[0]}` +
        `  (spread ${c.span_km.toFixed(0)}km, ${c.span_days}d)`,
    );
  }

  writeFileSync(
    OUT_CLUSTERS,
    clusters.map((c) => JSON.stringify(c)).join("\n") + "\n",
    "utf8",
  );
  writeFileSync(
    OUT_SUGGESTIONS,
    [...suggestions.values(), ...refused]
      .map((p) => JSON.stringify(p))
      .join("\n") + "\n",
    "utf8",
  );

  console.log(`\nwrote ${OUT_CLUSTERS} and ${OUT_SUGGESTIONS}`);
  console.log(`elapsed ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

void main();
