/**
 * Display labels and badge styling for every enum in the schema.
 *
 * Two rules from the design brief live here and nowhere else:
 *   - sentence case everywhere, no Title Case, no ALL CAPS
 *   - the badge colour carries meaning, so it is identical site-wide
 */

import type {
  Classification,
  Continent,
  DatePrecision,
  ScienceStatus,
  ScienceTopic,
  SourceType,
} from "@/lib/types";

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  acknowledged: "Acknowledged",
  unverified: "Unverified",
  likely_explained: "Likely explained",
  debunked: "Debunked",
};

/**
 * What each label actually means, shown on hover and on the browse page.
 * Written from the rubric so a reader can audit our reasoning.
 */
export const CLASSIFICATION_DEFINITIONS: Record<Classification, string> = {
  acknowledged:
    "A government or official body has released or confirmed the material and offered no conventional explanation.",
  unverified:
    "A public sighting with no official validation and no established conventional explanation.",
  likely_explained:
    "A plausible conventional cause is indicated but not conclusively proven.",
  debunked:
    "A conventional cause is conclusively established, or the material is demonstrably fabricated.",
};

export const CLASSIFICATION_BADGE: Record<Classification, string> = {
  acknowledged: "bg-acknowledged text-acknowledged-foreground",
  unverified: "bg-unverified text-unverified-foreground",
  likely_explained: "bg-explained text-explained-foreground",
  debunked: "bg-debunked text-debunked-foreground",
};

export const CLASSIFICATION_ORDER: Classification[] = [
  "acknowledged",
  "unverified",
  "likely_explained",
  "debunked",
];

export const CONTINENT_LABELS: Record<Continent, string> = {
  north_america: "North America",
  south_america: "South America",
  africa: "Africa",
  europe: "Europe",
  asia: "Asia",
  oceania: "Oceania",
  unknown: "Unknown location",
};

export const CONTINENT_ORDER: Continent[] = [
  "north_america",
  "south_america",
  "africa",
  "europe",
  "asia",
  "oceania",
  "unknown",
];

export const SCIENCE_TOPIC_LABELS: Record<ScienceTopic, string> = {
  exoplanets: "Exoplanets",
  search_for_life: "Search for life",
  astrobiology: "Astrobiology and biosignatures",
  interstellar_objects: "Interstellar objects",
  space_signals: "Space signals",
  missions_telescopes: "Missions and telescopes",
  other: "Other",
};

export const SCIENCE_TOPIC_ORDER: ScienceTopic[] = [
  "exoplanets",
  "search_for_life",
  "astrobiology",
  "interstellar_objects",
  "space_signals",
  "missions_telescopes",
  "other",
];

export const SCIENCE_STATUS_LABELS: Record<ScienceStatus, string> = {
  candidate: "Candidate",
  proposed: "Proposed",
  confirmed: "Confirmed",
  disputed: "Disputed",
  superseded: "Superseded",
};

/** Quieter than the case badges on purpose: maturity is not a verdict. */
export const SCIENCE_STATUS_BADGE: Record<ScienceStatus, string> = {
  candidate: "bg-candidate text-candidate-foreground",
  proposed: "bg-proposed text-proposed-foreground",
  confirmed: "bg-confirmed text-confirmed-foreground",
  disputed: "bg-disputed text-disputed-foreground",
  superseded: "bg-superseded text-superseded-foreground",
};

export const SCIENCE_STATUS_DEFINITIONS: Record<ScienceStatus, string> = {
  candidate: "A possible finding that has not been established.",
  proposed: "Put forward by researchers and awaiting wider testing.",
  confirmed: "Independently established and broadly accepted.",
  disputed: "Contested by other researchers or later observations.",
  superseded: "Replaced by a later, better-supported result.",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  govt: "Government",
  news: "News",
  witness: "Witness",
  research: "Research",
};

/**
 * Render a date only as precisely as it is actually known. A case dated
 * "sometime in 1978" must never appear as 1 January 1978.
 */
export function formatEventDate(
  date: string | null,
  precision: DatePrecision = "day",
): string {
  if (!date || precision === "unknown") return "Date unknown";

  // Parsed as UTC so a local timezone cannot shift the day backwards.
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "Date unknown";

  const opts: Intl.DateTimeFormatOptions =
    precision === "year"
      ? { year: "numeric", timeZone: "UTC" }
      : precision === "month"
        ? { year: "numeric", month: "long", timeZone: "UTC" }
        : { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };

  return new Intl.DateTimeFormat("en-GB", opts).format(parsed);
}

/** The meta line's location half, collapsing to "Unknown" when it must. */
export function formatLocation(
  locationName: string | null,
  country: string | null,
  continent: Continent,
  locationUnknown: boolean,
): string {
  if (locationUnknown) return "Location unknown";
  const parts = [locationName, country].filter(Boolean) as string[];
  if (parts.length === 0) return CONTINENT_LABELS[continent];
  return parts.join(", ");
}
