/**
 * The content repository, and the only module pages read data through.
 *
 * It dispatches to Supabase when credentials are present and to the
 * hand-entered seed when they are not, so the site works before the database
 * exists, works after, and degrades to something readable rather than a blank
 * page if a variable goes missing in production.
 *
 * Pages must keep importing from here and never from `content-seed`,
 * `content-supabase`, or `src/data` directly.
 */

import { isSupabaseConfigured } from "@/lib/supabase";
import * as seed from "@/lib/content-seed";
import * as remote from "@/lib/content-supabase";

export type {
  ArchiveCounts,
  CaseFilters,
  ScienceFilters,
} from "@/lib/content-types";

/**
 * Both modules export the same function names with the same signatures, so
 * this picks one and the rest of the file just re-exports from it. TypeScript
 * checks the two really do match: if one drifts, this assignment stops
 * compiling.
 */
const source: typeof seed = isSupabaseConfigured ? remote : seed;

export const listCases = source.listCases;
export const getCaseBySlug = source.getCaseBySlug;
export const getAllCaseSlugs = source.getAllCaseSlugs;
export const getRelatedCases = source.getRelatedCases;
export const getLatestCases = source.getLatestCases;
export const getAcknowledgedCases = source.getAcknowledgedCases;
export const getRotatingCases = source.getRotatingCases;
export const searchCases = source.searchCases;
export const getArchiveCounts = source.getArchiveCounts;

export const listScience = source.listScience;
export const getScienceBySlug = source.getScienceBySlug;
export const getAllScienceSlugs = source.getAllScienceSlugs;
export const searchScience = source.searchScience;
