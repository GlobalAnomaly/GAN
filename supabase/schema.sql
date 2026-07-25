-- Global Anomaly Network — database schema
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It is written to be re-runnable: every object is created with a guard,
-- so running it twice will not destroy data.
--
-- Tables are grouped by what they serve:
--   1. enums          the fixed vocabularies (classification, continent, ...)
--   2. cases          UFO/UAP entries and everything hanging off them
--   3. science        the "life elsewhere" entries
--   4. translations   one record per case, several language versions
--   5. people         profiles, submissions, comments, watchlist, newsletter
--   6. bot            monitored sources, ingestion memory, social drafts
--   7. settings       feature flags, all shipping OFF
--   8. RLS            the public may read published rows and nothing else
--
-- Feature-flagged tables are created now and sit empty until switched on.
-- Building them later is painful; building them now costs nothing.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type classification as enum (
    'acknowledged',      -- officially released or confirmed, no conventional explanation
    'unverified',        -- public sighting, no official validation
    'likely_explained',  -- plausible conventional cause, not conclusively proven
    'debunked'           -- conventional cause established, or demonstrably fabricated
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type continent as enum (
    'north_america', 'south_america', 'africa',
    'europe', 'asia', 'oceania', 'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('youtube', 'short', 'tiktok', 'gov_file', 'image');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_role as enum ('primary', 'additional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_type as enum ('govt', 'news', 'witness', 'research');
exception when duplicate_object then null; end $$;

do $$ begin
  create type science_topic as enum (
    'exoplanets', 'search_for_life', 'astrobiology',
    'interstellar_objects', 'space_signals', 'missions_telescopes', 'other'
  );
exception when duplicate_object then null; end $$;

-- A science entry's status is the finding's own maturity, never a verdict.
do $$ begin
  create type science_status as enum (
    'candidate', 'proposed', 'confirmed', 'disputed', 'superseded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin', 'mod', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lang as enum ('en', 'fr', 'pt', 'es');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at honest without the app having to remember.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Cases
-- ---------------------------------------------------------------------------

create table if not exists cases (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  slug                  text not null unique,
  summary               text,

  -- The four-part account from the editorial template. Split into columns
  -- rather than one blob so "what remains unknown" can never be quietly
  -- dropped: the reviewer sees an empty field instead of a smooth story.
  body_footage          text,  -- 1. what the footage shows
  body_testimony        text,  -- 2. what witnesses and officials say
  body_status           text,  -- 3. status and corroboration
  body_unknown          text,  -- 4. what remains unknown

  date_of_event         date,
  date_precision        text default 'day'
                          check (date_precision in ('day', 'month', 'year', 'unknown')),
  location_name         text,
  continent             continent not null default 'unknown',
  country               text,
  location_unknown      boolean not null default false,

  classification        classification not null default 'unverified',
  classification_reason text,

  view_count            integer not null default 0,
  published             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on column cases.date_precision is
  'Guards against a vague "sometime in 1978" being rendered as a false exact date.';

create index if not exists cases_published_idx
  on cases (published, date_of_event desc nulls last);
create index if not exists cases_classification_idx
  on cases (classification) where published;
create index if not exists cases_continent_idx
  on cases (continent) where published;
create index if not exists cases_country_idx
  on cases (country) where published;

-- Free-text search across the fields a reader would actually search by.
alter table cases drop column if exists search_vector;
alter table cases add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(location_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(country, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(body_footage, '')), 'D') ||
    setweight(to_tsvector('simple', coalesce(body_testimony, '')), 'D')
  ) stored;

create index if not exists cases_search_idx on cases using gin (search_vector);

drop trigger if exists cases_updated_at on cases;
create trigger cases_updated_at before update on cases
  for each row execute function set_updated_at();

-- Many media per case: a multi-angle case is stronger evidence, not spam.
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  type        media_type not null,
  embed_url   text not null,
  thumbnail_url text,
  caption     text,
  role        media_role not null default 'additional',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists media_case_idx on media (case_id, sort_order);

-- Only one primary clip per case; the rest are additional angles.
create unique index if not exists media_one_primary_per_case
  on media (case_id) where role = 'primary';

-- Documents are linked, never re-hosted. The button points at the original.
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  title       text not null,
  source_url  text not null,
  source_note text,
  sort_order  integer not null default 0
);

create index if not exists documents_case_idx on documents (case_id, sort_order);

create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  source_name text not null,
  source_url  text,
  source_type source_type not null default 'news',
  sort_order  integer not null default 0
);

create index if not exists sources_case_idx on sources (case_id, sort_order);

create table if not exists tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists case_tags (
  case_id uuid not null references cases(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (case_id, tag_id)
);

create index if not exists case_tags_tag_idx on case_tags (tag_id);

-- ---------------------------------------------------------------------------
-- 3. Science
-- ---------------------------------------------------------------------------

create table if not exists science_entries (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  summary          text,
  topic            science_topic not null default 'other',
  status           science_status not null default 'candidate',
  institutions     text[],

  -- The science template's four parts. "does_not_mean" is the anti-hype
  -- keystone and is required in practice, not just by convention.
  body_found       text,  -- 1. what they found
  body_how         text,  -- 2. how they found it
  body_why         text,  -- 3. why it matters
  body_caveat      text,  -- 4. what this does not mean

  date             date,
  view_count       integer not null default 0,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists science_published_idx
  on science_entries (published, date desc nulls last);
create index if not exists science_topic_idx
  on science_entries (topic) where published;

alter table science_entries drop column if exists search_vector;
alter table science_entries add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body_found, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(body_why, '')), 'D')
  ) stored;

