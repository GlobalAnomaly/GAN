/**
 * Which candidates are worth spending a model call on, and in what order.
 *
 * The first overnight run drafted in fetch order and stopped at a ceiling of
 * 120. Two consequences, both avoidable:
 *
 * - **It drafted the wrong things.** Two of the 122 drafts were sports press
 *   conferences, because a run source reading "aaro press briefing" was sent
 *   to YouTube, which fuzzy matched AARO into Aaron and returned fifty videos
 *   about Aaron Rodgers, De'Aaron Fox and Aaron Rai. At roughly three minutes
 *   a draft that is real time spent on nothing.
 * - **It left the best thing undrafted.** The UFO Seekers video on the Las
 *   Vegas case carries the exact date in its own title, "(04/30/23)", and
 *   explains the relationship between the family's video and the police
 *   bodycam footage. It sat in the 255 that never got reached.
 *
 * So the score answers one question: given a fixed budget of model calls,
 * which candidates produce the best archive? That is not the same as which are
 * most interesting. A well documented case with a date, a place and a named
 * source produces a good entry; a shaky anonymous clip produces an honest but
 * nearly empty one, and both cost the same three minutes.
 *
 * The same scoring gates the enrichment backfill. 255,763 clusters at even
 * five seconds of lookups each is 355 hours, so something has to choose, and
 * choosing by evidence is the only defensible basis.
 */

import { tierForChannel } from "@/lib/bot/channel-registry";
import {
  consensusDate,
  corroboration,
  factsOfKind,
  hasFootageDescription,
  type Dossier,
} from "@/lib/bot/dossier";

export interface RelevanceInput {
  title: string;
  description: string;
  channel: string;
  duration_seconds: number | null;
  media_type: "youtube" | "short" | string;
  /** The dossier built for this candidate or its cluster. */
  dossier: Dossier;
  /** Distinct publications in its cluster, 1 when it stands alone. */
  source_count?: number;
}

