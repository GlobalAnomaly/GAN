/**
 * The validator is what stands between an 8B model and the review inbox, so
 * its rules get tested. Run with: npm run bot:test
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeDraft, type DraftAccount } from "@/lib/bot/prompts";
import { validateAccount, validateTranslation } from "@/lib/bot/validate-account";
import { addFact, createDossier } from "@/lib/bot/dossier";

const SOURCE = `
Naval aviators were vectored toward an object detected by the cruiser's radar.
Commander David Fravor described an object that accelerated away. The Department
of Defense released the footage in 2020 and confirmed it was authentic Navy
video. No conventional identification has been offered.
`;

function draft(overrides: Partial<DraftAccount> = {}): DraftAccount {
  return {
    headline: "Navy pilots report an object off the coast",
    summary: "Aviators were sent toward an object the radar had tracked.",
    body_footage:
      "An infrared clip shows a small object against the sky. It has no visible wings or exhaust plume.",
    body_testimony:
      "Commander David Fravor said the object accelerated away in a manner he could not account for.",
    body_status:
      "The Department of Defense released the footage and confirmed it was authentic Navy video. No conventional identification has been offered.",
    body_unknown:
      "What the object was has not been established. The video alone cannot fix its size, altitude or speed.",
    location_name: null,
    country: null,
    continent: "north_america",
    date_of_event: null,
    date_precision: "unknown",
    ...overrides,
  };
}

test("a clean account passes", () => {
  const result = validateAccount(draft(), {
    sourceText: SOURCE,
    classification: "acknowledged",
  });
  assert.equal(
    result.ok,
    true,
    `unexpected errors: ${JSON.stringify(result.errors, null, 2)}`,
  );
});

test("em dashes are an error, wherever they appear", () => {
  const result = validateAccount(
    draft({ body_status: "The Pentagon released it \u2014 and confirmed it." }),
    { sourceText: SOURCE },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "no-em-dash"));
});

test("en dashes are caught too", () => {
  const result = validateAccount(
    draft({ summary: "Aviators were sent out \u2013 radar had tracked it." }),
    { sourceText: SOURCE },
  );
  assert.ok(result.errors.some((e) => e.rule === "no-em-dash"));
});

test("an empty what-remains-unknown is an error", () => {
  const result = validateAccount(draft({ body_unknown: "" }), {
    sourceText: SOURCE,
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.rule === "missing-section" && e.field === "body_unknown",
    ),
  );
});

test("hype headlines are rejected", () => {
  const result = validateAccount(
    draft({ headline: "Shocking UFO caught on camera!" }),
    { sourceText: SOURCE },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "hype-headline"));
});

test("a genuinely shouted headline is rejected", () => {
  const result = validateAccount(
    draft({ headline: "OBJECT FILMED OVER THE COAST" }),
    { sourceText: SOURCE },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "no-all-caps"));
});

test("agency acronyms are not treated as shouting", () => {
  // This domain is full of them, so a per-word rule would fire constantly.
  for (const headline of [
    "USAF airmen report an object near the base",
    "GEIPAN investigates a ground trace in Provence",
    "NASA and ESA respond to the AARO release",
  ]) {
    const result = validateAccount(draft({ headline }), { sourceText: SOURCE });
    assert.ok(
      !result.errors.some((e) => e.rule === "no-all-caps"),
      `wrongly flagged as shouting: ${headline}`,
    );
  }
});

test("stock AI phrasing is flagged", () => {
  const result = validateAccount(
    draft({
      body_status:
        "The release is a testament to the shift in official posture. The Department of Defense confirmed it.",
    }),
    { sourceText: SOURCE },
  );
  assert.ok(result.warnings.some((w) => w.rule === "stock-phrasing"));
});

test("a number not present in the source is flagged", () => {
  const result = validateAccount(
    draft({
      body_footage:
        "An infrared clip shows a small object holding at 24000 feet against the sky.",
    }),
    { sourceText: SOURCE },
  );
  assert.ok(
    result.warnings.some(
      (w) => w.rule === "grounding-number" && w.message.includes("24000"),
    ),
  );
});

test("a name not present in the source is flagged", () => {
  const result = validateAccount(
    draft({
      body_testimony:
        "Commander David Fravor said the object accelerated away. Lieutenant Marcus Halloway agreed.",
    }),
    { sourceText: SOURCE },
  );
  assert.ok(
    result.warnings.some(
      (w) => w.rule === "grounding-name" && w.message.includes("Halloway"),
    ),
  );
});

test("names that are in the source are not flagged", () => {
  const result = validateAccount(draft(), { sourceText: SOURCE });
  assert.ok(
    !result.warnings.some(
      (w) => w.rule === "grounding-name" && w.message.includes("Fravor"),
    ),
  );
});

test("acknowledged without an official body is an error", () => {
  const result = validateAccount(
    draft({
      body_status:
        "Nobody has looked into it and there is no corroborating footage.",
    }),
    { sourceText: SOURCE, classification: "acknowledged" },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "classification-support"));
});

test("unattributed testimony is flagged", () => {
  const result = validateAccount(
    draft({
      body_testimony:
        "The object was a metallic craft under intelligent control.",
    }),
    { sourceText: SOURCE },
  );
  assert.ok(result.warnings.some((w) => w.rule === "attribution"));
});

test("a translation that drops a section is an error", () => {
  const english = draft();
  const result = validateTranslation(
    english,
    {
      title: "Des pilotes signalent un objet",
      summary: "Des aviateurs ont ete envoyes vers un objet.",
      body_footage: "Une video infrarouge montre un petit objet.",
      body_testimony: "Le commandant Fravor a declare que l'objet a accelere.",
      body_status: "Le ministere a confirme que la video etait authentique.",
      body_unknown: "",
    },
    "fr",
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "dropped-section"));
});

test("a suspiciously short translation is flagged", () => {
  const english = draft();
  const result = validateTranslation(
    english,
    {
      title: "Des pilotes signalent un objet",
      summary: "Des aviateurs.",
      body_footage: "Une video infrarouge montre un petit objet sans ailes ni panache.",
      body_testimony: "Le commandant Fravor a declare que l'objet a accelere fortement.",
      body_status: "Le ministere a confirme que la vid.",
      body_unknown:
        "Ce qu'etait l'objet n'a pas ete etabli. La video ne permet pas d'en fixer la taille.",
    },
    "fr",
  );
  assert.ok(result.warnings.some((w) => w.rule === "short-translation"));
});

// ---------------------------------------------------------------------------
// The dossier-aware checks, added after the first overnight run put four
// fabricated footage descriptions into the inbox with no warnings at all.
// ---------------------------------------------------------------------------

test("describing footage nobody has described is an error", () => {
  const dossier = createDossier("las vegas");
  addFact(dossier, {
    kind: "claim",
    statement: "The uploader says a family saw nonhuman beings.",
    sources: [{ name: "NewsNation", tier: "press" }],
  });

  // The real sentence from the NewsNation draft. The video shows figures in a
  // backyard; this describes the police bodycam footage of a different thing.
  const result = validateAccount(
    draft({
      body_footage:
        "The footage shows a large, unidentifiable object moving across the sky at night. It is unclear what the object's shape or size is.",
    }),
    { dossier },
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "footage-not-established"));
});

test("saying the footage has not been described passes", () => {
  const dossier = createDossier("las vegas");
  const result = validateAccount(
    draft({
      body_footage:
        "The material available does not describe what the footage shows, and the archive has not reviewed it independently.",
    }),
    { dossier },
  );

  assert.ok(!result.errors.some((e) => e.rule === "footage-not-established"));
});

test("staying silent about the footage is also an error", () => {
  // An evasive section reads to a reader as though we simply had nothing to
  // add, when the useful fact is that nobody has ever described it.
  const result = validateAccount(
    draft({ body_footage: "The video was posted online in April." }),
    { dossier: createDossier("x") },
  );

  assert.ok(result.errors.some((e) => e.rule === "footage-not-established"));
});

test("a source that did see it lifts the restriction", () => {
  const dossier = createDossier("aaro case");
  addFact(dossier, {
    kind: "footage",
    statement:
      "The resolution report describes an oblong object crossing the sensor field.",
    sources: [{ name: "AARO", tier: "official" }],
  });

  const result = validateAccount(
    draft({
      body_footage:
        "The released video shows an oblong object crossing the sensor field from left to right.",
    }),
    { dossier },
  );

  assert.ok(!result.errors.some((e) => e.rule === "footage-not-established"));
});

test("a headline lifted from the source video is an error", () => {
  const result = validateAccount(
    draft({ headline: "Las Vegas giant creature possible alien video is original" }),
    {
      sourceTitle:
        "Las Vegas 'giant creature' possible 'alien' video is original: Evidence expert | Banfield",
    },
  );

  assert.ok(result.errors.some((e) => e.rule === "headline-echoes-source"));
});

test("our own headline sharing a place name is fine", () => {
  const result = validateAccount(
    draft({ headline: "family reports figures in a Las Vegas backyard after a 911 call" }),
    {
      sourceTitle:
        "Las Vegas 'giant creature' possible 'alien' video is original: Evidence expert | Banfield",
    },
  );

  assert.ok(!result.errors.some((e) => e.rule === "headline-echoes-source"));
});

test("calling a location unknown while naming it is an error", () => {
  // Both halves are from the same real draft.
  const result = validateAccount(
    draft({
      location_name: "Las Vegas",
      body_unknown:
        "The location of the event, the date of the event, and the identity of the object remain unknown.",
    }),
  );

  assert.ok(result.errors.some((e) => e.rule === "unknowns-contradict"));
});

test("a relative date in the prose is flagged for the reader's sake", () => {
  const result = validateAccount(
    draft({
      body_unknown:
        "The date of the event, established as last year, is not otherwise confirmed anywhere.",
    }),
  );

  assert.ok(result.warnings.some((f) => f.rule === "relative-date-in-prose"));
});

test("naming the place in the same sentence is precision, not contradiction", () => {
  // "The exact address within Las Vegas is unknown" is a useful sentence and
  // flagging it would teach the reviewer to ignore this rule.
  const result = validateAccount(
    draft({
      location_name: "Las Vegas",
      body_unknown:
        "The exact location within Las Vegas is unknown, and no address has been given by anyone.",
    }),
  );

  assert.ok(!result.errors.some((e) => e.rule === "unknowns-contradict"));
});

// ---------------------------------------------------------------------------
// normalizeDraft: the schema can enforce a shape but not a meaning, so a model
// with nothing to report writes the four characters "null" and they arrive as
// text. The first overnight run produced 25 accounts whose location was the
// string "null", and it would have rendered as that word on the page.
// ---------------------------------------------------------------------------

test("the string null becomes an actual null", () => {
  const result = normalizeDraft(
    draft({ location_name: "null", country: "null", date_of_event: "null" }),
  );

  assert.equal(result.location_name, null);
  assert.equal(result.country, null);
  assert.equal(result.date_of_event, null);
  assert.equal(result.date_precision, "unknown", "no date means no precision");
});

test("other ways of writing nothing are caught too", () => {
  for (const value of ["", "  ", "none", "N/A", "Unknown", "undefined"]) {
    assert.equal(
      normalizeDraft(draft({ location_name: value })).location_name,
      null,
      `did not normalise: ${JSON.stringify(value)}`,
    );
  }
});

test("a real place survives untouched", () => {
  const result = normalizeDraft(draft({ location_name: "Las Vegas", country: "United States" }));
  assert.equal(result.location_name, "Las Vegas");
  assert.equal(result.country, "United States");
});

test("prose in the date column is salvaged to the precision it supports", () => {
  // A real value from the run: "2024-04 (year only)" in a column the database
  // expects to parse as a date.
  const result = normalizeDraft(
    draft({ date_of_event: "2024-04 (year only)", date_precision: "day" }),
  );
  assert.equal(result.date_of_event, "2024-04-01");
  assert.equal(result.date_precision, "month", "precision drops to what is supported");
});

test("a bare year becomes the first of January at year precision", () => {
  const result = normalizeDraft(draft({ date_of_event: "1947", date_precision: "day" }));
  assert.equal(result.date_of_event, "1947-01-01");
  assert.equal(result.date_precision, "year");
});

test("an unsalvageable date is dropped rather than passed on to fail later", () => {
  const result = normalizeDraft(
    draft({ date_of_event: "some time in the summer", date_precision: "day" }),
  );
  assert.equal(result.date_of_event, null);
  assert.equal(result.date_precision, "unknown");
});

test("an invented continent falls back to unknown", () => {
  assert.equal(normalizeDraft(draft({ continent: "atlantis" })).continent, "unknown");
  assert.equal(normalizeDraft(draft({ continent: "europe" })).continent, "europe");
});

test("a month-precision date plus an unknown exact date is not a contradiction", () => {
  // From the first live AARO draft. Both halves are true and saying both is
  // better than saying either alone.
  const result = validateAccount(
    draft({
      date_of_event: "2018-12-01",
      date_precision: "month",
      body_unknown:
        "AARO publishes the imagery without the sensor type, the platform, the exact date or the reporting unit.",
    }),
  );

  assert.ok(!result.errors.some((e) => e.rule === "unknowns-contradict"));
});

test("but claiming a day and calling the exact date unknown still contradicts", () => {
  const result = validateAccount(
    draft({
      date_of_event: "2018-12-04",
      date_precision: "day",
      body_unknown: "The exact date of the event is unknown and nothing establishes it.",
    }),
  );

  assert.ok(result.errors.some((e) => e.rule === "unknowns-contradict"));
});

test("the dossier's own bracket annotations must not reach the prose", () => {
  // Straight from the first live AARO draft.
  const result = validateAccount(
    draft({
      body_footage:
        "AARO describes the released footage as showing a distant unified aerial object [single source: All-domain Anomaly Resolution Office (AARO)].",
    }),
  );

  assert.ok(result.errors.some((e) => e.rule === "scaffolding-leak"));
});

test("attribution written as an English sentence is fine", () => {
  const result = validateAccount(
    draft({
      body_footage:
        "AARO describes the released footage as showing a distant unified aerial object moving steadily across the sky.",
    }),
  );

  assert.ok(!result.errors.some((e) => e.rule === "scaffolding-leak"));
});
