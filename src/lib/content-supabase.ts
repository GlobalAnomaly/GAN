/**
 * The Supabase implementation of the content layer.
 *
 * Reads through the anon key, so row-level security decides what is visible.
 * Every query here could ask for unpublished rows and would still get none.
 * The `published` filters below are for index selectivity and clarity, not
 * for safety: the safety lives in the database.
 */

import { getSupabase } from "@/lib/supabase";
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

/** Columns needed for a card, so list queries do not drag whole bodies over. */
const SUMMARY_COLUMNS =
  "id, title, slug, summary, classification, continent, country, location_name, " +
  "date_of_event, date_precision, view_count, lat, lng, coord_precision, media(*)";

const FULL_CASE_COLUMNS =
  "*, media(*), documents(*), sources(*), case_tags(tags(*))";

const FULL_SCIENCE_COLUMNS = "*, science_images(*), science_sources(*)";

function db() {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. The content layer should have routed to " +
        "the seed implementation instead of calling this module.",
    );
  }
  return client;
}

/** Supabase returns joined rows untyped, so shapes are narrowed on the way in. */
type Row = Record<string, unknown>;

/**
 * Result rows, as plain records.
 *
 * The typed client widens `data` to a union that includes an error shape when
 * it cannot statically parse a select string containing joins, which ours all
 * do. Taking `unknown` here narrows in one place instead of sprinkling double
 * casts through every query.
 */
function rowsOf(data: unknown): Row[] {
  return (data ?? []) as Row[];
}

function sortMedia(media: Row[] = []) {
  return [...media].sort((a, b) => {
    const ar = a.role === "primary" ? 0 : 1;
    const br = b.role === "primary" ? 0 : 1;
    if (ar !== br) return ar - br;
    return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
  });
}

function bySortOrder(rows: Row[] = []) {
  return [...rows].sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
  );
}

function toSummary(row: Row): CaseSummary {
  const media = sortMedia(row.media as Row[]);
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    summary: String(row.summary ?? ""),
    classification: row.classification as CaseSummary["classification"],
    continent: row.continent as CaseSummary["continent"],
    country: (row.country as string | null) ?? null,
    location_name: (row.location_name as string | null) ?? null,
    date_of_event: (row.date_of_event as string | null) ?? null,
    date_precision:
      (row.date_precision as CaseSummary["date_precision"]) ?? "day",
    view_count: Number(row.view_count ?? 0),
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    coord_precision:
      (row.coord_precision as CaseSummary["coord_precision"]) ?? "exact",
    primary_media: (media[0] as unknown as CaseSummary["primary_media"]) ?? null,
  };
}

function toCase(row: Row): CaseRecord {
  // case_tags arrives as [{ tags: {...} }], so the join row is unwrapped.
  const tags = ((row.case_tags as Row[]) ?? [])
    .map((ct) => ct.tags)
    .filter(Boolean) as unknown as CaseRecord["tags"];

  return {
    ...(row as unknown as CaseRecord),
    summary: String(row.summary ?? ""),
    body_footage: String(row.body_footage ?? ""),
    body_testimony: String(row.body_testimony ?? ""),
    body_status: String(row.body_status ?? ""),
    body_unknown: String(row.body_unknown ?? ""),
    classification_reason: String(row.classification_reason ?? ""),
    media: sortMedia(row.media as Row[]) as unknown as CaseRecord["media"],
    documents: bySortOrder(
      row.documents as Row[],
    ) as unknown as CaseRecord["documents"],
    sources: bySortOrder(
      row.sources as Row[],
    ) as unknown as CaseRecord["sources"],
    tags,
  };
}

