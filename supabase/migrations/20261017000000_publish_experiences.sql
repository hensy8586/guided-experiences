-- Publication shares the parent-row transaction boundary with the Stop editor.
-- Also guard direct owner table writes: RLS alone does not enforce ordering.
begin;

create function public.lock_stop_publication_parent()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  parent_id uuid;
  old_parent uuid;
  new_parent uuid;
begin
  if TG_OP <> 'INSERT' then old_parent := OLD.experience_id; end if;
  if TG_OP <> 'DELETE' then new_parent := NEW.experience_id; end if;
  for parent_id in
    select e.id from public.experiences e
    where e.id = old_parent or e.id = new_parent order by e.id
  loop
    -- A real write serializes concurrent snapshots as well as taking the lock.
    -- RLS still applies. A cascading parent deletion has no remaining parent.
    update public.experiences set updated_at = pg_catalog.now() where id = parent_id;
  end loop;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

create trigger stop_publication_parent_lock
before insert or update or delete on public.experience_stops
for each row execute function public.lock_stop_publication_parent();

create function public.check_published_experience()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  current_status text;
  stop_count bigint;
begin
  select status into current_status from public.experiences where id = NEW.id;
  -- Read final state, not an intermediate NEW status. Deleting a parent is OK.
  if current_status is distinct from 'published' then return null; end if;
  select count(*) into stop_count from public.experience_stops where experience_id = NEW.id;
  if stop_count = 0 then
    raise exception using errcode = 'P0001', message = 'published_requires_stops';
  end if;
  if exists (
    select 1 from (
      select position, row_number() over (order by position) - 1 as expected
      from public.experience_stops where experience_id = NEW.id
    ) ordered where position <> expected
  ) then
    raise exception using errcode = 'P0001', message = 'published_invalid_order';
  end if;
  -- Nonblank titles, coordinate ranges and positive radii are table constraints.
  return null;
end;
$$;

-- Deferred so the existing RPC's temporary swap position and delete compaction
-- can finish; only a valid final published state may commit.
create constraint trigger published_experience_valid
after insert or update on public.experiences
deferrable initially deferred
for each row execute function public.check_published_experience();

create function public.set_experience_publication(p_experience_id uuid, p_published boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or p_published is null then
    raise exception 'Publication not permitted';
  end if;
  perform 1 from public.experiences
    where id = p_experience_id and creator_id = auth.uid() for update;
  if not found then raise exception 'Experience not found'; end if;
  update public.experiences
    set status = case when p_published then 'published' else 'draft' end
    where id = p_experience_id and creator_id = auth.uid();
  -- The deferred constraint checks the final state before the RPC commits.
end;
$$;

revoke all on function public.lock_stop_publication_parent() from public, anon, authenticated;
revoke all on function public.check_published_experience() from public, anon, authenticated;
revoke all on function public.set_experience_publication(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_experience_publication(uuid, boolean) to authenticated;

-- Fail migration safely if pre-existing published data violates the invariant.
do $$
begin
  if exists (
    select 1 from public.experiences e where e.status = 'published' and (
      not exists (select 1 from public.experience_stops s where s.experience_id = e.id)
      or exists (select 1 from (
        select s.position, row_number() over (order by s.position) - 1 as expected
        from public.experience_stops s where s.experience_id = e.id
      ) ordered where position <> expected)
    )
  ) then raise exception 'Existing published Experiences need valid nonempty ordered Stops before this migration';
  end if;
end;
$$;
commit;