create index if not exists science_search_idx
  on science_entries using gin (search_vector);

drop trigger if exists science_updated_at on science_entries;
create trigger science_updated_at before update on science_entries
  for each row execute function set_updated_at();

-- Credit is not optional: NASA/ESA/ESO imagery is usable *with* a credit line.
create table if not exists science_images (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references science_entries(id) on delete cascade,
  image_url  text not null,
  credit     text not null,
  caption    text,
  sort_order integer not null default 0
);

create index if not exists science_images_entry_idx
  on science_images (entry_id, sort_order);

create table if not exists science_sources (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references science_entries(id) on delete cascade,
  name       text not null,
  url        text,
  sort_order integer not null default 0
);

create index if not exists science_sources_entry_idx
  on science_sources (entry_id, sort_order);

-- ---------------------------------------------------------------------------
-- 4. Translations
--
-- One case, several language versions. The English row on `cases` is the
-- record of truth where attribution and classification live; these rows
-- must say exactly the same thing.
-- ---------------------------------------------------------------------------

create table if not exists case_translations (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references cases(id) on delete cascade,
  lang            lang not null,
  title           text not null,
  summary         text,
  body_footage    text,
  body_testimony  text,
  body_status     text,
  body_unknown    text,
  is_machine      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (case_id, lang)
);

create table if not exists science_translations (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references science_entries(id) on delete cascade,
  lang        lang not null,
  title       text not null,
  summary     text,
  body_found  text,
  body_how    text,
  body_why    text,
  body_caveat text,
  is_machine  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (entry_id, lang)
);

-- ---------------------------------------------------------------------------
-- 5. People (all dormant until accounts_on)
--
-- Supabase already owns auth.users. This table holds only the public-facing
-- extras, keyed to that identity, which is the supported pattern.
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nickname       text unique,
  role           user_role not null default 'user',
  watchlist_emails boolean not null default true,
  newsletter_opt_in boolean not null default false,
  created_at     timestamptz not null default now()
);