function toScience(row: Row): ScienceRecord {
  return {
    ...(row as unknown as ScienceRecord),
    summary: String(row.summary ?? ""),
    body_found: String(row.body_found ?? ""),
    body_how: String(row.body_how ?? ""),
    body_why: String(row.body_why ?? ""),
    body_caveat: String(row.body_caveat ?? ""),
    institutions: (row.institutions as string[]) ?? [],
    images: bySortOrder(
      row.science_images as Row[],
    ) as unknown as ScienceRecord["images"],
    sources: bySortOrder(
      row.science_sources as Row[],
    ) as unknown as ScienceRecord["sources"],
  };
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`Supabase ${context} failed: ${error?.message ?? "unknown"}`);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export async function listCases(
  filters: CaseFilters = {},
): Promise<CaseSummary[]> {
  // A tag filter needs the join table, so it takes a different path.
  if (filters.tag) {
    const { data, error } = await db()
      .from("case_tags")
      .select(`cases!inner(${SUMMARY_COLUMNS}), tags!inner(slug)`)
      .eq("tags.slug", filters.tag);

    if (error) fail("listCases(tag)", error);

    let rows = (rowsOf(data))
      .map((r) => r.cases as Row)
      .filter(Boolean);

    if (filters.classification)
      rows = rows.filter((r) => r.classification === filters.classification);
    if (filters.continent)
      rows = rows.filter((r) => r.continent === filters.continent);
    if (filters.country)
      rows = rows.filter((r) => r.country === filters.country);

    return rows
      .map(toSummary)
      .sort((a, b) => (b.date_of_event ?? "").localeCompare(a.date_of_event ?? ""));
  }

  let query = db()
    .from("cases")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .order("date_of_event", { ascending: false, nullsFirst: false });

  if (filters.classification)
    query = query.eq("classification", filters.classification);
  if (filters.continent) query = query.eq("continent", filters.continent);
  if (filters.country) query = query.eq("country", filters.country);

  const { data, error } = await query;
  if (error) fail("listCases", error);

  return (rowsOf(data)).map(toSummary);
}

export async function getCaseBySlug(slug: string): Promise<CaseRecord | null> {
  const { data, error } = await db()
    .from("cases")
    .select(FULL_CASE_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) fail("getCaseBySlug", error);
  return data ? toCase(data as Row) : null;
}

/**
 * Translations for a case, keyed by its slug.
 *
 * Fetched separately from the case rather than joined into it, because the
 * English page is statically prerendered and must not carry four languages of
 * body text it will probably never show.
 */
export async function listCaseTranslations(
  slug: string,
): Promise<CaseTranslation[]> {
  const { data, error } = await db()
    .from("case_translations")
    .select(
      "lang, title, summary, body_footage, body_testimony, body_status, body_unknown, is_machine, cases!inner(slug, published)",
    )
    .eq("cases.slug", slug)
    .eq("cases.published", true);

  if (error) fail("listCaseTranslations", error);

  return rowsOf(data)
    .map((r) => ({
      lang: r.lang as CaseTranslation["lang"],
      title: String(r.title ?? ""),
      summary: String(r.summary ?? ""),
      body_footage: String(r.body_footage ?? ""),
      body_testimony: String(r.body_testimony ?? ""),
      body_status: String(r.body_status ?? ""),
      body_unknown: String(r.body_unknown ?? ""),
      is_machine: r.is_machine !== false,
    }))
    // A translation missing its title or its unknowns section is not offered
    // at all: a half-translated account reads as a broken page and, worse, can
    // silently drop the honesty the English version carried.
    .filter((t) => t.title && t.body_unknown);
}

export async function getAllCaseSlugs(): Promise<string[]> {
  const { data, error } = await db()
    .from("cases")
    .select("slug")
    .eq("published", true);

  if (error) fail("getAllCaseSlugs", error);
  return (rowsOf(data)).map((r) => String(r.slug));
}

export async function getRelatedCases(
  slug: string,
  limit = 3,
): Promise<CaseSummary[]> {
  const { data: current, error: currentError } = await db()
    .from("cases")
    .select("id, case_tags(tag_id)")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (currentError) fail("getRelatedCases(current)", currentError);
  if (!current) return [];

  const tagIds = (((current as Row).case_tags as Row[]) ?? []).map((t) =>
    String(t.tag_id),
  );
  if (tagIds.length === 0) return [];

  const { data, error } = await db()
    .from("case_tags")
    .select(`case_id, cases!inner(${SUMMARY_COLUMNS})`)
    .in("tag_id", tagIds)
    .neq("case_id", String((current as Row).id));

  if (error) fail("getRelatedCases", error);

  // Rank by how many tags each candidate shares with the current case.
  const overlap = new Map<string, { row: Row; count: number }>();
  for (const r of rowsOf(data)) {
    const id = String(r.case_id);
    const existing = overlap.get(id);
    if (existing) existing.count += 1;
    else overlap.set(id, { row: r.cases as Row, count: 1 });
  }

  return [...overlap.values()]
    .filter((x) => x.row)
    .sort(
      (a, b) =>
        b.count - a.count ||
        String(b.row.date_of_event ?? "").localeCompare(
          String(a.row.date_of_event ?? ""),
        ),
    )
    .slice(0, limit)
    .map((x) => toSummary(x.row));
}

