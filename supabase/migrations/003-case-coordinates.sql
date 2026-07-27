-- Migration 003: coordinates on cases
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Why: the map needs somewhere to put a written case. Clusters carry coordinates
-- already (migration 002), but the nine seeded cases have no cluster and a case
-- we write from a single document may never get one, so a case has to be able to
-- hold its own position.
--
-- `coord_precision` exists for the same reason `date_precision` does. A case
-- known only to a year must never render as 1 January, and a case whose location
-- is "Pacific Ocean, off southern California" or "Phoenix and across Arizona"
-- must never render as a precise dot. Both of those are areas. Dropping a pin on
-- them claims a precision no source gave us, and the map draws approximate
-- locations differently so a reader can see which is which.

do $$ begin
  create type coord_precision as enum ('exact', 'approximate');
exception when duplicate_object then null; end $$;

alter table cases
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists coord_precision coord_precision not null default 'exact';

-- Range check rather than trust. A longitude of 4005 is what a missing decimal
-- separator looks like, and 33 rows of UFOCAT held exactly that.
alter table cases drop constraint if exists cases_coords_in_range;
alter table cases add constraint cases_coords_in_range check (
  (lat is null and lng is null)
  or (lat between -90 and 90 and lng between -180 and 180)
);

-- The map queries a viewport, so it filters on both at once.
create index if not exists cases_geo_idx on cases (lat, lng)
  where lat is not null and lng is not null;
