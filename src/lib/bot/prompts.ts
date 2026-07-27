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

import { objectSchema } from "@/lib/bot/ollama";
import {
  hasFootageDescription,
  renderForPrompt,
  type Dossier,
} from "@/lib/bot/dossier";

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
- The dossier's facts are established and sourced, so use them: do not write that a date or place is unknown when the dossier states it. Everything outside the dossier is unknown, and you must never fill a gap from your own knowledge.
- A video's title, description and any narration are the UPLOADER'S claims, not observations, however confidently they are worded. Write "the person who posted the footage states..." or "the uploader describes...", never the claim on its own. An anonymous account is attributed as anonymous. A title in capitals, or one asserting the object is a craft, alien, or military, is a claim about the footage and never evidence of it.
- Separate what the footage SHOWS from what anyone SAYS about it. A clip showing a light moving across a night sky shows exactly that, whatever the caption calls it.
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

/**
 * The drafting prompt, which now receives a dossier and nothing else.
 *
 * The change from raw metadata is not cosmetic. Previously the model got a
 * YouTube title and description and was asked what the footage showed, a
 * question that material cannot answer, so it answered from the stereotype of
 * a UFO video. Now the dossier states plainly when nobody has described the
 * footage, and the instruction below tells the model exactly what to write in
 * that case. An absence with a prescribed response is followable; an absence
 * with none is an invitation to be helpful.
 */
export function draftAccountPrompt(dossier: Dossier): string {
  const noFootage = !hasFootageDescription(dossier);

  return `You are an editorial assistant for a neutral UFO/UAP archive. Write a single case account in the fixed structure below, using ONLY the dossier provided. You are a reporter relaying information, not an advocate.

${ABSOLUTE_RULES}

THE DOSSIER IS YOUR ONLY SOURCE. It lists what has actually been established and who established it. If something is not in the dossier, you do not know it, and neither does the archive. Do not supply it from your own knowledge, however confident you are, and do not reason your way to it.

An empty section is a correct answer. An entry with no date, no place and nothing known about the footage is a complete and honest entry. Padding it is the one thing you must not do.

Each fact is marked with how many independent sources assert it. A fact confirmed by several sources may be stated more plainly than one resting on a single anonymous upload. Never present a single-source claim as though it were settled.

${noFootage ? `IMPORTANT: nobody has described this footage. For "body_footage" you must write that the material available does not describe what the footage shows, and that the archive has not independently reviewed it. Do NOT describe lights, objects, shapes, craft, the sky, or anything else visual. You have not seen it and neither has any source here.\n` : ""}
${renderForPrompt(dossier)}

Return JSON with exactly these keys:
{
  "headline": "plain, descriptive, sentence case, no hype. Names what is actually established. Must NOT reuse or lightly reword the video's own title: that is the uploader's wording, and often their sales pitch.",
  "summary": "one or two sentences for a card. Same rules.",
  "body_footage": "what the material states is visibly in the footage, from a source that saw it. If the dossier does not establish this, say so plainly and stop.",
  "body_testimony": "what witnesses and officials claim, attributed to whoever claimed it. Credentials shown, not asserted.",
  "body_status": "what any authority confirmed or denied, instrument or radar data, corroboration or its absence.",
  "body_unknown": "the explicit gaps, including every question the dossier lists as unanswered. Never leave this empty, and never contradict a field you have filled: if you give a location, do not also call the location unknown.",
  "location_name": "place name, or null if the dossier does not establish one",
  "country": "country, or null",
  "continent": "one of: north_america, south_america, africa, europe, asia, oceania, unknown",
  "date_of_event": "YYYY-MM-DD, or null if the dossier does not establish it",
  "date_precision": "one of: day, month, year, unknown"
}

Use the date the dossier gives, at the precision it gives. If it establishes only a year, set date_of_event to YYYY-01-01 and date_precision to "year". Never present a guessed day as exact, and never compute a date yourself: the dossier has already done that arithmetic and shown its working.`;
}

const CONTINENTS = new Set([
  "north_america", "south_america", "africa", "europe", "asia", "oceania",
  "unknown",
]);

const NULLISH = new Set(["", "null", "none", "n/a", "na", "unknown", "not known", "undefined"]);

