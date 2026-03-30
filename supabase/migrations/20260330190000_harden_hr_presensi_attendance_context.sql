create or replace function public.hr_presensi_get_attendance_context(
  p_employee_id bigint,
  p_attendance_date date
)
returns table (
  shift_id uuid,
  location_id uuid,
  scheduled_checkin timestamptz,
  scheduled_checkout timestamptz,
  grace_minutes integer
)
language plpgsql
as $$
declare
  v_assignment record;
  v_shift_id uuid;
  v_location_id uuid;
  v_shift_scheduled_checkin time;
  v_shift_scheduled_checkout time;
  v_shift_cross_day boolean := false;
  v_shift_grace_minutes integer := 0;
  v_shift_found boolean := false;
  v_scheduled_checkin timestamptz;
  v_scheduled_checkout timestamptz;
begin
  select
    sa.shift_id,
    sa.location_id,
    sg.default_shift_id,
    sg.default_location_id
  into v_assignment
  from public.hr_shift_assignments sa
  left join public.hr_attendance_schedule_groups sg on sg.id = sa.schedule_group_id
  where sa.employee_id = p_employee_id
    and sa.is_active = true
    and sa.effective_start_date <= p_attendance_date
    and (sa.effective_end_date is null or sa.effective_end_date >= p_attendance_date)
  order by sa.effective_start_date desc, sa.created_at desc
  limit 1;

  if found then
    v_shift_id := coalesce(v_assignment.shift_id, v_assignment.default_shift_id);
    v_location_id := coalesce(v_assignment.location_id, v_assignment.default_location_id);
  else
    v_shift_id := null;
    v_location_id := null;
  end if;

  if v_shift_id is not null then
    select
      scheduled_checkin,
      scheduled_checkout,
      cross_day,
      grace_minutes
    into
      v_shift_scheduled_checkin,
      v_shift_scheduled_checkout,
      v_shift_cross_day,
      v_shift_grace_minutes
    from public.hr_attendance_shifts
    where id = v_shift_id
      and is_active = true
      and effective_start_date <= p_attendance_date
      and (effective_end_date is null or effective_end_date >= p_attendance_date)
    limit 1;

    v_shift_found := found;
  end if;

  if v_shift_found and v_shift_scheduled_checkin is not null then
    v_scheduled_checkin := ((p_attendance_date::text || ' ' || v_shift_scheduled_checkin::text || '+07')::timestamptz);
  end if;

  if v_shift_found and v_shift_scheduled_checkout is not null then
    v_scheduled_checkout := (
      (
        (p_attendance_date + case when coalesce(v_shift_cross_day, false) or (v_shift_scheduled_checkin is not null and v_shift_scheduled_checkout <= v_shift_scheduled_checkin) then 1 else 0 end)::text
        || ' '
        || v_shift_scheduled_checkout::text
        || '+07'
      )::timestamptz
    );
  end if;

  return query
  select
    v_shift_id,
    v_location_id,
    v_scheduled_checkin,
    v_scheduled_checkout,
    case when v_shift_found then coalesce(v_shift_grace_minutes, 0) else 0 end;
end;
$$;
