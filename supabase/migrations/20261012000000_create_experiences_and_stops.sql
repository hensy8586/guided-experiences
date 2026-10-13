-- Milestone 1 base schema. Apply once through Supabase migrations.
begin;

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null constraint experiences_title_not_blank
    check (title ~ '[^[:space:]]'),
  description text not null default '',
  status text not null default 'draft'
    constraint experiences_status_valid check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experience_stops (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  position integer not null constraint experience_stops_position_nonnegative
    check (position >= 0),
  title text not null constraint experience_stops_title_not_blank
    check (title ~ '[^[:space:]]'),
  description text not null default '',
  latitude double precision not null constraint experience_stops_latitude_valid
    check (latitude between -90 and 90),
  longitude double precision not null constraint experience_stops_longitude_valid
    check (longitude between -180 and 180),
  trigger_radius_meters integer not null default 40
    constraint experience_stops_radius_positive check (trigger_radius_meters > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experience_stops_experience_position_unique
    unique (experience_id, position)
);

create index experiences_creator_id_idx on public.experiences (creator_id);
create index experiences_status_idx on public.experiences (status);
-- The unique constraint already indexes Stops by parent and position.

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger experiences_set_updated_at
before update on public.experiences
for each row execute function public.set_updated_at();

create trigger experience_stops_set_updated_at
before update on public.experience_stops
for each row execute function public.set_updated_at();

alter table public.experiences enable row level security;
alter table public.experience_stops enable row level security;

-- Explicit grants avoid relying on project defaults. In particular, clients
-- must not inherit TRUNCATE privileges, which are not governed by row policies.
revoke all on table public.experiences, public.experience_stops
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.experiences, public.experience_stops to anon;
grant select, insert, update, delete
  on table public.experiences, public.experience_stops to authenticated;

-- Trigger execution does not require exposing this function as a client RPC.
revoke all on function public.set_updated_at() from public, anon, authenticated;

create policy experiences_select
on public.experiences for select to anon, authenticated
using (status = 'published' or creator_id = (select auth.uid()));

create policy experiences_insert
on public.experiences for insert to authenticated
with check (creator_id = (select auth.uid()));

create policy experiences_update
on public.experiences for update to authenticated
using (creator_id = (select auth.uid()))
with check (creator_id = (select auth.uid()));

create policy experiences_delete
on public.experiences for delete to authenticated
using (creator_id = (select auth.uid()));

create policy experience_stops_select
on public.experience_stops for select to anon, authenticated
using (
  exists (
    select 1 from public.experiences as experience
    where experience.id = experience_stops.experience_id
      and (experience.status = 'published' or experience.creator_id = (select auth.uid()))
  )
);

create policy experience_stops_insert
on public.experience_stops for insert to authenticated
with check (
  exists (
    select 1 from public.experiences as experience
    where experience.id = experience_stops.experience_id
      and experience.creator_id = (select auth.uid())
  )
);

create policy experience_stops_update
on public.experience_stops for update to authenticated
using (
  exists (
    select 1 from public.experiences as experience
    where experience.id = experience_stops.experience_id
      and experience.creator_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.experiences as experience
    where experience.id = experience_stops.experience_id
      and experience.creator_id = (select auth.uid())
  )
);

create policy experience_stops_delete
on public.experience_stops for delete to authenticated
using (
  exists (
    select 1 from public.experiences as experience
    where experience.id = experience_stops.experience_id
      and experience.creator_id = (select auth.uid())
  )
);

commit;
