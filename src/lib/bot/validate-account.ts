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
    .replace(/[â€˜â€™]/g, "'")
    .replace(/[â€œâ€]/g, '"')
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
    const match = /[â€”â€“]/.exec(value);
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
    properNouns.add(candidate);
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

export interface ValidationResult {
  ok: boolean;
  errors: Finding[];
  warnings: Finding[];
}

export function validateAccount(
  account: DraftAccount,
  options: { sourceText?: string; classification?: string } = {},
): ValidationResult {
  const findings: Finding[] = [];

  checkEmDashes(account, findings);
  checkStockPhrases(account, findings);
  checkRequiredSections(account, findings);
  checkHeadline(account, findings);
  checkAttribution(account, findings);
  checkClassificationConsistency(account, options.classification, findings);

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
    if (/[â€”â€“]/.test(value)) {
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
