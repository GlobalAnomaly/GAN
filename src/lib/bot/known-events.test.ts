/**
 * The matcher decides which established facts get fed to the model. A wrong
 * match puts a confidently wrong date on a published case, so it is tested to
 * be right when it fires and silent when it is unsure.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  KNOWN_EVENTS,
  matchKnownEvent,
  referenceBlock,
} from "@/lib/bot/known-events";

test("finds the event a documentary title is about", () => {
  const match = matchKnownEvent(
    "The Roswell Incident: BBC documentary",
    "A look back at what happened in New Mexico.",
  );
  assert.equal(match?.event.id, "roswell");
});

test("the Roswell reference carries the date the video omitted", () => {
  const match = matchKnownEvent("Roswell documentary")!;
  const block = referenceBlock(match);
  assert.match(block, /1947/);
  assert.match(block, /New Mexico/);
  // The authority has to travel with the fact, so the case can attribute it.
  assert.match(block, /National Archives/);
});

test("matches on the description when the title is vague", () => {
  const match = matchKnownEvent(
    "The strangest night in British military history",
    "In December 1980, airmen near Rendlesham Forest reported lights.",
  );
  assert.equal(match?.event.id, "rendlesham");
});

test("returns nothing rather than guessing", () => {
  assert.equal(matchKnownEvent("Strange lights filmed over my house"), null);
  assert.equal(matchKnownEvent(""), null);
  assert.equal(matchKnownEvent("A drone flying at sunset"), null);
});

test("a bare city name does not fire a match", () => {
  // "Phoenix" alone must not pull in the 1997 Arizona date.
  assert.equal(matchKnownEvent("UFO filmed over Phoenix suburbs 2024"), null);
  // The real event still matches.
  assert.equal(
    matchKnownEvent("Revisiting the Phoenix Lights")?.event.id,
    "phoenix-lights",
  );
});

test("the longest matching alias wins", () => {
  // Both "gimbal" and nothing else should fire here; the specific phrase
  // decides when several could apply.
  const match = matchKnownEvent("Analysing the GO FAST video frame by frame");
  assert.equal(match?.event.id, "gimbal-gofast");
});

test("matching is case and punctuation insensitive", () => {
  assert.equal(matchKnownEvent("TRANS-EN-PROVENCE")?.event.id, "trans-en-provence");
  assert.equal(matchKnownEvent("trans en provence case")?.event.id, "trans-en-provence");
  assert.equal(matchKnownEvent("USS  Nimitz encounter")?.event.id, "nimitz-2004");
});

test("every event is internally consistent", () => {
  const ids = new Set<string>();

  for (const e of KNOWN_EVENTS) {
    assert.ok(!ids.has(e.id), `duplicate event id: ${e.id}`);
    ids.add(e.id);

    assert.ok(e.aliases.length > 0, `${e.id} has no aliases`);
    assert.ok(e.authority.length > 0, `${e.id} has no authority`);

    for (const alias of e.aliases) {
      // Short aliases are how false matches happen.
      assert.ok(
        alias.length >= 6,
        `${e.id} has a dangerously short alias: "${alias}"`,
      );
    }

    if (e.date) {
      assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${e.id} has a malformed date`);
      // A day-precise date claims more than a month-precise one, so the
      // precision must never overstate what the archive actually establishes.
      assert.ok(
        ["day", "month", "year"].includes(e.date_precision),
        `${e.id} has a date but precision "${e.date_precision}"`,
      );
    }
  }
});

test("a matched event's date never gets day precision it has not earned", () => {
  const roswell = KNOWN_EVENTS.find((e) => e.id === "roswell")!;
  // The debris recovery date is not pinned to a single agreed day, so this
  // must stay month precision no matter how tempting a tidy date looks.
  assert.equal(roswell.date_precision, "month");
});
