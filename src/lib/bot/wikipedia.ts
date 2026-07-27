/**
 * Wikipedia and Wikidata as an enrichment source.
 *
 * Free, no key, no account, and its API is explicitly open to automated use so
 * long as a real User-Agent identifies the caller. That makes it the first
 * thing the researcher stage should try, before anything needing a service to
 * run or a signup.
 *
 * It is strong exactly where the archive is weak and silent exactly where it
 * is silent, which is worth stating plainly because it sets expectations:
 *
 * - **Rendlesham Forest incident** resolves to its own article with
 *   coordinates, a Wikidata id and a summary naming December 1980.
 * - **The Las Vegas 2023 backyard case has no article at all.** Searching for
 *   it returns Luxor Las Vegas, Nellis Air Force Base and Fallout: New Vegas.
 *
 * That second result is the important one, and it is why everything here is
 * built around refusing rather than around finding. A confident wrong answer
 * is worse than no answer: attaching "Luxor Las Vegas" to a UFO case would put
 * a fabricated fact under a sourced account, which is the failure the whole
 * pipeline is arranged to prevent. So a result must earn its way in.
 */

const API = "https://en.wikipedia.org/w/api.php";

/**
 * Wikipedia asks automated callers to identify themselves and to provide a
 * way to be contacted. Sending a browser's user agent instead would be both
 * against their policy and dishonest about what we are.
 */
const USER_AGENT =
  "GlobalAnomalyNetwork/0.1 (https://globalanomaly.info; archive enrichment bot)";

export interface WikipediaPage {
  title: string;
  /** The lead section, plain text. */
  extract: string;
  url: string;
  lat: number | null;
  lng: number | null;
  /** Wikidata identifier, for later structured lookups. */
  wikidata_id: string | null;
  /** Whether this looks like a list or index rather than an article. */
  is_list: boolean;
}

/** Injectable so tests never touch the network. */
export type Fetcher = (url: string) => Promise<unknown>;

