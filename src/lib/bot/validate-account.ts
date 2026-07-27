/**
 * The house-style and grounding validator.
 *
 * A local 8B model will break the editorial rules sometimes. Catching that by
 * eye across thousands of cases is not realistic, so the rules that can be
 * checked mechanically are checked mechanically, and the reviewer's attention
 * is spent on the judgement calls instead.
 *
 * Two severities:
 *   error  the draft must not reach the review inbox as-is
 *   warn   a human should look at this specific line
 *
 * The grounding check is a heuristic and says so. It flags numbers and proper
 * nouns that appear in the draft but not in the source, which is the shape
 * that invented altitudes, witness counts and place names take. False
 * positives are expected and are cheap; a missed invention is not.
 */

import type { DraftAccount } from "@/lib/bot/prompts";
import { hasFootageDescription, type Dossier } from "@/lib/bot/dossier";

export interface Finding {
  severity: "error" | "warn";
  rule: string;
  message: string;
  field?: string;
  excerpt?: string;
}

/** Phrasing that reads as machine-written to this audience. */
const STOCK_PHRASES = [
  "genuinely",
  "truly",
  "delve",
  "delving",
  "testament to",
  "tapestry",
  "underscore",
  "underscores",
  "boasts",
  "it's not just",
  "it is not just",
  "that's the",
  "in the realm of",
  "navigate the",
  "a testament",
  "sheds light on",
  "plays a crucial role",
  "it's worth noting",
  "it is worth noting",
];

/** Words that turn a plain headline into a tabloid one. */
const HYPE_WORDS = [
  "shocking",
  "shock",
  "incredible",
  "unbelievable",
  "stunning",
  "bombshell",
  "terrifying",
  "must see",
  "must-see",
  "finally revealed",
  "the truth about",
  "exposed",
  "insane",
  "mind-blowing",
];

/** Verbs that signal a claim is being attributed rather than asserted. */
const ATTRIBUTION_MARKERS = [
  "said",
  "says",
  "stated",
  "state",
  "reported",
  "reports",
  "described",
  "describes",
  "claimed",
  "claims",
  "told",
  "wrote",
  "according to",
  "testified",
  "recalled",
  "confirmed",
  "denied",
  "concluded",
  "assessed",
  "acknowledged",
  "announced",
  "quoted",
  "has said",
  "have said",
];

/**
 * Capitalised words that are not names.
 *
 * The grounding check looks for capitalised words absent from the source,
 * because that is the shape an invented name takes. But English capitalises
 * plenty of things that nobody invented: nationalities, months, weekdays,
 * ranks used generically. Flagging "British pathologist" as a possibly
 * fabricated person is noise, and noise is what makes a reviewer stop reading
 * the warnings at all.
 */
const NON_NAME_CAPITALS = new Set([
  // Nationalities, languages, regional adjectives
  "british", "american", "english", "scottish", "welsh", "irish", "french",
  "german", "italian", "spanish", "portuguese", "brazilian", "mexican",
  "canadian", "australian", "russian", "soviet", "chinese", "japanese",
  "korean", "indian", "iranian", "israeli", "egyptian", "turkish", "greek",
  "dutch", "belgian", "swiss", "swedish", "norwegian", "danish", "finnish",
  "polish", "chilean", "argentine", "argentinian", "peruvian", "colombian",
  "zimbabwean", "african", "european", "asian", "latin", "nordic", "arab",
  "western", "eastern", "northern", "southern", "central",
  // Months and weekdays
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  // Ranks and roles that appear capitalised mid-sentence
  "major", "colonel", "captain", "lieutenant", "commander", "sergeant",
  "general", "admiral", "officer", "professor", "doctor", "sir", "dame",
  "lord", "president", "minister", "secretary", "chief", "deputy",
  // Generic capitalised nouns that recur in this material
  "air", "force", "army", "navy", "government", "ministry", "department",
  "state", "national", "federal", "royal", "united", "states", "kingdom",
  "earth", "moon", "sun", "god", "christmas", "world", "war",
]);

