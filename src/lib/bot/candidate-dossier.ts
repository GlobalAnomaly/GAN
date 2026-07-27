/**
 * Turning a YouTube candidate into a dossier, honestly.
 *
 * The old path handed the model a title and a description and asked for four
 * sections. This one asks a narrower question: given only this video's
 * metadata, what has actually been established?
 *
 * Usually the answer is very little, and saying so is the improvement. A title
 * reading "ALIEN CRAFT OVER TEXAS!! 100% REAL" establishes that somebody
 * posted a video under that title. It establishes nothing about Texas, about
 * craft, or about what is visible in the frame. Encoding that distinction here
 * rather than in a prompt is what makes it hold: the writer never sees the
 * title as raw material, only as an attributed claim.
 *
 * The description is worth more than it looks, and the first run threw most of
 * that value away. Chapter timestamps summarise the video's actual contents.
 * Article links point at real reporting. Both were flattened into one blob
 * alongside several paragraphs of channel boilerplate about how award-winning
 * the presenter is, which the model then read as evidence.
 */

import type { Candidate } from "@/lib/admin/store";
import { tierForChannel } from "@/lib/bot/channel-registry";
import {
  addFact,
  addMedia,
  addUnresolved,
  createDossier,
  hasFootageDescription,
  type Dossier,
  type DossierSource,
} from "@/lib/bot/dossier";
import { bestDate, resolveDates } from "@/lib/bot/relative-dates";

/**
 * Lines that are channel furniture rather than material about the event.
 *
 * Roughly 60% of the NewsNation description was a biography of the presenter
 * and a list of ways to watch. Left in, it competes with the two sentences
 * that actually describe the case, and on an 8B model that competition is not
 * hypothetical.
 */
const BOILERPLATE_PATTERNS: RegExp[] = [
  /^\s*#\w+/,
  /\b(subscribe|follow us|like and share|hit the bell|link in bio)\b/i,
  /\b(instagram|twitter|tiktok|facebook|patreon|discord|merch)\b.*[:\/]/i,
  /\bhttps?:\/\/(trib\.al|bit\.ly|linktr\.ee)/i,
  /\b(get our app|find us on cable|how to watch|more from)\b/i,
  /\b(is \*?the\*? definitive authority|award-winning|weeknights at)\b/i,
  // A channel describing itself. "NewsNation is your source for fact-based,
  // unbiased news for all America" is marketing, and leaving it in means the
  // model reads a claim of impartiality as though it were evidence.
  /\b(is your source for|your \w+ news source|no one knows .* better than)\b/i,
  /\b(registered trademark|servicemark|uspto|all rights reserved)\b/i,
  /\b(copyright|fair use|section 107)\b/i,
  /^\s*(credits? to|music by|edited by)\b/i,
];

/** A chapter list line: "00:16 Las Vegas family claims to see aliens". */
const CHAPTER_LINE = /^\s*(\d{1,2}:)?\d{1,2}:\d{2}\s+(.{4,})$/;

export interface CleanedDescription {
  /** Prose lines with the furniture removed. */
  text: string;
  /** Chapter titles, which describe the video's real contents. */
  chapters: string[];
  /** External links worth following during enrichment. */
  links: string[];
  /** How many lines were discarded, for the run log. */
  removed: number;
}

export function cleanDescription(description: string): CleanedDescription {
  const lines = (description ?? "").split(/\r?\n/);
  const kept: string[] = [];
  const chapters: string[] = [];
  const links: string[] = [];
  let removed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const chapter = CHAPTER_LINE.exec(trimmed);
    if (chapter) {
      chapters.push(chapter[2].trim());
      continue;
    }

    for (const m of trimmed.matchAll(/https?:\/\/[^\s)]+/g)) {
      const url = m[0].replace(/[.,;]$/, "");
      if (!links.includes(url)) links.push(url);
    }

    if (BOILERPLATE_PATTERNS.some((p) => p.test(trimmed))) {
      removed++;
      continue;
    }

    kept.push(trimmed);
  }

  return { text: kept.join("\n"), chapters, links, removed };
}

/**
 * Links that point at reporting rather than at the channel's own funnel.
 *
 * These are the enrichment stage's cheapest input: the KENS 5 description
 * carries a link straight to the article the segment was cut from, which is
 * real reporting we can read without any scraping fight.
 */
