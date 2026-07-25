import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The read-only client used by the public site.
 *
 * This uses the anon key, which is meant to be public. Safety comes from
 * row-level security in supabase/schema.sql: every table has RLS enabled and
 * the only policies allow selecting rows where `published` is true, with child
 * rows inheriting their parent's visibility. An unpublished draft is invisible
 * to this client no matter what it asks for.
 *
 * The service_role key bypasses RLS entirely and must never appear here or
 * anywhere else under src/. It belongs to the bot alone.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the site is wired to a real database yet. Until both variables are
 * set, the content layer keeps serving the hand-entered seed, so the site
 * never breaks half-configured.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  client ??= createClient(url!, anonKey!, {
    auth: {
      // The public site never signs anyone in, so there is no session to
      // persist or refresh. Turning this off keeps server rendering clean.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
