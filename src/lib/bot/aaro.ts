/**
 * The AARO fetcher.
 *
 * The All-domain Anomaly Resolution Office publishes official UAP imagery and
 * case resolution reports. This is the best source in the whole plan for one
 * blunt reason: **it describes its own footage**.
 *
 * Every video on the imagery page carries an accessibility label written by
 * the government, of the form "Silent 13 second video showing a distant
 * unified aerial object moving steadily across the sky, No audio." That is a
 * description of what is visible, from a source that had the file. It is the
 * exact input the dossier has been unable to obtain from YouTube, where a
 * title and description are the uploader's claims about footage nobody has
 * described.
 *
 * Three further properties matter:
 *
 * - **US federal public domain.** No licence to check, nobody to ask, and we
 *   may host the files ourselves rather than embedding, which removes the
 *   dead-embed risk entirely. `MediaType` already has `video_file` and
 *   `is_self_hosted` for this.
 * - **AARO states its own verdict in every title**: "Unresolved UAP Report",
 *   "Resolved as a Balloon", "Resolved as Migratory Birds", "Closed as Not
 *   Anomalous". That is `source_disposition`, kept as theirs and never
 *   translated into our own classification, per the three-axes rule.
 * - **Plain HTTP is enough.** No browser, no Playwright. The site returns the
 *   whole table server-rendered. Note that some clients get a 403 on user
 *   agent alone, which is why nothing here sets an exotic one.
 *
 * Parsing is by regex against the server-rendered table rather than with a DOM
 * library, matching how the rest of this directory reads HTML. The page is a
 * stable government table, not an app.
 */

import {
  addFact,
  addMedia,
  addUnresolved,
  createDossier,
  type Dossier,
  type DossierSource,
} from "@/lib/bot/dossier";
import { resolveDates } from "@/lib/bot/relative-dates";

const ORIGIN = "https://www.aaro.mil";
export const IMAGERY_PATH = "/UAP-Cases/Official-UAP-Imagery/";
export const REPORTS_PATH = "/UAP-Cases/UAP-Case-Resolution-Reports/";

export interface AaroVideo {
  /** Direct .mp4 on a government CDN. */
  url: string;
  poster: string | null;
  /**
   * AARO's own description of what the footage shows, taken from the video
   * element's accessibility label. This is the only field in this codebase
   * that may create a `footage` fact from a fetched page.
   */
  description: string;
  duration_seconds: number | null;
}

export interface AaroCase {
  /** AARO's identifier, such as PR-018 or Mt-Etna. */
  id: string;
  title: string;
  /** AARO's verdict in their words. Never converted into our classification. */
  disposition: string | null;
  region: string | null;
  year: number | null;
  /** The official narrative from the table's description column. */
  description: string;
  dvids_url: string | null;
  videos: AaroVideo[];
}

export interface AaroDocument {
  title: string;
  url: string;
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: "-", mdash: ", ",
  hellip: "...", deg: " degrees",
};

function decode(text: string): string {
  return text
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function absolute(url: string): string {
  return url.startsWith("http") ? url : `${ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Verdicts AARO uses, longest first so the specific ones win. */
const DISPOSITIONS = [
  "UAP Report Resolved as a Balloon",
  "UAP Report Closed as Not Anomalous",
  "UAP Report Undergoing Analysis",
  "Resolved as Migratory Birds",
  "Unresolved UAP Report",
  "Resolved as Birds",
  "Unresolved Case",
];

const REGIONS = [
  "Middle East", "South Asian", "Western U.S.", "Europe", "Africa",
  "Puerto Rico", "South Asia",
];

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/**
 * Seconds from a phrase like "13 second" or "two minutes and eight seconds".
 *
 * Returns null rather than guessing. A duration is a fact about the file and
 * we would rather omit it than state one nobody wrote down.
 */
export function parseDuration(label: string): number | null {
  const text = label.toLowerCase();
  const value = (token: string | undefined): number =>
    token === undefined ? 0 : (NUMBER_WORDS[token] ?? (Number(token) || 0));

  const minutes = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+minutes?/.exec(text);
  const seconds = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+seconds?/.exec(text);

  const total = value(minutes?.[1]) * 60 + value(seconds?.[1]);
  return total > 0 ? total : null;
}

export function parseTitle(title: string): {
  disposition: string | null;
  region: string | null;
  year: number | null;
} {
  const disposition = DISPOSITIONS.find((d) =>
    title.toLowerCase().includes(d.toLowerCase()),
  );
  const region = REGIONS.find((r) => title.toLowerCase().includes(r.toLowerCase()));

  // The year sits at the end of these titles ("Europe 2024"). Taking the last
  // match avoids a case id such as PR-2019 being read as a date.
  const years = [...title.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((m) => Number(m[1]));

  return {
    disposition: disposition ?? null,
    region: region ?? null,
    year: years.length > 0 ? years[years.length - 1] : null,
  };
}

/** Parses the official imagery page into cases. Exported for testing offline. */
export function parseImageryPage(html: string): AaroCase[] {
  // The videos live in hidden divs keyed by the same id as the table row, so
  // the two halves are joined on that id rather than on document order.
  const videosById = new Map<string, AaroVideo[]>();

  for (const block of html.matchAll(
    /id="extra-([^"]+)"([\s\S]*?)(?=<div class="hidden-extra"|<\/body>)/gi,
  )) {
    const id = block[1];
    const videos: AaroVideo[] = [];

    for (const tag of block[2].matchAll(/<video\b[^>]*>/gi)) {
      const attr = (name: string) =>
        new RegExp(`${name}="([^"]*)"`, "i").exec(tag[0])?.[1] ?? null;

      const src = attr("src");
      if (!src) continue;

      const label = decode(attr("aria-label") ?? "").trim();
      videos.push({
        url: absolute(src),
        poster: attr("poster") ? absolute(attr("poster")!) : null,
        description: label,
        duration_seconds: parseDuration(label),
      });
    }

    if (videos.length > 0) videosById.set(id, videos);
  }

  const cases: AaroCase[] = [];

  for (const row of html.matchAll(/<tr data-id="([^"]+)"([\s\S]*?)<\/tr>/gi)) {
    const id = row[1];
    const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 4) continue;

    const title = stripTags(cells[1]);
    const dvids = /href="([^"]+)"/i.exec(cells[2])?.[1] ?? null;
    const { disposition, region, year } = parseTitle(title);

    cases.push({
      id,
      title,
      disposition,
      region,
      year,
      description: stripTags(cells[3]),
      dvids_url: dvids ? absolute(dvids) : null,
      videos: videosById.get(id) ?? [],
    });
  }

  return cases;
}