const SELF_PROMOTION = /(youtube\.com|youtu\.be|instagram|twitter|x\.com|tiktok|facebook|patreon|discord|trib\.al|bit\.ly|linktr\.ee|teespring|amazon\.)/i;

export function articleLinks(links: string[]): string[] {
  return links.filter((url) => {
    if (SELF_PROMOTION.test(url)) return false;
    // A bare domain is the outlet's front page, not the story. Following
    // newsnationnow.com gets today's homepage, which will have moved on by the
    // time anyone reads it and never carried this case in the first place.
    try {
      const path = new URL(url).pathname.replace(/\/+$/, "");
      return path.length > 1;
    } catch {
      return false;
    }
  });
}

/**
 * Builds the dossier for a single candidate.
 *
 * Nothing here asserts anything about the event. Every fact is either a
 * mechanical property of the record (this video exists, it was posted on this
 * date, by this channel) or a claim explicitly attributed to whoever made it.
 * The one exception is a date parsed out of the text, which is arithmetic on
 * stated wording and carries its derivation with it.
 */
export function dossierFromCandidate(
  candidate: Candidate,
  /**
   * A transcript, when one has been pasted in by hand.
   *
   * This is the one input that can lift a candidate out of "nobody has
   * described the footage", and it is why the manual paste box earns its
   * place. What it establishes still depends on who is speaking: a reporter
   * saying two figures are visible in the yard is describing the footage,
   * while an uploader saying it is definitely not a drone is making a claim
   * about it. The tier decides which, the same way it does everywhere else.
   */
  transcript?: string,
): Dossier {
  const tier = tierForChannel(candidate.channel);
  const source: DossierSource = {
    name: candidate.channel || "an unnamed account",
    url: candidate.watch_url,
    tier,
    retrieved_at: candidate.fetched_at,
  };

  const dossier = createDossier(candidate.title.slice(0, 80));
  const cleaned = cleanDescription(candidate.description);
  const uploaderLabel =
    tier === "anonymous" || tier === "uploader"
      ? `the account that posted the video (${source.name})`
      : source.name;

  // The title. A claim, always, whoever posted it. A broadcaster's headline is
  // still a headline, not an observation.
  addFact(dossier, {
    kind: "claim",
    statement: `The video is titled "${candidate.title}".`,
    attributed_to: uploaderLabel,
    sources: [source],
  });

  // The description, minus the furniture.
  if (cleaned.text) {
    addFact(dossier, {
      kind: "claim",
      statement: `The description accompanying the video reads: ${cleaned.text}`,
      attributed_to: uploaderLabel,
      sources: [source],
    });
  }

  // Chapter titles genuinely describe what the video covers, and on a news
  // segment they often carry the conventional explanation. The 8 News Now
  // chapter list names a scientist attributing the fireball to a meteor, and
  // that never reached the draft written from the same description.
  for (const chapter of cleaned.chapters) {
    addFact(dossier, {
      kind: "context",
      statement: `The video's own chapter list includes a section titled "${chapter}".`,
      attributed_to: uploaderLabel,
      sources: [source],
    });
  }

  // A transcript, when we have one.
  const spoken = (transcript ?? "").trim();
  if (spoken) {
    const describesFootage = tier === "press" || tier === "official";
    addFact(dossier, {
      kind: describesFootage ? "footage" : "claim",
      statement: describesFootage
        ? `A transcript of the segment records the following. Treat descriptions of what is on screen as descriptions, and anything asserted about the object as a claim by whoever said it: ${spoken}`
        : `A transcript of what is said in the video records the following, all of it the speaker's own claims: ${spoken}`,
      attributed_to: describesFootage ? undefined : uploaderLabel,
      sources: [source],
    });
  }

  // Dates, resolved in code, with the derivation attached.
  //
  // One source establishes one event date, so only the best reading is kept.
  // The UFO Seekers description on the Las Vegas case lists two meteor shower
  // peaks and a comet designation, and taking every date found put 6 May, 10
  // May and 1983 into the dossier as candidate event dates. `bestDate` prefers
  // a stated date over a derived one and a precise one over a vague one, which
  // picks the 04/30/23 in the title over all of that.
  const dates = resolveDates(
    [candidate.title, cleaned.text, ...cleaned.chapters, spoken].join("\n"),
    candidate.published_at,
  );
  const best = bestDate(dates);

  if (best) {
    addFact(dossier, {
      kind: "event_date",
      statement: best.derived
        ? `A date of ${best.value} is implied by ${best.basis}.`
        : `The material gives the date as ${best.basis}.`,
      value: best.value,
      precision: best.precision,
      attributed_to: uploaderLabel,
      sources: [source],
    });
  }

  if (dates.length > 1) {
    addUnresolved(
      dossier,
      `The material mentions ${dates.length} different dates (${dates
        .map((d) => d.value)
        .join(", ")}). Only the best supported one is used above, so the date is worth checking by hand.`,
    );
  }

  // The record itself, which is a fact about the video and not about the event.
  addFact(dossier, {
    kind: "context",
    statement:
      `The video was published on ${candidate.published_at.slice(0, 10)} by ${source.name}` +
      (candidate.duration_seconds
        ? `, and runs ${candidate.duration_seconds} seconds.`
        : "."),
    sources: [source],
  });

  addMedia(dossier, {
    kind: "video",
    url: candidate.watch_url,
    // Our words, not theirs. What we know is that a video exists and who
    // posted it, which is exactly what this says.
    description: `Video posted by ${source.name}, ${candidate.duration_seconds ?? "unknown"} seconds.`,
    source,
  });

  // The gaps, written down rather than left for the model to paper over.
  if (!hasFootageDescription(dossier)) {
    addUnresolved(
      dossier,
      "Nobody has described what is visible in this footage. The title and description are the uploader's claims about it, not an account of it.",
    );
  }

  const links = articleLinks(cleaned.links);
  for (const url of links) {
    addUnresolved(
      dossier,
      `The description links to ${url}, which has not been read yet and may carry the reporting behind this clip.`,
    );
  }

  if (!cleaned.text && cleaned.chapters.length === 0) {
    addUnresolved(
      dossier,
      "The video has no description at all, so the only material is its title.",
    );
  }

  return dossier;
}