/** Words that start a sentence and so tell us nothing about proper nouns. */
const SENTENCE_STARTERS = new Set([
  "the", "a", "an", "in", "on", "at", "no", "not", "there", "this", "that",
  "these", "those", "it", "its", "he", "she", "they", "we", "his", "her",
  "their", "what", "when", "where", "who", "why", "how", "if", "as", "by",
  "for", "from", "several", "some", "many", "most", "other", "others",
  "witnesses", "witness", "officials", "official", "after", "before",
  "during", "because", "although", "while", "since", "both", "neither",
  "either", "none", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "and", "but", "or", "so", "then", "later",
]);

const NUMBER_WORDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "twenty", "thirty", "forty", "fifty", "sixty",
  "seventy", "eighty", "ninety", "hundred", "thousand", "dozen",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}\s'"-]/gu, " ")
    .replace(/\s+/g, " ");
}

const BODY_FIELDS: (keyof DraftAccount)[] = [
  "body_footage",
  "body_testimony",
  "body_status",
  "body_unknown",
];

function bodyText(account: DraftAccount): string {
  return BODY_FIELDS.map((f) => String(account[f] ?? "")).join("\n\n");
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkEmDashes(account: DraftAccount, findings: Finding[]) {
  for (const [field, value] of Object.entries(account)) {
    if (typeof value !== "string") continue;
    // En dash counts too: it is the same tell and reads as the same habit.
    const match = /[\u2014\u2013]/.exec(value);
    if (match) {
      const at = match.index;
      findings.push({
        severity: "error",
        rule: "no-em-dash",
        field,
        message:
          "Em or en dash found. Use a comma, a colon, parentheses, or two sentences.",
        excerpt: value.slice(Math.max(0, at - 40), at + 40).trim(),
      });
    }
  }
}

function checkStockPhrases(account: DraftAccount, findings: Finding[]) {
  const text = normalize(bodyText(account) + " " + account.headline);
  for (const phrase of STOCK_PHRASES) {
    if (text.includes(phrase)) {
      findings.push({
        severity: "warn",
        rule: "stock-phrasing",
        message: `Stock AI phrasing: "${phrase}". Rewrite it plainly.`,
      });
    }
  }
}

function checkRequiredSections(account: DraftAccount, findings: Finding[]) {
  for (const field of BODY_FIELDS) {
    const value = String(account[field] ?? "").trim();
    if (value.length === 0) {
      findings.push({
        severity: "error",
        rule: "missing-section",
        field,
        message: `${field} is empty. Every account has all four parts.`,
      });
    }
  }

  const unknown = String(account.body_unknown ?? "").trim();
  if (unknown.length > 0 && unknown.length < 40) {
    findings.push({
      severity: "warn",
      rule: "thin-unknowns",
      field: "body_unknown",
      message:
        "What remains unknown is very short. If it looks empty, something has probably been smoothed over.",
      excerpt: unknown,
    });
  }
}

function checkHeadline(account: DraftAccount, findings: Finding[]) {
  const headline = String(account.headline ?? "").trim();

  if (!headline) {
    findings.push({
      severity: "error",
      rule: "missing-headline",
      field: "headline",
      message: "Headline is empty.",
    });
    return;
  }

  const lower = headline.toLowerCase();
  for (const word of HYPE_WORDS) {
    if (lower.includes(word)) {
      findings.push({
        severity: "error",
        rule: "hype-headline",
        field: "headline",
        message: `Hype word in headline: "${word}". Headlines are plain and descriptive.`,
        excerpt: headline,
      });
    }
  }

  if (headline.includes("!")) {
    findings.push({
      severity: "error",
      rule: "hype-headline",
      field: "headline",
      message: "Exclamation mark in headline.",
      excerpt: headline,
    });
  }

  // Shouting is measured across the whole headline, not per word. This domain
  // is full of legitimate acronyms (USAF, NASA, GEIPAN, AARO, MoD, TRAPPIST),
  // and flagging any capitalised token would fire on almost every real case.
  // A genuinely shouted headline is mostly uppercase; a sober one carrying an
  // agency name is not.
  const alphaTokens = headline
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w));
  const upperTokens = alphaTokens.filter(
    (w) => w === w.toUpperCase() && /[A-Z]/.test(w),
  );

  if (
    alphaTokens.length >= 3 &&
    upperTokens.length / alphaTokens.length >= 0.6
  ) {
    findings.push({
      severity: "error",
      rule: "no-all-caps",
      field: "headline",
      message:
        "Headline is mostly uppercase. House style is sentence case everywhere.",
      excerpt: headline,
    });
  }

  // Title Case is a house-style break, not a factual one, so it only warns.
  const words = headline.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  const capitalised = words.slice(1).filter((w) => /^[A-Z][a-z]/.test(w));
  if (words.length >= 5 && capitalised.length > words.length * 0.6) {
    findings.push({
      severity: "warn",
      rule: "sentence-case",
      field: "headline",
      message: "Headline looks like Title Case. House style is sentence case.",
      excerpt: headline,
    });
  }
}

