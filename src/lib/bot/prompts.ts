/**
 * The prompts, in stages.
 *
 * Deliberately not one kitchen-sink call. An 8B model holds together far
 * better asked to do one thing at a time: draft the English account, then
 * classify it, then translate it. Each stage gets the source text again so
 * nothing is inferred from a summary of a summary.
 *
 * The absolute rules come from editorial-template.md section 8 and are
 * repeated in every stage, because a rule stated once at the top of a long
 * prompt is the first thing a small model forgets.
 */

export type Lang = "fr" | "pt" | "es";

export const LANG_NAMES: Record<Lang, string> = {
  fr: "French",
  pt: "Portuguese",
  es: "Spanish",
};

/** Repeated at every stage. These are the rules that never loosen. */
const ABSOLUTE_RULES = `Absolute rules:
- Include only (a) what the evidence observably shows and (b) what named or described people claim, always attributed. Never state a UFO claim as fact in your own voice.
- Never invent details not present in the source: object shape, material, size, altitude, time, witness count, or location. If a detail is absent, place it under "what remains unknown".
- Where an ESTABLISHED FACTS block is provided, treat those facts as part of the source. They are verified, so use them: do not write that a date or place is unknown when the block states it. Everything outside the source material and that block is still unknown, and you must never fill a gap from your own knowledge.
- Quote only short, load-bearing phrases that carry a fact or specific; attribute every quote. Cut anything kept for drama.
- Write original prose. Do not copy or closely paraphrase the wording of any source article. State facts in your own words.
- Show credibility through specifics (credentials, instrument data, corroboration); never assert it with adjectives.
- Write in a plain, natural human voice. Do NOT use em dashes anywhere; use commas, colons, parentheses, or separate sentences. Vary sentence length. Avoid stock AI phrasing ("genuinely", "testament to", "tapestry", "delve", "it's not just X, it's Y", "that's the [X]"). The account must not read as machine-generated.`;

export interface SourceMaterial {
  /** Where this came from, for the model's context and for the sources list. */
  sourceName: string;
  sourceUrl?: string;
  /** Transcript, article text, PDF text, or video description. */
  text: string;
  /** Anything already known, so the model does not have to guess it. */
  knownTitle?: string;
  knownDate?: string;
  knownLocation?: string;
  /**
   * Verified facts about a well-documented event, from the archive's own
   * reference. Present only when the material was confidently matched to a
   * known event. This is how the bot knows Roswell happened in 1947 without
   * that date coming out of the model's memory.
   */
  reference?: string;
}

