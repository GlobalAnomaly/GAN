import test from "node:test";
import assert from "node:assert/strict";

import {
  candidatePlaceNames,
  findArticle,
  isRelevant,
  resolvePlace,
  type Fetcher,
} from "@/lib/bot/wikipedia";

/**
 * Every page here is the real response, trimmed. Nothing in this file touches
 * the network, so the tests keep working when Wikipedia edits an article.
 */
const PAGES: Record<
  string,
  { extract: string; coords?: [number, number]; wikidata?: string; disambiguation?: boolean }
> = {
  "Rendlesham Forest incident": {
    extract:
      "The Rendlesham Forest incident was a series of reported sightings of unexplained lights near Rendlesham Forest in Suffolk, England, in December 1980, which became linked with alleged UFO landings.",
    coords: [52.08888889, 1.44916667],
    wikidata: "Q2271637",
  },
  "Rendlesham Forest": {
    extract: "Rendlesham Forest is a forestry plantation in Suffolk, England.",
    coords: [52.08388889, 1.43277778],
  },
  "Luxor Las Vegas": {
    extract:
      "Luxor Las Vegas is a hotel and casino on the Las Vegas Strip in Paradise, Nevada. It is themed after ancient Egypt.",
    coords: [36.0955, -115.176],
  },
  "Las Vegas": {
    extract:
      "Las Vegas, often known simply as Vegas, is the most populous city in the U.S. state of Nevada.",
    coords: [36.1672, -115.1486],
  },
  "UFO sightings in Brazil": {
    extract:
      "This is a list of alleged sightings of unidentified flying objects or UFOs in Brazil.",
  },
  Mercury: { extract: "Mercury may refer to Mercury the planet, or Mercury the element." },
  "List of UFO sightings": { extract: "Sightings of unidentified flying objects." },
};

const SEARCH: Record<string, string[]> = {
  "Las Vegas alien sighting": ["Luxor Las Vegas", "Las Vegas"],
  "Rendlesham Forest incident": ["Rendlesham Forest incident", "Rendlesham Forest"],
  "Colares Brazil": ["UFO sightings in Brazil"],
  "nothing at all": [],
};

const fetcher: Fetcher = async (url) => {
  const params = new URL(url).searchParams;

  if (params.get("list") === "search") {
    const titles = SEARCH[params.get("srsearch") ?? ""] ?? [];
    return { query: { search: titles.map((title) => ({ title })) } };
  }

  const title = params.get("titles") ?? "";
  const page = PAGES[title];
  if (!page) return { query: { pages: { "-1": { missing: "" } } } };

  return {
    query: {
      pages: {
        "1": {
          title,
          extract: page.extract,
          coordinates: page.coords ? [{ lat: page.coords[0], lon: page.coords[1] }] : undefined,
          pageprops: {
            wikibase_item: page.wikidata,
            ...(page.disambiguation ? { disambiguation: "" } : {}),
          },
        },
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Relevance, which is the only part that matters
// ---------------------------------------------------------------------------

test("a hotel is not an answer to a question about a sighting", () => {
  // The real first result for a Las Vegas UFO query. Accepting it would put a
  // fabricated fact under a sourced account.
  assert.equal(
    isRelevant(
      { title: "Luxor Las Vegas", extract: PAGES["Luxor Las Vegas"].extract, is_list: false },
      "Las Vegas alien sighting 2023 backyard",
    ),
    false,
  );
});

test("the article's subject must be named in the query, not the reverse", () => {
  // A query built from a video title carries words no encyclopedia article
  // will mention. Testing that the article covers the query rejected
  // everything real, which is why the direction was reversed.
  assert.equal(
    isRelevant(
      {
        title: "Rendlesham Forest incident",
        extract: PAGES["Rendlesham Forest incident"].extract,
        is_list: false,
      },
      "The Rendlesham Forest Incidents Gary Heseltine Interview",
    ),
    true,
  );
});

test("an index page is refused even when its title does not say so", () => {
  assert.equal(
    isRelevant(
      {
        title: "UFO sightings in Brazil",
        extract: PAGES["UFO sightings in Brazil"].extract,
        is_list: false,
      },
      "Colares Brazil UFO 1977",
    ),
    false,
  );
});

test("a one word subject cannot match on something common", () => {
  assert.equal(
    isRelevant({ title: "Brazil", extract: "Brazil is a country.", is_list: false }, "Brazil UFO"),
    false,
  );
});

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

test("search walks past a wrong first hit to a right second one", async () => {
  const page = await findArticle("Rendlesham Forest incident", fetcher);
  assert.equal(page?.title, "Rendlesham Forest incident");
  assert.equal(page?.lat, 52.08888889);
  assert.equal(page?.wikidata_id, "Q2271637");
});

test("no relevant result yields null rather than the nearest thing", async () => {
  assert.equal(await findArticle("Colares Brazil", fetcher), null);
  assert.equal(await findArticle("nothing at all", fetcher), null);
});

test("a disambiguation page establishes nothing", async () => {
  const withDisambiguation: Fetcher = async (url) => {
    const params = new URL(url).searchParams;
    if (params.get("list") === "search") return { query: { search: [{ title: "Mercury" }] } };
    return {
      query: {
        pages: {
          "1": { title: "Mercury", extract: PAGES.Mercury.extract, pageprops: { disambiguation: "" } },
        },
      },
    };
  };
  assert.equal(await findArticle("Mercury", withDisambiguation), null);
});

// ---------------------------------------------------------------------------
// Places are verified, never assumed
// ---------------------------------------------------------------------------

test("a phrase is confirmed as a place only by coordinates", async () => {
  const place = await resolvePlace("Las Vegas", fetcher);
  assert.equal(place?.lat, 36.1672);

  // A real article with no coordinates is not a place.
  assert.equal(await resolvePlace("UFO sightings in Brazil", fetcher), null);
  // A phrase with no article at all is not a place.
  assert.equal(await resolvePlace("Green Object", fetcher), null);
});

test("a lookup that lands somewhere broader is refused", async () => {
  // "Luxor Las Vegas" shares two words with "Las Vegas", but asking for one
  // and receiving the other is not confirmation.
  const redirecting: Fetcher = async (url) => {
    const params = new URL(url).searchParams;
    if (params.get("titles") === "Metro") {
      return {
        query: {
          pages: {
            "1": {
              title: "Las Vegas",
              extract: PAGES["Las Vegas"].extract,
              coordinates: [{ lat: 36.1672, lon: -115.1486 }],
            },
          },
        },
      };
    }
    return fetcher(url);
  };
  assert.equal(await resolvePlace("Metro", redirecting), null);
});

// ---------------------------------------------------------------------------
// Candidate names
// ---------------------------------------------------------------------------

test("a capitalised run is trimmed of the words that are not the name", () => {
  // "The Rendlesham Forest Case" is one run, and neither end belongs to the
  // place. Only emitting the whole run meant the real place was never tried.
  const names = candidatePlaceNames("The Rendlesham Forest Case: A New Look");
  assert.ok(names.includes("Rendlesham Forest"));
});

test("shorter phrases inside a run are tried too", () => {
  // "Las Vegas Metro" does not resolve; "Las Vegas" does.
  const names = candidatePlaceNames("PRO ANALYSIS: Green Object on Las Vegas Metro PD Body Cam");
  assert.ok(names.includes("Las Vegas"));
  assert.ok(
    names.indexOf("Las Vegas Metro") < names.indexOf("Las Vegas"),
    "longer phrases are tried first",
  );
});

test("lowercase words are not candidate places", () => {
  assert.deepEqual(candidatePlaceNames("a strange light in the night sky"), []);
});
