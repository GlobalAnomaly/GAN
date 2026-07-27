import test from "node:test";
import assert from "node:assert/strict";

import { bestDate, resolveDates } from "@/lib/bot/relative-dates";

/** Shorthand: the values found, for terse assertions. */
const values = (text: string, published: string) =>
  resolveDates(text, published).map((d) => `${d.value}/${d.precision}`);

// ---------------------------------------------------------------------------
// The four Las Vegas videos, which is where this came from
// ---------------------------------------------------------------------------

test("NewsNation: 'one year since' resolves against the publication date", () => {
  // The real description, published 2024-04-25. The draft written from this
  // said the date was "established as last year".
  const dates = resolveDates(
    "It's been one year since a Las Vegas family claims something crashed in their backyard, prompting them to call 911 about nonhuman beings.",
    "2024-04-25T03:46:43Z",
  );

  const best = bestDate(dates);
  assert.equal(best?.value, "2023-01-01");
  assert.equal(best?.precision, "year", "a rounded phrase must not claim a month");
  assert.equal(best?.derived, true);
  assert.match(best!.basis, /one year since/);
  assert.match(best!.basis, /2024-04-25/, "the derivation is stated, not hidden");
});

test("KENS 5: a day and month with no year takes the year from publication", () => {
  // The real description, published 2023-06-14. This is the fact the other
  // three accounts were missing while it sat in the same inbox.
  const dates = resolveDates(
    'It was around midnight on April 30 when a Las Vegas family reported something crashed in their backyard and there were "big creatures" on board.',
    "2023-06-14T18:03:24Z",
  );

  const best = bestDate(dates);
  assert.equal(best?.value, "2023-04-30");
  assert.equal(best?.precision, "day");
});

test("UFO Seekers: the date in the title parses out of the slashed form", () => {
  const dates = resolveDates(
    "PRO ANALYSIS: Green Object on Las Vegas Metro PD Body Cam, Aliens, and UFO Crash (04/30/23)",
    "2023-06-10T00:14:20Z",
  );
  assert.ok(
    dates.some((d) => d.value === "2023-04-30" && d.precision === "day"),
    "the candidate that was never drafted carried the exact date all along",
  );
});

// ---------------------------------------------------------------------------
// Not inventing, and not overstating
// ---------------------------------------------------------------------------

test("a date after publication is refused rather than reported", () => {
  // An event cannot be described before it happens, so this parse is wrong
  // and dropping it is the correct outcome.
  assert.deepEqual(values("on December 25", "2023-06-14T00:00:00Z"), [
    "2022-12-25/day",
  ]);
});

test("relative years never claim a month or a day", () => {
  const dates = resolveDates("Three years ago this happened.", "2026-07-27T00:00:00Z");
  assert.equal(dates[0].value, "2023-01-01");
  assert.equal(dates[0].precision, "year");
});

test("'last year' is a year, not a guessed month", () => {
  const dates = resolveDates("The family called 911 last year.", "2024-04-25T00:00:00Z");
  assert.ok(dates.some((d) => d.value === "2023-01-01" && d.precision === "year"));
});

test("months back are computed across a year boundary", () => {
  const dates = resolveDates("Filmed three months ago.", "2024-02-10T00:00:00Z");
  assert.ok(dates.some((d) => d.value === "2023-11-01" && d.precision === "month"));
});

test("a stated date always beats a derived one", () => {
  const dates = resolveDates(
    "It has been one year since the incident, which took place on 30 April 2023.",
    "2024-04-25T00:00:00Z",
  );
  const best = bestDate(dates);
  assert.equal(best?.value, "2023-04-30");
  assert.equal(best?.derived, false);
});

test("stray numbers are not read as years", () => {
  // Descriptions are full of view counts, timestamps and phone numbers.
  const dates = resolveDates(
    "Subscribe for 1000 more. Call 911. Runtime 408 seconds. Serial 90126027.",
    "2024-04-25T00:00:00Z",
  );
  assert.deepEqual(dates, []);
});

test("a year far outside the archive's range is ignored", () => {
  assert.deepEqual(values("USPTO Serial 90126027 filed", "2024-01-01T00:00:00Z"), []);
});

test("an unparseable publication date yields nothing rather than throwing", () => {
  assert.deepEqual(resolveDates("30 April 2023", "not a date"), []);
});

test("no date in the text yields nothing rather than a fallback", () => {
  assert.deepEqual(resolveDates("A light in the sky, no date given.", "2024-01-01T00:00:00Z"), []);
  assert.equal(bestDate([]), null);
});

// ---------------------------------------------------------------------------
// Forms that appear in this material
// ---------------------------------------------------------------------------

test("the common written forms all parse to the same day", () => {
  const published = "2024-01-01T00:00:00Z";
  for (const form of [
    "on 30 April 2023",
    "April 30, 2023",
    "April 30th, 2023",
    "2023-04-30",
    "4/30/2023",
  ]) {
    assert.ok(
      resolveDates(form, published).some((d) => d.value === "2023-04-30"),
      `failed to parse: ${form}`,
    );
  }
});

test("a month and year without a day stays at month precision", () => {
  const dates = resolveDates("The sighting occurred in April 2023.", "2024-01-01T00:00:00Z");
  const best = bestDate(dates);
  assert.equal(best?.value, "2023-04-01");
  assert.equal(best?.precision, "month");
});
