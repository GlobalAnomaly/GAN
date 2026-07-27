/**
 * Deciding when two videos are about the same event.
 *
 * The inbox held four videos of the Las Vegas 2023 case and drafted four
 * separate accounts. One of them, from KENS 5, carried "around midnight on
 * April 30" in its description. The other three said the date was 2023, or
 * "last year", or nothing. The archive already held the answer and never
 * looked at itself.
 *
 * This is a sibling of `src/lib/ingest/match.ts` rather than a reuse of it,
 * because the available signals are not the same. UFOCAT records block on
 * coordinates and score on distance; YouTube candidates have no coordinates at
 * all, so that matcher would send every pair to review. What videos do have is
 * a title and a description, and two videos of one event share distinctive
 * wording.
 *
 * Two ideas carry the weight.
 *
 * **Dates are intervals, not points.** The UFOCAT matcher compares dates as
 * days apart, which is right when every source names a day. Here precision
 * varies wildly: KENS 5 gives 30 April 2023, NewsNation gives 2023. Treated as
 * points those are 119 days apart and no match. Treated as intervals, "2023"
 * spans the year and contains 30 April, so they are *compatible*, which is the
 * honest reading. Only genuinely disjoint intervals refuse a match, which is
 * what correctly keeps the unrelated "Las Vegas 2021" aeroplane clip out.
 *
 * **Rare words carry the signal, and rarity is measured rather than guessed.**
 * Every title in this corpus says "UFO", so "UFO" discriminates nothing. A
 * hand-written stopword list would have to guess which words those are, and
 * would be wrong for the next batch. Weighting each term by how rare it is
 * across the candidate set does it automatically: "ufo" collapses toward zero,
 * "vegas" and "backyard" carry real weight, and the list needs no maintenance.
 *
 * The thresholds stay asymmetric for the reason `AGENTS.md` gives: a missed
 * link costs a corroboration, while a wrong one puts the wrong video under a
 * sourced account.
 */

export type DatePrecision = "day" | "month" | "year" | "unknown";

export interface MatchableCandidate {
  id: string;
  title: string;
  description: string;
  /** Best date the dossier established, or null. */
  occurred_at: string | null;
  date_precision: DatePrecision;
  /** The channel. Two videos from one channel corroborate less than two from two. */
  source_key: string;
}

export interface CandidateSignals {
  /** Whether the two date intervals can describe the same event. */
  dates_compatible: boolean;
  /** How tightly they agree, 0 to 1. Null when either side has no date. */
  date_tightness: number | null;
  /** Weighted overlap of distinctive terms, 0 to 1. */
  term_overlap: number;
  /** The rare words both used, for showing a reviewer why. */
  shared_terms: string[];
  same_source: boolean;
}

export interface ScoredCandidatePair {
  score: number;
  signals: CandidateSignals;
  action: "link" | "suggest" | "ignore";
}

/**
 * Deliberately high. Below this a pair is shown to a person rather than
 * merged, because merging two different events destroys both silently and
 * nobody ever finds out.
 */
export const LINK_THRESHOLD = 0.72;
export const SUGGEST_THRESHOLD = 0.4;

// ---------------------------------------------------------------------------
// Dates as intervals
// ---------------------------------------------------------------------------

/** Inclusive [start, end] in milliseconds for a date at a given precision. */
export function dateInterval(
  value: string | null,
  precision: DatePrecision,
): [number, number] | null {
  if (!value || precision === "unknown") return null;

  const [y, m, d] = value.split("-").map(Number);
  if (!Number.isFinite(y)) return null;

  if (precision === "year") {
    return [Date.UTC(y, 0, 1), Date.UTC(y, 11, 31, 23, 59, 59)];
  }
  if (precision === "month") {
    return [Date.UTC(y, (m || 1) - 1, 1), Date.UTC(y, m || 1, 0, 23, 59, 59)];
  }
  return [Date.UTC(y, (m || 1) - 1, d || 1), Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59)];
}

const DAY = 86_400_000;

/**
 * How well two date intervals agree.
 *
 * Returns null when either side has no date, which is uninformative rather
 * than negative. Returns 0 when they are disjoint, which is evidence against.
 * Between those, tighter intervals that overlap score higher, so two sources
 * naming the same day beat one naming a day and one naming the year.
 */
