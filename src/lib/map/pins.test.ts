import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clusterPins,
  decades,
  matchesFilters,
  type Pin,
} from "@/lib/map/pins";

function pin(over: Partial<Pin> = {}): Pin {
  return {
    id: "a",
    slug: "a",
    title: "Airmen report a landed craft",
    dateLabel: "26 December 1980",
    date: "1980-12-26",
    location: "Rendlesham Forest, Suffolk",
    classification: "acknowledged",
    continent: "europe",
    lat: 52.08,
    lng: 1.44,
    approximate: false,
    ...over,
  };
}

/** A trivial projection: one degree to one pixel, so the maths is checkable. */
const project = (lng: number, lat: number): [number, number] => [lng, lat];

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

test("pins far apart stay separate", () => {
  const out = clusterPins([pin({ lng: 0 }), pin({ id: "b", lng: 100 })], project, 10);
  assert.equal(out.length, 2);
  assert.ok(out.every((c) => c.single !== null));
});

test("pins inside one cell collapse into a cluster", () => {
  const out = clusterPins(
    [pin({ lng: 1, lat: 1 }), pin({ id: "b", lng: 2, lat: 2 })],
    project,
    10,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].members.length, 2);
});

test("a collapsed cluster has no single pin, so it shows no bubble", () => {
  // The requirement: hovering a group must not produce a bubble. Naming one of
  // twelve events arbitrarily is not information.
  const out = clusterPins(
    [pin({ lng: 1 }), pin({ id: "b", lng: 2 }), pin({ id: "c", lng: 3 })],
    project,
    10,
  );
  assert.equal(out[0].single, null);
});

test("a cluster sits at the centre of its members, not on the first one", () => {
  const out = clusterPins(
    [pin({ lng: 0, lat: 0 }), pin({ id: "b", lng: 4, lat: 8 })],
    project,
    10,
  );
  assert.equal(out[0].x, 2);
  assert.equal(out[0].y, 4);
});

test("a smaller cell separates pins that a larger one merged", () => {
  // This is what zooming in does: the grid loosens and clusters dissolve.
  const pins = [pin({ lng: 1, lat: 1 }), pin({ id: "b", lng: 5, lat: 5 })];
  assert.equal(clusterPins(pins, project, 10).length, 1);
  assert.equal(clusterPins(pins, project, 2).length, 2);
});

test("larger clusters are drawn first so single pins are never buried", () => {
  const pins = [
    pin({ lng: 1 }),
    pin({ id: "b", lng: 2 }),
    pin({ id: "c", lng: 3 }),
    pin({ id: "d", lng: 50 }),
  ];
  const out = clusterPins(pins, project, 10);
  assert.equal(out[0].members.length, 3);
  assert.equal(out[out.length - 1].members.length, 1);
});

test("a projection refusing a coordinate drops the pin rather than throwing", () => {
  const out = clusterPins([pin()], () => null, 10);
  assert.deepEqual(out, []);
});

test("a non-finite projection result is discarded", () => {
  const out = clusterPins([pin()], () => [NaN, 0], 10);
  assert.deepEqual(out, []);
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

test("classification and continent filter independently", () => {
  assert.ok(matchesFilters(pin(), { classification: "acknowledged" }));
  assert.ok(!matchesFilters(pin(), { classification: "debunked" }));
  assert.ok(matchesFilters(pin(), { continent: "europe" }));
  assert.ok(!matchesFilters(pin(), { continent: "asia" }));
});

test("an empty filter set matches everything", () => {
  assert.ok(matchesFilters(pin(), {}));
  assert.ok(matchesFilters(pin({ date: null }), {}));
});

test("a date range includes its own bounds", () => {
  const p = pin({ date: "1980-12-26" });
  assert.ok(matchesFilters(p, { from: "1980-12-26", to: "1980-12-26" }));
  assert.ok(!matchesFilters(p, { from: "1980-12-27" }));
  assert.ok(!matchesFilters(p, { to: "1980-12-25" }));
});

test("either end of a range can stand alone", () => {
  const p = pin({ date: "1980-12-26" });
  assert.ok(matchesFilters(p, { from: "1970-01-01" }));
  assert.ok(matchesFilters(p, { to: "1990-01-01" }));
});

test("a date-unknown case shows unfiltered and hides once a range is set", () => {
  // Including it would tell the reader it falls in the range. Dropping it always
  // would hide it entirely. This is the only reading that asserts nothing false.
  const p = pin({ date: null });
  assert.ok(matchesFilters(p, {}));
  assert.ok(!matchesFilters(p, { from: "1970-01-01" }));
});

test("search matches the title and the location, case-insensitively", () => {
  assert.ok(matchesFilters(pin(), { query: "RENDLESHAM" }));
  assert.ok(matchesFilters(pin(), { query: "landed craft" }));
  assert.ok(!matchesFilters(pin(), { query: "varginha" }));
});

test("a blank query is not a filter", () => {
  assert.ok(matchesFilters(pin(), { query: "   " }));
});

test("filters combine as AND", () => {
  const f = { classification: "acknowledged" as const, continent: "asia" as const };
  assert.ok(!matchesFilters(pin(), f));
});

// ---------------------------------------------------------------------------
// Decades
// ---------------------------------------------------------------------------

test("decades run from the 1930s to the current decade", () => {
  const out = decades(new Date("2026-07-27T00:00:00Z"));
  assert.equal(out[0].label, "1930s");
  assert.equal(out[out.length - 1].label, "2020s");
});

test("a decade bucket spans exactly ten years", () => {
  const out = decades(new Date("2026-07-27T00:00:00Z"));
  assert.equal(out[0].from, "1930-01-01");
  assert.equal(out[0].to, "1939-12-31");
});

test("every decade in the range is present, with none skipped", () => {
  const out = decades(new Date("2026-07-27T00:00:00Z"));
  assert.equal(out.length, 10); // 1930s through 2020s
  const years = out.map((d) => Number(d.label.slice(0, 4)));
  for (let i = 1; i < years.length; i++) {
    assert.equal(years[i] - years[i - 1], 10);
  }
});