create table if not exists submissions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null check (type in ('link', 'upload')),
  url        text,
  note       text,
  status     text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references cases(id) on delete cascade,
  entry_id   uuid references science_entries(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  status     text not null default 'visible' check (status in ('visible', 'removed')),
  created_at timestamptz not null default now(),
  -- A comment belongs to exactly one thing.
  check (num_nonnulls(case_id, entry_id) = 1)
);

create index if not exists comments_case_idx on comments (case_id, created_at desc);
create index if not exists comments_entry_idx on comments (entry_id, created_at desc);

create table if not exists watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  case_id    uuid references cases(id) on delete cascade,
  target_kind text check (target_kind in ('case', 'classification', 'continent', 'topic')),
  target_value text,
  created_at timestamptz not null default now()
);

create index if not exists watchlist_user_idx on watchlist (user_id);

create table if not exists newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  email          text not null unique,
  opted_in_at    timestamptz,
  unsubscribed_at timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. The bot
-- ---------------------------------------------------------------------------

create table if not exists monitored_sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text,
  section      text not null default 'cases' check (section in ('cases', 'science')),
  endpoint     text,
  query        text,
  last_checked timestamptz,
  mode         text not null default 'backfill' check (mode in ('backfill', 'watch')),
  status       text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  enabled      boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);

comment on table monitored_sources is
  'The bot proposes; a human approves. Discovery never promotes a source by itself.';

-- Everything the bot has ever seen, including what was rejected, so the same
-- clip never reaches the review inbox twice.
create table if not exists ingestion_log (
  id             uuid primary key default gen_random_uuid(),
  normalized_url text not null unique,
  source         text,
  first_seen     timestamptz not null default now(),
  outcome        text not null default 'published'
                   check (outcome in ('published', 'merged', 'dismissed', 'pending')),
  case_id        uuid references cases(id) on delete set null,
  notes          text
);

comment on column ingestion_log.normalized_url is
  'Tracking params stripped and short/mobile variants resolved, so one video via three links counts once.';

create table if not exists social_drafts (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid references cases(id) on delete cascade,
  entry_id      uuid references science_entries(id) on delete cascade,
  platform      text not null check (platform in ('x', 'instagram', 'facebook')),
  draft_text    text not null,
  media_ref     text,
  status        text not null default 'queued' check (status in ('queued', 'posted', 'skipped')),
  scheduled_for timestamptz,
  created_at    timestamptz not null default now(),
  check (num_nonnulls(case_id, entry_id) = 1)
);

-- ---------------------------------------------------------------------------
-- 7. Settings and feature flags
-- ---------------------------------------------------------------------------