/**
 * Folds the archive's own vetted reference into the dossier.
 *
 * This is the mechanism from session 1: a Roswell documentary that never says
 * "1947" used to produce "the date is unknown", and the fix was never to let
 * the model recall the date from its weights, because that is the same
 * mechanism as inventing an altitude. The facts arrive as sourced material
 * with an authority attached.
 *
 * They enter at `reference` tier, so they can establish a date and a place but
 * still cannot describe footage. Knowing that Rendlesham happened in December
 * 1980 tells us nothing about what is in a particular clip.
 */
export function addKnownEventFacts(
  dossier: Dossier,
  match: {
    event: {
      name: string;
      date: string | null;
      date_precision: "day" | "month" | "year" | "unknown";
      date_note?: string;
      location_name: string | null;
      country: string | null;
      authority: string;
    };
    matchedOn: string;
  },
): Dossier {
  const { event } = match;
  const source: DossierSource = {
    name: event.authority,
    tier: "reference",
  };

  if (event.date && event.date_precision !== "unknown") {
    addFact(dossier, {
      kind: "event_date",
      statement: `${event.name} is recorded as ${event.date_note ?? event.date}.`,
      value: event.date,
      precision: event.date_precision,
      sources: [source],
    });
  }

  const place = [event.location_name, event.country].filter(Boolean).join(", ");
  if (place) {
    addFact(dossier, {
      kind: "location",
      statement: `${event.name} took place at ${place}.`,
      value: place.toLowerCase(),
      sources: [source],
    });
  }

  addFact(dossier, {
    kind: "context",
    statement:
      `This material was matched to the documented event "${event.name}" ` +
      `on the phrase "${match.matchedOn}". The facts above are held on the ` +
      `authority of ${event.authority}.`,
    sources: [source],
  });

  return dossier;
}

/**
 * Whether a dossier is too thin to be worth a model call.
 *
 * A run that spends three minutes writing an account from a bare title is
 * spending the night on the wrong thing, and the account it produces is the
 * one most likely to be invented. Better to leave the candidate queued for
 * enrichment and draft it once there is something to draft from.
 */
export function tooThinToDraft(dossier: Dossier): boolean {
  const substantive = dossier.facts.filter(
    (f) => f.kind !== "context" && f.statement.length > 40,
  );
  return substantive.length < 2;
}
