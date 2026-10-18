begin;

-- All editor mutations serialize on the owned parent. Existing RLS still
-- applies: this function runs as the authenticated caller, never as its owner.
create function public.edit_experience_stop(
  p_experience_id uuid,
  p_operation text,
  p_stop_id uuid default null,
  p_title text default null,
  p_description text default '',
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_trigger_radius_meters integer default 40
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_position integer;
  v_target integer;
  v_row record;
begin
  if auth.uid() is null then
    raise exception 'Experience not found';
  end if;
  perform id from public.experiences
    where id = p_experience_id and creator_id = auth.uid() for update;
  if not found then
    raise exception 'Experience not found';
  end if;

  if p_operation is null or p_operation not in ('add', 'edit', 'delete', 'up', 'down') then
    raise exception 'Invalid operation';
  end if;

  -- Lock existing rows and refuse malformed ordering rather than repairing it.
  perform id from public.experience_stops
    where experience_id = p_experience_id order by position for update;
  select count(*) into v_count from public.experience_stops
    where experience_id = p_experience_id;
  if exists (
    select 1 from (
      select position, row_number() over (order by position) - 1 as expected
      from public.experience_stops where experience_id = p_experience_id
    ) as ordered where position <> expected
  ) then
    raise exception 'Invalid stop ordering';
  end if;

  if p_operation <> 'add' then
    select position into v_position from public.experience_stops
      where id = p_stop_id and experience_id = p_experience_id;
    if not found then
      raise exception 'Stop not found';
    end if;
  end if;

  if p_operation in ('add', 'edit') then
    if p_title is null or p_title !~ '[^[:space:]]'
      or p_latitude is null or not (p_latitude between -90 and 90)
      or p_longitude is null or not (p_longitude between -180 and 180)
      or p_trigger_radius_meters is null or p_trigger_radius_meters <= 0 then
      raise exception 'Invalid stop fields';
    end if;
    if p_operation = 'add' then
      insert into public.experience_stops
        (experience_id, position, title, description, latitude, longitude, trigger_radius_meters)
      values (p_experience_id, v_count, btrim(p_title), coalesce(p_description, ''),
        p_latitude, p_longitude, p_trigger_radius_meters);
    else
      update public.experience_stops set
        title = btrim(p_title), description = coalesce(p_description, ''),
        latitude = p_latitude, longitude = p_longitude,
        trigger_radius_meters = p_trigger_radius_meters
      where id = p_stop_id and experience_id = p_experience_id;
    end if;
  elsif p_operation = 'delete' then
    delete from public.experience_stops
      where id = p_stop_id and experience_id = p_experience_id;
    -- Each ascending move fills the hole left by the preceding move.
    for v_row in select id, position from public.experience_stops
      where experience_id = p_experience_id and position > v_position order by position
    loop
      update public.experience_stops set position = v_row.position - 1 where id = v_row.id;
    end loop;
  else
    v_target := v_position + case when p_operation = 'up' then -1 else 1 end;
    if v_target < 0 or v_target >= v_count then
      raise exception 'Cannot move stop further';
    end if;
    -- n is unused because positions were verified as exactly 0..n-1.
    update public.experience_stops set position = v_count
      where id = p_stop_id and experience_id = p_experience_id;
    update public.experience_stops set position = v_position
      where experience_id = p_experience_id and position = v_target;
    update public.experience_stops set position = v_target
      where id = p_stop_id and experience_id = p_experience_id;
  end if;
end;
$$;

revoke all on function public.edit_experience_stop(uuid, text, uuid, text, text, double precision, double precision, integer)
  from public, anon, authenticated;
grant execute on function public.edit_experience_stop(uuid, text, uuid, text, text, double precision, double precision, integer)
  to authenticated;

commit;
