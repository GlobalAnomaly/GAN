import test from "node:test";
import assert from "node:assert/strict";

import { addFact, createDossier, type Dossier } from "@/lib/bot/dossier";
import { rankByRelevance, scoreRelevance, type RelevanceInput } from "@/lib/bot/relevance";

function input(over: Partial<RelevanceInput> = {}): RelevanceInput {
  return {
    title: "strange light over the harbour",
    description: "",
    channel: "someone",
    duration_seconds: 60,
    media_type: "short",
    dossier: createDossier("x"),
    ...over,
  };
}

function withDate(precision: "day" | "year" = "day"): Dossier {
  const d = createDossier("x");
  addFact(d, {
    kind: "event_date",
    statement: "30 April 2023.",
    value: "2023-04-30",
    precision,
    sources: [{ name: "KENS 5", tier: "press" }],
  });
  return d;
}

// ---------------------------------------------------------------------------
// Exclusions, which are why this exists
// ---------------------------------------------------------------------------

test("a sports press conference is not about this archive's subject", () => {
  const result = scoreRelevance(
    input({
      title: "Aaron Rodgers on returning to Steelers, his future, Coach Tomlin",
      channel: "Pittsburgh Steelers",
      media_type: "youtube",
    }),
  );
  assert.equal(result.excluded, true);
  assert.match(String(result.exclusion_reason), /touches this archive's subject/);
});

test("the domain check matches words, not substrings", () => {
  // The first version used includes(), so "aaro" matched "Aaron" and the check
  // written to keep these out was matching them in. Fuzzy matching AARO into
  // Aaron is how they arrived in the first place.
  for (const title of [
    "Aaron Gunches execution news conference",
    "De'Aaron Fox & Coach Brown | Postgame Pressers",
    "Aaron Rai's Champion's Press Conference",
    "Aaron Glenn Introductory Press Conference",
  ]) {
    assert.equal(scoreRelevance(input({ title })).excluded, true, `let through: ${title}`);
  }

  // And the real thing still passes.
  assert.equal(
    scoreRelevance(input({ title: "AARO releases new UAP footage" })).excluded,
    false,
  );
});

test("compilations are refused because no claim in them can be attributed", () => {
  for (const title of [
    "The Boomerang UFO Compilation",
    "Undeniable UFO Footage Vol. 7",
    "Top 10 UFO sightings of 2024",
    "Best of UFO encounters",
  ]) {
    const result = scoreRelevance(input({ title }));
    assert.equal(result.excluded, true, `not excluded: ${title}`);
    assert.match(String(result.exclusion_reason), /compilation/);
  }
});

test("a single documented case is not mistaken for a compilation", () => {
  assert.equal(
    scoreRelevance(input({ title: "UFO filmed over Mexico City, 21st February 2020" })).excluded,
    false,
  );
});

test("test uploads are refused", () => {
  assert.equal(scoreRelevance(input({ title: "test 20260209 031847 showstest" })).excluded, true);
});

// ---------------------------------------------------------------------------
// What earns a place in the queue
// ---------------------------------------------------------------------------

test("a description of the footage outweighs everything else", () => {
  const described = createDossier("x");
  addFact(described, {
    kind: "footage",
    statement: "AARO describes the released footage as showing an object crossing the field.",
    sources: [{ name: "AARO", tier: "official" }],
  });

  const bare = scoreRelevance(input({ title: "UFO sighting" }));
  const withFootage = scoreRelevance(input({ title: "UFO sighting", dossier: described }));

  assert.ok(withFootage.score > bare.score + 0.25);
  assert.ok(withFootage.reasons.some((r) => /describes what the footage shows/.test(r)));
});

test("a date to the day is worth more than a date to the year", () => {
  const day = scoreRelevance(input({ title: "UFO sighting", dossier: withDate("day") }));
  const year = scoreRelevance(input({ title: "UFO sighting", dossier: withDate("year") }));
  // A year cannot be cross-checked against contemporaneous reporting; a day can.
  assert.ok(day.score > year.score);
});

test("corroboration across publications raises the score", () => {
  const alone = scoreRelevance(input({ title: "UFO sighting", source_count: 1 }));
  const together = scoreRelevance(input({ title: "UFO sighting", source_count: 4 }));
  assert.ok(together.score > alone.score);
  assert.ok(together.reasons.some((r) => /independent sources agree/.test(r)));
});

test("a press source outranks an anonymous account, all else equal", () => {
  const press = scoreRelevance(input({ title: "UFO sighting", channel: "NewsNation" }));
  const anon = scoreRelevance(input({ title: "UFO sighting", channel: "" }));
  assert.ok(press.score > anon.score);
});

test("a broadcaster with no channel number is still a broadcaster", () => {
  // "BBC" carries no digit, so an earlier pattern let a BBC Roswell
  // documentary fall through to uploader and rank near the bottom.
  const bbc = scoreRelevance(input({ title: "The Roswell UFO crash", channel: "BBC" }));
  const unknown = scoreRelevance(input({ title: "The Roswell UFO crash", channel: "some guy" }));
  assert.ok(bbc.score > unknown.score);
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

test("ranking drops the excluded and puts the best first", () => {
  const items = [
    { id: "sport", relevance: scoreRelevance(input({ title: "Aaron Rodgers press conference" })) },
    { id: "thin", relevance: scoreRelevance(input({ title: "ufo maybe", channel: "" })) },
    {
      id: "good",
      relevance: scoreRelevance(
        input({ title: "UFO over Las Vegas", channel: "NewsNation", dossier: withDate(), source_count: 3 }),
      ),
    },
  ];

  const ranked = rankByRelevance(items);
  assert.equal(ranked.length, 2, "the sports video is gone");
  assert.equal(ranked[0].id, "good");
});

test("the score stays inside its range", () => {
  const everything = createDossier("x");
  addFact(everything, {
    kind: "footage",
    statement: "An official report describes the footage in detail across several sentences here.",
    sources: [{ name: "AARO", tier: "official" }],
  });
  addFact(everything, {
    kind: "location",
    statement: "The event took place at a named location established by two separate sources.",
    value: "somewhere",
    sources: [{ name: "AARO", tier: "official" }, { name: "NewsNation", tier: "press" }],
  });
  addFact(everything, {
    kind: "event_date",
    statement: "The date is established to the day by more than one source.",
    value: "2023-04-30",
    precision: "day",
    sources: [{ name: "AARO", tier: "official" }, { name: "NewsNation", tier: "press" }],
  });

  const result = scoreRelevance(
    input({ title: "UAP footage released", channel: "AARO", dossier: everything, source_count: 5 }),
  );
  assert.ok(result.score > 0 && result.score <= 1, `score was ${result.score}`);
});
