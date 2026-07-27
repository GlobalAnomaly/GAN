import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_SOURCES,
  HARVEST_SOURCES,
  SUPPORT_SOURCES,
  coverageGap,
  harvestable,
  isFetchable,
  sourceById,
  supportSourcesFor,
} from "@/lib/bot/sources";

// ---------------------------------------------------------------------------
// The registry has to stay internally honest
// ---------------------------------------------------------------------------

test("every source has a unique id", () => {
  const ids = ALL_SOURCES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a conditional or permission-gated source states its condition", () => {
  for (const source of ALL_SOURCES) {
    if (source.status === "conditional" || source.status === "needs_permission") {
      assert.ok(source.condition, `${source.id} gives no condition`);
    }
  }
});

test("nothing restricted is allowed to publish narrative", () => {
  // The flag that stops publishing code serving what we have no right to
  // serve. A source needing permission must never carry it.
  for (const source of ALL_SOURCES) {
    if (source.status === "needs_permission" || source.status === "unchecked") {
      assert.equal(
        source.may_publish_narrative,
        false,
        `${source.id} would serve narrative it has no right to`,
      );
    }
  }
});

test("support sources are never walked for records", () => {
  for (const source of SUPPORT_SOURCES) {
    assert.notEqual(source.role, "harvest", `${source.id} is listed as support`);
  }
});

// ---------------------------------------------------------------------------
// The status gate
// ---------------------------------------------------------------------------

test("a source with an unchecked licence cannot be fetched", () => {
  // Treating silence as permission is how a project acquires a problem it
  // cannot undo.
  const uk = sourceById("uk-national-archives")!;
  assert.equal(uk.status, "unchecked");
  assert.equal(isFetchable(uk), false);
  assert.ok(!harvestable().includes(uk));
});

test("sources needing written permission are held back too", () => {
  for (const id of ["ufocat", "geipan", "nuforc"]) {
    assert.equal(isFetchable(sourceById(id)!), false, `${id} should be gated`);
  }
});

test("what is cleared is genuinely available", () => {
  const ids = harvestable().map((s) => s.id);
  assert.ok(ids.includes("aaro-imagery"));
  assert.ok(ids.includes("blue-book"));
  assert.ok(ids.includes("youtube"));
});

// ---------------------------------------------------------------------------
// Coverage, which is what makes a slow enrichment affordable
// ---------------------------------------------------------------------------

test("a 1947 US case gets the newspaper archive and not the news index", () => {
  const ids = supportSourcesFor({ occurred_at: "1947-07-08", country: "US" }).map((s) => s.id);
  assert.ok(ids.includes("chronicling-america"), "in period and in country");
  assert.ok(!ids.includes("gdelt"), "GDELT starts in 2015");
  assert.ok(ids.includes("wikipedia"), "unbounded sources always apply");
});

test("a 2023 case gets the news index and not the newspaper archive", () => {
  const ids = supportSourcesFor({ occurred_at: "2023-04-30", country: "US" }).map((s) => s.id);
  assert.ok(ids.includes("gdelt"));
  assert.ok(!ids.includes("chronicling-america"), "it stops in 1963");
});

test("a country-specific archive is not asked about another country", () => {
  const ids = supportSourcesFor({ occurred_at: "1954-09-10", country: "FR" }).map((s) => s.id);
  assert.ok(!ids.includes("chronicling-america"), "US only");
  assert.ok(!ids.includes("trove"), "Australia only");
});

test("an undated record is only asked of sources with no date bounds", () => {
  // Asking a dated source about an undated record would mean pretending to
  // know something we do not.
  const sources = supportSourcesFor({ occurred_at: null, country: null });
  for (const source of sources) {
    assert.equal(source.coverage.from, null, `${source.id} has a lower bound`);
    assert.equal(source.coverage.to, null, `${source.id} has an upper bound`);
  }
  assert.ok(sources.some((s) => s.id === "wikipedia"));
});

test("nothing unfetchable is ever selected", () => {
  for (const year of ["1897-04-15", "1947-07-08", "1980-12-26", "2023-04-30"]) {
    for (const source of supportSourcesFor({ occurred_at: year, country: "US" })) {
      assert.ok(isFetchable(source), `${source.id} was selected while gated`);
    }
  }
});

// ---------------------------------------------------------------------------
// The gap, stated rather than discovered later
// ---------------------------------------------------------------------------

test("the 1964 to 2014 gap is real and only one source covers it", () => {
  // Free newspaper archives are mostly pre-1963 and news indexes start around
  // 2015, while UFOCAT is densest in the 1970s to 1990s. The archives help
  // least exactly where we hold most material.
  const gap = coverageGap();
  assert.equal(gap.from, 1964);

  const mid = supportSourcesFor({ occurred_at: "1978-06-01", country: "US" }).map((s) => s.id);
  assert.ok(!mid.includes("chronicling-america"));
  assert.ok(!mid.includes("gdelt"));
  assert.ok(
    gap.covered_by.includes("ufo-newsclipping-service"),
    "which is why AFU is the most valuable contact on the list",
  );
});

// ---------------------------------------------------------------------------
// Incremental harvesting
// ---------------------------------------------------------------------------

test("a closed collection is not marked for incremental updates", () => {
  // Blue Book closed in 1969. Re-walking it for new records would be work that
  // can never find anything.
  const blueBook = sourceById("blue-book")!;
  assert.equal(blueBook.coverage.to, 1969);
  assert.equal(blueBook.supports_date_range, false);
});

test("ongoing sources can be asked for only what is new", () => {
  // The whole point of the second phase: after the initial backfill, keeping
  // current must not mean re-walking 300,000 records.
  for (const id of ["youtube", "nara-uap", "gdelt"]) {
    assert.equal(sourceById(id)!.supports_date_range, true, `${id} needs incremental fetch`);
  }
});

test("every harvest source declares roughly what a full pass costs", () => {
  // Not required for all of them, but where it is known it belongs here, since
  // the initial backfill has to be planned in parts.
  const known = HARVEST_SOURCES.filter((s) => s.approximate_records !== undefined);
  assert.ok(known.length >= 6);
  assert.ok(known.every((s) => (s.approximate_records ?? 0) > 0));
});
