/**
 * Load clustered reports into Supabase.
 *
 * Reads .pipeline/clusters.jsonl and .pipeline/ufocat.jsonl, writes
 * sources_registry, event_clusters and reports. Requires migration 002, which is
 * applied by pasting supabase/migrations/002-reports-and-cross-reference.sql into
 * the Supabase SQL editor: supabase-js cannot run DDL and the project holds no
 * direct Postgres connection string.
 *
 * Two things it will not do.
 *
 * **It never sets may_publish_facts true.** That flag is what row-level security
 * reads to decide whether a report is visible to the anon key, so it is the
 * difference between storing data and publishing it. UFOCAT requires written
 * permission from CUFOS to publish extracted material, so its rows load invisible
 * and stay that way until someone deliberately flips one boolean. A loader that
 * could grant itself publication rights would defeat the point of having the flag.
 *
 * **It never writes narrative text or witness names.** Neither column exists in
 * the schema, by design. See the notes in migration 002.
 *
 * Run: npx tsx --env-file-if-exists=.env.local scripts/ingest/load-supabase.ts [--dry]
 *
 * The flag is --dry, not --dry-run, because npm swallows the latter as its own.
 */

import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CLUSTERS = ".pipeline/clusters.jsonl";
const REPORTS = ".pipeline/ufocat.jsonl";

/**
 * Batch size.
 *
 * Kept modest on purpose: Supabase normalises keys across a batch, so a large
 * batch that happens to contain one odd row corrupts more rows before anything
 * surfaces. Smaller batches fail smaller.
 */
const BATCH = 500;

const SOURCE = {
  key: "ufocat",
  name: "UFOCAT 2023",
  url: "https://www.cufos.org/",
  licence:
    "Copyright 2023 Donald A. Johnson / J. Allen Hynek Center for UFO Studies. " +
    "Written permission required to reproduce or publish extracted material.",
  attribution: "UFOCAT 2023, Center for UFO Studies",
  may_publish_facts: false,
  may_publish_narrative: false,
};

const dry = process.argv.includes("--dry");

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "They live in .env.local; pass --env-file-if-exists=.env.local to tsx.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Fails loudly and specifically when the migration has not been applied. */
async function requireSchema(client: SupabaseClient) {
  for (const table of ["sources_registry", "event_clusters", "reports"]) {
    const { error } = await client.from(table).select("id").limit(1);
    if (error) {
      throw new Error(
        `Table "${table}" is not reachable: ${error.message}\n\n` +
          "Migration 002 has probably not been applied. Paste\n" +
          "supabase/migrations/002-reports-and-cross-reference.sql into the\n" +
          "Supabase SQL editor and run it, then try again.",
      );
    }
  }
}

async function* jsonl(path: string) {
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line);
  }
}

/**
 * Every row in a batch carries every key, always.
 *
 * Session 1 lost time to this: Supabase normalises keys across the rows in a
 * batch and sends an explicit null for any key a row is missing, which defeats
 * the column default rather than falling back to it. Building rows from a fixed
 * template means a row can hold null, but never *silently* hold null where the
 * schema meant to supply something.
 */
function reportRow(r: Record<string, unknown>, sourceId: string, clusterId: string | null) {
  return {
    source_id: sourceId,
    source_ref: r.source_ref ?? null,
    cluster_id: clusterId,
    occurred_at: r.occurred_at ?? null,
    date_precision: r.date_precision ?? "unknown",
    occurred_raw: r.occurred_raw ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    location_raw: r.location_raw ?? null,
    country: r.country ?? null,
    continent: r.continent ?? "unknown",
    shape: r.shape ?? null,
    duration_raw: r.duration_raw ?? null,
    observers: r.observers ?? null,
    source_disposition: r.source_disposition ?? null,
    hynek_code: r.hynek ?? null,
    vallee_code: r.vallee ?? null,
    svp_code: r.svp ?? null,
    cited_source: r.cited_source ?? null,
    cited_author: r.cited_author ?? null,
    cited_locator: r.cited_locator ?? null,
    coords_unchecked: r.coords_unchecked === true,
    has_narrative: r.has_narrative === true,
    has_media: false,
  };
}

async function main() {
  for (const p of [CLUSTERS, REPORTS]) {
    if (!existsSync(p)) {
      throw new Error(
        `${p} is missing. Run scripts/ingest/ufocat_extract.py then ` +
          "scripts/ingest/build-clusters.ts first.",
      );
    }
  }

  const client = db();
  if (!dry) await requireSchema(client);

  console.log(dry ? "DRY RUN: nothing will be written\n" : "");

  // ---- source -------------------------------------------------------------
  let sourceId = "dry-run-source";
  if (!dry) {
    const { data, error } = await client
      .from("sources_registry")
      .upsert(SOURCE, { onConflict: "key" })
      .select("id")
      .single();
    if (error) throw new Error(`sources_registry: ${error.message}`);
    sourceId = data!.id as string;
  }
  console.log(
    `source: ${SOURCE.key}  may_publish_facts=${SOURCE.may_publish_facts}` +
      `  (invisible to the anon key until CUFOS answers)`,
  );

  // ---- clusters -----------------------------------------------------------
  // Member -> cluster id, so reports can be attached in one pass afterwards.
  const clusterOf = new Map<string, string>();
  let clusterCount = 0;
  let batch: Record<string, unknown>[] = [];
  let members: string[][] = [];

  const flushClusters = async () => {
    if (batch.length === 0) return;
    if (dry) {
      batch.forEach((_, i) =>
        members[i].forEach((m) => clusterOf.set(m, `dry-${clusterCount + i}`)),
      );
    } else {
      const { data, error } = await client
        .from("event_clusters")
        .insert(batch)
        .select("id");
      if (error) throw new Error(`event_clusters: ${error.message}`);
      data!.forEach((row, i) =>
        members[i].forEach((m) => clusterOf.set(m, row.id as string)),
      );
    }
    clusterCount += batch.length;
    batch = [];
    members = [];
  };

  for await (const c of jsonl(CLUSTERS)) {
    batch.push({
      occurred_at: c.occurred_at ?? null,
      date_precision: "day",
      lat: c.lat ?? null,
      lng: c.lng ?? null,
      location_name: null,
      country: null,
      continent: "unknown",
      report_count: c.members.length,
      source_count: c.source_count,
      case_id: null,
    });
    members.push(c.members);
    if (batch.length >= BATCH) await flushClusters();
  }
  await flushClusters();
  console.log(`clusters: ${clusterCount.toLocaleString()}`);

  // ---- reports ------------------------------------------------------------
  let reportCount = 0;
  let rbatch: Record<string, unknown>[] = [];

  const flushReports = async () => {
    if (rbatch.length === 0) return;
    if (!dry) {
      const { error } = await client
        .from("reports")
        .upsert(rbatch, { onConflict: "source_id,source_ref" });
      if (error) throw new Error(`reports: ${error.message}`);
    }
    reportCount += rbatch.length;
    rbatch = [];
  };

  for await (const r of jsonl(REPORTS)) {
    rbatch.push(reportRow(r, sourceId, clusterOf.get(String(r.source_ref)) ?? null));
    if (rbatch.length >= BATCH) await flushReports();
  }
  await flushReports();

  console.log(`reports: ${reportCount.toLocaleString()}`);
  console.log(
    dry
      ? "\nDRY RUN complete. Nothing was written."
      : "\nLoaded. Reports stay invisible publicly until may_publish_facts is set.",
  );
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
