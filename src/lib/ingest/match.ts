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
  /** Local clock time as the source wrote it ("0045", "21:30"), when given. */
  time_raw?: string | null;
}

export interface Signals {
  /** Days apart, or null when either date is unusable. */
  day_gap: number | null;
  /** Kilometres apart, or null when either report lacks coordinates. */
  distance_km: number | null;
  /** 0 to 1, on the normalised place name. */
  location_similarity: number | null;
  /** 0 to 1 on clock proximity, or null when either side gave no time. */
  time_proximity: number | null;
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
 *     score >= 0.950   98.3% precision    61,119 pairs
 *     score >= 0.900   94.6%             155,299
 *     score >= 0.850   86.1%             236,852
 *     score >= 0.800   76.9%             287,356
 *     score >= 0.650   55.4%             433,231
 *
 * `LINK` sits at 0.92 rather than higher for a specific reason. The maximum
 * possible score is 0.97, and a pair agreeing perfectly on date, place and name
 * but where neither source recorded a time reaches only 0.925. A bar above that
 * would permanently exclude the 17% of records with no time, so the auto-link
 * would only ever fire on the better-documented five-sixths. 0.92 admits those and
 * still rejects a pair that actively disagrees on time, which tops out at 0.8935.
 *
 * The other 65% of pairs are not lost. They go to review.
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
export const LINK_THRESHOLD = 0.92;
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

/**
 * Generous by design: see the Mantell note at the top of this file.
 *
 * Continuous rather than stepped. The stepped version returned exactly 1 for
 * anything within 5km, which combined with an exact date to pin 93,001 pairs at
 * a score of precisely 1.0. That destroyed all ranking at the top of the
 * distribution, which is the one place ranking matters, because it is where the
 * auto-link decision is made.
 *
 * 1/(1 + km/60) keeps the shape we measured: 0km scores 1, 5km 0.92, 25km 0.71,
 * 100km 0.375, and 150km 0.286, so the Mantell spread still clears the suggest
 * bar. Beyond 200km it is floored to zero, because at that range a same-day pair
 * is a wave rather than a duplicate.
 */
function distanceScore(km: number | null): number {
  if (km === null) return 0;
  if (km > 200) return 0;
  return 1 / (1 + km / 60);
}

/**
 * Time of day, when both sources give one. The tiebreaker the score was missing.
 *
 * UFOCAT carries a time on 82.9% of records, and it discriminates exactly where
 * distance and date have both saturated: two accounts of one event at 21:00 and
 * 21:05 are a far better match than 21:00 and 04:00 on the same date, and until
 * now those scored identically.
 *
 * Returns null rather than 0 when either side is missing, so a report without a
 * time is not penalised for it. Roughly a sixth of them have none, and treating
 * silence as disagreement would push them all below the link bar.
 */
export function timeScore(a: string | null, b: string | null): number | null {
  const parse = (raw: string | null): number | null => {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 3) return null;
    const padded = digits.padStart(4, "0").slice(0, 4);
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2));
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  };

  const ma = parse(a);
  const mb = parse(b);
  if (ma === null || mb === null) return null;

  // Shortest way round the clock: 23:50 and 00:10 are twenty minutes apart, not
  // twenty-three hours and forty.
  const raw = Math.abs(ma - mb);
  const minutes = Math.min(raw, 1440 - raw);

  if (minutes <= 10) return 1;
  if (minutes <= 30) return 0.9;
  if (minutes <= 90) return 0.7;
  if (minutes <= 180) return 0.45;
  return 0.15;
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

  const time_proximity = timeScore(a.time_raw ?? null, b.time_raw ?? null);

  const signals: Signals = {
    day_gap: gap,
    distance_km,
    location_similarity,
    time_proximity,
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
  //
  // Weights sum to 0.94 before the optional signals, so a pair agreeing perfectly
  // on date and place still leaves headroom. Time and shape then decide between
  // otherwise identical candidates, which is what the old formulation could not
  // do: its weights summed to exactly 1.0 and clamped, so the whole top of the
  // distribution collapsed onto a single value.
  // A missing time counts as NEUTRAL, not as absent.
  //
  // The first version withheld the bonus when either side gave no time, which
  // ranked a pair seven hours apart *above* a pair with no times at all. That is
  // backwards: silence is uninformative, whereas 21:00 against 04:00 is evidence
  // these were two different sightings that night. Substituting the midpoint puts
  // the three cases in the right order, and the ordering is asserted in the tests
  // rather than left to be rediscovered.
  const timeFactor = time_proximity ?? 0.5;

  // Weights sum to 0.97, deliberately short of 1. The previous formulation summed
  // to exactly 1 and clamped, so 93,001 pairs pinned at the top and no ranking
  // was possible precisely where the auto-link decision gets made.
  const score =
    0.48 * date +
    0.30 * place +
    0.07 * (location_similarity ?? 0) +
    0.09 * timeFactor +
    (shape_agrees ? 0.03 : 0);

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
  const keys: string[] = [];

  // The name key is emitted for EVERY record, not only those lacking
  // coordinates. Measured: keying coordinate records on the grid alone and
  // coordinate-less ones on the name alone meant the two populations could never
  // meet, which accounted for 44% of the true pairs blocking could not reach
  // (7,078 of 16,076). 8% of UFOCAT has no coordinates and much more of the older
  // material, so that was a large hole shaped like an implementation detail.
  //
  // It also catches pairs where one record's coordinates are simply wrong.
  // UFOCAT holds SANDWICH at both -1.339 and +1.34 longitude, 186km apart and
  // one of them a sign error; the grid can never reconcile that, and the
  // identical place name reconciles it immediately.
  const place = normalizePlace(r.location_raw).split(" ")[0];
  if (place) keys.push(`${year}|name:${place}`);

  if (r.lat !== null && r.lng !== null) {
    const baseLat = Math.floor(r.lat);
    const baseLng = Math.floor(r.lng);

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        keys.push(`${year}|${baseLat + dLat},${baseLng + dLng}`);
      }
    }
  }

  return keys;
}

/**
 * Two classes of unreachable pair are left alone on purpose.
 *
 * **Sources disagreeing on the year** (3,485 pairs, 22% of the gap). Adding
 * adjacent-year blocks would not help, because the date gate correctly refuses a
 * pair a year apart: two reports twelve months apart are two events, and CUFOS
 * only linked these using specific knowledge of particular cases. That is
 * judgement, and automating it would trade a real gain for a class of silent
 * error we have no way to audit.
 *
 * **Coordinates more than 200km apart** (3,435 pairs, 21%). Some are the sign
 * errors described above and the name key now catches those. The rest are pairs
 * like CHEREPOVETS and CHAROVSK, 127km apart on the same day, which CUFOS placed
 * in one case. Under our model those are not duplicates at all: they are two
 * events in a wave, which is a separate relation with its own table. Refusing to
 * merge them is the correct answer rather than a miss.
 */


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
