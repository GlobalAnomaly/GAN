-- Migration 002: imported reports, and the cross-reference layer
--
-- Run this in the Supabase SQL editor after 001. Safe to run twice.
--
-- Why: a case is something we wrote. A report is what one source says about one
-- event, and there are hundreds of thousands of them. Putting reports in the
-- cases table would either flood the archive with entries nobody wrote, or
-- force us to write 300,000 accounts before the map could show anything.
--
-- So they are separate things with a link between them:
--
--   report          what a source says. Becomes a pin on the map.
--   event_cluster   several reports that describe the same event.
--   case            the account we wrote, when we wrote one.
--
-- A cluster may have no case (most will not, for a long time). A case may have
-- no cluster (the nine seeded ones do not). The link is what lets a pin open an
-- article when we have one, and stay an honest unwritten pin when we do not.

-- ---------------------------------------------------------------------------
-- Where reports come from, and what we are allowed to do with them
-- ---------------------------------------------------------------------------
--
-- The licence lives in the data, not in someone's memory. Publishing code reads
-- these flags, so a source that forbids redistribution cannot be served by
-- accident, and a source added a year from now gets the safe default rather
-- than inheriting whatever the last one had.

create table if not exists sources_registry (
  id            uuid primary key default gen_random_uuid(),
  -- Stable machine name used by loaders: 'ufocat', 'nuforc', 'blue_book'.
  key           text not null unique,
  name          text not null,
  url           text,
  -- Free text, because licences are not an enum: 'public domain (US federal)',
  -- 'Licence Ouverte 2.0', 'copyright CUFOS, written permission required'.
  licence       text not null,
  attribution   text,

  -- Both default false. Permission is something you demonstrate, not assume.

  -- May the plain facts (date, place, shape) be served publicly at all?
  -- False for UFOCAT until CUFOS answers, so its rows load locally and stay
  -- out of Supabase entirely.
  may_publish_facts boolean not null default false,

  -- May the source's own words ever be shown? Almost always false. Their
  -- narrative is input for our writing, never output. See the note on the
  -- reports table about why there is no column here to hold it.
  may_publish_narrative boolean not null default false,

  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Event clusters: several reports, one event
-- ---------------------------------------------------------------------------
--
-- This is the corroboration signal, and it is the thing competitors do not
-- show. UFOSINT flags 126,729 duplicate pairs and displays none of them. When
-- an event turns up in NUFORC, in the UK MoD files and in a police log,
-- "independently reported to three archives, one of them official" is worth
-- more to a reader than a third pin in the same spot.
--
-- Canonical values are resolved here rather than trusting any single report,
-- because sources disagree: UFOCAT's 56 records for Mantell 1948 place it at
-- FORT KNOX, FRANKFORT, FRANKLIN SW and F-51.

create table if not exists event_clusters (
  id            uuid primary key default gen_random_uuid(),

  occurred_at   date,
  date_precision date_precision not null default 'day',
  lat           double precision,
  lng           double precision,
  location_name text,
  country       text,
  continent     continent not null default 'unknown',

  report_count  integer not null default 0,
  -- How many distinct sources, which is the number worth showing. Five records
  -- from one database is not corroboration; three records from three is.
  source_count  integer not null default 0,

  -- Set when we write the account. Until then the cluster is an honest gap,
  -- and a good candidate for the work queue.
  case_id       uuid references cases(id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists event_clusters_date_idx on event_clusters (occurred_at desc);
create index if not exists event_clusters_geo_idx on event_clusters (lat, lng);
create index if not exists event_clusters_case_idx on event_clusters (case_id)
  where case_id is not null;
-- Written-up clusters are the ones the map links onward, so they are worth
-- their own partial index.

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
--
-- NOTE THE ABSENCE: there is no narrative column, and that is deliberate.
--
-- Source narratives are copyrighted expression. They are read locally so the
-- bot can write our own account from them, and they never leave the pipeline
-- machine. Rather than store them here behind a flag and trust every future
-- query to respect it, the column simply does not exist in the database that
-- serves the public site. What is not here cannot leak.
--
-- The local pipeline database holds the full rows. This table holds what a map
-- pin needs.

create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references sources_registry(id) on delete cascade,
  -- The source's own identifier, so a reader can look it up there and so
  -- re-imports update rather than duplicate.
  source_ref    text,

  cluster_id    uuid references event_clusters(id) on delete set null,

  occurred_at   date,
  date_precision date_precision not null default 'day',
  -- Kept as written, because "summer 1974" and " E" are information about how
  -- well the date is known, and normalising them away discards that.
  occurred_raw  text,

  lat           double precision,
  lng           double precision,
  location_raw  text,
  country       text,
  continent     continent not null default 'unknown',

  shape         text,
  duration_raw  text,
  observers     integer,

  -- The source's own verdict, kept as theirs and never translated into our
  -- classification. Blue Book's 'unidentified', GEIPAN's 'D', NUFORC's
  -- explanation field. This is what makes 701 Blue Book unidentifieds
  -- filterable as a set on day one.
  source_disposition text,

  -- Whether the source holds material we could go and look at, which is a
  -- research signal even when we cannot show the thing itself.
  has_narrative boolean not null default false,
  has_media     boolean not null default false,

  created_at    timestamptz not null default now(),

  unique (source_id, source_ref)
);

create index if not exists reports_cluster_idx on reports (cluster_id);
create index if not exists reports_date_idx on reports (occurred_at desc);
create index if not exists reports_geo_idx on reports (lat, lng);
create index if not exists reports_source_idx on reports (source_id);

-- ---------------------------------------------------------------------------
-- Candidate matches
-- ---------------------------------------------------------------------------
--
-- Flagged, never auto-merged. Two genuinely different events at the same place
-- on the same day get silently destroyed by an automatic merge and nobody ever
-- finds out. UFOSINT flags rather than merges, and they are right.
--
-- Thresholds are asymmetric on purpose. A missed link costs a corroboration we
-- could have shown. A wrong link puts the wrong video under a sourced account,
-- which is the failure the seed cases already guard against by shipping empty
-- embed URLs rather than guessed ones.

do $$ begin
  create type link_state as enum ('suggested', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists report_links (
  id         uuid primary key default gen_random_uuid(),
  a_id       uuid not null references reports(id) on delete cascade,
  b_id       uuid not null references reports(id) on delete cascade,

  score      real not null,
  -- Which signals fired and how hard, so a human reviewing the pair can see
  -- why the matcher thought so instead of being asked to trust a number.
  signals    jsonb not null default '{}'::jsonb,

  state      link_state not null default 'suggested',
  decided_at timestamptz,

  created_at timestamptz not null default now(),

  -- One row per pair regardless of which side was found first.
  constraint report_links_ordered check (a_id < b_id),
  unique (a_id, b_id)
);

create index if not exists report_links_state_idx on report_links (state, score desc);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
--
-- Reports are public only when their source permits it. This is the flag doing
-- real work: UFOCAT rows loaded before CUFOS answers are invisible to the anon
-- key, so an accidental push cannot become an accidental publication.

alter table sources_registry enable row level security;
alter table event_clusters   enable row level security;
alter table reports          enable row level security;
alter table report_links     enable row level security;

drop policy if exists "sources are public" on sources_registry;
create policy "sources are public" on sources_registry
  for select using (true);

drop policy if exists "reports are public when their source permits" on reports;
create policy "reports are public when their source permits" on reports
  for select using (exists (
    select 1 from sources_registry s
    where s.id = reports.source_id and s.may_publish_facts));

-- A cluster is visible once any of its reports is. A cluster made entirely of
-- restricted reports would otherwise appear on the map as a pin with nothing
-- behind it.
drop policy if exists "clusters are public when a report is" on event_clusters;
create policy "clusters are public when a report is" on event_clusters
  for select using (exists (
    select 1 from reports r
    join sources_registry s on s.id = r.source_id
    where r.cluster_id = event_clusters.id and s.may_publish_facts));

-- Candidate matches are working state, not reader-facing. No public policy, so
-- RLS denies by default and only the service key sees them.
