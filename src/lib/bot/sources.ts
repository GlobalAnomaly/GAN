/**
 * The source registry, as data the pipeline reads rather than a document a
 * person reads.
 *
 * `docs/source-registry.md` remains the working record and the place where
 * reasoning about each source lives. It is organised by licence class, which
 * is the right axis for deciding what may be published and the wrong one for
 * deciding what to do next. This file adds the axis the pipeline needs.
 *
 * **Two roles, and the distinction is not cosmetic.**
 *
 * A *harvest* source produces records. Walking it yields candidates that did
 * not exist before: AARO's imagery page, a YouTube channel, Blue Book's
 * microfilm, UFOCAT's tables. Harvesting is the expensive one-off, and after
 * the first pass it only needs whatever is new since last time.
 *
 * A *support* source answers questions about a record we already hold. It is
 * never walked and never produces candidates. Wikipedia, Chronicling America,
 * GDELT and a search engine are consulted about a specific event on a specific
 * date, and most of the time they have nothing, which is a normal outcome.
 *
 * Several sources are both, and that is fine: AARO is walked for its 32 cases
 * and consulted about anything military and American.
 *
 * **Coverage exists so enrichment does not waste itself.** Chronicling America
 * stops in 1963 and GDELT starts in 2015, so asking either about the other's
 * period is a guaranteed miss that still costs a request and a delay. The
 * operator's instruction is that accuracy is worth burning time for, and that
 * is exactly why the time must be burned on lookups that can succeed.
 *
 * **A source nobody has licence-cleared cannot be harvested.** `status` gates
 * it in code, the same way `may_publish_narrative` gates serving narrative.
 * The default for anything new is the restrictive one.
 */

export type SourceRole =
  /** Produces new candidate records when walked. */
  | "harvest"
  /** Consulted about a record we already have. Never walked. */
  | "support"
  | "both";

export type SourceStatus =
  /** Licence understood, cleared to use. */
  | "verified"
  /** Usable, with the condition named in `condition`. */
  | "conditional"
  /** Licence not checked. Assume nothing and do not fetch. */
  | "unchecked"
  /** Needs written permission before anything is published from it. */
  | "needs_permission"
  /** Do not use. */
  | "blocked";

export type AccessMethod =
  /** A documented API, usually free and usually rate limited. */
  | "api"
  /** A file to download once: Excel, CSV, bulk dump, database. */
  | "bulk"
  /** Server-rendered HTML we parse. */
  | "html"
  /** Scanned images needing extraction before anything is readable. */
  | "scanned"
  /** A person requests it, one at a time. No bot does this. */
  | "manual";

export interface SourceCoverage {
  /** Earliest year with meaningful material, or null for no lower bound. */
  from: number | null;
  /** Latest year, or null for ongoing. */
  to: number | null;
  /**
   * ISO country codes this source covers, or null for worldwide. Used the same
   * way as the year range: to avoid asking a US newspaper archive about a
   * Brazilian case.
   */
  countries: string[] | null;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  role: SourceRole;
  status: SourceStatus;
  access: AccessMethod;
  coverage: SourceCoverage;
  /**
   * Whether narrative text from this source may ever be served to a reader.
   * False means facts only: ingest the date and the place, write our own
   * prose. This is the flag that stops publishing code serving what we have no
   * right to serve, and it defaults to false for anything unexamined.
   */
  may_publish_narrative: boolean;
  attribution_required: boolean;
  /** Named condition, required when status is conditional or needs_permission. */
  condition?: string;
  /**
   * Whether the source can be asked for only what is new since a date. Without
   * this, keeping up to date means re-walking everything, which is affordable
   * for a 32 row page and not for 300,000 records.
   */
  supports_date_range: boolean;
  /** Roughly how many records a full harvest yields, where known. */
  approximate_records?: number;
  /** Anything a future reader needs in order to disagree with a decision. */
  note?: string;
}

const WORLDWIDE: SourceCoverage = { from: null, to: null, countries: null };

// ---------------------------------------------------------------------------
// Harvest: sources that produce records
// ---------------------------------------------------------------------------

