import type { Classification, Continent, ScienceTopic } from "@/lib/types";

/**
 * Shared shapes for the content layer. Kept separate from both
 * implementations so `content-seed` and `content-supabase` can import them
 * without either depending on the other.
 */

export interface CaseFilters {
  classification?: Classification;
  continent?: Continent;
  country?: string;
  tag?: string;
}

export interface ScienceFilters {
  topic?: ScienceTopic;
}

export interface ArchiveCounts {
  cases: number;
  science: number;
  continents: number;
  byClassification: Record<Classification, number>;
  byContinent: Record<string, number>;
  byCountry: { country: string; count: number }[];
}