function checkAttribution(account: DraftAccount, findings: Finding[]) {
  const testimony = normalize(String(account.body_testimony ?? ""));
  if (!testimony.trim()) return;

  const hasMarker = ATTRIBUTION_MARKERS.some((m) => testimony.includes(m));
  if (!hasMarker) {
    findings.push({
      severity: "warn",
      rule: "attribution",
      field: "body_testimony",
      message:
        "No attribution verb found in the testimony section. Every claim should trace to someone.",
    });
  }
}

/**
 * The grounding heuristic.
 *
 * Pulls specifics out of the draft and checks each one appears in the source.
 * Anything that does not is exactly where an invented detail would be.
 */
function checkGrounding(
  account: DraftAccount,
  sourceText: string,
  findings: Finding[],
) {
  const source = normalize(sourceText);
  if (!source.trim()) return;

  const draft = bodyText(account);

  // Numbers first: altitudes, witness counts, durations, years.
  const numbers = new Set<string>();
  for (const m of draft.matchAll(/\b\d[\d,.]*\b/g)) {
    numbers.add(m[0].replace(/[,.]$/, ""));
  }
  for (const word of NUMBER_WORDS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(draft)) numbers.add(word);
  }

  for (const n of numbers) {
    const needle = normalize(n).trim();
    if (!needle) continue;
    if (!source.includes(needle)) {
      findings.push({
        severity: "warn",
        rule: "grounding-number",
        message:
          `The number "${n}" appears in the account but not in the source. ` +
          "Check it was not inferred.",
      });
    }
  }

  // Then proper nouns: names, places, agencies.
  const properNouns = new Set<string>();
  // Sentence-initial words are capitalised for grammar, so they are skipped.
  for (const m of draft.matchAll(/(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/gm)) {
    const candidate = m[1];
    if (SENTENCE_STARTERS.has(candidate.toLowerCase())) continue;

    // Strip the parts that are not names ("Major Jesse Marcel" is really a
    // claim about Jesse Marcel), and drop the candidate entirely if nothing
    // name-like is left. This is what stops "British pathologist" reading as
    // an invented person.
    const nameParts = candidate
      .split(/\s+/)
      .filter((w) => !NON_NAME_CAPITALS.has(w.toLowerCase()));

    if (nameParts.length === 0) continue;

    properNouns.add(nameParts.join(" "));
  }

  for (const noun of properNouns) {
    if (!source.includes(normalize(noun).trim())) {
      findings.push({
        severity: "warn",
        rule: "grounding-name",
        message:
          `"${noun}" appears in the account but not in the source. ` +
          "Check it was not invented.",
      });
    }
  }
}

function checkClassificationConsistency(
  account: DraftAccount,
  classification: string | undefined,
  findings: Finding[],
) {
  if (!classification) return;

  const status = normalize(String(account.body_status ?? ""));

  // "Acknowledged" is the strongest label and needs an official body in the
  // status section, otherwise the label is doing work the account does not.
  if (classification === "acknowledged") {
    const officialMarkers = [
      "government", "official", "ministry", "department", "agency", "pentagon",
      "air force", "navy", "army", "archives", "confirmed", "released",
      "declassified", "cnes", "geipan", "nasa", "faa", "aaro", "dod", "mod",
    ];
    if (!officialMarkers.some((m) => status.includes(m))) {
      findings.push({
        severity: "error",
        rule: "classification-support",
        field: "classification",
        message:
          "Classified acknowledged, but the status section names no official body. " +
          "Acknowledged requires an official source.",
      });
    }
  }

  if (classification === "debunked") {
    const settled = [
      "established", "conclusive", "proven", "admitted", "confessed",
      "fabricated", "hoax", "staged", "identified as", "shown to be",
    ];
    if (!settled.some((m) => status.includes(m))) {
      findings.push({
        severity: "warn",
        rule: "classification-support",
        field: "classification",
        message:
          "Classified debunked, but the status section does not show a conclusive cause. " +
          "Consider likely_explained instead.",
      });
    }
  }
}

