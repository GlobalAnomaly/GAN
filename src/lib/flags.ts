import { getSupabase } from "@/lib/supabase";

/**
 * Feature flags, read from the settings table.
 *
 * Everything ships off. Each capability switches on when there is audience or
 * moderation capacity to match it, and the public site reads the flags rather
 * than having them hardcoded, so flipping one is a database change rather than
 * a deploy.
 *
 * The privacy policy reads these too. That is the point: an ad script sets
 * cookies, and a policy page insisting the site sets none would be false the
 * moment ads went live. Tying the page to the same switch means the two cannot
 * drift apart, which is not a thing to leave to memory when the failure mode
 * is a untrue legal disclosure.
 */

export interface FeatureFlags {
  comments_on: boolean;
  accounts_on: boolean;
  uploads_on: boolean;
  ads_on: boolean;
  newsletter_on: boolean;
}

const ALL_OFF: FeatureFlags = {
  comments_on: false,
  accounts_on: false,
  uploads_on: false,
  ads_on: false,
  newsletter_on: false,
};

/**
 * Fails closed. If the database is unreachable or a flag is missing, every
 * capability reads as off: better to briefly hide a feature than to briefly
 * run ads on a site whose privacy policy says it does not.
 */
export async function getFlags(): Promise<FeatureFlags> {
  const db = getSupabase();
  if (!db) return { ...ALL_OFF };

  try {
    const { data, error } = await db.from("settings").select("key, value");
    if (error) return { ...ALL_OFF };

    const flags = { ...ALL_OFF };
    for (const row of data ?? []) {
      const key = String(row.key) as keyof FeatureFlags;
      if (key in flags) flags[key] = row.value === true || row.value === "true";
    }
    return flags;
  } catch {
    return { ...ALL_OFF };
  }
}
