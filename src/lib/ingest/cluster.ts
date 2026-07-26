/**
 * Turning linked pairs into event clusters.
 *
 * The matcher decides pairs. This decides groups, and the two are not the same
 * problem, because grouping is transitive and matching is not.
 *
 * **The drift trap.** If A links to B and B links to C, naive union-find puts all
 * three in one cluster even when A and C were never compared or were compared and
 * rejected. Chains like that walk: a sequence of 60km hops merges reports 500km
 * apart into a single "event". At 98% pair precision that still happens, because a
 * cluster of 30 records contains 435 pairs and only a handful need to be chains.
 *
 * The consequence is exactly the failure this archive cannot afford. A cluster is
 * shown to readers as "independently reported in five archives", so a drifted
 * cluster is a fabricated corroboration claim, invented by an algorithm and
 * asserted in the site's own voice.
 *
 * So merges are guarded. A union that would stretch a cluster beyond what one
 * event can plausibly span is refused, and the pair is demoted to a suggestion for
 * a human instead. Refusing costs a link we might have shown; accepting costs the
 * reader's trust in every other number on the page.
 */

import { haversineKm } from "@/lib/ingest/match";

/**
 * How far one event may span.
 *
 * Days: the matcher already treats more than two days apart as no match, and a
 * cluster spanning three calendar days covers a late-evening sighting recorded on
 * either side of midnight in two timezones. Beyond that it is two events.
 *
 * Kilometres: the distance score floors at 200km, so a cluster wider than that
 * contains a pair the matcher would itself have refused. 250 leaves a little room
 * for a genuine chain across a wave front without licensing a walk.
 */
export const MAX_CLUSTER_DAYS = 3;
export const MAX_CLUSTER_KM = 250;

export interface Clusterable {
  id: string;
  occurred_at: string | null;
  lat: number | null;
  lng: number | null;
  /** Which publication carried it, for counting genuine corroboration. */
  source_key: string;
}

export interface Pair {
  a: string;
  b: string;
  score: number;
}

export interface Cluster {
  members: string[];
  /** Distinct publications, which is the number worth showing a reader. */
  source_count: number;
  occurred_at: string | null;
  lat: number | null;
  lng: number | null;
  span_days: number;
  span_km: number;
}

export interface ClusterResult {
  clusters: Cluster[];
  /** Pairs refused because the merge would have drifted. Go to review. */
  refused: Pair[];
}

interface Bounds {
  minDate: number;
  maxDate: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  hasGeo: boolean;
  hasDate: boolean;
}

const DAY = 86_400_000;

function boundsOf(r: Clusterable): Bounds {
  const t = r.occurred_at ? Date.parse(`${r.occurred_at}T00:00:00Z`) : NaN;
  const hasDate = !Number.isNaN(t);
  const hasGeo = r.lat !== null && r.lng !== null;
  return {
    minDate: hasDate ? t : 0,
    maxDate: hasDate ? t : 0,
    minLat: hasGeo ? r.lat! : 0,
    maxLat: hasGeo ? r.lat! : 0,
    minLng: hasGeo ? r.lng! : 0,
    maxLng: hasGeo ? r.lng! : 0,
    hasGeo,
    hasDate,
  };
}

function union(a: Bounds, b: Bounds): Bounds {
  return {
    minDate: a.hasDate && b.hasDate ? Math.min(a.minDate, b.minDate) : a.hasDate ? a.minDate : b.minDate,
    maxDate: a.hasDate && b.hasDate ? Math.max(a.maxDate, b.maxDate) : a.hasDate ? a.maxDate : b.maxDate,
    minLat: a.hasGeo && b.hasGeo ? Math.min(a.minLat, b.minLat) : a.hasGeo ? a.minLat : b.minLat,
    maxLat: a.hasGeo && b.hasGeo ? Math.max(a.maxLat, b.maxLat) : a.hasGeo ? a.maxLat : b.maxLat,
    minLng: a.hasGeo && b.hasGeo ? Math.min(a.minLng, b.minLng) : a.hasGeo ? a.minLng : b.minLng,
    maxLng: a.hasGeo && b.hasGeo ? Math.max(a.maxLng, b.maxLng) : a.hasGeo ? a.maxLng : b.maxLng,
    hasGeo: a.hasGeo || b.hasGeo,
    hasDate: a.hasDate || b.hasDate,
  };
}