export function dateAgreement(
  a: [number, number] | null,
  b: [number, number] | null,
): number | null {
  if (!a || !b) return null;

  const overlapStart = Math.max(a[0], b[0]);
  const overlapEnd = Math.min(a[1], b[1]);

  if (overlapStart > overlapEnd) {
    // Disjoint, but allow a two day grace: an evening event is reported the
    // next morning, and sources disagree about which day that was.
    const gap = overlapStart - overlapEnd;
    return gap <= 2 * DAY ? 0.5 : 0;
  }

  // Both narrow and overlapping is the strongest case. The span used is the
  // wider of the two, so a precise date paired with a vague one is scored on
  // the vague one, which is the weaker claim and the honest basis.
  const widest = Math.max(a[1] - a[0], b[1] - b[0]) + DAY;
  return Math.max(0.55, Math.min(1, (30 * DAY) / widest));
}

// ---------------------------------------------------------------------------
// Distinctive terms
// ---------------------------------------------------------------------------

/** Structural words that never carry meaning about an event. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "was", "were", "are",
  "his", "her", "its", "you", "your", "our", "not", "but", "all", "can",
  "has", "have", "had", "what", "when", "where", "who", "why", "how", "new",
  "видео", "over", "into", "out", "off", "about", "after", "before", "more",
  "most", "some", "than", "then", "they", "them", "there", "here", "been",
  "will", "would", "could", "should", "just", "very", "also", "any", "one",
  "two", "watch", "video", "videos", "footage", "caught", "camera", "shorts",
  "subscribe", "channel", "full", "part", "https", "http", "www", "com",
]);

/**
 * Rarity is a bad proxy for importance on its own, and this is the guard.
 *
 * A URL fragment such as "73b667fa" or "63a8a626582b" is maximally rare and
 * completely meaningless. Left in, those crowd genuine discriminators out of
 * the fingerprint: the first run pushed "vegas" out of a Las Vegas video in
 * favour of an article slug's hex.
 */
function isJunk(token: string): boolean {
  if (token.length > 18) return true;
  if (/\d/.test(token) && /[a-z]/.test(token)) return true;
  if (/^[0-9a-f]{6,}$/.test(token)) return true;
  return false;
}

/**
 * Crude plural stripping, which is enough here.
 *
 * "creature" and "creatures" are the same signal, and one video says one while
 * the next says the other. A full stemmer would be more than this needs and
 * would bring its own surprises on place names.
 */
