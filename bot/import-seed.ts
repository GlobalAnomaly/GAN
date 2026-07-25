/**
 * Push the hand-entered seed content into Supabase.
 *
 * Idempotent: cases and science entries are matched on their slug, and child
 * rows (media, sources, documents, tags, images) are replaced rather than
 * appended, so running this twice does not produce two copies of anything.
 *
 * Uses the service_role key, which bypasses row-level security. That key must
 * never appear in anything under src/.
 *
 * Usage:
 *   npm run bot:import-seed
 *   npm run bot:import-seed -- --dry
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED_CASES } from "@/data/cases";
import { SEED_SCIENCE } from "@/data/science";

// Not --dry-run: npm treats that as its own flag and never passes it through.
const dryRun = process.argv.includes("--dry");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Assigned by connect(), which main() calls only when actually importing. */
let db!: SupabaseClient;

function connect() {
  if (!url || !serviceKey) {
    console.error(
      "Missing credentials.\n\n" +
        "Add these to .env.local:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=<the service_role key>\n\n" +
        "Both are in your Supabase dashboard under Project Settings, API keys.\n" +
        "The service_role key bypasses row-level security: keep it out of the\n" +
        "repo and never reference it from src/.",
    );
    process.exit(1);
  }

  db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stop(what: string, error: { message: string } | null): never {
  console.error(`\nFailed while ${what}: ${error?.message ?? "unknown error"}`);
  process.exit(1);
}

async function importCases() {
  console.log(`Importing ${SEED_CASES.length} cases`);

  for (const c of SEED_CASES) {
    // The seed's readable ids ("c-rendlesham") are not UUIDs, so they are
    // dropped and the database assigns real ones. Slug is the stable key.
    const { data: row, error } = await db
      .from("cases")
      .upsert(
        {
          title: c.title,
          slug: c.slug,
          summary: c.summary,
          body_footage: c.body_footage,
          body_testimony: c.body_testimony,
          body_status: c.body_status,
          body_unknown: c.body_unknown,
          date_of_event: c.date_of_event,
          date_precision: c.date_precision,
          location_name: c.location_name,
          continent: c.continent,
          country: c.country,
          location_unknown: c.location_unknown,
          classification: c.classification,
          classification_reason: c.classification_reason,
          published: c.published,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error) stop(`upserting case ${c.slug}`, error);
    const caseId = row!.id as string;

    // Replace children rather than appending, so re-runs stay clean.
    for (const table of ["media", "documents", "sources", "case_tags"]) {
      const { error: delError } = await db
        .from(table)
        .delete()
        .eq("case_id", caseId);
      if (delError) stop(`clearing ${table} for ${c.slug}`, delError);
    }

    if (c.media.length) {
      const { error: e } = await db.from("media").insert(
        c.media.map((m, i) => ({
          case_id: caseId,
          type: m.type,
          embed_url: m.embed_url,
          thumbnail_url: m.thumbnail_url ?? null,
          caption: m.caption ?? null,
          role: m.role,
          sort_order: m.sort_order ?? i,
        })),
      );
      if (e) stop(`inserting media for ${c.slug}`, e);
    }

    if (c.documents.length) {
      const { error: e } = await db.from("documents").insert(
        c.documents.map((d, i) => ({
          case_id: caseId,
          title: d.title,
          source_url: d.source_url,
          source_note: d.source_note ?? null,
          sort_order: i,
        })),
      );
      if (e) stop(`inserting documents for ${c.slug}`, e);
    }

    if (c.sources.length) {
      const { error: e } = await db.from("sources").insert(
        c.sources.map((s, i) => ({
          case_id: caseId,
          source_name: s.source_name,
          source_url: s.source_url ?? null,
          source_type: s.source_type,
          sort_order: i,
        })),
      );
      if (e) stop(`inserting sources for ${c.slug}`, e);
    }

    for (const t of c.tags) {
      const { data: tag, error: tagError } = await db
        .from("tags")
        .upsert({ name: t.name, slug: t.slug }, { onConflict: "slug" })
        .select("id")
        .single();
      if (tagError) stop(`upserting tag ${t.slug}`, tagError);

      const { error: linkError } = await db
        .from("case_tags")
        .insert({ case_id: caseId, tag_id: tag!.id });
      if (linkError) stop(`linking tag ${t.slug} to ${c.slug}`, linkError);
    }

    console.log(`  ${c.slug}`);
  }
}

async function importScience() {
  console.log(`\nImporting ${SEED_SCIENCE.length} science entries`);

  for (const e of SEED_SCIENCE) {
    const { data: row, error } = await db
      .from("science_entries")
      .upsert(
        {
          title: e.title,
          slug: e.slug,
          summary: e.summary,
          topic: e.topic,
          status: e.status,
          institutions: e.institutions,
          body_found: e.body_found,
          body_how: e.body_how,
          body_why: e.body_why,
          body_caveat: e.body_caveat,
          date: e.date,
          published: e.published,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error) stop(`upserting science entry ${e.slug}`, error);
    const entryId = row!.id as string;

    for (const table of ["science_images", "science_sources"]) {
      const { error: delError } = await db
        .from(table)
        .delete()
        .eq("entry_id", entryId);
      if (delError) stop(`clearing ${table} for ${e.slug}`, delError);
    }

    if (e.images.length) {
      const { error: err } = await db.from("science_images").insert(
        e.images.map((img, i) => ({
          entry_id: entryId,
          image_url: img.image_url,
          credit: img.credit,
          caption: img.caption ?? null,
          sort_order: i,
        })),
      );
      if (err) stop(`inserting images for ${e.slug}`, err);
    }

    if (e.sources.length) {
      const { error: err } = await db.from("science_sources").insert(
        e.sources.map((s, i) => ({
          entry_id: entryId,
          name: s.name,
          url: s.url ?? null,
          sort_order: i,
        })),
      );
      if (err) stop(`inserting sources for ${e.slug}`, err);
    }

    console.log(`  ${e.slug}`);
  }
}

async function main() {
  if (dryRun) {
    console.log(
      `Dry run. Would import ${SEED_CASES.length} cases and ` +
        `${SEED_SCIENCE.length} science entries:\n`,
    );
    for (const c of SEED_CASES) console.log(`  case     ${c.slug}`);
    for (const e of SEED_SCIENCE) console.log(`  science  ${e.slug}`);
    console.log(
      `\nTarget would be: ${url ?? "(NEXT_PUBLIC_SUPABASE_URL not set)"}`,
    );
    return;
  }

  connect();
  console.log(`Target: ${url}\n`);

  // Fail early and clearly if the schema has not been run yet, rather than
  // reporting a confusing error partway through the first insert.
  const { error: probe } = await db.from("cases").select("id").limit(1);
  if (probe) {
    console.error(
      `Cannot read the cases table: ${probe.message}\n\n` +
        "Run supabase/schema.sql in the Supabase SQL editor first.",
    );
    process.exit(1);
  }

  await importCases();
  await importScience();

  const [{ count: caseCount }, { count: scienceCount }] = await Promise.all([
    db.from("cases").select("id", { count: "exact", head: true }),
    db.from("science_entries").select("id", { count: "exact", head: true }),
  ]);

  console.log(
    `\nDone. Database now holds ${caseCount} cases and ${scienceCount} science entries.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
