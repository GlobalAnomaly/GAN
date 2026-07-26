import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blockKeys,
  blockKeysWithYearEdges,
  haversineKm,
  normalizePlace,
  scorePair,
  stringSimilarity,
  LINK_THRESHOLD,
  SUGGEST_THRESHOLD,
  type MatchableReport,
} from "@/lib/ingest/match";

function report(over: Partial<MatchableReport> = {}): MatchableReport {
  return {
    id: "a",
    occurred_at: "1980-12-26",
    date_precision: "day",
    lat: 52.08,
    lng: 1.43,
    location_raw: "RENDLESHAM",
    country: "Great Britain",
    shape: "Disc",
    observers: 3,
    source_key: "ufocat",
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Geometry and strings
// ---------------------------------------------------------------------------

test("haversine matches a known distance", () => {
  // Fort Knox to Frankfort, Kentucky: the Mantell disagreement, about 70km.
  const km = haversineKm(37.91, -85.96, 38.2, -84.87);
  assert.ok(km > 90 && km < 110, `expected roughly 100km, got ${km}`);
});

test("haversine is zero for a point against itself", () => {
  assert.equal(haversineKm(10, 20, 10, 20), 0);
});

test("normalizePlace strips the alternate after an equals sign", () => {
  // UFOCAT writes "LAFOLLETTE=POWELL" for one place named two ways.
  assert.equal(normalizePlace("LAFOLLETTE=POWELL"), "lafollette");
});

test("normalizePlace drops direction suffixes", () => {
  // "FRANKLIN SW" and "FRANKLIN" are the same town to a matcher.
  assert.equal(normalizePlace("FRANKLIN SW"), normalizePlace("FRANKLIN"));
});

test("stringSimilarity ranks a misspelling well above an unrelated name", () => {
  // A transposition breaks three bigrams, so Dice gives about 0.67 rather than
  // something near 1. Asserting a relative ordering rather than an invented
  // absolute number, because the absolute is a property of the metric and the
  // ordering is the thing the matcher actually relies on.
  const typo = stringSimilarity("rendlesham", "rendelsham");
  const unrelated = stringSimilarity("rendlesham", "varginha");
  assert.ok(typo > 0.6, `expected above 0.6, got ${typo}`);
  assert.ok(typo > unrelated * 2, `${typo} should dwarf ${unrelated}`);
});

test("stringSimilarity separates unrelated names", () => {
  assert.ok(stringSimilarity("phoenix", "varginha") < 0.2);
});

test("similar but genuinely different towns stay below the substitution bar", () => {
  // This is why the name-for-coordinates bar is 0.8 and not lower. Springfield
  // and Springville are different places, and they score around 0.5, which is
  // uncomfortably close to a misspelling's 0.67. Coordinates decide when we have
  // them; a name only substitutes when it is nearly exact.
  assert.ok(stringSimilarity("springfield", "springville") < 0.8);
});

// ---------------------------------------------------------------------------
// The date gate
// ---------------------------------------------------------------------------

test("same place six months apart is never a match", () => {
  const scored = scorePair(
    report({ occurred_at: "1980-01-10" }),
    report({ id: "b", occurred_at: "1980-07-10" }),
  );
  assert.equal(scored.action, "ignore");
  assert.equal(scored.score, 0);
});

test("one day apart still scores well, because midnight and timezones", () => {
  const scored = scorePair(
    report({ occurred_at: "1980-12-26" }),
    report({ id: "b", occurred_at: "1980-12-27" }),
  );
  assert.ok(scored.score >= SUGGEST_THRESHOLD, `got ${scored.score}`);
});

test("a year-precision date does not pretend to day precision", () => {
  // Both were stored as 1 January because only the year was known. They must
  // not read as an exact same-day match.
  const a = report({ occurred_at: "1954-01-01", date_precision: "year" });
  const b = report({ id: "b", occurred_at: "1954-01-01", date_precision: "year" });
  const scored = scorePair(a, b);
  assert.ok(
    scored.score < LINK_THRESHOLD,
    `year-only dates must not auto-link, got ${scored.score}`,
  );
});

test("an unusable date blocks the pair entirely", () => {
  const scored = scorePair(
    report({ date_precision: "unknown" }),
    report({ id: "b" }),
  );
  assert.equal(scored.action, "ignore");
});

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

test("the same event at the same spot links without asking", () => {
  const scored = scorePair(report(), report({ id: "b", source_key: "nuforc" }));
  assert.equal(scored.action, "link");
});

test("the Mantell disagreement is still caught", () => {
  // Sources place one event at Fort Knox and at Frankfort, about 100km apart.
  // A matcher that demanded tight agreement would miss the best-documented
  // case in the database.
  const scored = scorePair(
    report({
      occurred_at: "1948-01-07",
      lat: 37.91,
      lng: -85.96,
      location_raw: "FORT KNOX",
      shape: null,
    }),
    report({
      id: "b",
      occurred_at: "1948-01-07",
      lat: 38.2,
      lng: -84.87,
      location_raw: "FRANKFORT",
      shape: null,
      source_key: "nuforc",
    }),
  );
  assert.notEqual(scored.action, "ignore");
  assert.ok(scored.score >= SUGGEST_THRESHOLD, `got ${scored.score}`);
});

test("same day on opposite sides of the world is not a match", () => {
  const scored = scorePair(
    report({ lat: 52.08, lng: 1.43 }),
    report({ id: "b", lat: -33.87, lng: 151.21, location_raw: "SYDNEY" }),
  );
  assert.equal(scored.action, "ignore");
});

test("a strong name match substitutes for missing coordinates", () => {
  // 8% of UFOCAT has no coordinates, and much more of the older material.
  const scored = scorePair(
    report({ lat: null, lng: null }),
    report({ id: "b", lat: null, lng: null, source_key: "nuforc" }),
  );
  assert.notEqual(scored.action, "ignore");
});

test("no coordinates and unrelated names is not a match", () => {
  const scored = scorePair(
    report({ lat: null, lng: null, location_raw: "PHOENIX" }),
    report({ id: "b", lat: null, lng: null, location_raw: "VARGINHA" }),
  );
  assert.equal(scored.action, "ignore");
});

// ---------------------------------------------------------------------------
// Shape is corroboration, not evidence
// ---------------------------------------------------------------------------

test("disagreeing on shape does not by itself break a strong match", () => {
  // Witnesses to one event describe it differently. That is normal, and the
  // account is supposed to say so rather than treating it as two events.
  const scored = scorePair(
    report({ shape: "Disc" }),
    report({ id: "b", shape: "Cigar", source_key: "nuforc" }),
  );
  assert.notEqual(scored.action, "ignore");
});

test("agreeing on shape cannot rescue a weak match", () => {
  const scored = scorePair(
    report({ occurred_at: "1980-01-10", shape: "Disc" }),
    report({ id: "b", occurred_at: "1980-09-10", shape: "Disc" }),
  );
  assert.equal(scored.action, "ignore");
});

// ---------------------------------------------------------------------------
// Blocking
// ---------------------------------------------------------------------------

test("a report blocks into its own cell and its eight neighbours", () => {
  const keys = blockKeys(report());
  assert.equal(keys.length, 9);
  assert.ok(keys.includes("1980|52,1"));
});

test("two reports either side of a cell boundary share a block", () => {
  const a = blockKeys(report({ lat: 51.99, lng: 1.43 }));
  const b = blockKeys(report({ lat: 52.01, lng: 1.43 }));
  assert.ok(a.some((k) => b.includes(k)), "boundary pair must share a block");
});

test("reports without coordinates block on the place name", () => {
  const keys = blockKeys(report({ lat: null, lng: null }));
  assert.deepEqual(keys, ["1980|name:rendlesham"]);
});

test("a report with neither date nor usable block yields nothing", () => {
  assert.deepEqual(blockKeys(report({ occurred_at: null })), []);
});

test("new year's eve and new year's day can still meet", () => {
  const a = blockKeysWithYearEdges(report({ occurred_at: "1980-12-31" }));
  const b = blockKeysWithYearEdges(report({ occurred_at: "1981-01-01" }));
  assert.ok(
    a.some((k) => b.includes(k)),
    "a pair spanning midnight on 31 December must share a block",
  );
});

test("mid-year dates do not pay for the year-edge widening", () => {
  const keys = blockKeysWithYearEdges(report({ occurred_at: "1980-06-15" }));
  assert.equal(keys.length, 9);
});