export const HARVEST_SOURCES: Source[] = [
  {
    id: "aaro-imagery",
    name: "AARO official UAP imagery",
    url: "https://www.aaro.mil/UAP-Cases/Official-UAP-Imagery/",
    role: "both",
    status: "verified",
    access: "html",
    coverage: { from: 2004, to: null, countries: null },
    may_publish_narrative: true,
    attribution_required: true,
    supports_date_range: false,
    approximate_records: 32,
    note:
      "US federal public domain, so the files may be hosted rather than embedded. " +
      "The only source so far that describes its own footage, via the accessibility " +
      "label on each video. Built and tested in aaro.ts.",
  },
  {
    id: "aaro-reports",
    name: "AARO case resolution reports",
    url: "https://www.aaro.mil/UAP-Cases/UAP-Case-Resolution-Reports/",
    role: "both",
    status: "verified",
    access: "html",
    coverage: { from: 2004, to: null, countries: null },
    may_publish_narrative: true,
    attribution_required: true,
    supports_date_range: false,
    approximate_records: 9,
    note: "PDFs. Needs text extraction, which is the highest value unbuilt input.",
  },
  {
    id: "nara-uap",
    name: "NARA UAP Record Collection (Record Group 615)",
    url: "https://www.archives.gov/research/topics/uaps",
    role: "harvest",
    status: "verified",
    access: "bulk",
    coverage: { from: 1947, to: null, countries: ["US"] },
    may_publish_narrative: true,
    attribution_required: true,
    supports_date_range: true,
    note: "Still receiving records, so date-range updates matter here.",
  },
  {
    id: "blue-book",
    name: "Project Blue Book",
    url: "https://www.archives.gov/research/military/air-force/ufos",
    role: "harvest",
    status: "verified",
    access: "scanned",
    coverage: { from: 1947, to: 1969, countries: ["US"] },
    may_publish_narrative: true,
    attribution_required: true,
    supports_date_range: false,
    approximate_records: 12618,
    note:
      "701 unidentified. Closed in 1969, so it is harvested once and never again. " +
      "Microfilm, so extraction and geocoding are the real work.",
  },
  {
    id: "ufocat",
    name: "UFOCAT 2023 (CUFOS)",
    url: "https://www.cufos.org/",
    role: "harvest",
    status: "needs_permission",
    access: "bulk",
    coverage: { from: 34, to: 2023, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    condition:
      "Copyright CUFOS. Publishing extracted material needs written permission. " +
      "Facts may be used and our own prose written from them; NOTES is never served.",
    supports_date_range: false,
    approximate_records: 306817,
    note:
      "Already extracted to .pipeline/. Its PRN groupings are the validation set " +
      "for our own matcher and are never shipped.",
  },
  {
    id: "geipan",
    name: "GEIPAN (CNES, France)",
    url: "https://www.cnes-geipan.fr/fr/recherche/cas",
    role: "harvest",
    status: "needs_permission",
    access: "bulk",
    coverage: { from: 1937, to: null, countries: ["FR"] },
    may_publish_narrative: false,
    attribution_required: true,
    condition:
      "Terms forbid extraction outright and assert all rights reserved to CNES. " +
      "France's implementation of the EU database right means the facts-are-free " +
      "argument does not rescue this one. Checked 27 July 2026.",
    supports_date_range: true,
    approximate_records: 3368,
  },
  {
    id: "uk-national-archives",
    name: "UK National Archives UFO files",
    url: "https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/postwar/ufo-reports/",
    role: "harvest",
    status: "unchecked",
    access: "bulk",
    coverage: { from: 1950, to: 2009, countries: ["GB"] },
    may_publish_narrative: false,
    attribution_required: true,
    supports_date_range: false,
    approximate_records: 11000,
    note: "209 files, ~52,000 pages. Confirm Open Government Licence: Crown copyright normally is.",
  },
  {
    id: "brazil-fab",
    name: "Arquivo Nacional and FAB (Brazil)",
    url: "https://www.gov.br/arquivonacional/",
    role: "harvest",
    status: "unchecked",
    access: "bulk",
    coverage: { from: 1952, to: 2016, countries: ["BR"] },
    may_publish_narrative: false,
    attribution_required: true,
    supports_date_range: false,
    approximate_records: 4500,
    note: "Pairs with the Portuguese translation, and holds Varginha.",
  },
  {
    id: "youtube",
    name: "YouTube channels and searches",
    url: "https://www.youtube.com/",
    role: "harvest",
    status: "conditional",
    access: "api",
    coverage: { from: 2005, to: null, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    condition:
      "Embed, never rehost. An uploader who disabled embedding has said no. " +
      "Title and description are the uploader's claims, never a description of footage.",
    supports_date_range: true,
    note:
      "playlistItems.list costs 1 unit per 50 videos against search.list at 100, so " +
      "walking a channel is ~50x cheaper. Quota is not the constraint: a full night " +
      "used 224 of 10,000. Model throughput is.",
  },
  {
    id: "nuforc",
    name: "NUFORC databank",
    url: "https://nuforc.org/databank/",
    role: "harvest",
    status: "needs_permission",
    access: "bulk",
    coverage: { from: 1400, to: null, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    condition:
      "Terms forbid scraping and redistribution and prohibit any commercial use. " +
      "Their terms forbid taking and nothing forbids asking: their CTO reportedly " +
      "provides data on request, which is the only legitimate route.",
    supports_date_range: true,
    approximate_records: 159320,
  },
];

// ---------------------------------------------------------------------------
// Support: sources consulted about a record we already hold
// ---------------------------------------------------------------------------

export const SUPPORT_SOURCES: Source[] = [
  {
    id: "wikipedia",
    name: "Wikipedia",
    url: "https://en.wikipedia.org/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: WORLDWIDE,
    may_publish_narrative: false,
    attribution_required: true,
    supports_date_range: false,
    note:
      "CC BY-SA, so facts and citations are taken and prose is written fresh. " +
      "Strong on notable events and silent on everything else: it has no article " +
      "on the Las Vegas 2023 case. Built in wikipedia.ts.",
  },
  {
    id: "wikidata",
    name: "Wikidata",
    url: "https://www.wikidata.org/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: WORLDWIDE,
    may_publish_narrative: true,
    attribution_required: false,
    supports_date_range: false,
    note: "CC0, an outright public domain dedication. Dates and coordinates for notable incidents.",
  },
  {
    id: "chronicling-america",
    name: "Chronicling America (Library of Congress)",
    url: "https://chroniclingamerica.loc.gov/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: { from: 1777, to: 1963, countries: ["US"] },
    may_publish_narrative: true,
    attribution_required: true,
    supports_date_range: false,
    note:
      "Public domain, full text, has an API, and nobody in this field queries it " +
      "systematically. Lands on the 1947 wave, the 1952 Washington flap and the " +
      "1897 airships with contemporaneous local reporting. The 1963 cutoff is hard.",
  },
  {
    id: "trove",
    name: "Trove (National Library of Australia)",
    url: "https://trove.nla.gov.au/",
    role: "support",
    status: "conditional",
    access: "api",
    coverage: { from: 1803, to: 1995, countries: ["AU"] },
    may_publish_narrative: false,
    attribution_required: true,
    condition: "API key required, free on request.",
    supports_date_range: false,
    note: "The Australian equivalent of Chronicling America.",
  },
  {
    id: "gdelt",
    name: "GDELT",
    url: "https://www.gdeltproject.org/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: { from: 2015, to: null, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    supports_date_range: true,
    note:
      "Current news index, free API. Covers exactly the period Chronicling America " +
      "does not, and neither covers 1963 to 2015, which is where UFOCAT is densest.",
  },
  {
    id: "internet-archive",
    name: "Internet Archive and Wayback Machine",
    url: "https://archive.org/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: { from: 1996, to: null, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    supports_date_range: true,
    note:
      "The CDX API is also the fix for dead embeds: a video that disappears can be " +
      "shown to have existed, with what it was.",
  },
  {
    id: "ufo-newsclipping-service",
    name: "UFO Newsclipping Service (via AFU)",
    url: "https://archive.org/details/UFO_Newsclipping_Service_1978_12_no_113",
    role: "support",
    status: "conditional",
    access: "api",
    coverage: { from: 1970, to: 2009, countries: null },
    may_publish_narrative: false,
    attribution_required: true,
    condition:
      "Clipping copyright stays with the newspapers, so the finding-aid rule applies: " +
      "it names the paper and the date, and we cite the paper.",
    supports_date_range: false,
    note:
      "~470 monthly issues, ~9,400 OCR'd pages, covering precisely the decades the " +
      "national newspaper archives miss and UFOCAT is densest.",
  },
  {
    id: "govinfo",
    name: "govinfo (US Government Publishing Office)",
    url: "https://www.govinfo.gov/",
    role: "support",
    status: "verified",
    access: "api",
    coverage: { from: 1994, to: null, countries: ["US"] },
    may_publish_narrative: true,
    attribution_required: false,
    supports_date_range: true,
    note:
      "Public domain. Congressional hearing transcripts, including the 26 July 2023 " +
      "House Oversight hearing. Sworn testimony from named witnesses is unusually " +
      "well suited to the editorial rules.",
  },
  {
    id: "searxng",
    name: "SearXNG (self-hosted)",
    url: "http://localhost:8080/",
    role: "support",
    status: "conditional",
    access: "api",
    coverage: WORLDWIDE,
    may_publish_narrative: false,
    attribution_required: false,
    condition:
      "Self-hosted, requires SEARXNG_URL to be set, and JSON output enabled in " +
      "settings.yml. It queries upstream engines on our behalf, so favour those that " +
      "tolerate automation and treat Google results as a bonus rather than a backbone.",
    supports_date_range: true,
    note:
      "The catch-all for everything the specific sources miss, which is most of this " +
      "material. Off unless configured.",
  },
];

export const ALL_SOURCES: Source[] = [...HARVEST_SOURCES, ...SUPPORT_SOURCES];

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** Statuses that permit fetching at all. */
const FETCHABLE: ReadonlySet<SourceStatus> = new Set<SourceStatus>([
  "verified",
  "conditional",
]);

/**
 * Whether a source may be fetched right now.
 *
 * `unchecked` is refused deliberately. A source whose licence nobody has read
 * is not a source we are allowed to walk, and treating silence as permission
 * is how a project acquires a problem it cannot undo.
 */
export function isFetchable(source: Source): boolean {
  return FETCHABLE.has(source.status);
}

export function sourceById(id: string): Source | undefined {
  return ALL_SOURCES.find((s) => s.id === id);
}

/** Harvest sources cleared to walk, which is not all of them. */
export function harvestable(): Source[] {
  return HARVEST_SOURCES.filter(isFetchable);
}

export interface RecordContext {
  /** ISO date of the event, or null when unknown. */
  occurred_at: string | null;
  /** ISO country code, or null. */
  country: string | null;
}

/**
 * The support sources worth asking about one record.
 *
 * Filtering on coverage is not an optimisation, it is what makes a slow,
 * thorough enrichment affordable. Asking Chronicling America about a 2023
 * sighting is a guaranteed miss that still costs a request, a rate limit slot
 * and a delay, and doing that across every source for every cluster is how a
 * stage becomes too slow to ever run.
 *
 * A record with no date gets everything without a date restriction, because we
 * cannot rule anything out and guessing would be the wrong kind of confident.
 */
export function supportSourcesFor(record: RecordContext): Source[] {
  const year = record.occurred_at ? Number(record.occurred_at.slice(0, 4)) : null;

  return SUPPORT_SOURCES.filter((source) => {
    if (!isFetchable(source)) return false;

    const { from, to, countries } = source.coverage;

    if (year !== null) {
      if (from !== null && year < from) return false;
      if (to !== null && year > to) return false;
    } else if (from !== null || to !== null) {
      // A dated source cannot be asked about an undated record without
      // pretending to know something. Only the unbounded ones apply.
      return false;
    }

    if (countries && record.country && !countries.includes(record.country)) {
      return false;
    }

    return true;
  });
}

/**
 * The coverage gap, stated rather than discovered later.
 *
 * Free full-text newspaper archives are mostly pre-1963 and the current news
 * indexes start around 2015. UFOCAT is densest in the 1970s to 1990s, so the
 * general archives help least exactly where the archive holds most material.
 * The UFO Newsclipping Service is the one source that covers it, which is why
 * AFU is the most valuable contact on the list.
 */
export function coverageGap(): { from: number; to: number; covered_by: string[] } {
  return {
    from: 1964,
    to: 2014,
    covered_by: SUPPORT_SOURCES.filter((s) => {
      const { from, to } = s.coverage;
      return (from ?? 0) <= 1990 && (to ?? 9999) >= 1990;
    }).map((s) => s.id),
  };
}
