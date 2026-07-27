/**
 * The dossier: the only thing the writer is ever allowed to see.
 *
 * Before this existed, the drafting stage received a YouTube title and
 * description and was asked to write four sections from them. Nothing in that
 * material describes a single frame of footage, so the model filled "what the
 * footage shows" from the stereotype of what a UFO video contains. All four
 * accounts drafted from the Las Vegas 2023 case invented it, one of them
 * describing an object crossing the night sky when the video shows figures in
 * a backyard, and the validator passed three of them without a single warning.
 *
 * The structural fix is not a firmer instruction. It is to change what the
 * writer receives. A dossier is a list of facts, each carrying the sources
 * that asserted it, and the writer gets that and nothing else: no raw
 * metadata, no search results, no ability to look anything up. Three
 * consequences follow, and they are the point.
 *
 * 1. A section with no supporting facts cannot be written, because there is
 *    nothing to write it from. Absence becomes visible instead of being
 *    smoothed over.
 * 2. Every sentence in the account is checkable against a specific fact, so
 *    the validator can treat "this is not in the dossier" as an error rather
 *    than guessing at stray numbers and proper nouns.
 * 3. A fact asserted by three independent sources is distinguishable from one
 *    asserted by a single anonymous upload, and the writer is told which is
 *    which. That mirrors the clusterer, where `source_count` counts
 *    publications rather than records, because five rows from one database is
 *    not corroboration and three rows from three is.
 *
 * The tier on a source is doing editorial work, not decoration. An `uploader`
 * or `anonymous` source can only ever produce a claim, never an observation,
 * which is the rule in AGENTS.md expressed as data instead of as a sentence in
 * a prompt that an 8B model forgets by paragraph four.
 */

/**
 * How much weight a source carries, and what it is capable of establishing.
 *
 * Ordered from strongest to weakest. Nothing here is about whether a source is
 * telling the truth; it is about what kind of statement it can support. A
 * government release can establish that a document exists. An anonymous upload
 * can only establish that somebody said something.
 */
export type SourceTier =
  /** Government body, agency, court, official record. */
  | "official"
  /** A named news organisation. */
  | "press"
  /** Reference works and our own vetted set: Wikipedia, Wikidata, known-events. */
  | "reference"
  /** The person who posted the material, describing their own material. */
  | "uploader"
  /** An account with no identifiable person behind it. */
  | "anonymous";

/** Tiers whose statements are always claims, never observations. */
const CLAIM_ONLY_TIERS: ReadonlySet<SourceTier> = new Set<SourceTier>([
  "uploader",
  "anonymous",
]);

export interface DossierSource {
  /** Shown in the account's source list, so it must be readable as-is. */
  name: string;
  url?: string;
  tier: SourceTier;
  /** When we fetched it. Sources change under us; the archive should know. */
  retrieved_at?: string;
}

/**
 * What a fact is about, which decides which section of the account it can
 * feed. A fact of a kind the account has no section for is still worth
 * holding, because it may become a source line or an update later.
 */
export type FactKind =
  /** Describes what the material visibly shows. Only this kind can support
   *  "what the footage shows", and only a source that actually saw it. */
  | "footage"
  /** When the event happened. Carries a normalised value so agreement between
   *  sources is checkable rather than a matter of wording. */
  | "event_date"
  /** Where it happened. Same reason for the normalised value. */
  | "location"
  /** Somebody asserts something. Always attributed, never asserted by us. */
  | "claim"
  /** An authority stated, released, confirmed or denied something. */
  | "official"
  /** A proposed conventional cause, from anyone. */
  | "explanation"
  /** Background that does not fit the above but belongs in the record. */
  | "context";

export type DatePrecision = "day" | "month" | "year" | "unknown";

export interface Fact {
  kind: FactKind;
  /** The fact in one plain sentence. This is the text the writer works from. */
  statement: string;
  /**
   * Normalised value for the kinds where agreement can be computed
   * mechanically: an ISO date for `event_date`, a place string for
   * `location`. Absent for prose facts, where agreement is decided by a human
   * or by the matcher, not by string equality.
   */
  value?: string;
  /** For `event_date`, how exact `value` actually is. */
  precision?: DatePrecision;
  /** Who is making the claim. Required in practice for `claim` facts. */
  attributed_to?: string;
  /** Every source that asserted this. Length is not corroboration; see below. */
  sources: DossierSource[];
}