// ---------------------------------------------------------------------------

/**
 * Nouns that only appear when someone is describing a picture.
 *
 * Used for one check: whether the account describes footage that nobody has
 * described to us. The correct sentence in that situation ("the material
 * available does not describe what the footage shows") contains none of these,
 * so the list can be blunt.
 */
const VISUAL_NOUNS = [
  "object", "objects", "light", "lights", "craft", "disc", "disk", "saucer",
  "sphere", "spheres", "orb", "orbs", "triangle", "cigar", "shape", "shapes",
  "figure", "figures", "being", "beings", "creature", "creatures", "entity",
  "entities", "sky", "horizon", "hovering", "glowing", "streak", "flash",
  "formation", "aircraft", "drone", "balloon", "silhouette", "beam",
];

/**
 * The check that would have stopped every Las Vegas draft.
 *
 * When no source in the dossier describes the footage, the account cannot
 * describe it either. This is an error rather than a warning because the
 * output is not merely unsupported, it is fabricated, and it appears in the
 * site's own voice under a section heading promising observation.
 */
function checkFootageIsEstablished(
  account: DraftAccount,
  dossier: Dossier,
  findings: Finding[],
) {
  if (hasFootageDescription(dossier)) return;

  const text = normalize(String(account.body_footage ?? ""));
  const used = VISUAL_NOUNS.filter((n) => new RegExp(`\\b${n}\\b`).test(text));

  if (used.length > 0) {
    findings.push({
      severity: "error",
      rule: "footage-not-established",
      field: "body_footage",
      message:
        `Nothing in the dossier describes this footage, but the account describes it anyway ` +
        `(${used.slice(0, 4).join(", ")}). Nobody has seen it. Say it has not been described.`,
      excerpt: String(account.body_footage ?? "").slice(0, 140),
    });
    return;
  }

  // Silence is not the same as saying so. An empty or evasive section leaves
  // the reader to assume we simply had nothing to say, when the honest and
  // more useful statement is that the footage has never been described.
  const ABSENCE = [
    "not describe", "no description", "has not been described",
    "does not establish", "not been established", "not available",
    "not reviewed", "has not reviewed", "unknown", "no source",
    "nobody has", "no one has", "cannot be established",
  ];
  if (!ABSENCE.some((m) => text.includes(m))) {
    findings.push({
      severity: "error",
      rule: "footage-not-established",
      field: "body_footage",
      message:
        "Nothing in the dossier describes this footage, and the account does not say so. " +
        "State plainly that the material does not describe what the footage shows.",
      excerpt: String(account.body_footage ?? "").slice(0, 140),
    });
  }
}

/**
 * A headline must not be the uploader's headline.
 *
 * Their title is written to be clicked, and reusing it imports their framing
 * wholesale under our byline. Measured on content words so that reordering or
 * dropping a word does not evade it.
 */