function sourceBlock(source: SourceMaterial): string {
  const known = [
    source.knownTitle && `Known title: ${source.knownTitle}`,
    source.knownDate && `Known publication date: ${source.knownDate}`,
    source.knownLocation && `Stated location: ${source.knownLocation}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `SOURCE: ${source.sourceName}${source.sourceUrl ? ` (${source.sourceUrl})` : ""}
${known ? `${known}\n` : ""}
SOURCE MATERIAL BEGINS
${source.text}
SOURCE MATERIAL ENDS${
    source.reference
      ? `

${source.reference}`
      : ""
  }`;
}

export interface DraftAccount {
  headline: string;
  summary: string;
  body_footage: string;
  body_testimony: string;
  body_status: string;
  body_unknown: string;
  location_name: string | null;
  country: string | null;
  continent: string;
  date_of_event: string | null;
  date_precision: "day" | "month" | "year" | "unknown";
}

export function draftAccountPrompt(source: SourceMaterial): string {
  return `You are an editorial assistant for a neutral UFO/UAP archive. From the source material provided, write a single case account in the fixed structure below. You are a reporter relaying information, not an advocate.

${ABSOLUTE_RULES}

If the source is thin, keep the account short and let "what remains unknown" carry the gaps. Never pad.

${sourceBlock(source)}

Return JSON with exactly these keys:
{
  "headline": "plain, descriptive, sentence case, no hype. Names the observable and the location if known.",
  "summary": "one or two sentences for a card. Same rules.",
  "body_footage": "what the footage or record observably shows. Description only, no interpretation.",
  "body_testimony": "what witnesses and officials say, attributed. Credentials shown, not asserted.",
  "body_status": "what any authority confirmed or denied, instrument or radar data, corroboration or its absence.",
  "body_unknown": "the explicit gaps: location, date, object identity, whether it has been analysed. Never leave this empty.",
  "location_name": "place name, or null if the source does not give one",
  "country": "country, or null",
  "continent": "one of: north_america, south_america, africa, europe, asia, oceania, unknown",
  "date_of_event": "YYYY-MM-DD, or null if the source does not establish it",
  "date_precision": "one of: day, month, year, unknown"
}

If the source only establishes a year, set date_of_event to YYYY-01-01 and date_precision to "year". Never present a guessed day as exact.`;
}

export interface ClassificationResult {
  classification:
    | "acknowledged"
    | "unverified"
    | "likely_explained"
    | "debunked";
  classification_reason: string;
}

export function classifyPrompt(
  account: DraftAccount,
  source: SourceMaterial,
): string {
  return `You are classifying a UFO/UAP case for a neutral archive, using fixed criteria. Apply the criteria to the evidence, not to how interesting the case is.

CRITERIA:
- "acknowledged": a government or official body has publicly released or confirmed the material and offered no conventional explanation. Requires an official source.
- "unverified": a public sighting with no official validation and no established conventional explanation. This is the default for social and user-submitted material.
- "likely_explained": a plausible conventional cause is identified or strongly indicated (satellite train, drone, aircraft, balloon, lens flare, camera artifact, probable hoax) but not conclusively proven.
- "debunked": a conventional cause is conclusively established, or the material is demonstrably fabricated.

When two labels both fit, choose the more conservative one and say why in the reason.
Do not use em dashes. Write the reason as one plain sentence.

${sourceBlock(source)}

THE ACCOUNT AS DRAFTED:
Headline: ${account.headline}
What it shows: ${account.body_footage}
Testimony: ${account.body_testimony}
Status: ${account.body_status}
Unknowns: ${account.body_unknown}

Return JSON:
{
  "classification": "one of the four labels above",
  "classification_reason": "one sentence saying why this label and not the neighbouring one"
}`;
}

export interface Translation {
  title: string;
  summary: string;
  body_footage: string;
  body_testimony: string;
  body_status: string;
  body_unknown: string;
}

export function translatePrompt(
  account: DraftAccount,
  classificationReason: string,
  lang: Lang,
): string {
  return `Translate the following UFO case account into ${LANG_NAMES[lang]}.

This is a factual archive entry, so the translation must say exactly the same thing as the English. In particular:
- Do not strengthen or weaken any claim. "Witnesses said" must not become "it happened".
- Keep every attribution. If the English says a pilot stated something, the translation must too.
- Keep hedging words exactly as hedged: "reported", "claimed", "unconfirmed", "not established".
- Do not add detail that is not in the English.
- Do NOT use em dashes. Use commas, colons, parentheses, or separate sentences.
- Write naturally in ${LANG_NAMES[lang]}, not word for word, but never at the cost of accuracy.

Classification reason (for context, do not translate into the body): ${classificationReason}

ENGLISH ACCOUNT:
Title: ${account.headline}
Summary: ${account.summary}
Section 1 (what it shows): ${account.body_footage}
Section 2 (testimony): ${account.body_testimony}
Section 3 (status): ${account.body_status}
Section 4 (what remains unknown): ${account.body_unknown}

Return JSON with these keys, all in ${LANG_NAMES[lang]}:
{
  "title": "",
  "summary": "",
  "body_footage": "",
  "body_testimony": "",
  "body_status": "",
  "body_unknown": ""
}`;
}