create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Launch is a clean, read-only, zero-moderation archive. Each flag switches
-- on when there is audience or moderation capacity to match it.
insert into settings (key, value) values
  ('comments_on',   'false'::jsonb),
  ('accounts_on',   'false'::jsonb),
  ('uploads_on',    'false'::jsonb),
  ('ads_on',        'false'::jsonb),
  ('newsletter_on', 'false'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Row level security
--
-- The public site connects with the anon key and must see published rows and
-- nothing else. The bot and the admin panel use the service_role key, which
-- bypasses RLS entirely, so no write policies are needed here.
--
-- RLS denies by default: a table with RLS on and no matching policy returns
-- nothing. Every table below is therefore locked unless a policy opens it.
-- ---------------------------------------------------------------------------

alter table cases                enable row level security;
alter table media                enable row level security;
alter table documents            enable row level security;
alter table sources              enable row level security;
alter table tags                 enable row level security;
alter table case_tags            enable row level security;
alter table science_entries      enable row level security;
alter table science_images       enable row level security;
alter table science_sources      enable row level security;
alter table case_translations    enable row level security;
alter table science_translations enable row level security;
alter table profiles             enable row level security;
alter table submissions          enable row level security;
alter table comments             enable row level security;
alter table watchlist            enable row level security;
alter table newsletter_subscribers enable row level security;
alter table monitored_sources    enable row level security;
alter table ingestion_log        enable row level security;
alter table social_drafts        enable row level security;
alter table settings             enable row level security;

drop policy if exists "published cases are public" on cases;
create policy "published cases are public" on cases
  for select using (published);

-- Child rows inherit their parent's visibility. An unpublished case must not
-- leak its sources or media through a side door.
drop policy if exists "media of published cases is public" on media;
create policy "media of published cases is public" on media
  for select using (exists (
    select 1 from cases c where c.id = media.case_id and c.published));

drop policy if exists "documents of published cases are public" on documents;
create policy "documents of published cases are public" on documents
  for select using (exists (
    select 1 from cases c where c.id = documents.case_id and c.published));

drop policy if exists "sources of published cases are public" on sources;
create policy "sources of published cases are public" on sources
  for select using (exists (
    select 1 from cases c where c.id = sources.case_id and c.published));

drop policy if exists "case tags of published cases are public" on case_tags;
create policy "case tags of published cases are public" on case_tags
  for select using (exists (
    select 1 from cases c where c.id = case_tags.case_id and c.published));

drop policy if exists "tags are public" on tags;
create policy "tags are public" on tags for select using (true);

drop policy if exists "translations of published cases are public" on case_translations;
create policy "translations of published cases are public" on case_translations
  for select using (exists (
    select 1 from cases c where c.id = case_translations.case_id and c.published));

drop policy if exists "published science is public" on science_entries;
create policy "published science is public" on science_entries
  for select using (published);

drop policy if exists "images of published science are public" on science_images;
create policy "images of published science are public" on science_images
  for select using (exists (
    select 1 from science_entries e where e.id = science_images.entry_id and e.published));

drop policy if exists "sources of published science are public" on science_sources;
create policy "sources of published science are public" on science_sources
  for select using (exists (
    select 1 from science_entries e where e.id = science_sources.entry_id and e.published));

drop policy if exists "translations of published science are public" on science_translations;
create policy "translations of published science are public" on science_translations
  for select using (exists (
    select 1 from science_entries e where e.id = science_translations.entry_id and e.published));

-- Feature flags drive what the front end renders, so the anon key reads them.
-- Only the flags: anything sensitive belongs under a different key prefix and
-- is served through the admin panel instead.
drop policy if exists "feature flags are public" on settings;
create policy "feature flags are public" on settings
  for select using (key in
    ('comments_on', 'accounts_on', 'uploads_on', 'ads_on', 'newsletter_on'));

-- Visible comments on published cases, readable by anyone, once the flag is on.
drop policy if exists "visible comments are public" on comments;
create policy "visible comments are public" on comments
  for select using (
    status = 'visible'
    and (
      (case_id is not null and exists (
        select 1 from cases c where c.id = comments.case_id and c.published))
      or (entry_id is not null and exists (
        select 1 from science_entries e where e.id = comments.entry_id and e.published))
    ));

-- Signed-in users manage their own rows and no one else's.
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own watchlist" on watchlist;
create policy "own watchlist" on watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own comments" on comments;
create policy "own comments" on comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "edit own comments" on comments;
create policy "edit own comments" on comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- monitored_sources, ingestion_log, social_drafts, submissions and
-- newsletter_subscribers get no public policy on purpose. RLS is on, so the
-- anon key sees nothing; the bot and admin reach them via service_role.

-- ---------------------------------------------------------------------------
-- View counter. Called from the site with the anon key, so it is defined as
-- security definer to increment a column the caller cannot otherwise write.
-- ---------------------------------------------------------------------------

create or replace function increment_case_views(case_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update cases set view_count = view_count + 1
  where slug = case_slug and published;
$$;

create or replace function increment_science_views(entry_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update science_entries set view_count = view_count + 1
  where slug = entry_slug and published;
$$;

grant execute on function increment_case_views(text) to anon, authenticated;
grant execute on function increment_science_views(text) to anon, authenticated;