/**
 * Coerces a raw model response into the types the rest of the code assumes.
 *
 * Ollama's structured output enforces the shape, not the meaning, and every
 * field in DRAFT_SCHEMA is declared a string because that is what the schema
 * language gives us. So a model with nothing to report writes the four
 * characters "null" and they arrive as text, which is truthy, non-empty and
 * renders on a page as the word null. The first overnight run produced 25
 * accounts whose location was the string "null", 27 with that country and 24
 * with that date, and nothing anywhere noticed.
 *
 * Dates are the other half. The schema cannot say "ISO date", so one draft
 * carried "2024-04 (year only)" in a column the database expects to parse.
 * Anything unsalvageable becomes null with precision "unknown", which is a
 * correct answer, rather than being passed along to fail somewhere later.
 */
export function normalizeDraft(account: DraftAccount): DraftAccount {
  const clean = (value: string | null): string | null => {
    const text = String(value ?? "").trim();
    return NULLISH.has(text.toLowerCase()) ? null : text;
  };

  let date = clean(account.date_of_event);
  let precision = account.date_precision;

  if (date) {
    const full = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    const month = /^(\d{4})-(\d{2})$/.exec(date);
    const year = /^(\d{4})$/.exec(date);

    if (full) {
      date = `${full[1]}-${full[2]}-${full[3]}`;
    } else if (month) {
      date = `${month[1]}-${month[2]}-01`;
      precision = "month";
    } else if (year) {
      date = `${year[1]}-01-01`;
      precision = "year";
    } else {
      // Salvage a leading year from prose such as "2024-04 (year only)", and
      // drop the precision to match what we can actually stand behind.
      const loose = /(\d{4})(?:-(\d{2}))?/.exec(date);
      if (loose) {
        date = `${loose[1]}-${loose[2] ?? "01"}-01`;
        precision = loose[2] ? "month" : "year";
      } else {
        date = null;
        precision = "unknown";
      }
    }
  }

  if (!date) precision = "unknown";
  if (!["day", "month", "year", "unknown"].includes(precision)) precision = "unknown";

  const continent = CONTINENTS.has(account.continent) ? account.continent : "unknown";

  return {
    ...account,
    location_name: clean(account.location_name),
    country: clean(account.country),
    date_of_event: date,
    date_precision: precision,
    continent,
  };
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
  dossier: Dossier,
): string {
  return `You are classifying a UFO/UAP case for a neutral archive, using fixed criteria. Apply the criteria to the evidence, not to how interesting the case is.

CRITERIA:
- "acknowledged": a government or official body has publicly released or confirmed the material and offered no conventional explanation. Requires an official source.
- "unverified": a public sighting with no official validation and no established conventional explanation. This is the default for social and user-submitted material.
- "likely_explained": a plausible conventional cause is identified or strongly indicated (satellite train, drone, aircraft, balloon, lens flare, camera artifact, probable hoax) but not conclusively proven.
- "debunked": a conventional cause is conclusively established, or the material is demonstrably fabricated.

When two labels both fit, choose the more conservative one and say why in the reason.
Do not use em dashes. Write the reason as one plain sentence.

"unverified" is the honest label for most material and carries no stigma. Do not reach for a stronger one to make the entry feel more finished.

${renderForPrompt(dossier)}

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

/**
 * Schemas handed to Ollama so the shape is enforced during generation rather
 * than hoped for afterwards. Every key is required, which is what stops a
 * translation quietly arriving without its "what remains unknown" section.
 */
const str = { type: "string" } as const;

export const DRAFT_SCHEMA = objectSchema({
  headline: str,
  summary: str,
  body_footage: str,
  body_testimony: str,
  body_status: str,
  body_unknown: str,
  location_name: str,
  country: str,
  continent: str,
  date_of_event: str,
  date_precision: str,
});

export const CLASSIFICATION_SCHEMA = objectSchema({
  classification: str,
  classification_reason: str,
});

export const TRANSLATION_SCHEMA = objectSchema({
  title: str,
  summary: str,
  body_footage: str,
  body_testimony: str,
  body_status: str,
  body_unknown: str,
});

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