export interface DossierMedia {
  kind: "video" | "image" | "document";
  url: string;
  /** What this specific piece of media is, in our words, not the uploader's. */
  description: string;
  source: DossierSource;
}

export interface Dossier {
  /** A short handle for logs and the admin panel. Never published. */
  subject: string;
  facts: Fact[];
  media: DossierMedia[];
  /**
   * Questions enrichment asked and could not answer. These are not failures
   * to hide: they are the raw material for "what remains unknown", and having
   * them written down is what stops that section being padded.
   */
  unresolved: string[];
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

export function createDossier(subject: string): Dossier {
  return { subject, facts: [], media: [], unresolved: [] };
}

/** Loose normalisation, used only for deciding whether two facts are the same. */
function mergeKey(fact: Fact): string {
  const basis = fact.value ?? fact.statement;
  return [
    fact.kind,
    basis
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim(),
  ].join("|");
}

/**
 * Adds a fact, merging it into an existing one where the two say the same
 * thing.
 *
 * Merging is what turns a pile of search results into corroboration. If
 * Wikidata and a news article both give 30 April 2023, that is one fact with
 * two sources, not two facts, and the difference is the entire claim we make
 * to readers about independent confirmation.
 *
 * Facts carrying a normalised `value` merge on that value, so two sources
 * wording a date differently still agree. Prose facts merge only on near
 * identical text, which is deliberately conservative: wrongly merging two
 * different statements would manufacture agreement that nobody expressed.
 */
export function addFact(dossier: Dossier, fact: Fact): Dossier {
  const key = mergeKey(fact);
  const existing = dossier.facts.find((f) => mergeKey(f) === key);

  if (!existing) {
    dossier.facts.push({ ...fact, sources: [...fact.sources] });
    return dossier;
  }

  for (const source of fact.sources) {
    const already = existing.sources.some(
      (s) => s.name === source.name && s.url === source.url,
    );
    if (!already) existing.sources.push(source);
  }

  // Prefer the more precise date when two sources agree on the same day but
  // one of them only knew the month. Never the other way round.
  if (fact.precision && existing.precision) {
    const rank: Record<DatePrecision, number> = {
      day: 3,
      month: 2,
      year: 1,
      unknown: 0,
    };
    if (rank[fact.precision] > rank[existing.precision]) {
      existing.precision = fact.precision;
      existing.value = fact.value ?? existing.value;
      existing.statement = fact.statement;
    }
  }

  return dossier;
}

/**
 * A dossier from one deliberately supplied document.
 *
 * This is the path for material a person chose and handed over: an AARO case
 * resolution PDF, a news article, a transcript. It differs from the YouTube
 * path in one respect that matters, which is that somebody decided this
 * document is about this event, so its text is treated as reporting rather
 * than as an uploader's pitch.
 *
 * The tier is still explicit and still decides whether the document can
 * establish what the footage shows. A government resolution report describing
 * a sensor image can. A forum post cannot, however carefully it is written.
 */
export function dossierFromDocument(
  source: DossierSource,
  text: string,
  options: { subject?: string; describesFootage?: boolean } = {},
): Dossier {
  const dossier = createDossier(options.subject ?? source.name);
  const body = text.trim();
  if (!body) return dossier;

  const canDescribe =
    options.describesFootage ??
    (source.tier === "official" || source.tier === "press");

  addFact(dossier, {
    kind: canDescribe ? "footage" : "claim",
    statement: `${source.name} provides the following material: ${body}`,
    attributed_to: canDescribe ? undefined : source.name,
    sources: [source],
  });

  return dossier;
}

/**
 * Combines the dossiers of records judged to describe one event.
 *
 * This is where corroboration actually appears. Four videos of the Las Vegas
 * 2023 case were drafted separately and three of them never learned the date,
 * while a fourth carried "around midnight on April 30" in its description. Fed
 * through here, that date arrives as one fact carrying every source that
 * asserted it, and `addFact` does the counting.
 *
 * Nothing is invented by merging and nothing is discarded. Where two sources
 * disagree, both statements survive as separate facts, because the archive's
 * job is to show that the sources disagree rather than to pick a winner.
 */
export function mergeDossiers(subject: string, parts: Dossier[]): Dossier {
  const merged = createDossier(subject);

  for (const part of parts) {
    for (const fact of part.facts) addFact(merged, fact);
    for (const media of part.media) addMedia(merged, media);
    for (const question of part.unresolved) addUnresolved(merged, question);
  }

  // A question one source could not answer is not open if another answered it.
  // Leaving it in would tell the reader we do not know something we do.
  merged.unresolved = merged.unresolved.filter((question) => {
    if (/described what is visible/i.test(question)) {
      return !hasFootageDescription(merged);
    }
    return true;
  });

  return merged;
}

export function addMedia(dossier: Dossier, media: DossierMedia): Dossier {
  if (!dossier.media.some((m) => m.url === media.url)) dossier.media.push(media);
  return dossier;
}

export function addUnresolved(dossier: Dossier, question: string): Dossier {
  if (!dossier.unresolved.includes(question)) dossier.unresolved.push(question);
  return dossier;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function factsOfKind(dossier: Dossier, kind: FactKind): Fact[] {
  return dossier.facts.filter((f) => f.kind === kind);
}

/**
 * How many independent sources assert a fact.
 *
 * Counted by distinct source name, not by entry, for the same reason the
 * clusterer counts publications rather than records. Three articles
 * syndicated from one wire service, or five rows from one database, are one
 * source saying something once.
 */
export function corroboration(fact: Fact): number {
  return new Set(fact.sources.map((s) => s.name)).size;
}

/** Whether a fact rests only on people describing their own material. */
export function isClaimOnly(fact: Fact): boolean {
  return fact.sources.every((s) => CLAIM_ONLY_TIERS.has(s.tier));
}

/**
 * Whether anything in the dossier actually describes the footage.
 *
 * This is the single check that would have stopped the Las Vegas drafts. A
 * `footage` fact from an uploader does not count: an uploader saying their
 * clip shows an alien craft is a claim about the footage, not a description of
 * it, and that distinction is the whole editorial position.
 */
export function hasFootageDescription(dossier: Dossier): boolean {
  return factsOfKind(dossier, "footage").some((f) => !isClaimOnly(f));
}

const PRECISION_RANK: Record<DatePrecision, number> = {
  day: 3,
  month: 2,
  year: 1,
  unknown: 0,
};

/**
 * How much a tier is trusted to know when something happened.
 *
 * Not a judgement of honesty. An uploader knows exactly when they posted a
 * video and frequently puts that date in the title, which is a real date about
 * the wrong thing.
 */
const TIER_RANK: Record<SourceTier, number> = {
  official: 4,
  reference: 3,
  press: 2,
  uploader: 1,
  anonymous: 0,
};

function bestTier(fact: Fact): number {
  return Math.max(0, ...fact.sources.map((s) => TIER_RANK[s.tier] ?? 0));
}

/**
 * The best supported event date.
 *
 * Ranked by how many sources agree, then by precision, then by the earliest.
 *
 * Corroboration leads because of Socorro: taking the earliest date alone put
 * it at 23 April 1964 when the event was the 24th and most of its 55 sources
 * said so, and being wrong about the best documented case in the archive is
 * the first thing an informed reader would check.
 *
 * Precision breaks the tie because otherwise a vague date beats an exact one.
 * A year-only date is stored as 1 January by convention, so "2023" competing
 * against "30 April 2023" would win on the earliest-date rule and silently
 * discard the better answer. That is the exact failure the Las Vegas drafts
 * showed, where one source gave the day and the account published the year.
 *
 * The result is always a date some source actually named, never an average.
 * Averaging 20 and 22 December produces the 21st, a day nobody reported.
 */
export function consensusDate(
  dossier: Dossier,
): { value: string; precision: DatePrecision; sources: number } | null {
  const dated = factsOfKind(dossier, "event_date").filter((f) => f.value);
  if (dated.length === 0) return null;

  const best = [...dated].sort((a, b) => {
    const bySources = corroboration(b) - corroboration(a);
    if (bySources !== 0) return bySources;

    // Tier before precision, and the Rendlesham cluster is why. A podcast
    // episode titled "December 24, 2023 - #1027" yields a day-precise date
    // that is the episode's date, not the event's. Wikipedia gives December
    // 1980, which is correct and less precise. Ranking on precision alone
    // published the podcast's own release date as the date of a 1980 event.
    const byTier = bestTier(b) - bestTier(a);
    if (byTier !== 0) return byTier;

    const byPrecision =
      PRECISION_RANK[b.precision ?? "unknown"] -
      PRECISION_RANK[a.precision ?? "unknown"];
    if (byPrecision !== 0) return byPrecision;

    return String(a.value).localeCompare(String(b.value));
  })[0];

  return {
    value: String(best.value),
    precision: best.precision ?? "unknown",
    sources: corroboration(best),
  };
}

/** Counts for the admin panel and the run log, so thin dossiers are visible. */
export function summarise(dossier: Dossier) {
  const bySource = new Set(
    dossier.facts.flatMap((f) => f.sources.map((s) => s.name)),
  );
  return {
    facts: dossier.facts.length,
    sources: bySource.size,
    corroborated: dossier.facts.filter((f) => corroboration(f) > 1).length,
    describes_footage: hasFootageDescription(dossier),
    media: dossier.media.length,
    unresolved: dossier.unresolved.length,
  };
}

// ---------------------------------------------------------------------------
// Rendering for the writer
// ---------------------------------------------------------------------------

const KIND_HEADINGS: Record<FactKind, string> = {
  footage: "WHAT THE MATERIAL VISIBLY SHOWS",
  event_date: "WHEN",
  location: "WHERE",
  claim: "WHAT PEOPLE CLAIM (these are claims, never observations)",
  official: "WHAT AUTHORITIES HAVE STATED",
  explanation: "PROPOSED CONVENTIONAL EXPLANATIONS",
  context: "BACKGROUND",
};

const KIND_ORDER: FactKind[] = [
  "event_date",
  "location",
  "footage",
  "claim",
  "official",
  "explanation",
  "context",
];

function renderFact(fact: Fact): string {
  const names = [...new Set(fact.sources.map((s) => s.name))];
  const agreement =
    names.length > 1
      ? ` [confirmed independently by ${names.length} sources: ${names.join("; ")}]`
      : ` [single source: ${names[0] ?? "unknown"}]`;

  const attribution = fact.attributed_to ? ` (stated by ${fact.attributed_to})` : "";
  return `- ${fact.statement}${attribution}${agreement}`;
}

/**
 * The dossier as the writer sees it.
 *
 * Every empty section is stated as empty rather than omitted. An omitted
 * heading reads as an oversight and invites the model to be helpful; an
 * explicit "nothing in the material describes this" is an instruction it can
 * follow, and it is also the literal truth we want printed on the page.
 */
export function renderForPrompt(dossier: Dossier): string {
  const blocks: string[] = ["DOSSIER BEGINS"];

  for (const kind of KIND_ORDER) {
    const facts = factsOfKind(dossier, kind);
    blocks.push(`\n${KIND_HEADINGS[kind]}`);

    if (facts.length === 0) {
      blocks.push(
        kind === "footage"
          ? "  NOTHING IN THE MATERIAL DESCRIBES THE FOOTAGE. Nobody has told us what is visible. Do not describe it. Say that it has not been described and move the question to what remains unknown."
          : "  (nothing established)",
      );
      continue;
    }

    for (const fact of facts) blocks.push(renderFact(fact));
  }

  if (dossier.media.length > 0) {
    blocks.push("\nMEDIA HELD");
    for (const m of dossier.media) {
      blocks.push(`- ${m.kind}: ${m.description} [${m.source.name}]`);
    }
  }

  if (dossier.unresolved.length > 0) {
    blocks.push("\nQUESTIONS RESEARCH COULD NOT ANSWER");
    for (const q of dossier.unresolved) blocks.push(`- ${q}`);
    blocks.push(
      "  These belong in what remains unknown. They were looked for and not found, which is worth saying plainly.",
    );
  }

  blocks.push("\nDOSSIER ENDS");
  return blocks.join("\n");
}

/**
 * Everything the validator checks the account against.
 *
 * Deliberately not the rendered prompt: that carries headings and
 * instructions, and matching account text against our own instruction wording
 * would let a phrase from the scaffolding count as grounding.
 */
export function groundingText(dossier: Dossier): string {
  return [
    ...dossier.facts.map((f) =>
      [f.statement, f.value, f.attributed_to, ...f.sources.map((s) => s.name)]
        .filter(Boolean)
        .join(" "),
    ),
    ...dossier.media.map((m) => m.description),
    ...dossier.unresolved,
  ].join("\n");
}
