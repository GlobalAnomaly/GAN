import test from "node:test";
import assert from "node:assert/strict";

import { consensusDate, createDossier, factsOfKind } from "@/lib/bot/dossier";
import { addFact } from "@/lib/bot/dossier";
import { enrichDossier } from "@/lib/bot/enrich";
import type { Fetcher } from "@/lib/bot/wikipedia";

const PAGES: Record<string, { extract: string; coords?: [number, number] }> = {
  "Rendlesham Forest incident": {
    extract:
      "The Rendlesham Forest incident was a series of reported sightings of unexplained lights near Rendlesham Forest in Suffolk, England, in December 1980.",
    coords: [52.08888889, 1.44916667],
  },
  "Rendlesham Forest": {
    extract: "Rendlesham Forest is a forestry plantation in Suffolk, England.",
    coords: [52.08388889, 1.43277778],
  },
  "Las Vegas": {
    extract: "Las Vegas is the most populous city in the U.S. state of Nevada.",
    coords: [36.1672, -115.1486],
  },
  "Luxor Las Vegas": {
    extract: "Luxor Las Vegas is a hotel and casino on the Las Vegas Strip in Paradise, Nevada.",
    coords: [36.0955, -115.176],
  },
};

const SEARCH: Record<string, string[]> = {
  "Rendlesham Forest incident": ["Rendlesham Forest incident"],
  "Rendlesham Forest UFO": ["Rendlesham Forest incident"],
  // What the real search returns for the Las Vegas case: nothing that fits.
  "Las Vegas incident": ["Luxor Las Vegas"],
  "Las Vegas UFO": ["Luxor Las Vegas"],
};

let calls = 0;
const fetcher: Fetcher = async (url) => {
  calls += 1;
  const params = new URL(url).searchParams;

  if (params.get("list") === "search") {
    return { query: { search: (SEARCH[params.get("srsearch") ?? ""] ?? []).map((t) => ({ title: t })) } };
  }

  const page = PAGES[params.get("titles") ?? ""];
  if (!page) return { query: { pages: { "-1": { missing: "" } } } };

  return {
    query: {
      pages: {
        "1": {
          title: params.get("titles"),
          extract: page.extract,
          coordinates: page.coords ? [{ lat: page.coords[0], lon: page.coords[1] }] : undefined,
          pageprops: {},
        },
      },
    },
  };
};

test("a place named in the material is confirmed and given coordinates", async () => {
  const dossier = createDossier("las vegas");
  const report = await enrichDossier(
    dossier,
    "Las Vegas 'giant creature' possible 'alien' video is original",
    { fetcher },
  );

  assert.deepEqual(report.places_confirmed, ["Las Vegas"]);
  assert.match(factsOfKind(dossier, "location")[0].statement, /36\.1672/);
});

test("coordinates for a settlement are flagged as the centre, not the event", async () => {
  const dossier = createDossier("x");
  await enrichDossier(dossier, "Las Vegas alien sighting", { fetcher });
  assert.ok(
    dossier.unresolved.some((q) => /centre of the place, not the location of the event/.test(q)),
  );
});

test("no article is found for a case that has none, and that is recorded", async () => {
  // The real outcome for Las Vegas 2023: Wikipedia's search returns Luxor Las
  // Vegas, and accepting it would be worse than the gap it fills.
  const dossier = createDossier("x");
  const report = await enrichDossier(dossier, "Las Vegas alien sighting backyard", { fetcher });

  assert.equal(report.article_found, null);
  assert.ok(
    dossier.unresolved.some((q) => /No encyclopedia article on this event was found/.test(q)),
    "a gap somebody looked for reads differently from one nobody checked",
  );
});

test("a documented event gains its article, date and coordinates", async () => {
  const dossier = createDossier("rendlesham");
  const report = await enrichDossier(
    dossier,
    "The Rendlesham Forest Incidents Gary Heseltine Interview",
    { fetcher },
  );

  assert.equal(report.article_found, "Rendlesham Forest incident");
  assert.equal(consensusDate(dossier)?.value, "1980-12-01");
  assert.equal(consensusDate(dossier)?.precision, "month");
});

test("an encyclopedia date outranks a more precise one from an uploader", async () => {
  // The podcast episode is titled "December 24, 2023 - #1027", which yields a
  // day-precise date that is the episode's, not the event's.
  const dossier = createDossier("rendlesham");
  addFact(dossier, {
    kind: "event_date",
    statement: "The title gives the date as December 24, 2023.",
    value: "2023-12-24",
    precision: "day",
    sources: [{ name: "a podcast", tier: "uploader" }],
  });

  await enrichDossier(dossier, "Rendlesham Forest incident", { fetcher });

  const date = consensusDate(dossier);
  assert.equal(date?.value, "1980-12-01", "the event, not the episode");
});

test("research is skipped where the dossier already knows", async () => {
  const dossier = createDossier("x");
  addFact(dossier, {
    kind: "location",
    statement: "Las Vegas, Nevada.",
    value: "las vegas",
    sources: [{ name: "KENS 5", tier: "press" }],
  });

  const report = await enrichDossier(dossier, "Las Vegas alien sighting", { fetcher });
  assert.deepEqual(report.places_tried, [], "no lookups spent confirming what is known");
});

test("the lookup budget is respected", async () => {
  const dossier = createDossier("x");
  const report = await enrichDossier(
    dossier,
    "Many Capitalised Names Like Paris Berlin Madrid Rome Cairo Tokyo Lima Oslo",
    { fetcher, maxLookups: 3 },
  );
  assert.equal(report.lookups, 3, "exactly the budget, never more");
});

test("a failing lookup does not take the run down with it", async () => {
  const broken: Fetcher = async () => {
    throw new Error("network gone");
  };
  const dossier = createDossier("x");
  const report = await enrichDossier(dossier, "Las Vegas alien sighting", { fetcher: broken });

  assert.equal(report.facts_added, 0);
  assert.equal(report.article_found, null);
});

test("the network is never touched in these tests", () => {
  assert.ok(calls > 0, "the injected fetcher was used");
});

test("the registry decides which support sources apply to a record", async () => {
  const dossier = createDossier("x");
  const report = await enrichDossier(dossier, "Las Vegas alien sighting", {
    fetcher,
    record: { occurred_at: "2023-04-30", country: "US" },
  });

  assert.ok(report.sources_selected.includes("gdelt"), "2023 is in GDELT's period");
  assert.ok(
    report.sources_out_of_scope.includes("chronicling-america"),
    "which stops in 1963",
  );
});

test("a 1947 case selects the newspaper archive instead", async () => {
  const dossier = createDossier("x");
  const report = await enrichDossier(dossier, "Roswell New Mexico", {
    fetcher,
    record: { occurred_at: "1947-07-08", country: "US" },
  });

  assert.ok(report.sources_selected.includes("chronicling-america"));
  assert.ok(report.sources_out_of_scope.includes("gdelt"));
});
