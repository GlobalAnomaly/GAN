/** Confirms what actually landed in Supabase after migrations 002 and 003. */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await db
    .from("cases")
    .select("slug, lat, lng, coord_precision, published")
    .order("slug");

  if (error) {
    console.error("cases query FAILED:", error.message);
    process.exit(1);
  }

  const withCoords = data!.filter((c) => c.lat !== null && c.lng !== null);
  console.log(`cases: ${data!.length}, with coordinates: ${withCoords.length}`);
  for (const c of data!) {
    console.log(
      `  ${c.slug.padEnd(26)} ${String(c.lat).padStart(9)},${String(c.lng).padStart(10)}  ${c.coord_precision}`,
    );
  }

  console.log("\n--- tables from migration 002 ---");
  for (const t of ["sources_registry", "event_clusters", "reports", "report_links"]) {
    const { count, error: e } = await db
      .from(t)
      .select("id", { count: "exact", head: true });
    console.log(`  ${t.padEnd(20)} ${e ? "MISSING: " + e.message : count + " rows"}`);
  }

  // The anon key is what the site uses, so check RLS lets a reader see cases.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: pub, error: anonErr } = await anon
    .from("cases")
    .select("slug, lat")
    .not("lat", "is", null);
  console.log(
    `\nas the anon key sees it: ${anonErr ? "ERROR " + anonErr.message : `${pub!.length} published cases with coordinates`}`,
  );
}

void main();
