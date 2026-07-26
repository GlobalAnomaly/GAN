/**
 * Why do 7% of true pairs never share a block?
 *
 * Blocking reaches 267,229 of 287,460 pairs CUFOS linked. The missing 20,231 are
 * invisible to any threshold, so the fix is the block key. Guessing at which
 * cause dominates would waste a change, so this counts them.
 *
 * Run: npx tsx scripts/ingest/block-diagnose.ts
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { blockKeysWithYearEdges, normalizePlace, haversineKm } from "@/lib/ingest/match";

const INPUT = ".pipeline/ufocat.jsonl";

interface Row {
  id: string;
  prn: string | null;
  occurred_at: string | null;
  date_precision: "day" | "month" | "year" | "unknown";
  lat: number | null;
  lng: number | null;
  location_raw: string | null;
}

async function main() {
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
    });
  }

  const byId = new Map(rows.map((r) => [r.id, r]));

  const keysOf = new Map<string, Set<string>>();
  for (const r of rows) {
    keysOf.set(
      r.id,
      new Set(
        blockKeysWithYearEdges({
          id: r.id,
          occurred_at: r.occurred_at,
          date_precision: r.date_precision,
          lat: r.lat,
          lng: r.lng,
          location_raw: r.location_raw,
          country: null,
          shape: null,
          observers: null,
          source_key: "x",
        }),
      ),
    );
  }

  const byPrn = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.prn) continue;
    const l = byPrn.get(r.prn);
    if (l) l.push(r.id);
    else byPrn.set(r.prn, [r.id]);
  }

  const reason = new Map<string, number>();
  const bump = (k: string) => reason.set(k, (reason.get(k) ?? 0) + 1);
  let total = 0;
  let unreachable = 0;
  const samples: string[] = [];

  for (const ids of byPrn.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        total++;
        const a = byId.get(ids[i])!;
        const b = byId.get(ids[j])!;
        const ka = keysOf.get(a.id)!;
        const kb = keysOf.get(b.id)!;

        let shared = false;
        for (const k of ka) {
          if (kb.has(k)) {
            shared = true;
            break;
          }
        }
        if (shared) continue;

        unreachable++;

        const aHasCoords = a.lat !== null && a.lng !== null;
        const bHasCoords = b.lat !== null && b.lng !== null;

        if (!a.occurred_at || !b.occurred_at) {
          bump("no date on one side");
        } else if (a.occurred_at.slice(0, 4) !== b.occurred_at.slice(0, 4)) {
          bump("sources disagree on the YEAR");
        } else if (aHasCoords !== bHasCoords) {
          // A record with coordinates blocks on a grid cell; one without blocks
          // on a place name. They can never meet, whatever the data says.
          bump("one has coordinates, the other does not");
        } else if (!aHasCoords && !bHasCoords) {
          bump("neither has coordinates, place names differ");
        } else {
          const km = haversineKm(a.lat!, a.lng!, b.lat!, b.lng!);
          bump(km > 200 ? "coordinates over 200km apart" : "coordinates 1-2 cells apart");
          if (samples.length < 6 && km <= 200) {
            samples.push(
              `  ${a.occurred_at}  ${a.location_raw} (${a.lat},${a.lng})` +
                ` vs ${b.location_raw} (${b.lat},${b.lng})  ${km.toFixed(0)}km`,
            );
          }
        }
      }
    }
  }

  console.log(`true pairs: ${total.toLocaleString()}`);
  console.log(
    `unreachable: ${unreachable.toLocaleString()}` +
      ` (${((unreachable / total) * 100).toFixed(1)}%)\n`,
  );

  for (const [k, v] of [...reason].sort((x, y) => y[1] - x[1])) {
    console.log(
      `${String(v).padStart(7)}  ${((v / unreachable) * 100).toFixed(1).padStart(5)}%  ${k}`,
    );
  }

  if (samples.length) {
    console.log("\nexamples of near-miss geography:");
    for (const s of samples) console.log(s);
  }

  // How much would emitting both key types for coordinate records recover?
  const noCoords = rows.filter((r) => r.lat === null || r.lng === null).length;
  console.log(
    `\nrecords without coordinates: ${noCoords.toLocaleString()} of ${rows.length.toLocaleString()}`,
  );
  const namedNoCoords = rows.filter(
    (r) => (r.lat === null || r.lng === null) && normalizePlace(r.location_raw),
  ).length;
  console.log(`  of those, with a usable place name: ${namedNoCoords.toLocaleString()}`);
}

void main();