/**
 * The bounding box diagonal, which is a deliberate over-estimate of the true
 * spread. Cheaper than the exact widest pair, and erring toward refusing a merge
 * is the correct direction for the reason given at the top of this file.
 */
export function spanKm(b: Bounds): number {
  if (!b.hasGeo) return 0;
  return haversineKm(b.minLat, b.minLng, b.maxLat, b.maxLng);
}

export function spanDays(b: Bounds): number {
  if (!b.hasDate) return 0;
  return (b.maxDate - b.minDate) / DAY;
}

function withinLimits(b: Bounds): boolean {
  return spanDays(b) <= MAX_CLUSTER_DAYS && spanKm(b) <= MAX_CLUSTER_KM;
}

/**
 * The date a cluster reports: the one most of its sources name.
 *
 * Two rules, and the second was learned from being wrong.
 *
 * **Never average.** Averaging 20 and 22 December gives the 21st, a day no source
 * reported, and putting that on a page is inventing a fact.
 *
 * **Never just take the earliest either.** That was the first rule here, and on
 * the first full run it dated Socorro to 23 April 1964. The event was the 24th.
 * UFOCAT holds both, most of its 55 sources say the 24th, and taking the earliest
 * let a single outlier misdate the most heavily documented case in the archive by
 * a day. Being wrong about Socorro is the kind of error a reader checks first.
 *
 * So: the modal date, ties broken by the earliest for determinism. The result is
 * still always a date some source actually named, which is what the
 * no-invented-detail rule requires, but it now reflects where the sources agree
 * rather than which one was furthest out.
 */
export function consensusDate(dates: string[]): string | null {
  if (dates.length === 0) return null;

  const tally = new Map<string, number>();
  for (const d of dates) tally.set(d, (tally.get(d) ?? 0) + 1);

  let best: string | null = null;
  let bestCount = 0;
  for (const [date, count] of tally) {
    if (count > bestCount || (count === bestCount && best !== null && date < best)) {
      best = date;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Groups reports into clusters, refusing merges that would drift.
 *
 * Pairs are consumed strongest first, so the confident links shape each cluster
 * before a marginal one can stretch it. That ordering matters: the same set of
 * pairs applied in a different order produces different clusters, and taking the
 * best evidence first is the order that puts the burden on the weak links.
 */
export function buildClusters(
  reports: Clusterable[],
  pairs: Pair[],
): ClusterResult {
  const byId = new Map(reports.map((r) => [r.id, r]));
  const parent = new Map<string, string>();
  const bounds = new Map<string, Bounds>();

  for (const r of reports) {
    parent.set(r.id, r.id);
    bounds.set(r.id, boundsOf(r));
  }

  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression, so a long chain does not cost on every later lookup.
    let walk = x;
    while (parent.get(walk) !== root) {
      const next = parent.get(walk)!;
      parent.set(walk, root);
      walk = next;
    }
    return root;
  };

  const refused: Pair[] = [];

  for (const pair of [...pairs].sort((x, y) => y.score - x.score)) {
    if (!byId.has(pair.a) || !byId.has(pair.b)) continue;

    const ra = find(pair.a);
    const rb = find(pair.b);
    if (ra === rb) continue;

    const merged = union(bounds.get(ra)!, bounds.get(rb)!);
    if (!withinLimits(merged)) {
      refused.push(pair);
      continue;
    }

    parent.set(rb, ra);
    bounds.set(ra, merged);
  }

  const grouped = new Map<string, string[]>();
  for (const r of reports) {
    const root = find(r.id);
    const list = grouped.get(root);
    if (list) list.push(r.id);
    else grouped.set(root, [r.id]);
  }

  const clusters: Cluster[] = [];
  for (const [root, members] of grouped) {
    const rows = members.map((id) => byId.get(id)!);
    const b = bounds.get(root)!;

    const geo = rows.filter((r) => r.lat !== null && r.lng !== null);
    const dated = rows.filter((r) => r.occurred_at);

    clusters.push({
      members,
      source_count: new Set(rows.map((r) => r.source_key)).size,
      occurred_at: consensusDate(dated.map((r) => r.occurred_at!)),
      lat: geo.length ? geo.reduce((s, r) => s + r.lat!, 0) / geo.length : null,
      lng: geo.length ? geo.reduce((s, r) => s + r.lng!, 0) / geo.length : null,
      span_days: spanDays(b),
      span_km: spanKm(b),
    });
  }

  return { clusters, refused };
}
