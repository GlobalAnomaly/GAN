import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildClusters,
  MAX_CLUSTER_DAYS,
  MAX_CLUSTER_KM,
  type Clusterable,
  type Pair,
} from "@/lib/ingest/cluster";

function rep(
  id: string,
  over: Partial<Clusterable> = {},
): Clusterable {
  return {
    id,
    occurred_at: "1980-12-26",
    lat: 52.08,
    lng: 1.43,
    source_key: `src-${id}`,
    ...over,
  };
}

const byMember = (r: ReturnType<typeof buildClusters>, id: string) =>
  r.clusters.find((c) => c.members.includes(id))!;

// ---------------------------------------------------------------------------
// The basics
// ---------------------------------------------------------------------------

test("an unlinked report is its own cluster", () => {
  const { clusters } = buildClusters([rep("a"), rep("b")], []);
  assert.equal(clusters.length, 2);
  assert.ok(clusters.every((c) => c.members.length === 1));
});

test("a linked pair becomes one cluster", () => {
  const { clusters } = buildClusters(
    [rep("a"), rep("b")],
    [{ a: "a", b: "b", score: 0.95 }],
  );
  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].members.sort(), ["a", "b"]);
});

test("a tight chain merges transitively", () => {
  // Three accounts of one event, linked A-B and B-C but never A-C directly.
  // That is the normal case and it should still produce one cluster.
  const { clusters } = buildClusters(
    [rep("a"), rep("b"), rep("c")],
    [
      { a: "a", b: "b", score: 0.95 },
      { a: "b", b: "c", score: 0.94 },
    ],
  );
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].members.length, 3);
});

// ---------------------------------------------------------------------------
// Drift: the thing this file exists to prevent
// ---------------------------------------------------------------------------

test("a chain of short hops cannot walk across a continent", () => {
  // Five reports, each about 200km from the next, every consecutive pair linked.
  // Naive union-find merges all five and the site then tells a reader that one
  // event was independently reported in five archives, 800km apart. That claim
  // would be invented by an algorithm and asserted in our own voice.
  const reports = [0, 2, 4, 6, 8].map((deg, i) =>
    rep(String.fromCharCode(97 + i), { lat: 40 + deg, lng: -100 }),
  );
  const pairs: Pair[] = [];
  for (let i = 0; i < reports.length - 1; i++) {
    pairs.push({ a: reports[i].id, b: reports[i + 1].id, score: 0.93 });
  }

  const result = buildClusters(reports, pairs);

  assert.ok(result.clusters.length > 1, "the chain must be broken somewhere");
  for (const c of result.clusters) {
    assert.ok(
      c.span_km <= MAX_CLUSTER_KM,
      `cluster spans ${c.span_km.toFixed(0)}km, over the ${MAX_CLUSTER_KM}km limit`,
    );
  }
  assert.ok(result.refused.length > 0, "refused merges must be reported");
});

test("a refused merge is handed back rather than silently dropped", () => {
  // Refusing is only defensible if a human gets to see the pair.
  const result = buildClusters(
    [rep("a", { lat: 40 }), rep("b", { lat: 50 })],
    [{ a: "a", b: "b", score: 0.93 }],
  );
  assert.equal(result.clusters.length, 2);
  assert.deepEqual(result.refused, [{ a: "a", b: "b", score: 0.93 }]);
});

test("a cluster cannot stretch beyond the allowed number of days", () => {
  const reports = [
    rep("a", { occurred_at: "1980-12-20" }),
    rep("b", { occurred_at: "1980-12-22" }),
    rep("c", { occurred_at: "1980-12-24" }),
    rep("d", { occurred_at: "1980-12-26" }),
  ];
  const result = buildClusters(reports, [
    { a: "a", b: "b", score: 0.95 },
    { a: "b", b: "c", score: 0.94 },
    { a: "c", b: "d", score: 0.93 },
  ]);

  for (const c of result.clusters) {
    assert.ok(
      c.span_days <= MAX_CLUSTER_DAYS,
      `cluster spans ${c.span_days} days, over the ${MAX_CLUSTER_DAYS} allowed`,
    );
  }
});

test("the strongest pairs shape a cluster before weak ones can stretch it", () => {
  // b sits close to a and c sits far away. The strong a-b link must be taken
  // first, so the weak b-c link is the one refused rather than a-b.
  const reports = [
    rep("a", { lat: 40, lng: -100 }),
    rep("b", { lat: 40.1, lng: -100 }),
    rep("c", { lat: 45, lng: -100 }),
  ];
  const result = buildClusters(reports, [
    { a: "b", b: "c", score: 0.93 },
    { a: "a", b: "b", score: 0.97 },
  ]);

  const cluster = byMember(result, "a");
  assert.ok(cluster.members.includes("b"), "the strong link must survive");
  assert.ok(!cluster.members.includes("c"), "the weak link must be the casualty");
});

// ---------------------------------------------------------------------------
// What a cluster reports about itself
// ---------------------------------------------------------------------------

test("source_count counts publications, not records", () => {
  // Five records from one database is not corroboration. Three from three is,
  // and that distinction is the whole claim we make to a reader.
  const { clusters } = buildClusters(
    [
      rep("a", { source_key: "nuforc" }),
      rep("b", { source_key: "nuforc" }),
      rep("c", { source_key: "bluebook" }),
    ],
    [
      { a: "a", b: "b", score: 0.95 },
      { a: "b", b: "c", score: 0.95 },
    ],
  );
  assert.equal(clusters[0].members.length, 3);
  assert.equal(clusters[0].source_count, 2);
});

test("the cluster date is one a source actually named", () => {
  // Averaging 20 December and 22 December gives the 21st, a day no source
  // reported. That is inventing a fact, which is the one thing we never do.
  const { clusters } = buildClusters(
    [
      rep("a", { occurred_at: "1980-12-22" }),
      rep("b", { occurred_at: "1980-12-20" }),
    ],
    [{ a: "a", b: "b", score: 0.95 }],
  );
  assert.equal(clusters[0].occurred_at, "1980-12-20");
});

test("a cluster with no coordinates anywhere reports none", () => {
  const { clusters } = buildClusters(
    [rep("a", { lat: null, lng: null }), rep("b", { lat: null, lng: null })],
    [{ a: "a", b: "b", score: 0.95 }],
  );
  assert.equal(clusters[0].lat, null);
  assert.equal(clusters[0].lng, null);
});

test("a report missing coordinates does not drag the centroid to zero", () => {
  // Treating a null as 0,0 would put the cluster in the Gulf of Guinea.
  const { clusters } = buildClusters(
    [rep("a", { lat: 52, lng: 1 }), rep("b", { lat: null, lng: null })],
    [{ a: "a", b: "b", score: 0.95 }],
  );
  assert.ok(clusters[0].lat! > 51 && clusters[0].lat! < 53, `got ${clusters[0].lat}`);
});

test("pairs referring to unknown reports are ignored, not fatal", () => {
  const { clusters } = buildClusters(
    [rep("a")],
    [{ a: "a", b: "ghost", score: 0.99 }],
  );
  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].members, ["a"]);
});

test("every report ends up in exactly one cluster", () => {
  const reports = ["a", "b", "c", "d", "e"].map((id) => rep(id));
  const { clusters } = buildClusters(reports, [
    { a: "a", b: "b", score: 0.95 },
    { a: "d", b: "e", score: 0.95 },
  ]);
  const seen = clusters.flatMap((c) => c.members);
  assert.equal(seen.length, reports.length);
  assert.equal(new Set(seen).size, reports.length);
});