function singular(token: string): string {
  // Only a trailing "s" comes off. An earlier version also stripped "es",
  // which turned "creatures" into "creatur" while leaving "creature" alone, so
  // the two forms it existed to unify still did not match.
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenize(text: string): string[] {
  const words = (text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !isJunk(w))
    .map(singular);

  // Adjacent pairs as well as single words. "las vegas" is a far stronger
  // signal than "las" and "vegas" separately, because the pair names a place
  // while the parts are noise that happens to co-occur.
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  return [...words, ...bigrams];
}

/**
 * Inverse document frequency across the candidate set.
 *
 * This is what makes "ufo" worthless and "vegas" valuable without anyone
 * maintaining a list. A term in nearly every candidate approaches zero; a term
 * in a handful approaches one.
 */
export function termWeights(corpus: string[]): Map<string, number> {
  const documents = corpus.length || 1;
  const appearances = new Map<string, number>();

  for (const text of corpus) {
    for (const term of new Set(tokenize(text))) {
      appearances.set(term, (appearances.get(term) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [term, count] of appearances) {
    // Normalised so the rarest term in any corpus lands near 1.
    weights.set(term, Math.log(documents / count) / Math.log(documents));
  }
  return weights;
}

/**
 * Shared rare-word mass, measured absolutely rather than as a proportion.
 *
 * Two earlier attempts failed in opposite directions and both failures were
 * instructive.
 *
 * Scoring the proportion of all terms shared drowned the signal: the Las Vegas
 * videos agree on "las vegas", "alien" and "backyard" and disagree on forty
 * words of unrelated description, so the ratio was tiny for a genuine match.
 *
 * Reducing each document to its rarest terms first was worse, and backwards.
 * Selecting by rarity selects terms unique to one document, and a term unique
 * to one document can never be shared with another. The rarest words in a
 * title are precisely the ones that will not match.
 *
 * What actually indicates a match is the absolute weight of what two
 * candidates agree on. Sharing "las vegas", "alien" and "backyard" is
 * evidence, and it stays evidence whether the descriptions around them run to
 * ten words or a thousand. So the shared weight is summed and compared against
 * a fixed target rather than against either document's length.
 *
 * Title agreement counts in full, description-only agreement at a fraction of
 * that. A channel's stock description binds its own uploads together, and it
 * was what clustered eight unrelated compilations on the first run, while a
 * title is short and chosen to say what the clip actually is.
 */
const TARGET_SHARED_WEIGHT = 2.2;
const DESCRIPTION_DISCOUNT = 0.3;

function sharedMass(
  aTitle: Set<string>,
  aAll: Set<string>,
  bTitle: Set<string>,
  bAll: Set<string>,
  weights: Map<string, number>,
): { score: number; shared: string[] } {
  const shared: { term: string; weight: number }[] = [];
  let total = 0;

  for (const term of aAll) {
    if (!bAll.has(term)) continue;
    const weight = weights.get(term) ?? 1;
    // A term in nearly every candidate tells us nothing, and summing many of
    // them would eventually clear any bar.
    if (weight < 0.25) continue;

    const inBothTitles = aTitle.has(term) && bTitle.has(term);
    const contribution = weight * (inBothTitles ? 1 : DESCRIPTION_DISCOUNT);
    total += contribution;
    shared.push({ term, weight: contribution });
  }

  return {
    score: Math.min(1, total / TARGET_SHARED_WEIGHT),
    shared: shared
      .sort((x, y) => y.weight - x.weight)
      .slice(0, 8)
      .map((s) => s.term),
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * The words a candidate is about.
 *
 * `description` is expected to have been through `cleanDescription` already.
 * Passing the raw text clusters on channel furniture instead of on events:
 * the first run over the real inbox grouped twelve unrelated compilations
 * because they shared "copylink", "postshare" and "utm" from a share widget.
 */
function termsOf(candidate: MatchableCandidate): Set<string> {
  return new Set([
    ...tokenize(candidate.title),
    ...tokenize((candidate.description ?? "").slice(0, 600)),
  ]);
}

/**
 * The title alone, which is what the video is declared to be about.
 *
 * Kept separate because a title is short and chosen, while a description is
 * long and mostly furniture. Two videos of one event agree in the title far
 * more reliably than anywhere else.
 */
function titleTermsOf(candidate: MatchableCandidate): Set<string> {
  return new Set(tokenize(candidate.title));
}

export function scoreCandidatePair(
  a: MatchableCandidate,
  b: MatchableCandidate,
  weights: Map<string, number>,
): ScoredCandidatePair {
  const agreement = dateAgreement(
    dateInterval(a.occurred_at, a.date_precision),
    dateInterval(b.occurred_at, b.date_precision),
  );

  const { score: overlap, shared } = sharedMass(
    titleTermsOf(a),
    termsOf(a),
    titleTermsOf(b),
    termsOf(b),
    weights,
  );

  const sameSource = a.source_key === b.source_key;

  const signals: CandidateSignals = {
    dates_compatible: agreement === null || agreement > 0,
    date_tightness: agreement,
    term_overlap: overlap,
    shared_terms: shared,
    same_source: sameSource,
  };

  // A hard gate. Two sources placing an event in different years are not
  // describing one event, whatever words they share, and this is what keeps
  // "Lightning reveals dark-UFO near airplane Las Vegas 2021" away from the
  // 2023 backyard case despite both being Las Vegas UFO videos.
  if (agreement === 0) {
    return { score: 0, signals, action: "ignore" };
  }

  // A single shared word is a coincidence. Requiring two stops a title of one
  // word matching everything, which is how twenty-four unrelated clips called
  // "test" became one cluster on the first run.
  if (shared.length < 2) {
    return { score: 0, signals, action: "ignore" };
  }

  // Wording carries most of the weight, because it is the only signal always
  // present. A date, when both sides have one, confirms rather than decides.
  let score = 0.7 * overlap + 0.3 * (agreement ?? 0.5);

  // One channel's own boilerplate binds its own uploads together, which is how
  // eight unrelated compilations from one uploader clustered. It is also the
  // weaker claim editorially: `source_count` counts publications precisely
  // because five records from one publisher is not corroboration.
  if (sameSource) score *= 0.75;

  let action: ScoredCandidatePair["action"] =
    score >= LINK_THRESHOLD
      ? "link"
      : score >= SUGGEST_THRESHOLD
        ? "suggest"
        : "ignore";

  // A pair with no date on one side can never merge on its own.
  //
  // Found by running this over the real inbox: "Lightning reveals dark-UFO
  // near airplane Las Vegas 2021" linked to "Original Video of Las Vegas
  // family entering backyard" at 0.79, on the strength of "las vegas" alone,
  // because the second video establishes no date so the year gate never fired.
  // They are two different events in one city, three years apart.
  //
  // Without a date there is nothing left to separate two events at one place,
  // so a person decides. Same conclusion the UFOCAT matcher reached about
  // reports lacking coordinates, for the same reason: less evidence should
  // mean more human judgement, not more confident automation.
  if (action === "link" && agreement === null) action = "suggest";

  return { score, signals, action };
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export interface CandidateCluster {
  members: string[];
  /** Distinct channels. One channel posting five clips is not corroboration. */
  source_count: number;
  /** The rare words the group is built on, so a reviewer can judge it. */
  shared_terms: string[];
}

export interface CandidateMatchResult {
  clusters: CandidateCluster[];
  /** Pairs worth a person's attention but not confident enough to merge. */
  suggestions: { a: string; b: string; score: number; shared_terms: string[] }[];
}

/**
 * Groups candidates into events.
 *
 * Pairs are consumed strongest first, exactly as in `cluster.ts`, so confident
 * links shape a group before a marginal one can stretch it. The guard here is
 * against the same failure that module names: grouping is transitive while
 * matching is not, so A links B and B links C can drag in a C that A would
 * have refused.
 */
export function clusterCandidates(
  candidates: MatchableCandidate[],
): CandidateMatchResult {
  const weights = termWeights(
    candidates.map((c) => `${c.title} ${(c.description ?? "").slice(0, 600)}`),
  );

  const links: { a: string; b: string; score: number; shared: string[] }[] = [];
  const suggestions: CandidateMatchResult["suggestions"] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const scored = scoreCandidatePair(candidates[i], candidates[j], weights);
      if (scored.action === "ignore") continue;

      const entry = {
        a: candidates[i].id,
        b: candidates[j].id,
        score: scored.score,
        shared_terms: scored.signals.shared_terms,
      };

      if (scored.action === "link") {
        links.push({ ...entry, shared: scored.signals.shared_terms });
      } else {
        suggestions.push(entry);
      }
    }
  }

  links.sort((x, y) => y.score - x.score);

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) && parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };

  for (const c of candidates) parent.set(c.id, c.id);

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const groupTerms = new Map<string, Set<string>>();

  for (const link of links) {
    const rootA = find(link.a);
    const rootB = find(link.b);
    if (rootA === rootB) continue;

    parent.set(rootB, rootA);
    const terms = groupTerms.get(rootA) ?? new Set<string>();
    for (const t of link.shared) terms.add(t);
    for (const t of groupTerms.get(rootB) ?? []) terms.add(t);
    groupTerms.set(rootA, terms);
  }

  const members = new Map<string, string[]>();
  for (const c of candidates) {
    const root = find(c.id);
    members.set(root, [...(members.get(root) ?? []), c.id]);
  }

  const clusters: CandidateCluster[] = [...members.entries()].map(([root, ids]) => ({
    members: ids,
    source_count: new Set(ids.map((id) => byId.get(id)?.source_key)).size,
    shared_terms: [...(groupTerms.get(root) ?? [])].slice(0, 8),
  }));

  return {
    clusters: clusters.sort((a, b) => b.members.length - a.members.length),
    suggestions: suggestions.sort((a, b) => b.score - a.score),
  };
}
