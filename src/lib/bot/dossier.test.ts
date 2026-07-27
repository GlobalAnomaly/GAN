import test from "node:test";
import assert from "node:assert/strict";

import {
  addFact,
  addMedia,
  addUnresolved,
  consensusDate,
  corroboration,
  createDossier,
  factsOfKind,
  groundingText,
  hasFootageDescription,
  isClaimOnly,
  mergeDossiers,
  renderForPrompt,
  summarise,
  type DossierSource,
} from "@/lib/bot/dossier";

const wikidata: DossierSource = { name: "Wikidata", tier: "reference" };
const kens5: DossierSource = { name: "KENS 5", tier: "press" };
const newsnation: DossierSource = { name: "NewsNation", tier: "press" };
const uploader: DossierSource = { name: "Da Goob Show", tier: "uploader" };
const anon: DossierSource = { name: "unnamed account", tier: "anonymous" };
const aaro: DossierSource = { name: "AARO", tier: "official" };

// ---------------------------------------------------------------------------
// Merging, which is what turns search results into corroboration
// ---------------------------------------------------------------------------

test("two sources giving the same date become one fact with two sources", () => {
  const d = createDossier("las vegas 2023");
  addFact(d, {
    kind: "event_date",
    statement: "The event happened on 30 April 2023.",
    value: "2023-04-30",
    precision: "day",
    sources: [kens5],
  });
  addFact(d, {
    kind: "event_date",
    // Worded completely differently on purpose: agreement is decided by the
    // normalised value, not by the sentence.
    statement: "Reported as occurring around midnight, 30 April 2023.",
    value: "2023-04-30",
    precision: "day",
    sources: [wikidata],
  });

  assert.equal(factsOfKind(d, "event_date").length, 1);
  assert.equal(corroboration(factsOfKind(d, "event_date")[0]), 2);
});

test("the same source twice is still one source", () => {
  const d = createDossier("x");
  const fact = {
    kind: "event_date" as const,
    statement: "1964-04-24",
    value: "1964-04-24",
    sources: [kens5],
  };
  addFact(d, fact);
  addFact(d, { ...fact, sources: [kens5] });

  assert.equal(corroboration(d.facts[0]), 1, "one publication is not corroboration");
});

test("differing prose facts are never merged into false agreement", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "claim",
    statement: "The caller said the beings were about eight feet tall.",
    sources: [kens5],
  });
  addFact(d, {
    kind: "claim",
    statement: "The caller said the beings were about ten feet tall.",
    sources: [newsnation],
  });

  assert.equal(d.facts.length, 2, "two different statements stay two facts");
});

test("merging upgrades date precision but never downgrades it", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "event_date",
    statement: "Sometime in 2023.",
    value: "2023-04-30",
    precision: "year",
    sources: [newsnation],
  });
  addFact(d, {
    kind: "event_date",
    statement: "On 30 April 2023.",
    value: "2023-04-30",
    precision: "day",
    sources: [kens5],
  });
  assert.equal(d.facts[0].precision, "day");

  addFact(d, {
    kind: "event_date",
    statement: "In April 2023.",
    value: "2023-04-30",
    precision: "month",
    sources: [wikidata],
  });
  assert.equal(d.facts[0].precision, "day", "a vaguer source must not coarsen it");
  assert.equal(corroboration(d.facts[0]), 3);
});

// ---------------------------------------------------------------------------
// The footage rule, which is the bug this whole module exists for
// ---------------------------------------------------------------------------

test("an uploader describing their own clip does not describe the footage", () => {
  const d = createDossier("anonymous short");
  addFact(d, {
    kind: "footage",
    statement: "The uploader says the video shows an alien craft over Texas.",
    attributed_to: "the account that posted it",
    sources: [uploader],
  });

  assert.equal(isClaimOnly(d.facts[0]), true);
  assert.equal(
    hasFootageDescription(d),
    false,
    "a claim about footage is not a description of it",
  );
});

test("a press or official source describing the footage does count", () => {
  const d = createDossier("aaro case");
  addFact(d, {
    kind: "footage",
    statement:
      "The resolution report describes an oblong object crossing the sensor field from left to right.",
    sources: [aaro],
  });
  assert.equal(hasFootageDescription(d), true);
});

