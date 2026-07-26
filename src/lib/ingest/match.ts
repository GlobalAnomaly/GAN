/**
 * Deciding whether two reports describe the same event.
 *
 * This is the part of the archive that competitors do not have. UFOSINT flags
 * 126,729 duplicate pairs and shows a reader none of them; MUFON only holds
 * itself. When one event turns up in NUFORC, in the UK MoD files and in a police
 * log, "independently reported to three archives, one of them official" is worth
 * more than a third pin in the same place.
 *
 * Two rules shape everything below.
 *
 * **Thresholds are asymmetric.** A missed link costs a corroboration we could
 * have shown. A wrong link merges two genuinely separate events, or puts the
 * wrong video under a sourced account, which is the failure the seed cases guard
 * against by shipping empty embed URLs rather than guessed ones. So the bar for
 * acting is much higher than the bar for suggesting.
 *
 * **Sources disagree about the facts, not just the interpretation.** UFOCAT's 56
 * records for Mantell 1948 place it at FORT KNOX, FRANKFORT, FRANKLIN SW and
 * F-51, which are tens of kilometres apart. A matcher that demands close
 * agreement on coordinates would miss the single best-documented case in the
 * database. Distance tolerance is therefore generous and carries little weight
 * on its own.
 */

export interface MatchableReport {
  id: string;
  /** ISO date, or null when the source gave none. */
  occurred_at: string | null;
  date_precision: "day" | "month" | "year" | "unknown";
  lat: number | null;
  lng: number | null;
  location_raw: string | null;
  country: string | null;
  shape: string | null;
  observers: number | null;
  /** Which source it came from. Two records from one source corroborate less. */
  source_key: string;
}

export interface Signals {
  /** Days apart, or null when either date is unusable. */
  day_gap: number | null;
  /** Kilometres apart, or null when either report lacks coordinates. */
  distance_km: number | null;
  /** 0 to 1, on the normalised place name. */
  location_similarity: number | null;
  shape_agrees: boolean | null;
  same_source: boolean;
}

export interface Scored {
  score: number;
  signals: Signals;
  /** What the pipeline should do, given the asymmetry described above. */
  action: "link" | "suggest" | "ignore";
}

/**
 * Confidence needed to act. **Measured, not guessed.**
 *
 * `scripts/ingest/match-validate.ts` scores every pair against UFOCAT's 35,109
 * hand-built multi-record cases. The first guesses at these constants were 0.86
 * and 0.55, which gave 72.2% precision on auto-links, meaning one merge in four
 * disagreed with CUFOS. Against our own rule that a wrong merge destroys two
 * events silently, that is not usable.
 *
 * Measured on 91 million compared pairs, restricted to pairs citing *different*
 * publications, which is both the fair test and the one that carries the
 * corroboration claim:
 *
 *     score >= 1.000   97.1% precision   93,001 pairs
 *     score >= 0.950   89.7%
 *     score >= 0.900   80.7%
 *     score >= 0.700   56.6%
 *     score >= 0.650   49.0%   (93.4% recall of reachable pairs)
 *
 * So `link` demands near-perfect agreement on every signal. It buys 35% recall,
 * which sounds poor and is not: the other 65% are not lost, they go to review.
 *
 * Why measuring against UFOCAT understates us, and why we do not tune to
 * maximise agreement with it: their unit is one witness via one source, so a
 * mass sighting reported by forty people to NUFORC is forty separate cases
 * describing one event. Ours is the event, which is what a map pin needs.
 * Inspection of perfect-score disagreements found them dominated by
 * same-publication pairs (UFOReportCtr with itself, 716; CanadUFOSurv with
 * itself, 709) and by outright errors in UFOCAT, such as the Aveley 1974 case
 * where a transposed PRN (166684 against 106684) orphaned one record from its
 * own cluster.
 */
export const LINK_THRESHOLD = 0.97;
export const SUGGEST_THRESHOLD = 0.65;

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Place names, reduced to something comparable.
 *
 * UFOCAT writes them in shouting caps, sometimes with a second place appended
 * after an equals sign ("LAFOLLETTE=POWELL") or a direction suffixed
 * ("FRANKLIN SW"). Those are the same town described two ways, so the suffix and
 * the alternate are noise for comparison purposes.
 */