function checkHeadlineIsOurs(
  account: DraftAccount,
  sourceTitle: string,
  findings: Finding[],
) {
  // Quotes have to come off before comparing. Uploaders scare-quote the
  // words that carry the claim, so "'alien'" and "alien" are the same token
  // for our purposes and the check is useless if they are not.
  const words = (s: string) =>
    new Set(
      normalize(s)
        .split(/\s+/)
        .map((w) => w.replace(/['"]/g, ""))
        .filter((w) => w.length > 3 && !SENTENCE_STARTERS.has(w)),
    );

  const ours = words(String(account.headline ?? ""));
  const theirs = words(sourceTitle);
  if (ours.size === 0 || theirs.size === 0) return;

  const shared = [...ours].filter((w) => theirs.has(w)).length;
  const overlap = shared / ours.size;

  // Some overlap is unavoidable and correct: both will say "Las Vegas". Most
  // of the headline coming from theirs is not.
  if (overlap >= 0.8) {
    findings.push({
      severity: "error",
      rule: "headline-echoes-source",
      field: "headline",
      message:
        `The headline reuses ${Math.round(overlap * 100)}% of the source video's own title. ` +
        "Write our own, describing what is established rather than what they advertised.",
      excerpt: `ours: ${account.headline} | theirs: ${sourceTitle}`,
    });
  }
}

/**
 * "What remains unknown" must not contradict a field that is filled in.
 *
 * The Las Vegas draft named Las Vegas as the location and then said the
 * location was unknown, in the same account. Each half is defensible alone;
 * together they tell the reader we are not paying attention.
 */
function checkUnknownsAgree(account: DraftAccount, findings: Finding[]) {
  const raw = String(account.body_unknown ?? "");
  const unknown = normalize(raw);

  // Sentence by sentence rather than within a fixed window. The real draft
  // said "The location of the event, the date of the event, and the identity
  // of the object remain unknown", where the subject and the verb sit thirty
  // words apart, so any window narrow enough to avoid false positives was too
  // narrow to catch it.
  const sentences = unknown.split(/[.;]/).filter((s) => s.trim());
  const NEGATED = /\b(unknown|not known|unclear|not established|undetermined|has not been determined)\b/;

  const contradicts = (
    subject: RegExp,
    mention: string | null,
    within: string[] = sentences,
  ) =>
    within.some((sentence) => {
      if (!subject.test(sentence) || !NEGATED.test(sentence)) return false;
      // Naming the thing in the same breath is not a contradiction. "The
      // exact address within Las Vegas is unknown" is a precise and useful
      // sentence, and flagging it would train the reviewer to ignore this.
      return !(mention && sentence.includes(normalize(mention).trim()));
    });

  if (account.location_name && contradicts(/\b(location|place|where)\b/, account.location_name)) {
    findings.push({
      severity: "error",
      rule: "unknowns-contradict",
      field: "body_unknown",
      message: `The account gives the location as "${account.location_name}" and also calls the location unknown.`,
      excerpt: raw.slice(0, 140),
    });
  }

  // Precision matters here, and the first live AARO draft is why. It dated the
  // Mt. Etna footage to December 2018 at month precision and said AARO does
  // not publish the exact date. Both are true, and saying so is better than
  // either alone. So a sentence about an "exact" or "precise" date only
  // contradicts a date we claim to know to the day.
  const exactOnly = /\b(exact|precise|specific)\b/;
  const dateSentences = sentences.filter(
    (s) => account.date_precision === "day" || !exactOnly.test(s),
  );

  if (
    account.date_of_event &&
    account.date_precision !== "unknown" &&
    contradicts(/\b(date|when)\b/, account.date_of_event.slice(0, 4), dateSentences)
  ) {
    findings.push({
      severity: "error",
      rule: "unknowns-contradict",
      field: "body_unknown",
      message: `The account dates the event to ${account.date_of_event} and also calls the date unknown.`,
      excerpt: raw.slice(0, 140),
    });
  }

  // A date described only in terms the reader cannot resolve. "Last year"
  // means nothing on a page with no publication date beside it.
  if (/\b(last year|this year|a year ago|recently)\b/.test(unknown)) {
    findings.push({
      severity: "warn",
      rule: "relative-date-in-prose",
      field: "body_unknown",
      message:
        "A relative date phrase appears in the account. The reader has no reference point for it, so name the year.",
    });
  }
}

/**
 * Our own scaffolding, copied into the prose.
 *
 * The dossier annotates each fact with its sourcing, in square brackets, so
 * the model can weigh a corroborated fact against a lone anonymous one. A
 * small model sometimes copies that annotation straight through into the
 * account. The first live AARO draft ended a sentence with "[single source:
 * All-domain Anomaly Resolution Office (AARO)]", which would have published
 * exactly as written.
 *
 * Attribution belongs in the sentence, in English, which the editorial rules
 * already require. It does not belong in brackets borrowed from a prompt.
 */
const SCAFFOLDING = [
  /\[single source:/i,
  /\[confirmed independently by/i,
  /\[stated by/i,
  /DOSSIER (BEGINS|ENDS)/i,
  /\(nothing established\)/i,
  /NOTHING IN THE MATERIAL DESCRIBES/i,
];

function checkNoScaffolding(account: DraftAccount, findings: Finding[]) {
  for (const [field, value] of Object.entries(account)) {
    if (typeof value !== "string") continue;
    for (const pattern of SCAFFOLDING) {
      const match = pattern.exec(value);
      if (!match) continue;
      findings.push({
        severity: "error",
        rule: "scaffolding-leak",
        field,
        message:
          "The dossier's own annotation was copied into the prose. Attribute the " +
          "claim in a sentence instead.",
        excerpt: value.slice(Math.max(0, match.index - 40), match.index + 60).trim(),
      });
      break;
    }
  }
}

export interface ValidationResult {
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
}

export function validateAccount(
  account: DraftAccount,
  options: {
    sourceText?: string;
    /**
     * The dossier the account was written from. When present, the checks that
     * depend on knowing what was actually established can run, which is the
     * difference between catching an invented number and catching an invented
     * paragraph.
     */
    dossier?: Dossier;
    /** The source video's own title, to check the headline is not a copy. */
    sourceTitle?: string;
    classification?: string;
  } = {},
): ValidationResult {
  const findings: Finding[] = [];

  checkEmDashes(account, findings);
  checkStockPhrases(account, findings);
  checkRequiredSections(account, findings);
  checkHeadline(account, findings);
  checkAttribution(account, findings);
  checkUnknownsAgree(account, findings);
  checkNoScaffolding(account, findings);
  checkClassificationConsistency(account, options.classification, findings);

  if (options.dossier) {
    checkFootageIsEstablished(account, options.dossier, findings);
  }

  if (options.sourceTitle) {
    checkHeadlineIsOurs(account, options.sourceTitle, findings);
  }

  if (options.sourceText) {
    checkGrounding(account, options.sourceText, findings);
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warn");

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Translations get a narrower check: the rules that survive translation are
 * the dash rule and, most importantly, that no section was dropped. A
 * translation that loses "what remains unknown" turns an honest entry into an
 * overconfident one.
 */
export function validateTranslation(
  english: DraftAccount,
  translated: Record<string, string>,
  lang: string,
): ValidationResult {
  const findings: Finding[] = [];

  for (const [field, value] of Object.entries(translated)) {
    if (typeof value !== "string") continue;
    if (/[\u2014\u2013]/.test(value)) {
      findings.push({
        severity: "error",
        rule: "no-em-dash",
        field: `${lang}.${field}`,
        message: "Em or en dash in translation.",
      });
    }
  }

  for (const field of BODY_FIELDS) {
    const source = String(english[field] ?? "").trim();
    const target = String(translated[field] ?? "").trim();

    if (source && !target) {
      findings.push({
        severity: "error",
        rule: "dropped-section",
        field: `${lang}.${field}`,
        message: `${field} is present in English but missing in ${lang}.`,
      });
      continue;
    }

    // A translation far shorter than its source has usually lost a clause,
    // and the clause that goes first is the hedging one.
    if (source && target && target.length < source.length * 0.5) {
      findings.push({
        severity: "warn",
        rule: "short-translation",
        field: `${lang}.${field}`,
        message:
          `${field} in ${lang} is less than half the length of the English. ` +
          "Check no attribution or hedging was dropped.",
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warn");

  return { ok: errors.length === 0, errors, warnings };
}

export function formatFindings(result: ValidationResult): string {
  const lines: string[] = [];

  for (const f of result.errors) {
    lines.push(`  ERROR  [${f.rule}] ${f.field ? `${f.field}: ` : ""}${f.message}`);
    if (f.excerpt) lines.push(`         ...${f.excerpt}...`);
  }
  for (const f of result.warnings) {
    lines.push(`  warn   [${f.rule}] ${f.field ? `${f.field}: ` : ""}${f.message}`);
    if (f.excerpt) lines.push(`         ...${f.excerpt}...`);
  }

  return lines.join("\n");
}