export interface RelevanceResult {
  /** 0 to 1. Higher means draft it sooner. */
  score: number;
  /** Set when the candidate should not be drafted at all. */
  excluded: boolean;
  exclusion_reason: string | null;
  /** What earned or cost points, for the reviewer and the run log. */
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

/**
 * The vocabulary of this subject, broadly drawn.
 *
 * A candidate mentioning none of these is not about the archive's subject.
 * Deliberately wide: a genuine witness clip may never say "UFO" and will say
 * "strange lights", so the list covers how people actually describe these
 * things as well as the jargon.
 */
const DOMAIN_TERMS = [
  "ufo", "ufos", "uap", "alien", "aliens", "extraterrestrial", "unidentified",
  "anomalous", "sighting", "sightings", "saucer", "orb", "orbs", "craft",
  "disc", "disk", "triangle", "cigar", "abduction", "abducted", "encounter",
  "phenomena", "phenomenon", "mothership", "flying object", "strange light",
  "strange object", "unexplained", "night sky", "hovering", "roswell",
  "rendlesham", "area 51", "nonhuman", "non-human", "close encounter",
  "contactee", "crop circle", "men in black", "aaro", "nuforc", "mufon",
  "geipan", "blue book", "skinwalker", "interstellar", "fireball", "meteor",
  "drone", "drones", "balloon", "radar", "disclosure", "flying saucer",
];

/**
 * Matched on word boundaries, never as substrings.
 *
 * The first version used `includes`, and it reproduced the exact bug it was
 * written to fix: "aaro" is a substring of "Aaron", so the check meant to keep
 * Aaron Rodgers press conferences out was matching them in. "et " was worse,
 * catching any word ending in those letters. Fuzzy matching AARO into Aaron is
 * how fifty sports videos entered the inbox in the first place, and doing it
 * again inside the filter would have been an expensive joke.
 */
const DOMAIN_PATTERN = new RegExp(
  `(?:^|[^\\p{L}])(?:${DOMAIN_TERMS.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})(?![\\p{L}])`,
  "iu",
);

/**
 * Titles that describe a collection rather than an event.
 *
 * A compilation cannot become an archive entry: one entry cannot cite a reel
 * of thirty unrelated clips, and attributing any single claim in it is
 * impossible. Long-form still earns its place on well documented cases, so
 * this looks at the title rather than at duration alone.
 */
const COMPILATION_PATTERNS: RegExp[] = [
  /\b(compilation|megamix|mega mix|best of|top \d+|top ten)\b/i,
  /\bvol(?:ume)?\.?\s*\d+/i,
  /\bpart\s*\d+\s*(of|\/)\s*\d+/i,
  /\b\d+\s+(ufo|uap|alien)s?\s+(sightings?|videos?|clips?)\b/i,
  /\b(every|all)\s+.{0,20}\b(sightings?|encounters?)\s+(of|from)\s+\d{4}\b/i,
];

const JUNK_PATTERNS: RegExp[] = [
  /^\s*test\b/i,
  /\btest\s+\d{8}\b/i,
  /^\s*(untitled|new video|video \d+)\s*$/i,
];

function mentionsDomain(text: string): boolean {
  return DOMAIN_PATTERN.test(text);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Weights, and the reasoning behind the ordering.
 *
 * Evidence outranks everything, because evidence is what makes an entry worth
 * reading and what the editorial rules require. A description of the footage
 * is weighted highest of all: without one the account cannot have a "what the
 * footage shows" section at all, which is a quarter of the entry missing.
 */
const WEIGHTS = {
  describes_footage: 0.3,
  corroboration: 0.2,
  has_date: 0.15,
  has_place: 0.1,
  source_tier: 0.15,
  substance: 0.1,
} as const;

export function scoreRelevance(input: RelevanceInput): RelevanceResult {
  const reasons: string[] = [];
  const haystack = `${input.title} ${input.description ?? ""}`;

  // ---- Hard exclusions ---------------------------------------------------

  if (JUNK_PATTERNS.some((p) => p.test(input.title))) {
    return {
      score: 0,
      excluded: true,
      exclusion_reason: "The title looks like a test upload rather than material.",
      reasons: [],
    };
  }

  if (!mentionsDomain(haystack)) {
    return {
      score: 0,
      excluded: true,
      exclusion_reason:
        "Nothing in the title or description touches this archive's subject. " +
        "This is how fifty Aaron Rodgers press conferences reached the inbox.",
      reasons: [],
    };
  }

  if (COMPILATION_PATTERNS.some((p) => p.test(input.title))) {
    return {
      score: 0,
      excluded: true,
      exclusion_reason:
        "This looks like a compilation. One entry cannot cite a reel of unrelated " +
        "clips, and no claim in it can be attributed to anyone.",
      reasons: [],
    };
  }

  // ---- Evidence ----------------------------------------------------------

  let score = 0;

  if (hasFootageDescription(input.dossier)) {
    score += WEIGHTS.describes_footage;
    reasons.push("a source describes what the footage shows");
  }

  const sourceCount = input.source_count ?? 1;
  const bestCorroboration = Math.max(
    sourceCount,
    ...input.dossier.facts.map(corroboration),
    1,
  );
  if (bestCorroboration > 1) {
    // Two publications is the claim worth making; beyond three adds little.
    score += WEIGHTS.corroboration * Math.min(1, (bestCorroboration - 1) / 2);
    reasons.push(`${bestCorroboration} independent sources agree on something`);
  }

  const date = consensusDate(input.dossier);
  if (date) {
    // A day is worth more than a year, because a year cannot be cross-checked
    // against contemporaneous reporting and a day can.
    const precision = date.precision === "day" ? 1 : date.precision === "month" ? 0.7 : 0.4;
    score += WEIGHTS.has_date * precision;
    reasons.push(`the date is established to the ${date.precision}`);
  }

  if (factsOfKind(input.dossier, "location").length > 0) {
    score += WEIGHTS.has_place;
    reasons.push("a place is established");
  }

  // ---- Who is speaking ---------------------------------------------------

  const tier = tierForChannel(input.channel);
  const tierScore = { official: 1, press: 0.8, reference: 0.7, uploader: 0.35, anonymous: 0.1 };
  score += WEIGHTS.source_tier * tierScore[tier];
  if (tier === "official" || tier === "press") {
    reasons.push(`posted by a ${tier} source`);
  }

  // ---- Substance ---------------------------------------------------------

  const substantive = input.dossier.facts.filter(
    (f) => f.kind !== "context" && f.statement.length > 60,
  ).length;
  score += WEIGHTS.substance * Math.min(1, substantive / 4);

  // A Short from an uploader is the operator's preferred raw material, since
  // Shorts carry homemade footage while long videos are usually compilations.
  // Worth a nudge, not a weight: it says something about the format and
  // nothing about the evidence.
  if (input.media_type === "short" && tier === "uploader") {
    score += 0.03;
    reasons.push("a Short, which is where raw homemade footage lives");
  }

  // A long video from an unknown account, with no compilation marker in the
  // title, is the shape a compilation takes when it is not labelled as one.
  if ((input.duration_seconds ?? 0) > 1800 && tier === "uploader") {
    score -= 0.05;
    reasons.push("long, from an uploader, so possibly an unlabelled compilation");
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    excluded: false,
    exclusion_reason: null,
    reasons,
  };
}

/**
 * Orders candidates so the best material is drafted first.
 *
 * The ceiling that stops a run is a budget, not a filter, so what it cuts off
 * should be the weakest material rather than whatever the API happened to
 * return last.
 */
export function rankByRelevance<T extends { relevance: RelevanceResult }>(items: T[]): T[] {
  return [...items]
    .filter((item) => !item.relevance.excluded)
    .sort((a, b) => b.relevance.score - a.relevance.score);
}