test("an empty dossier renders an explicit refusal, not a missing heading", () => {
  const rendered = renderForPrompt(createDossier("nothing known"));
  assert.match(rendered, /NOTHING IN THE MATERIAL DESCRIBES THE FOOTAGE/);
  assert.match(rendered, /Do not describe it/);
  // Every heading is present even when empty, so absence reads as a finding
  // rather than as an oversight the model should be helpful about.
  assert.match(rendered, /WHEN/);
  assert.match(rendered, /WHERE/);
  assert.match(rendered, /\(nothing established\)/);
});

// ---------------------------------------------------------------------------
// What the writer is told about agreement
// ---------------------------------------------------------------------------

test("the rendered dossier marks single sourced and corroborated facts apart", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "location",
    statement: "Las Vegas, Nevada.",
    value: "las vegas nevada us",
    sources: [kens5, newsnation],
  });
  addFact(d, {
    kind: "claim",
    statement: "The person filming said the object made no sound.",
    attributed_to: "the person who posted the footage",
    sources: [anon],
  });

  const rendered = renderForPrompt(d);
  assert.match(rendered, /confirmed independently by 2 sources: KENS 5; NewsNation/);
  assert.match(rendered, /single source: unnamed account/);
  assert.match(rendered, /stated by the person who posted the footage/);
  assert.match(rendered, /these are claims, never observations/);
});

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

test("consensusDate prefers the best corroborated date, not the earliest", () => {
  const d = createDossier("socorro");
  addFact(d, {
    kind: "event_date",
    statement: "23 April 1964.",
    value: "1964-04-23",
    precision: "day",
    sources: [{ name: "one outlying publication", tier: "reference" }],
  });
  addFact(d, {
    kind: "event_date",
    statement: "24 April 1964.",
    value: "1964-04-24",
    precision: "day",
    sources: [kens5, newsnation, wikidata],
  });

  const date = consensusDate(d);
  assert.equal(date?.value, "1964-04-24");
  assert.equal(date?.sources, 3);
});

test("a tie on corroboration falls back to the earliest date named", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "event_date",
    statement: "22 December.",
    value: "1980-12-22",
    precision: "day",
    sources: [kens5],
  });
  addFact(d, {
    kind: "event_date",
    statement: "20 December.",
    value: "1980-12-20",
    precision: "day",
    sources: [newsnation],
  });

  // Never an average: 21 December is a day nobody reported.
  assert.equal(consensusDate(d)?.value, "1980-12-20");
});

test("an exact date beats a vague one when equally sourced", () => {
  const d = createDossier("las vegas 2023");
  // The year-only date is stored as 1 January by convention, so on the
  // earliest-date rule alone it would beat the day it actually happened. This
  // is the Las Vegas failure exactly: one source gave 30 April and the
  // published account said 2023.
  addFact(d, {
    kind: "event_date",
    statement: "Sometime in 2023, derived from the video being a year later.",
    value: "2023-01-01",
    precision: "year",
    sources: [newsnation],
  });
  addFact(d, {
    kind: "event_date",
    statement: "Around midnight on 30 April 2023.",
    value: "2023-04-30",
    precision: "day",
    sources: [kens5],
  });

  const date = consensusDate(d);
  assert.equal(date?.value, "2023-04-30");
  assert.equal(date?.precision, "day");
});

test("corroboration still outranks precision", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "event_date",
    statement: "A precise date nobody else supports.",
    value: "1964-04-23",
    precision: "day",
    sources: [{ name: "one outlier", tier: "reference" }],
  });
  addFact(d, {
    kind: "event_date",
    statement: "A vaguer date three sources agree on.",
    value: "1964-01-01",
    precision: "year",
    sources: [kens5, newsnation, wikidata],
  });

  assert.equal(consensusDate(d)?.value, "1964-01-01");
});

test("no date facts yields null rather than a guess", () => {
  assert.equal(consensusDate(createDossier("x")), null);
});

// ---------------------------------------------------------------------------
// Housekeeping
// ---------------------------------------------------------------------------