export async function getLatestCases(limit = 8): Promise<CaseSummary[]> {
  const { data, error } = await db()
    .from("cases")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) fail("getLatestCases", error);
  return (rowsOf(data)).map(toSummary);
}

export async function getAcknowledgedCases(limit = 6): Promise<CaseSummary[]> {
  const { data, error } = await db()
    .from("cases")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .eq("classification", "acknowledged")
    .order("date_of_event", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) fail("getAcknowledgedCases", error);
  return (rowsOf(data)).map(toSummary);
}

/**
 * Rotates on the day rather than being random, for the same reason as the seed
 * version: a prerendered page would freeze any Math.random() at build time.
 * The offset walks the archive by view_count order so the window moves daily.
 */
export async function getRotatingCases(limit = 8): Promise<CaseSummary[]> {
  const { count, error: countError } = await db()
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("published", true);

  if (countError) fail("getRotatingCases(count)", countError);
  if (!count) return [];

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const offset = count > limit ? dayIndex % (count - limit + 1) : 0;

  const { data, error } = await db()
    .from("cases")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) fail("getRotatingCases", error);
  return (rowsOf(data)).map(toSummary);
}

export async function searchCases(query: string): Promise<CaseSummary[]> {
  const q = query.trim();
  if (!q) return [];

  // websearch syntax lets a reader use quotes and OR the way they expect.
  // The 'simple' config must match the one the generated column was built
  // with, or the query silently matches nothing.
  const { data, error } = await db()
    .from("cases")
    .select(SUMMARY_COLUMNS)
    .eq("published", true)
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .order("date_of_event", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) fail("searchCases", error);
  return (rowsOf(data)).map(toSummary);
}

export async function getArchiveCounts(): Promise<ArchiveCounts> {
  // Three narrow columns for every published case. Fine into the low tens of
  // thousands; past that this wants a materialised view or an RPC that
  // aggregates in the database rather than shipping rows to be tallied here.
  const [{ data, error }, scienceCount] = await Promise.all([
    db()
      .from("cases")
      .select("classification, continent, country")
      .eq("published", true),
    db()
      .from("science_entries")
      .select("id", { count: "exact", head: true })
      .eq("published", true),
  ]);

  if (error) fail("getArchiveCounts", error);

  const byClassification = {
    acknowledged: 0,
    unverified: 0,
    likely_explained: 0,
    debunked: 0,
  } as Record<Classification, number>;

  const byContinent: Record<string, number> = {};
  const countryTally: Record<string, number> = {};

  for (const row of rowsOf(data)) {
    const cls = row.classification as Classification;
    if (cls in byClassification) byClassification[cls] += 1;

    const cont = String(row.continent);
    byContinent[cont] = (byContinent[cont] ?? 0) + 1;

    if (row.country) {
      const c = String(row.country);
      countryTally[c] = (countryTally[c] ?? 0) + 1;
    }
  }

  return {
    cases: (data ?? []).length,
    science: scienceCount.count ?? 0,
    continents: Object.keys(byContinent).filter((k) => k !== "unknown").length,
    byClassification,
    byContinent,
    byCountry: Object.entries(countryTally)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country)),
  };
}

// ---------------------------------------------------------------------------
// Science
// ---------------------------------------------------------------------------

export async function listScience(
  filters: ScienceFilters = {},
): Promise<ScienceRecord[]> {
  let query = db()
    .from("science_entries")
    .select(FULL_SCIENCE_COLUMNS)
    .eq("published", true)
    .order("date", { ascending: false, nullsFirst: false });

  if (filters.topic) query = query.eq("topic", filters.topic);

  const { data, error } = await query;
  if (error) fail("listScience", error);

  return (rowsOf(data)).map(toScience);
}

export async function getScienceBySlug(
  slug: string,
): Promise<ScienceRecord | null> {
  const { data, error } = await db()
    .from("science_entries")
    .select(FULL_SCIENCE_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) fail("getScienceBySlug", error);
  return data ? toScience(data as Row) : null;
}

export async function getAllScienceSlugs(): Promise<string[]> {
  const { data, error } = await db()
    .from("science_entries")
    .select("slug")
    .eq("published", true);

  if (error) fail("getAllScienceSlugs", error);
  return (rowsOf(data)).map((r) => String(r.slug));
}

export async function searchScience(query: string): Promise<ScienceRecord[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await db()
    .from("science_entries")
    .select(FULL_SCIENCE_COLUMNS)
    .eq("published", true)
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(50);

  if (error) fail("searchScience", error);
  return (rowsOf(data)).map(toScience);
}