export function normalizePlace(raw: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .split("=")[0]
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(n|s|e|w|ne|nw|se|sw|near|nr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dice coefficient on character bigrams: cheap, and forgiving of misspellings. */
export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const ga = bigrams(a);
  const gb = bigrams(b);
  let shared = 0;
  let total = 0;

  for (const n of ga.values()) total += n;
  for (const [g, n] of gb) {
    total += n;
    shared += Math.min(n, ga.get(g) ?? 0);
  }

  return total === 0 ? 0 : (2 * shared) / total;
}

function dayGap(a: MatchableReport, b: MatchableReport): number | null {
  if (!a.occurred_at || !b.occurred_at) return null;
  // A date known only to the year was stored as 1 January, so comparing days
  // would claim a precision the source never had.
  if (a.date_precision === "unknown" || b.date_precision === "unknown") return null;

  const ta = Date.parse(`${a.occurred_at}T00:00:00Z`);
  const tb = Date.parse(`${b.occurred_at}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;

  return Math.abs(ta - tb) / 86_400_000;
}

/**
 * How much the dates agree, from 0 to 1.
 *
 * Zero days apart is not certainty, because thousands of unrelated reports share
 * any given date. One day apart still scores well: a sighting at 23:40 local
 * lands on either side of midnight depending on the timezone the source used,
 * and UFOCAT stores a timezone field precisely because they disagree.
 */
function dateScore(gap: number | null, aPrec: string, bPrec: string): number {
  if (gap === null) return 0;

  // Two records known only to the month agree on nothing more than the month,
  // so an exact match between them means much less.
  const coarse = aPrec !== "day" || bPrec !== "day";

  if (gap === 0) return coarse ? 0.45 : 1;
  if (gap <= 1) return coarse ? 0.4 : 0.9;
  if (gap <= 2) return coarse ? 0.3 : 0.5;
  if (gap <= 31 && coarse) return 0.25;
  return 0;
}

/** Generous by design: see the Mantell note at the top of this file. */
function distanceScore(km: number | null): number {
  if (km === null) return 0;
  if (km <= 5) return 1;
  if (km <= 25) return 0.85;
  if (km <= 60) return 0.6;
  if (km <= 150) return 0.35;
  return 0;
}

export function scorePair(a: MatchableReport, b: MatchableReport): Scored {
  const gap = dayGap(a, b);

  const distance_km =
    a.lat !== null && a.lng !== null && b.lat !== null && b.lng !== null
      ? haversineKm(a.lat, a.lng, b.lat, b.lng)
      : null;

  const pa = normalizePlace(a.location_raw);
  const pb = normalizePlace(b.location_raw);
  const location_similarity = pa && pb ? stringSimilarity(pa, pb) : null;

  const shape_agrees =
    a.shape && b.shape ? a.shape.toLowerCase() === b.shape.toLowerCase() : null;

  const signals: Signals = {
    day_gap: gap,
    distance_km,
    location_similarity,
    shape_agrees,
    same_source: a.source_key === b.source_key,
  };

  const date = dateScore(gap, a.date_precision, b.date_precision);

  // The date has to agree for anything else to matter. Two reports from the same
  // town six months apart are two events, however alike they read.
  if (date === 0) {
    return { score: 0, signals, action: "ignore" };
  }

  const place = Math.max(
    distanceScore(distance_km),
    // A name match substitutes for coordinates when one side has none, which is
    // 8% of UFOCAT and much more of the older material.
    (location_similarity ?? 0) >= 0.8 ? 0.7 : 0,
  );

  if (place === 0) {
    return { score: 0, signals, action: "ignore" };
  }

  // Date and place carry the decision. Shape is corroboration, never evidence:
  // "Disc" is the most common value in the database and agreeing on it says
  // almost nothing.
  let score = 0.55 * date + 0.35 * place;

  if (location_similarity !== null) score += 0.06 * location_similarity;
  if (shape_agrees) score += 0.04;

  // Two records from one source that look identical are usually one report
  // entered twice, which is worth merging but is not corroboration. The caller
  // uses `same_source` when counting how many sources back a cluster.
  score = Math.min(1, score);

  const action =
    score >= LINK_THRESHOLD
      ? "link"
      : score >= SUGGEST_THRESHOLD
        ? "suggest"
        : "ignore";

  return { score, signals, action };
}

/**
 * Buckets a report into block keys, so we never compare all pairs.
 *
 * 306,817 records is 47 billion pairs, which does not finish. Blocking on the
 * year and a one-degree cell cuts that to something linear in practice.
 *
 * Returns the report's own cell plus its eight neighbours, because two reports
 * of one event routinely fall either side of a cell boundary, and a boundary is
 * an artefact of our grid rather than anything about the world.
 */
export function blockKeys(r: MatchableReport): string[] {
  if (!r.occurred_at) return [];
  const year = r.occurred_at.slice(0, 4);

  if (r.lat === null || r.lng === null) {
    // Without coordinates the only usable block is the year plus the place
    // name's first token, or every undated-location report in a year would be
    // compared with every other.
    const place = normalizePlace(r.location_raw).split(" ")[0];
    return place ? [`${year}|name:${place}`] : [];
  }

  const keys: string[] = [];
  const baseLat = Math.floor(r.lat);
  const baseLng = Math.floor(r.lng);

  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      keys.push(`${year}|${baseLat + dLat},${baseLng + dLng}`);
    }
  }

  return keys;
}

/**
 * The year boundary problem: a sighting at 23:50 on 31 December is one day from
 * one at 00:10 on 1 January, but the two fall in different year blocks. Small
 * enough to handle by also emitting the neighbouring year for dates within two
 * days of a boundary.
 */
export function blockKeysWithYearEdges(r: MatchableReport): string[] {
  const keys = blockKeys(r);
  if (!r.occurred_at || keys.length === 0) return keys;

  const md = r.occurred_at.slice(5);
  const year = Number(r.occurred_at.slice(0, 4));
  const nearStart = md <= "01-02";
  const nearEnd = md >= "12-30";
  if (!nearStart && !nearEnd) return keys;

  const other = nearStart ? year - 1 : year + 1;
  return [
    ...keys,
    ...keys.map((k) => k.replace(/^\d{4}/, String(other).padStart(4, "0"))),
  ];
}
