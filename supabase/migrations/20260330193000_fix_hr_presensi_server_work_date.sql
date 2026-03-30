create or replace function public.hr_presensi_server_work_date()
returns date
language sql
volatile
as $$
  select timezone('Asia/Jakarta', now())::date;
$$;

create or replace function public.hr_presensi_clock_in(
  p_employee_id bigint,
  p_source text default 'manual'
)
returns public.hr_attendance_daily_records
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_work_date date := public.hr_presensi_server_work_date();
  v_existing public.hr_attendance_daily_records%rowtype;
  v_assignment record;
  v_shift record;
  v_shift_id uuid;
  v_location_id uuid;
  v_scheduled_checkin timestamptz;
  v_scheduled_checkout timestamptz;
  v_late_minutes integer := 0;
  v_status_main text := 'hadir';
  v_result public.hr_attendance_daily_records%rowtype;
begin
  select *
  into v_existing
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and attendance_date = v_work_date
  for update;

  if found and v_existing.actual_checkin is not null then
    raise exception 'Check-in hari ini sudah tercatat.';
  end if;

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
    and sa.effective_start_date <= v_work_date
    and (sa.effective_end_date is null or sa.effective_end_date >= v_work_date)
  order by sa.effective_start_date desc, sa.created_at desc
  limit 1;

  v_shift_id := coalesce(v_assignment.shift_id, v_assignment.default_shift_id);
  v_location_id := coalesce(v_assignment.location_id, v_assignment.default_location_id);

  if v_shift_id is not null then
    select
      scheduled_checkin,
      scheduled_checkout,
      cross_day,
      grace_minutes
    into v_shift
    from public.hr_attendance_shifts
    where id = v_shift_id
      and is_active = true
      and effective_start_date <= v_work_date
      and (effective_end_date is null or effective_end_date >= v_work_date)
    limit 1;
  end if;

  if v_shift.scheduled_checkin is not null then
    v_scheduled_checkin := ((v_work_date::text || ' ' || v_shift.scheduled_checkin::text || '+07')::timestamptz);
  end if;

  if v_shift.scheduled_checkout is not null then
    v_scheduled_checkout := (((v_work_date + case when coalesce(v_shift.cross_day, false) or v_shift.scheduled_checkout <= v_shift.scheduled_checkin then 1 else 0 end)::text || ' ' || v_shift.scheduled_checkout::text || '+07')::timestamptz);
  end if;

  if v_scheduled_checkin is not null then
    v_late_minutes := greatest(0, floor(extract(epoch from (v_now - v_scheduled_checkin)) / 60))::integer;
    if v_late_minutes > coalesce(v_shift.grace_minutes, 0) then
      v_status_main := 'terlambat';
    end if;
  end if;

  if found then
    update public.hr_attendance_daily_records
    set shift_id = coalesce(v_shift_id, shift_id),
        location_id = coalesce(v_location_id, location_id),
        scheduled_checkin = coalesce(v_scheduled_checkin, scheduled_checkin),
        scheduled_checkout = coalesce(v_scheduled_checkout, scheduled_checkout),
        actual_checkin = v_now,
        status_main = v_status_main,
        late_minutes = v_late_minutes,
        attendance_source = coalesce(nullif(p_source, ''), 'manual'),
        server_checkin_at = v_now
    where id = v_existing.id
    returning * into v_result;
  else
    insert into public.hr_attendance_daily_records (
      employee_id,
      attendance_date,
      shift_id,
      location_id,
      scheduled_checkin,
      scheduled_checkout,
      actual_checkin,
      status_main,
      late_minutes,
      attendance_source,
      server_checkin_at
    )
    values (
      p_employee_id,
      v_work_date,
      v_shift_id,
      v_location_id,
      v_scheduled_checkin,
      v_scheduled_checkout,
      v_now,
      v_status_main,
      v_late_minutes,
      coalesce(nullif(p_source, ''), 'manual'),
      v_now
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

create or replace function public.hr_presensi_clock_in(
  p_employee_id bigint,
  p_source text default 'manual',
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy numeric default null
)
returns public.hr_attendance_daily_records
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_work_date date := public.hr_presensi_server_work_date();
  v_existing public.hr_attendance_daily_records%rowtype;
  v_assignment record;
  v_shift record;
  v_existing_found boolean := false;
  v_shift_id uuid;
  v_location_id uuid;
  v_scheduled_checkin timestamptz;
  v_scheduled_checkout timestamptz;
  v_late_minutes integer := 0;
  v_status_main text := 'hadir';
  v_result public.hr_attendance_daily_records%rowtype;
  v_location_validation record;
begin
  select *
  into v_existing
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and attendance_date = v_work_date
  for update;

  v_existing_found := found;

  if v_existing_found and v_existing.actual_checkin is not null then
    raise exception 'Check-in hari ini sudah tercatat.';
  end if;

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
    and sa.effective_start_date <= v_work_date
    and (sa.effective_end_date is null or sa.effective_end_date >= v_work_date)
  order by sa.effective_start_date desc, sa.created_at desc
  limit 1;

  v_shift_id := coalesce(v_assignment.shift_id, v_assignment.default_shift_id);
  v_location_id := coalesce(v_assignment.location_id, v_assignment.default_location_id);

  if v_shift_id is not null then
    select
      scheduled_checkin,
      scheduled_checkout,
      cross_day,
      grace_minutes
    into v_shift
    from public.hr_attendance_shifts
    where id = v_shift_id
      and is_active = true
      and effective_start_date <= v_work_date
      and (effective_end_date is null or effective_end_date >= v_work_date)
    limit 1;
  end if;

  select *
  into v_location_validation
  from public.hr_presensi_validate_location(
    p_employee_id,
    v_work_date,
    p_latitude,
    p_longitude,
    p_accuracy
  );

  if v_location_validation.location_status = 'akurasi_lemah' then
    raise exception 'Akurasi GPS terlalu lemah untuk check-in. Dekatkan perangkat ke titik kantor dan coba lagi.';
  end if;

  if v_location_validation.location_status = 'di_luar_area' then
    raise exception 'Posisi Anda berada di luar radius kantor aktif.';
  end if;

  v_location_id := coalesce(v_location_validation.location_id, v_location_id);

  if v_shift.scheduled_checkin is not null then
    v_scheduled_checkin := ((v_work_date::text || ' ' || v_shift.scheduled_checkin::text || '+07')::timestamptz);
  end if;

  if v_shift.scheduled_checkout is not null then
    v_scheduled_checkout := (((v_work_date + case when coalesce(v_shift.cross_day, false) or v_shift.scheduled_checkout <= v_shift.scheduled_checkin then 1 else 0 end)::text || ' ' || v_shift.scheduled_checkout::text || '+07')::timestamptz);
  end if;

  if v_scheduled_checkin is not null then
    v_late_minutes := greatest(0, floor(extract(epoch from (v_now - v_scheduled_checkin)) / 60))::integer;
    if v_late_minutes > coalesce(v_shift.grace_minutes, 0) then
      v_status_main := 'terlambat';
    end if;
  end if;

  if v_existing_found then
    update public.hr_attendance_daily_records
    set shift_id = coalesce(v_shift_id, shift_id),
        location_id = coalesce(v_location_validation.location_id, v_location_id, location_id),
        scheduled_checkin = coalesce(v_scheduled_checkin, scheduled_checkin),
        scheduled_checkout = coalesce(v_scheduled_checkout, scheduled_checkout),
        actual_checkin = v_now,
        status_main = v_status_main,
        late_minutes = v_late_minutes,
        attendance_source = coalesce(nullif(p_source, ''), 'manual'),
        server_checkin_at = v_now,
        checkin_latitude = p_latitude,
        checkin_longitude = p_longitude,
        checkin_accuracy_meters = p_accuracy,
        checkin_distance_meters = v_location_validation.distance_meters,
        checkin_location_status = v_location_validation.location_status
    where id = v_existing.id
    returning * into v_result;
  else
    insert into public.hr_attendance_daily_records (
      employee_id,
      attendance_date,
      shift_id,
      location_id,
      scheduled_checkin,
      scheduled_checkout,
      actual_checkin,
      status_main,
      late_minutes,
      attendance_source,
      server_checkin_at,
      checkin_latitude,
      checkin_longitude,
      checkin_accuracy_meters,
      checkin_distance_meters,
      checkin_location_status
    )
    values (
      p_employee_id,
      v_work_date,
      v_shift_id,
      coalesce(v_location_validation.location_id, v_location_id),
      v_scheduled_checkin,
      v_scheduled_checkout,
      v_now,
      v_status_main,
      v_late_minutes,
      coalesce(nullif(p_source, ''), 'manual'),
      v_now,
      p_latitude,
      p_longitude,
      p_accuracy,
      v_location_validation.distance_meters,
      v_location_validation.location_status
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;
