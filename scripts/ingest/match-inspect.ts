/**
 * Look at the pairs where the matcher and CUFOS disagree at high confidence.
 *
 * Precision plateaus at 94.9% even for pairs scoring a perfect 1.0, and a
 * plateau is usually a definition problem rather than a tuning problem. Two
 * reports agreeing on the exact day, sitting within 5km, matching on place name
 * and on shape are unlikely to be different events, so before accepting 94.9% as
 * our error rate it is worth reading some.
 *
 * The hypothesis to test: UFOCAT's unit is one witness via one source, and the
 * codebook says so. A mass sighting reported by forty people to NUFORC on one
 * night may therefore be forty separate PRNs, all describing one event. If the
 * disagreements cluster in a single high-volume source, the ceiling is
 * definitional and our links are right.
 *
 * Run: npx tsx scripts/ingest/match-inspect.ts
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import {
  blockKeysWithYearEdges,
  scorePair,
  type MatchableReport,
} from "@/lib/ingest/match";

const INPUT = ".pipeline/ufocat.jsonl";
const MAX_BLOCK = 400;
const SAMPLE = 12;

interface Row extends MatchableReport {
  prn: string | null;
  cited_source: string | null;
  cited_author: string | null;
  cited_locator: string | null;
  state_code: string | null;
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
      prn: r.ufocat_prn ?? null,
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
      cited_author: r.cited_author ?? null,
      cited_locator: r.cited_locator ?? null,
      state_code: r.state_code ?? null,
    });
  }
  return rows;
}

async function main() {
  const rows = await load();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const prnOf = new Map(rows.map((r) => [r.id, r.prn]));

  const blocks = new Map<string, string[]>();
  for (const r of rows)
    for (const k of blockKeysWithYearEdges(r)) {
      const l = blocks.get(k);
      if (l) l.push(r.id);
      else blocks.set(k, [r.id]);
    }

  const samples: [Row, Row, number][] = [];
  const sourcePairs = new Map<string, number>();
  const sameSourceCount = { same: 0, different: 0 };
  let agreeCount = 0;
  let disagreeCount = 0;
  const seen = new Set<string>();

  for (const ids of blocks.values()) {
    if (ids.length < 2 || ids.length > MAX_BLOCK) continue;
    for (let i = 0; i < ids.length; i++) {
      const a = byId.get(ids[i])!;
      for (let j = i + 1; j < ids.length; j++) {
        const b = byId.get(ids[j])!;
        const key = a.id < b.id ? `${a.id} ${b.id}` : `${b.id} ${a.id}`;
        if (seen.has(key)) continue;

        const { score } = scorePair(a, b);
        if (score < 0.995) continue;
        seen.add(key);

        const pa = prnOf.get(a.id);
        const pb = prnOf.get(b.id);
        if (pa && pb && pa === pb) {
          agreeCount++;
          continue;
        }

        disagreeCount++;
        if (a.cited_source === b.cited_source) sameSourceCount.same++;
        else sameSourceCount.different++;

        const pairName = [a.cited_source ?? "?", b.cited_source ?? "?"]
          .sort()
          .join(" + ");
        sourcePairs.set(pairName, (sourcePairs.get(pairName) ?? 0) + 1);

        if (samples.length < SAMPLE) samples.push([a, b, score]);
      }
    }
  }

  console.log(`perfect-score pairs: ${(agreeCount + disagreeCount).toLocaleString()}`);
  console.log(`  CUFOS agrees   : ${agreeCount.toLocaleString()}`);
  console.log(`  CUFOS disagrees: ${disagreeCount.toLocaleString()}`);

  console.log(`\ndisagreements by whether both cite the SAME publication:`);
  console.log(`  same publication     : ${sameSourceCount.same.toLocaleString()}`);
  console.log(`  different publications: ${sameSourceCount.different.toLocaleString()}`);

  console.log(`\ntop source pairings among disagreements:`);
  for (const [k, v] of [...sourcePairs].sort((x, y) => y[1] - x[1]).slice(0, 8)) {
    console.log(`  ${String(v).padStart(6)}  ${k}`);
  }

  console.log(`\n--- ${samples.length} examples ---`);
  for (const [a, b, score] of samples) {
    console.log(
      `\nscore ${score.toFixed(3)}  PRN ${a.prn} vs ${b.prn}` +
        `  ${a.occurred_at}`,
    );
    for (const r of [a, b]) {
      console.log(
        `   URN ${r.id.padStart(7)}  ${(r.location_raw ?? "").padEnd(22)}` +
          ` ${(r.state_code ?? "").padEnd(4)} ${String(r.lat).padStart(8)},${String(r.lng).padStart(9)}` +
          `  ${(r.shape ?? "-").padEnd(9)} ${r.cited_source ?? "-"} / ${r.cited_author ?? "-"}`,
      );
    }
  }
}

void main();