export function parseDocumentLinks(html: string): AaroDocument[] {
  const seen = new Map<string, AaroDocument>();

  for (const m of html.matchAll(/href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = absolute(m[1]);
    const text = stripTags(m[2]);
    if (!seen.has(url)) {
      seen.set(url, {
        // Falls back to the filename, which AARO names descriptively.
        title:
          text ||
          decodeURIComponent(url.split("/").pop() ?? "")
            .replace(/\.pdf$/i, "")
            .replace(/[_-]+/g, " ")
            .trim(),
        url,
      });
    }
  }

  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function getPage(path: string): Promise<string> {
  const response = await fetch(`${ORIGIN}${path}`, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(
      `AARO returned ${response.status} for ${path}. The site rejects some user ` +
        "agents, so if this started failing, check whether anything began setting one.",
    );
  }
  return response.text();
}

export async function fetchOfficialImagery(): Promise<AaroCase[]> {
  return parseImageryPage(await getPage(IMAGERY_PATH));
}

export async function fetchCaseResolutionReports(): Promise<AaroDocument[]> {
  return parseDocumentLinks(await getPage(REPORTS_PATH));
}

// ---------------------------------------------------------------------------
// Dossier
// ---------------------------------------------------------------------------

const AARO_SOURCE: DossierSource = {
  name: "All-domain Anomaly Resolution Office (AARO)",
  url: `${ORIGIN}${IMAGERY_PATH}`,
  tier: "official",
};

/** Dispositions that name a conventional cause rather than leaving it open. */
function resolvesToCause(disposition: string | null): boolean {
  if (!disposition) return false;
  return /resolved as|not anomalous/i.test(disposition);
}

/**
 * Builds a dossier from one AARO case.
 *
 * This is the first source able to populate "what the footage shows", and it
 * does so from an official description rather than from anyone's impression.
 * Note what is still refused: the disposition enters as AARO's stated finding,
 * not as our classification, so "Resolved as a Balloon" reaches the classifier
 * as evidence to weigh rather than as a verdict to copy.
 */
export function dossierFromAaroCase(record: AaroCase): Dossier {
  const dossier = createDossier(`AARO ${record.id}: ${record.title}`);

  for (const video of record.videos) {
    if (!video.description) continue;
    addFact(dossier, {
      kind: "footage",
      statement: `AARO describes the released footage: ${video.description}`,
      sources: [AARO_SOURCE],
    });
  }

  if (record.description) {
    addFact(dossier, {
      kind: "official",
      statement: record.description,
      attributed_to: "AARO",
      sources: [AARO_SOURCE],
    });
  }

  if (record.disposition) {
    addFact(dossier, {
      kind: resolvesToCause(record.disposition) ? "explanation" : "official",
      statement: `AARO records this case as "${record.disposition}".`,
      attributed_to: "AARO",
      sources: [AARO_SOURCE],
    });
  }

  if (record.year) {
    addFact(dossier, {
      kind: "event_date",
      statement: `AARO dates this case to ${record.year}.`,
      value: `${record.year}-01-01`,
      // The title gives a year and no more, so the archive claims no more.
      precision: "year",
      sources: [AARO_SOURCE],
    });
  }

  // The narrative is frequently more precise than the title. "Mt. Etna Object"
  // carries no date at all, while its description opens "In December 2018".
  // Reading both means the better date wins through consensusDate rather than
  // being lost because it was in the wrong column.
  for (const date of resolveDates(record.description, new Date().toISOString())) {
    addFact(dossier, {
      kind: "event_date",
      statement: `AARO's account of this case gives the date as ${date.basis}.`,
      value: date.value,
      precision: date.precision,
      attributed_to: "AARO",
      sources: [AARO_SOURCE],
    });
  }

  if (record.region) {
    addFact(dossier, {
      kind: "location",
      statement: `AARO places this case in ${record.region}.`,
      value: record.region.toLowerCase(),
      sources: [AARO_SOURCE],
    });
    addUnresolved(
      dossier,
      `AARO gives the location only as ${record.region}, which is a continent or region rather than a place. No coordinates are published, so this case cannot carry a map pin.`,
    );
  }

  for (const video of record.videos) {
    addMedia(dossier, {
      kind: "video",
      url: video.url,
      description:
        video.description ||
        `Official AARO video for ${record.id}, no description published.`,
      source: AARO_SOURCE,
    });
  }

  // Standing gaps on this material, worth stating because a reader of an
  // official release will assume more was disclosed than actually was.
  addUnresolved(
    dossier,
    "AARO publishes the imagery without the sensor type, the platform, the exact date or the reporting unit, so none of those are established here.",
  );

  if (!record.disposition) {
    addUnresolved(dossier, "AARO states no disposition for this case.");
  }

  return dossier;
}
