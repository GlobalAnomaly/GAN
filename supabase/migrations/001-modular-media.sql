-- Migration 001: modular case pages
--
-- Run this in the Supabase SQL editor after schema.sql. Safe to run twice.
--
-- Why: a case is no longer "a video at the top and links at the bottom". The
-- official US releases pair a video with poster frames and a case resolution
-- PDF, and those belong beside the passage they support, the way a news story
-- places its pictures. So media and documents gain a placement, and the page
-- renders them between the account's sections instead of only around it.
--
-- The four-part account structure does not change. It is what enforces the
-- editorial discipline, and interleaving media does not require abandoning it.

-- ---------------------------------------------------------------------------
-- Where a piece of media or a document sits in the page
-- ---------------------------------------------------------------------------

do $$ begin
  create type block_placement as enum (
    'hero',             -- above the account, leading the page
    'after_footage',    -- after "what the footage shows"
    'after_testimony',  -- after "what witnesses and officials say"
    'after_status',     -- after "status and corroboration"
    'after_unknown',    -- after "what remains unknown"
    'end'               -- the traditional list at the bottom
  );
exception when duplicate_object then null; end $$;

-- Media can now be a self-hosted file rather than only a third-party embed,
-- because public-domain government video is ours to serve.
do $$ begin
  alter type media_type add value if not exists 'video_file';
exception when others then null; end $$;

alter table media
  add column if not exists placement block_placement not null default 'hero',
  -- Public-domain material still gets credited: it is where the reader goes
  -- to verify, not a legal formality.
  add column if not exists credit text,
  -- Poster frame for a video file, so the page is not blank before play.
  add column if not exists poster_url text,
  -- Set when we serve the file ourselves instead of embedding it.
  add column if not exists is_self_hosted boolean not null default false;

alter table documents
  add column if not exists placement block_placement not null default 'end',
  -- "Read the full 12-page report" beats "Read the full report".
  add column if not exists page_count integer,
  add column if not exists published_by text;

create index if not exists media_placement_idx on media (case_id, placement, sort_order);
create index if not exists documents_placement_idx on documents (case_id, placement, sort_order);

-- ---------------------------------------------------------------------------
-- Case updates
--
-- When new material emerges on a case already covered, the account is not
-- rewritten as though it always said that. A dated update is appended, so the
-- record shows what was known when. An archive that silently revises itself is
-- not a record.
-- ---------------------------------------------------------------------------

create table if not exists case_updates (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references cases(id) on delete cascade,
  happened_at date not null default current_date,
  title      text,
  body       text not null,
  source_name text,
  source_url text,
  -- Lifts the case onto the front page as breaking news.
  is_major   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists case_updates_case_idx
  on case_updates (case_id, happened_at desc);

-- Front page spotlight: the most recent major update across the whole archive.
create index if not exists case_updates_major_idx
  on case_updates (happened_at desc) where is_major;

alter table case_updates enable row level security;

drop policy if exists "updates of published cases are public" on case_updates;
create policy "updates of published cases are public" on case_updates
  for select using (exists (
    select 1 from cases c where c.id = case_updates.case_id and c.published));

-- ---------------------------------------------------------------------------
-- Language: which translations a reader may switch to
-- ---------------------------------------------------------------------------

-- Readers need to find translations, so the join has to be cheap.
create index if not exists case_translations_lang_idx
  on case_translations (case_id, lang);