test("unresolved questions and media deduplicate", () => {
  const d = createDossier("x");
  addUnresolved(d, "Where exactly in Las Vegas?");
  addUnresolved(d, "Where exactly in Las Vegas?");
  addMedia(d, {
    kind: "video",
    url: "https://example.test/a",
    description: "the clip as posted",
    source: kens5,
  });
  addMedia(d, {
    kind: "video",
    url: "https://example.test/a",
    description: "the same clip again",
    source: newsnation,
  });

  assert.equal(d.unresolved.length, 1);
  assert.equal(d.media.length, 1);
});

test("summarise reports the thinness that decides whether to draft at all", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "claim",
    statement: "Someone said something.",
    sources: [anon],
  });

  const s = summarise(d);
  assert.equal(s.facts, 1);
  assert.equal(s.sources, 1);
  assert.equal(s.corroborated, 0);
  assert.equal(s.describes_footage, false);
});

test("grounding text carries the facts but not the prompt scaffolding", () => {
  const d = createDossier("x");
  addFact(d, {
    kind: "location",
    statement: "Las Vegas, Nevada.",
    sources: [kens5],
  });

  const text = groundingText(d);
  assert.match(text, /Las Vegas, Nevada/);
  assert.match(text, /KENS 5/);
  // Instruction wording must not be available as grounding, or a phrase from
  // our own scaffolding would count as a source for the model's prose.
  assert.doesNotMatch(text, /DOSSIER BEGINS/);
  assert.doesNotMatch(text, /nothing established/);
});

// ---------------------------------------------------------------------------
// Merging, which is where corroboration actually appears
// ---------------------------------------------------------------------------

test("merging clustered records turns separate dates into one corroborated fact", () => {
  // The real failure: four videos of the Las Vegas 2023 case were drafted
  // separately, three of them never learned the date, and a fourth carried
  // "around midnight on April 30" in its description all along.
  const a = createDossier("kens 5");
  addFact(a, {
    kind: "event_date",
    statement: "Around midnight on 30 April 2023.",
    value: "2023-04-30",
    precision: "day",
    sources: [kens5],
  });

  const b = createDossier("ufo seekers");
  addFact(b, {
    kind: "event_date",
    statement: "The title gives the date as 04/30/23.",
    value: "2023-04-30",
    precision: "day",
    sources: [{ name: "UFO Seekers", tier: "uploader" }],
  });

  const c = createDossier("newsnation");
  addFact(c, {
    kind: "claim",
    statement: "A family called 911 about nonhuman beings.",
    sources: [newsnation],
  });

  const merged = mergeDossiers("Las Vegas 2023", [a, b, c]);
  const date = consensusDate(merged);

  assert.equal(date?.value, "2023-04-30");
  assert.equal(date?.precision, "day");
  assert.equal(date?.sources, 2, "two separate publications, which is the claim");
  assert.equal(summarise(merged).sources, 3);
});

test("sources that disagree both survive the merge", () => {
  // The archive's job is to show that the sources disagree, not to pick one.
  const a = createDossier("a");
  addFact(a, {
    kind: "claim",
    statement: "The caller described the beings as about eight feet tall.",
    sources: [kens5],
  });
  const b = createDossier("b");
  addFact(b, {
    kind: "claim",
    statement: "The caller described the beings as about ten feet tall.",
    sources: [newsnation],
  });

  assert.equal(mergeDossiers("x", [a, b]).facts.length, 2);
});

test("a question one source could not answer closes if another answered it", () => {
  const unknown = createDossier("a");
  addUnresolved(
    unknown,
    "Nobody has described what is visible in this footage. The title and description are the uploader's claims about it, not an account of it.",
  );

  const described = createDossier("b");
  addFact(described, {
    kind: "footage",
    statement: "The report describes an object crossing the sensor field.",
    sources: [aaro],
  });

  const merged = mergeDossiers("x", [unknown, described]);
  assert.equal(hasFootageDescription(merged), true);
  assert.equal(
    merged.unresolved.length,
    0,
    "leaving it open would say we do not know something we do",
  );
});
