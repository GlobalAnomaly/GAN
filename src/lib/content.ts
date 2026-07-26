/**
 * The content repository, and the only module pages read data through.
 *
 * It dispatches to Supabase when credentials are present and to the
 * hand-entered seed when they are not. Crucially it also falls back to the
 * seed when a Supabase query *fails*, not just when it is unconfigured.
 *
 * That second case is the one that bites: the moment the keys are pasted in,
 * the site switches to a database whose schema may not have been created yet.
 * Without a fallback every page 500s and the whole site looks broken, when the
 * real state is "half configured". A readable site plus a loud server warning
 * is a far better failure than a stack trace in the browser.
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

/** One warning per failing function, so a broken schema does not spam the log. */
const warned = new Set<string>();

function warnOnce(name: string, error: unknown) {
  if (warned.has(name)) return;
  warned.add(name);

  const message = error instanceof Error ? error.message : String(error);
  const missingTable = /schema cache|does not exist|relation .* does not/i.test(
    message,
  );

  console.warn(
    `\n[content] Supabase query "${name}" failed, serving seed content instead.` +
      `\n[content] ${message}` +
      // The stack matters here: this fallback is silent by design, so without
      // it a bug in the query layer looks like an empty database rather than
      // a bug. That is exactly how a recursive helper went unnoticed.
      (error instanceof Error && error.stack
        ? `\n[content] ${error.stack.split("\n").slice(1, 6).join("\n[content] ")}`
        : "") +
      (missingTable
        ? "\n[content] The tables do not exist yet. Open the Supabase SQL editor" +
          "\n[content] and run supabase/schema.sql once.\n"
        : "\n"),
  );
}

/**
 * Wraps a database call so a failure degrades to the seed rather than to a
 * 500. Typed so the two implementations must keep identical signatures.
 */
function withFallback<A extends unknown[], R>(
  name: string,
  remoteFn: (...args: A) => Promise<R>,
  seedFn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  if (!isSupabaseConfigured) return seedFn;

  return async (...args: A): Promise<R> => {
    try {
      return await remoteFn(...args);
    } catch (error) {
      warnOnce(name, error);
      return seedFn(...args);
    }
  };
}

export const listCases = withFallback("listCases", remote.listCases, seed.listCases);
export const getCaseBySlug = withFallback("getCaseBySlug", remote.getCaseBySlug, seed.getCaseBySlug);
export const getAllCaseSlugs = withFallback("getAllCaseSlugs", remote.getAllCaseSlugs, seed.getAllCaseSlugs);
export const listCaseTranslations = withFallback("listCaseTranslations", remote.listCaseTranslations, seed.listCaseTranslations);
export const getRelatedCases = withFallback("getRelatedCases", remote.getRelatedCases, seed.getRelatedCases);
export const getLatestCases = withFallback("getLatestCases", remote.getLatestCases, seed.getLatestCases);
export const getAcknowledgedCases = withFallback("getAcknowledgedCases", remote.getAcknowledgedCases, seed.getAcknowledgedCases);
export const getRotatingCases = withFallback("getRotatingCases", remote.getRotatingCases, seed.getRotatingCases);
export const searchCases = withFallback("searchCases", remote.searchCases, seed.searchCases);
export const getArchiveCounts = withFallback("getArchiveCounts", remote.getArchiveCounts, seed.getArchiveCounts);

export const listScience = withFallback("listScience", remote.listScience, seed.listScience);
export const getScienceBySlug = withFallback("getScienceBySlug", remote.getScienceBySlug, seed.getScienceBySlug);
export const getAllScienceSlugs = withFallback("getAllScienceSlugs", remote.getAllScienceSlugs, seed.getAllScienceSlugs);
export const searchScience = withFallback("searchScience", remote.searchScience, seed.searchScience);

/**
 * Whether the database is reachable *and* has the schema. Used by the admin
 * dashboard to tell "not configured" apart from "configured but the SQL has
 * not been run", which are very different problems with different fixes.
 */
export async function checkDatabase(): Promise<
  { state: "unconfigured" } | { state: "ready"; cases: number } | { state: "no-schema"; message: string } | { state: "error"; message: string }
> {
  if (!isSupabaseConfigured) return { state: "unconfigured" };

  try {
    const counts = await remote.getArchiveCounts();
    return { state: "ready", cases: counts.cases };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/schema cache|does not exist|relation .* does not/i.test(message)) {
      return { state: "no-schema", message };
    }
    return { state: "error", message };
  }
}
