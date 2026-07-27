/**
 * Turning cases into map pins, and pins into screen clusters.
 *
 * Kept apart from the map component so the arithmetic can be tested without a
 * DOM. The component owns the projection and the zoom transform; this owns what
 * counts as a cluster and which pins survive a filter.
 */

import type { CaseSummary, Classification, Continent } from "@/lib/types";

export interface Pin {
  id: string;
  slug: string;
  title: string;
  /** Already-formatted, because the map does not own date formatting. */
  dateLabel: string;
  /** ISO date or null, for range filtering. */
  date: string | null;
  location: string;
  classification: Classification;
  continent: Continent;
  lat: number;
  lng: number;
  /** Approximate locations are drawn softer: see CoordPrecision. */
  approximate: boolean;
}

/** One rendered thing on the map: a single pin, or several collapsed together. */
export interface PinCluster {
  key: string;
  x: number;
  y: number;
  members: Pin[];
  /**
   * The single pin, when this cluster holds exactly one.
   *
   * The map only shows a hover bubble for these. Hovering a group of collapsed
   * pins would have to either name one of them arbitrarily or say "12 events",
   * and neither is information: the reader wants a specific event, so they get a
   * bubble once they have zoomed far enough to point at one.
   */
  single: Pin | null;
}

/**
 * Groups pins into screen-space cells.
 *
 * Screen space rather than geographic space, deliberately. Two sightings 40km
 * apart overlap on a world view and are far apart at city zoom, so what counts
 * as "too close to draw separately" is a property of the current view, not of
 * the pins. Bucketing after projection means the grid loosens as you zoom in and
 * clusters dissolve into pins on their own.
 */
export function clusterPins(
  pins: Pin[],
  project: (lng: number, lat: number) => [number, number] | null,
  cellPx: number,
): PinCluster[] {
  const cells = new Map<string, PinCluster>();

  for (const pin of pins) {
    const point = project(pin.lng, pin.lat);
    // A projection can legitimately refuse a coordinate, for instance when it
    // falls outside the visible hemisphere of a globe.
    if (!point) continue;

    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const key = `${Math.floor(x / cellPx)},${Math.floor(y / cellPx)}`;
    const existing = cells.get(key);

    if (existing) {
      existing.members.push(pin);
      // Running mean, so the marker sits at the centre of what it represents
      // rather than on whichever pin happened to arrive first.
      const n = existing.members.length;
      existing.x += (x - existing.x) / n;
      existing.y += (y - existing.y) / n;
      existing.single = null;
    } else {
      cells.set(key, { key, x, y, members: [pin], single: pin });
    }
  }

  // Larger groups drawn first, so a single pin is never hidden behind a cluster
  // it does not belong to.
  return [...cells.values()].sort((a, b) => b.members.length - a.members.length);
}

export interface PinFilters {
  classification?: Classification | null;
  continent?: Continent | null;
  /** Inclusive ISO bounds. Either may stand alone. */
  from?: string | null;
  to?: string | null;
  /** Matched against title and location, case-insensitively. */
  query?: string | null;
}

/**
 * A date-unknown case is excluded whenever a date filter is active.
 *
 * Silently including it would tell the reader it falls in the range, and
 * silently dropping it from an unfiltered view would hide it entirely. So it
 * appears when no range is set and disappears when one is, which is the only
 * reading that never asserts something we do not know.
 */
export function matchesFilters(pin: Pin, f: PinFilters): boolean {
  if (f.classification && pin.classification !== f.classification) return false;
  if (f.continent && pin.continent !== f.continent) return false;

  if (f.from || f.to) {
    if (!pin.date) return false;
    if (f.from && pin.date < f.from) return false;
    if (f.to && pin.date > f.to) return false;
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    const haystack = `${pin.title} ${pin.location}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export interface Decade {
  label: string;
  from: string;
  to: string;
}

/**
 * Decade buckets covering the archive.
 *
 * The blueprint dates the archive from the 1930s, so that is the floor even
 * before any case fills it. Ends at the current decade rather than the last one
 * with data, because an empty current decade is a true statement about the
 * archive and hiding it would imply coverage stops earlier than it does.
 */
export function decades(now = new Date()): Decade[] {
  const first = 1930;
  const last = Math.floor(now.getUTCFullYear() / 10) * 10;
  const out: Decade[] = [];

  for (let y = first; y <= last; y += 10) {
    out.push({
      label: `${y}s`,
      from: `${y}-01-01`,
      to: `${y + 9}-12-31`,
    });
  }

  return out;
}

/** Turns cards into pins, dropping any that cannot be placed. */
export function toPins(
  cases: CaseSummary[],
  formatDate: (date: string | null, precision: CaseSummary["date_precision"]) => string,
  formatLocation: (c: CaseSummary) => string,
): Pin[] {
  const pins: Pin[] = [];

  for (const c of cases) {
    if (c.lat === null || c.lng === null) continue;

    pins.push({
      id: c.id,
      slug: c.slug,
      title: c.title,
      dateLabel: formatDate(c.date_of_event, c.date_precision),
      date: c.date_of_event,
      location: formatLocation(c),
      classification: c.classification,
      continent: c.continent,
      lat: c.lat,
      lng: c.lng,
      approximate: c.coord_precision === "approximate",
    });
  }

  return pins;
}

/**
 * Angular distance in degrees between two points on the sphere.
 *
 * Used only to decide whether a pin is on the near side. Beyond 90 degrees from
 * the point facing the viewer, it is behind the globe.
 */
export function greatCircleDegrees(
  [lngA, latA]: [number, number],
  [lngB, latB]: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const cos =
    Math.sin(toRad(latA)) * Math.sin(toRad(latB)) +
    Math.cos(toRad(latA)) *
      Math.cos(toRad(latB)) *
      Math.cos(toRad(lngB - lngA));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
