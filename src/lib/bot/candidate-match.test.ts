import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterCandidates,
  dateAgreement,
  dateInterval,
  scoreCandidatePair,
  SUGGEST_THRESHOLD,
  termWeights,
  tokenize,
  type MatchableCandidate,
} from "@/lib/bot/candidate-match";

function candidate(
  id: string,
  title: string,
  over: Partial<MatchableCandidate> = {},
): MatchableCandidate {
  return {
    id,
    title,
    description: "",
    occurred_at: null,
    date_precision: "unknown",
    source_key: id,
    ...over,
  };
}

/**
 * The real Las Vegas set from the inbox, trimmed to titles and dates. Four
 * videos of the 2023 backyard case, one unrelated aeroplane clip from 2021 in
 * the same city, and one dateless repost.
 */
const LAS_VEGAS: MatchableCandidate[] = [
  candidate(
    "seekers",
    "PRO ANALYSIS: Green Object on Las Vegas Metro PD Body Cam, Aliens, and UFO Crash (04/30/23)",
    { occurred_at: "2023-04-30", date_precision: "day", source_key: "UFO Seekers" },
  ),
  candidate(
    "kens5",
    "UFO and large alien creatures reported in Las Vegas and police took it seriously",
    { occurred_at: "2023-04-30", date_precision: "day", source_key: "KENS 5" },
  ),
  candidate(
    "newsnation",
    "Las Vegas 'giant creature' possible 'alien' video is original: Evidence expert | Banfield",
    { occurred_at: "2023-01-01", date_precision: "year", source_key: "NewsNation" },
  ),
  candidate("8news", "Alleged Las Vegas alien sighting: What happened in 2023? | UFO Mysteries", {
    occurred_at: "2023-01-01",
    date_precision: "year",
    source_key: "8 News Now",
  }),
  candidate("plane2021", "Lightning reveals dark-UFO near airplane Las Vegas 2021", {
    occurred_at: "2021-01-01",
    date_precision: "year",
    source_key: "UFO archive",
  }),
  candidate(
    "dateless",
    "Original Video of Las Vegas family entering backyard with guns where Aliens was seen",
    { source_key: "Da Goob Show" },
  ),
];

/**
 * Term weights come from the whole corpus, so six titles that all say "Las
 * Vegas" would correctly give that phrase zero discriminating power. This
 * filler stands in for the other 391 candidates in the real inbox, where the
 * place name is rare and therefore meaningful.
 */
const FILLER = [
  "strange lights over Phoenix Arizona",
  "triangle craft filmed in Belgium 1990",
  "orbs over Tonopah air force base Nevada",
  "Rendlesham forest incident witness interview",
  "UFO compilation volume four undeniable footage",
  "pilot reports object off the coast of California",
  "Aaron Rodgers training camp press conference",
  "NASA SpaceX launch livestream anomaly",
];

const WEIGHTS = termWeights([...LAS_VEGAS.map((c) => c.title), ...FILLER]);
const byId = (id: string) => LAS_VEGAS.find((c) => c.id === id)!;
const pair = (a: string, b: string) => scoreCandidatePair(byId(a), byId(b), WEIGHTS);

// ---------------------------------------------------------------------------
// Dates as intervals, which is the whole reason this is not the UFOCAT matcher
// ---------------------------------------------------------------------------

test("a year contains a day inside it, so the two are compatible", () => {
  const year = dateInterval("2023-01-01", "year");
  const day = dateInterval("2023-04-30", "day");
  // As points these are 119 days apart and no match. As intervals the year
  // contains the day, which is the honest reading.
  assert.ok((dateAgreement(year, day) ?? 0) > 0);
});

test("different years are disjoint and refuse the match", () => {
  assert.equal(
    dateAgreement(dateInterval("2021-01-01", "year"), dateInterval("2023-04-30", "day")),
    0,
  );
});

test("two tight dates agree more strongly than a tight one and a vague one", () => {
  const bothDays = dateAgreement(
    dateInterval("2023-04-30", "day"),
    dateInterval("2023-04-30", "day"),
  )!;
  const dayAndYear = dateAgreement(
    dateInterval("2023-04-30", "day"),
    dateInterval("2023-01-01", "year"),
  )!;
  assert.ok(bothDays > dayAndYear);
});

test("a day either side of midnight still agrees", () => {
  // An evening sighting is reported in the next morning's edition, and sources
  // disagree about which day that was.
  assert.ok(
    (dateAgreement(dateInterval("2023-04-30", "day"), dateInterval("2023-05-01", "day")) ?? 0) > 0,
  );
});

test("a missing date is uninformative, not a refusal", () => {
  assert.equal(dateAgreement(dateInterval(null, "unknown"), dateInterval("2023-04-30", "day")), null);
});

// ---------------------------------------------------------------------------
// The pairs this exists to get right
// ---------------------------------------------------------------------------

test("videos of the same event score well above unrelated ones", () => {
  // Scores are asserted relatively rather than against the threshold, because
  // term weights depend on corpus size: this fixture holds fourteen documents
  // while the real inbox holds 397, so the same true pair scores 0.60 here and
  // 0.87 there. What must hold in both is the separation.
  const sameEvent = [
    ["seekers", "kens5"],
    ["seekers", "newsnation"],
    ["kens5", "8news"],
    ["newsnation", "8news"],
  ].map(([a, b]) => pair(a, b).score);

  const unrelated = scoreCandidatePair(
    byId("kens5"),
    candidate("filler", "orbs over Tonopah air force base Nevada", {
      occurred_at: "2023-04-30",
      date_precision: "day",
      source_key: "elsewhere",
    }),
    WEIGHTS,
  ).score;

  assert.ok(Math.min(...sameEvent) > unrelated * 2, "the separation is wide");
  assert.ok(Math.min(...sameEvent) >= SUGGEST_THRESHOLD, "and every one is at least reviewable");
});

