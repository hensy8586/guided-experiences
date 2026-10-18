-- Check the Stop mutation's resulting state even when a SQL caller chooses
-- SET CONSTRAINTS ALL IMMEDIATE. A BEFORE trigger checks the old Stop set and
-- can let a last-Stop deletion leave an empty published Experience.
begin;

-- Do not silently bless data left invalid by the old timing edge case.
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
  ) then
    raise exception 'Correct invalid published Experiences before applying the publication timing fix';
  end if;
end;
$$;

drop trigger stop_publication_parent_lock on public.experience_stops;
create trigger stop_publication_parent_lock
after insert or update or delete on public.experience_stops
for each row execute function public.lock_stop_publication_parent();

-- RPCs still lock the parent before touching Stops. Direct table writers lock
-- the parent via this AFTER trigger before commit. The parent UPDATE continues
-- to serialize concurrent writes and queue published_experience_valid checks.
-- Default deferred mode permits the RPC's temporary reorder positions.
-- Immediate mode may reject intermediate reorder states, but never commits
-- invalid published content. Parent deletion/cascade remains permitted.
commit;
