/**
 * The validator is what stands between an 8B model and the review inbox, so
 * its rules get tested. Run with: npm run bot:test
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { DraftAccount } from "@/lib/bot/prompts";
import { validateAccount, validateTranslation } from "@/lib/bot/validate-account";

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
    draft({ body_status: "The Pentagon released it â€” and confirmed it." }),
    { sourceText: SOURCE },
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.rule === "no-em-dash"));
});

test("en dashes are caught too", () => {
  const result = validateAccount(
    draft({ summary: "Aviators were sent out â€“ radar had tracked it." }),
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