test("the same pairs do link on a corpus the size of the real inbox", () => {
  // The calibration test. Padding to 400 documents reproduces the weights the
  // thresholds were tuned against, and there the four videos merge.
  const padding = Array.from({ length: 390 }, (_, i) => `unrelated video number ${i} about nothing`);
  const weights = termWeights([...LAS_VEGAS.map((c) => c.title), ...FILLER, ...padding]);

  for (const [a, b] of [
    ["seekers", "kens5"],
    ["kens5", "8news"],
    ["newsnation", "8news"],
  ]) {
    assert.equal(
      scoreCandidatePair(byId(a), byId(b), weights).action,
      "link",
      `${a} <> ${b} should link`,
    );
  }
});

test("a different event in the same city three years earlier is refused", () => {
  // Both are Las Vegas UFO videos and they share the place name. Only the year
  // separates them, which is why the date is a gate rather than a bonus.
  for (const other of ["seekers", "kens5", "newsnation", "8news"]) {
    const scored = pair("plane2021", other);
    assert.equal(scored.action, "ignore", `plane2021 <> ${other} must not match`);
    assert.equal(scored.score, 0);
  }
});

test("a candidate with no date can be suggested but never merged", () => {
  // Found on the real inbox: the dateless repost linked to the 2021 aeroplane
  // clip on "las vegas" alone, because the year gate never fired. They are two
  // events in one city, three years apart. Without a date there is nothing
  // left to separate them, so a person decides.
  //
  // Built as identical titles so the wording score is as high as it can be,
  // which is the case that would otherwise merge.
  const withDate = candidate("a", "strange green orb filmed over Kettering town centre", {
    occurred_at: "2023-04-30",
    date_precision: "day",
    source_key: "one",
  });
  const without = candidate("b", "strange green orb filmed over Kettering town centre", {
    source_key: "two",
  });

  const scored = scoreCandidatePair(withDate, without, termWeights([withDate.title, ...FILLER]));
  assert.equal(scored.signals.date_tightness, null);
  assert.notEqual(scored.action, "link", "identical wording is still not enough without a date");
});

test("one shared word is a coincidence, not a match", () => {
  const a = candidate("a", "strange lights over the harbour");
  const b = candidate("b", "harbour festival fireworks display");
  const weights = termWeights([a.title, b.title, ...FILLER]);
  assert.equal(scoreCandidatePair(a, b, weights).action, "ignore");
});

test("a channel's own uploads are held to a higher bar", () => {
  const a = candidate("a", "The Boomerang UFO Compilation", { source_key: "one channel" });
  const b = candidate("b", "The Boomerang UFO Compilation PREVIEW", { source_key: "one channel" });
  const scored = scoreCandidatePair(a, b, termWeights([a.title, b.title, ...FILLER]));
  // Eight unrelated compilations from one uploader clustered on the first run,
  // bound by that channel's stock description.
  assert.notEqual(scored.action, "link");
});

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

test("adjacent words are kept as pairs, because a place name is not two words", () => {
  assert.ok(tokenize("las vegas backyard").includes("las vega"));
});

test("plurals fold together", () => {
  assert.ok(tokenize("alien creatures").includes("creature"));
  assert.ok(tokenize("alien creature").includes("creature"));
});

test("url fragments and hashes are discarded", () => {
  // These are maximally rare and completely meaningless, so left in they crowd
  // real discriminators out.
  const tokens = tokenize("article 73b667fa e949 461d 8af4 63a8a626582b vegas");
  assert.deepEqual(tokens.filter((t) => /^[0-9a-f]{6,}$/.test(t)), []);
  assert.ok(tokens.includes("vega"), "the place name survives");
});

test("a term in almost every document carries almost no weight", () => {
  const weights = termWeights(["ufo sighting vegas", "ufo sighting texas", "ufo sighting paris", ...FILLER]);
  assert.ok((weights.get("ufo") ?? 1) < (weights.get("vega") ?? 0));
});

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

test("the real set groups into one event, with the other two left out", () => {
  // Padded to inbox scale for the same reason as the calibration test above:
  // in a six document corpus every title says "Las Vegas", so the phrase
  // correctly carries no information and nothing can cluster on it.
  const padding = Array.from({ length: 390 }, (_, i) =>
    candidate(`pad-${i}`, `unrelated video number ${i} about nothing`, {
      source_key: `pad-${i}`,
    }),
  );

  const { clusters } = clusterCandidates([...LAS_VEGAS, ...padding]);
  const main = clusters.find((c) => c.members.includes("kens5"))!;

  assert.equal(main.members.length, 4);
  assert.equal(main.source_count, 4, "four separate channels is genuine corroboration");
  assert.ok(!main.members.includes("plane2021"), "a different event must stay out");
  assert.ok(!main.members.includes("dateless"), "no date means a person decides");
});

test("source_count counts channels, not videos", () => {
  const group = [
    candidate("a", "orbs over Tonopah air force base nevada", {
      occurred_at: "2024-03-01",
      date_precision: "day",
      source_key: "one channel",
    }),
    candidate("b", "orbs over Tonopah air force base nevada at night", {
      occurred_at: "2024-03-01",
      date_precision: "day",
      source_key: "one channel",
    }),
  ];
  const { clusters } = clusterCandidates(group);
  // Whether or not these merge, one channel posting twice is one source.
  for (const c of clusters) assert.equal(c.source_count, 1);
});

test("an empty set does not throw", () => {
  const { clusters, suggestions } = clusterCandidates([]);
  assert.deepEqual(clusters, []);
  assert.deepEqual(suggestions, []);
});
