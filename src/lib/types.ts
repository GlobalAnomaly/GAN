/**
 * Domain types, mirroring supabase/schema.sql.
 *
 * These names match the database columns exactly so that swapping the seed
 * data for a real Supabase query is a change of source, not a change of shape.
 */

export type Classification =
  | "acknowledged"
  | "unverified"
  | "likely_explained"
  | "debunked";

export type Continent =
  | "north_america"
  | "south_america"
  | "africa"
  | "europe"
  | "asia"
  | "oceania"
  | "unknown";

export type MediaType =
  | "youtube"
  | "short"
  | "tiktok"
  | "gov_file"
  | "image"
  /** A file we serve ourselves, which public-domain government video allows. */
  | "video_file";

export type MediaRole = "primary" | "additional";
export type SourceType = "govt" | "news" | "witness" | "research";

/**
 * Where a piece of media or a document sits on the page.
 *
 * A case is not "video on top, links at the bottom". Official releases pair
 * footage with poster frames and a resolution report, and each belongs beside
 * the passage it supports, the way a news story places its pictures.
 */
export type BlockPlacement =
  | "hero"
  | "after_footage"
  | "after_testimony"
  | "after_status"
  | "after_unknown"
  | "end";

export type ScienceTopic =
  | "exoplanets"
  | "search_for_life"
  | "astrobiology"
  | "interstellar_objects"
  | "space_signals"
  | "missions_telescopes"
  | "other";

export type ScienceStatus =
  | "candidate"
  | "proposed"
  | "confirmed"
  | "disputed"
  | "superseded";

/** How precisely the event date is actually known. */
export type DatePrecision = "day" | "month" | "year" | "unknown";

/**
 * How precisely the location is known, which is not the same question as whether
 * we have coordinates.
 *
 * `date_precision` exists so a case known only to a year never renders as
 * 1 January. Coordinates need the same honesty. "Pacific Ocean, off southern
 * California" and "Phoenix and across Arizona" are areas, and dropping a precise
 * dot on either claims a precision no source gave us. The map draws approximate
 * locations differently, so the reader can see which is which.
 */
export type CoordPrecision = "exact" | "approximate";

export interface CaseMedia {
  id: string;
  type: MediaType;
  embed_url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  role: MediaRole;
  sort_order: number;
  placement?: BlockPlacement;
  /** Credited even when public domain: it is where the reader goes to verify. */
  credit?: string | null;
  /** Poster frame, so a video file is not a black rectangle before play. */
  poster_url?: string | null;
  is_self_hosted?: boolean;
}

export interface CaseDocument {
  id: string;
  title: string;
  source_url: string;
  source_note?: string | null;
  placement?: BlockPlacement;
  /** "Read the full 12-page report" beats "Read the full report". */
  page_count?: number | null;
  published_by?: string | null;
}

export interface CaseSource {
  id: string;
  source_name: string;
  source_url?: string | null;
  source_type: SourceType;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

/**
 * The body is four named parts rather than one blob. That is deliberate:
 * "what remains unknown" is a required section of every account, and a
 * separate field makes an empty one visible instead of invisible.
 */
export interface CaseRecord {
  id: string;
  title: string;
  slug: string;
  summary: string;

  body_footage: string;
  body_testimony: string;
  body_status: string;
  body_unknown: string;

  date_of_event: string | null;
  date_precision: DatePrecision;
  location_name: string | null;
  continent: Continent;
  country: string | null;
  location_unknown: boolean;

  /** Null when we have no coordinate. A case is not obliged to be mappable. */
  lat: number | null;
  lng: number | null;
  coord_precision: CoordPrecision;

  classification: Classification;
  classification_reason: string;

  view_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;

  media: CaseMedia[];
  documents: CaseDocument[];
  sources: CaseSource[];
  tags: Tag[];
}

export interface ScienceImage {
  id: string;
  image_url: string;
  credit: string;
  caption?: string | null;
}

export interface ScienceSource {
  id: string;
  name: string;
  url?: string | null;
}

export interface ScienceRecord {
  id: string;
  title: string;
  slug: string;
  summary: string;
  topic: ScienceTopic;
  status: ScienceStatus;
  institutions: string[];

  body_found: string;
  body_how: string;
  body_why: string;
  /** The anti-hype slot. Never optional in practice. */
  body_caveat: string;

  date: string | null;
  view_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;

  images: ScienceImage[];
  sources: ScienceSource[];
}

export type Lang = "en" | "fr" | "pt" | "es";

/**
 * A translated case account.
 *
 * Carries the same four sections as the English original, because a
 * translation that drops one turns an honest entry into an overconfident one.
 * `is_machine` drives the label the reader sees: they are told when nobody has
 * checked it, rather than being left to assume a person did.
 */
export interface CaseTranslation {
  lang: Lang;
  title: string;
  summary: string;
  body_footage: string;
  body_testimony: string;
  body_status: string;
  body_unknown: string;
  is_machine: boolean;
}

/** A card is the shared shape the home and browse grids render. */
export interface CaseSummary
  extends Pick<
    CaseRecord,
    | "id"
    | "title"
    | "slug"
    | "summary"
    | "classification"
    | "continent"
    | "country"
    | "location_name"
    | "date_of_event"
    | "date_precision"
    | "view_count"
    // The map reads cards, so coordinates belong on the summary shape rather
    // than forcing a second query per pin.
    | "lat"
    | "lng"
    | "coord_precision"
  > {
  primary_media: CaseMedia | null;
}
