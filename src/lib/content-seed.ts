/**
 * The seed implementation of the content layer.
 *
 * Serves the hand-entered cases in src/data. Used until Supabase credentials
 * are present, and kept afterwards so the site still runs offline and so a
 * missing environment variable degrades to a working site rather than a blank
 * one.
 */

import { SEED_CASES } from "@/data/cases";
import { SEED_SCIENCE } from "@/data/science";
import type {
  ArchiveCounts,
  CaseFilters,
  ScienceFilters,
} from "@/lib/content-types";
import type {
  CaseRecord,
  CaseSummary,
  CaseTranslation,
  Classification,
  ScienceRecord,
} from "@/lib/types";

const published = <T extends { published: boolean }>(rows: T[]) =>
  rows.filter((r) => r.published);

/** Newest first, with undated cases last rather than pretending to be old. */
function byDateDesc(
  a: { date_of_event: string | null },
  b: { date_of_event: string | null },
) {
  if (!a.date_of_event && !b.date_of_event) return 0;
  if (!a.date_of_event) return 1;
  if (!b.date_of_event) return -1;
  return b.date_of_event.localeCompare(a.date_of_event);
}

function toSummary(c: CaseRecord): CaseSummary {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    classification: c.classification,
    continent: c.continent,
    country: c.country,
    location_name: c.location_name,
    date_of_event: c.date_of_event,
    date_precision: c.date_precision,
    view_count: c.view_count,
    primary_media:
      c.media.find((m) => m.role === "primary") ?? c.media[0] ?? null,
  };
}

export async function listCases(
  filters: CaseFilters = {},
): Promise<CaseSummary[]> {
  let rows = published(SEED_CASES);

  if (filters.classification)
    rows = rows.filter((c) => c.classification === filters.classification);
  if (filters.continent)
    rows = rows.filter((c) => c.continent === filters.continent);
  if (filters.country) rows = rows.filter((c) => c.country === filters.country);
  if (filters.tag)
    rows = rows.filter((c) => c.tags.some((t) => t.slug === filters.tag));

  return rows.sort(byDateDesc).map(toSummary);
}

export async function getCaseBySlug(slug: string): Promise<CaseRecord | null> {
  return published(SEED_CASES).find((c) => c.slug === slug) ?? null;
}

/**
 * The seed carries no translations. Returning an empty list rather than
 * throwing means the language switcher simply does not appear, which is the
 * honest answer when there is nothing to switch to.
 */
export async function listCaseTranslations(
  _slug: string,
): Promise<CaseTranslation[]> {
  return [];
}

export async function getAllCaseSlugs(): Promise<string[]> {
  return published(SEED_CASES).map((c) => c.slug);
}

export async function getRelatedCases(
  slug: string,
  limit = 3,
): Promise<CaseSummary[]> {
  const current = published(SEED_CASES).find((c) => c.slug === slug);
  if (!current) return [];

  const tagSlugs = new Set(current.tags.map((t) => t.slug));

  return published(SEED_CASES)
    .filter((c) => c.slug !== slug)
    .map((c) => ({
      row: c,
      overlap: c.tags.filter((t) => tagSlugs.has(t.slug)).length,
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || byDateDesc(a.row, b.row))
    .slice(0, limit)
    .map((x) => toSummary(x.row));
}

export async function getLatestCases(limit = 8): Promise<CaseSummary[]> {
  return published(SEED_CASES)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || byDateDesc(a, b))
    .slice(0, limit)
    .map(toSummary);
}

export async function getAcknowledgedCases(limit = 6): Promise<CaseSummary[]> {
  return published(SEED_CASES)
    .filter((c) => c.classification === "acknowledged")
    .sort(byDateDesc)
    .slice(0, limit)
    .map(toSummary);
}

/**
 * A rotating selection rather than true randomness. Math.random() on a
 * prerendered page freezes at build time anyway, and differing between server
 * and client would trip hydration. Rotating on the day gives the same "there
 * is always something new" feel with none of that.
 */
export async function getRotatingCases(limit = 8): Promise<CaseSummary[]> {
  const rows = published(SEED_CASES);
  if (rows.length === 0) return [];

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const offset = dayIndex % rows.length;

  return Array.from({ length: Math.min(limit, rows.length) }, (_, i) =>
    toSummary(rows[(offset + i) % rows.length]),
  );
}

export async function searchCases(query: string): Promise<CaseSummary[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/);

  return published(SEED_CASES)
    .filter((c) => {
      const haystack = [
        c.title,
        c.summary,
        c.location_name,
        c.country,
        c.body_footage,
        c.body_testimony,
        c.body_status,
        ...c.tags.map((t) => t.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return terms.every((t) => haystack.includes(t));
    })
    .sort(byDateDesc)
    .map(toSummary);
}

export async function getArchiveCounts(): Promise<ArchiveCounts> {
  const rows = published(SEED_CASES);

  const byClassification = {
    acknowledged: 0,
    unverified: 0,
    likely_explained: 0,
    debunked: 0,
  } as Record<Classification, number>;

  const byContinent: Record<string, number> = {};
  const countryTally: Record<string, number> = {};

  for (const c of rows) {
    byClassification[c.classification] += 1;
    byContinent[c.continent] = (byContinent[c.continent] ?? 0) + 1;
    if (c.country) countryTally[c.country] = (countryTally[c.country] ?? 0) + 1;
  }

  return {
    cases: rows.length,
    science: published(SEED_SCIENCE).length,
    // "Unknown location" is a bucket, not a continent, so it is not counted.
    continents: Object.keys(byContinent).filter((k) => k !== "unknown").length,
    byClassification,
    byContinent,
    byCountry: Object.entries(countryTally)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country)),
  };
}

export async function listScience(
  filters: ScienceFilters = {},
): Promise<ScienceRecord[]> {
  let rows = published(SEED_SCIENCE);
  if (filters.topic) rows = rows.filter((e) => e.topic === filters.topic);

  return rows.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function getScienceBySlug(
  slug: string,
): Promise<ScienceRecord | null> {
  return published(SEED_SCIENCE).find((e) => e.slug === slug) ?? null;
}

export async function getAllScienceSlugs(): Promise<string[]> {
  return published(SEED_SCIENCE).map((e) => e.slug);
}

export async function searchScience(query: string): Promise<ScienceRecord[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/);

  return published(SEED_SCIENCE).filter((e) => {
    const haystack = [
      e.title,
      e.summary,
      e.body_found,
      e.body_why,
      ...e.institutions,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return terms.every((t) => haystack.includes(t));
  });
}