const liveFetch: Fetcher = async (url) => {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}`);
  return response.json();
};

function query(params: Record<string, string>): string {
  return `${API}?${new URLSearchParams({ format: "json", origin: "*", ...params })}`;
}

// ---------------------------------------------------------------------------
// Relevance, which is the only part that matters
// ---------------------------------------------------------------------------

const NOISE = new Set([
  "the", "and", "for", "with", "from", "was", "were", "are", "this", "that",
  "ufo", "uap", "video", "footage", "sighting", "sightings", "incident",
  "case", "object", "objects", "alien", "aliens", "report", "reported",
]);

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !NOISE.has(w));
}

/**
 * Whether a page is plausibly about the thing we asked for.
 *
 * Wikipedia's search always returns something, and something is usually wrong.
 * Two conditions have to hold together, because either alone is easy to pass
 * by accident:
 *
 * 1. The page title must share distinctive wording with the query. "Luxor Las
 *    Vegas" shares "las" and "vegas" with a Las Vegas query, so this alone is
 *    not enough, which is what the second condition is for.
 * 2. The article text must mention most of the query's distinctive words. A
 *    page about a hotel does not discuss a backyard, a 911 call or creatures.
 *
 * A list or index page is refused outright. "UFO sightings in Brazil" is a
 * real page and a real topic, and it is not a source for any single event.
 */
export function isRelevant(
  page: Pick<WikipediaPage, "title" | "extract" | "is_list">,
  queryText: string,
): boolean {
  if (page.is_list) return false;

  // An index page announces itself in its first sentence even when its title
  // does not. "UFO sightings in Brazil" opens "This is a list of alleged
  // sightings", and it is a real page about a real topic that is not a source
  // for any single event.
  if (/^this (is|article is) a (list|index)|may refer to/i.test(page.extract.trim())) {
    return false;
  }

  const asked = new Set(contentWords(queryText));
  const subject = contentWords(page.title);
  if (asked.size === 0 || subject.length === 0) return false;

  // The test runs from the article towards the query, not the other way round.
  //
  // An earlier version asked whether the article covered the query, and it
  // rejected everything real: a query built from a video title carries words
  // like "interview" and a presenter's name that no encyclopedia article will
  // mention. What actually matters is whether the query names the article's
  // subject. "Rendlesham Forest incident" is named by a query about the
  // Rendlesham forest incidents; "Luxor Las Vegas" is not named by a query
  // about a Las Vegas sighting, because nothing in it says Luxor.
  const matched = subject.filter((w) => asked.has(w));

  // At least two, so a one word subject cannot match on something common.
  // "UFO sightings in Brazil" reduces to the single word "brazil" once the
  // generic terms are dropped, and matching on that alone would attach a
  // country index to any Brazilian case.
  if (matched.length < 2) return false;

  return matched.length / subject.length >= 0.8;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

interface SearchResponse {
  query?: { search?: { title: string }[] };
}

interface PageResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        extract?: string;
        coordinates?: { lat: number; lon: number }[];
        pageprops?: { wikibase_item?: string; disambiguation?: string };
      }
    >;
  };
}

export async function fetchPage(
  title: string,
  fetcher: Fetcher = liveFetch,
): Promise<WikipediaPage | null> {
  const data = (await fetcher(
    query({
      action: "query",
      prop: "extracts|coordinates|pageprops",
      exintro: "1",
      explaintext: "1",
      titles: title,
    }),
  )) as PageResponse;

  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page?.title || !page.extract) return null;
  // A disambiguation page lists possibilities and establishes nothing.
  if (page.pageprops?.disambiguation !== undefined) return null;

  const coordinates = page.coordinates?.[0];

  return {
    title: page.title,
    extract: page.extract,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    lat: coordinates?.lat ?? null,
    lng: coordinates?.lon ?? null,
    wikidata_id: page.pageprops?.wikibase_item ?? null,
    is_list: /^(list of|index of|outline of)\b/i.test(page.title),
  };
}

/**
 * Searches, then refuses anything that does not clearly match.
 *
 * Returns null far more often than not, and that is the intended behaviour.
 */
export async function findArticle(
  queryText: string,
  fetcher: Fetcher = liveFetch,
): Promise<WikipediaPage | null> {
  const results = (await fetcher(
    query({ action: "query", list: "search", srlimit: "3", srsearch: queryText }),
  )) as SearchResponse;

  for (const hit of results.query?.search ?? []) {
    const page = await fetchPage(hit.title, fetcher);
    if (page && isRelevant(page, queryText)) return page;
  }

  return null;
}

/**
 * Confirms that a phrase names a real place, and gets its coordinates.
 *
 * The archive needs place names out of free text, and guessing which
 * capitalised phrase is a location is exactly the kind of inference that
 * produces confident nonsense. This verifies instead: look the phrase up, and
 * accept it only if the article carries coordinates, which is Wikipedia's own
 * marker that the subject is somewhere rather than something.
 *
 * A settlement article has coordinates. A hotel has coordinates too, so this
 * confirms "a place exists by this name" rather than "the event happened
 * here". Every coordinate obtained this way is therefore approximate, and the
 * `coord_precision` field exists for exactly that reason.
 */
export async function resolvePlace(
  name: string,
  fetcher: Fetcher = liveFetch,
): Promise<WikipediaPage | null> {
  const page = await fetchPage(name, fetcher);
  if (!page || page.is_list) return null;
  if (page.lat === null || page.lng === null) return null;

  // The article found must actually be about the phrase asked for, not a
  // redirect to something broader.
  const asked = new Set(contentWords(name));
  const found = new Set(contentWords(page.title));
  const shared = [...asked].filter((w) => found.has(w)).length;
  if (asked.size === 0 || shared / asked.size < 0.5) return null;

  return page;
}

/**
 * Capitalised phrases from a title, as candidate place names.
 *
 * Deliberately a generator of guesses, not an answer. Everything it produces
 * is checked against Wikipedia by `resolvePlace`, and most of it is discarded.
 * Trying to decide here which phrase is a place would be the guessing this
 * archive keeps having to remove.
 */
/** Words that begin or end a capitalised run without being part of the name. */
const PHRASE_EDGE = new Set([
  "the", "a", "an", "case", "cases", "incident", "incidents", "video",
  "footage", "interview", "report", "reports", "story", "mystery", "new",
  "original", "official", "full", "part", "analysis", "update", "special",
]);

export function candidatePlaceNames(title: string): string[] {
  const found = new Set<string>();

  for (const match of title.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/g)) {
    let words = match[1].trim().split(/\s+/);

    // Trim the edges. A capitalised run in a title is regularly wrapped in
    // words that are not part of the name: "The Rendlesham Forest Case" is one
    // run, and neither "The" nor "Case" belongs to the place.
    while (words.length > 1 && PHRASE_EDGE.has(words[0].toLowerCase())) words = words.slice(1);
    while (words.length > 1 && PHRASE_EDGE.has(words[words.length - 1].toLowerCase())) {
      words = words.slice(0, -1);
    }
    if (words.length === 0) continue;

    // The whole run, and every shorter run inside it. "Las Vegas Metro" does
    // not resolve, "Las Vegas" does, and only emitting the longest form meant
    // the real place was never tried.
    for (let size = Math.min(words.length, 3); size >= 1; size--) {
      for (let start = 0; start + size <= words.length; start++) {
        const phrase = words.slice(start, start + size).join(" ");
        if (!PHRASE_EDGE.has(phrase.toLowerCase())) found.add(phrase);
      }
    }
  }

  // Longer phrases first: "Las Vegas" is a better guess than "Vegas", and
  // trying it first avoids resolving a fragment when the whole exists.
  return [...found].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);
}
