create table if not exists public.hr_attendance_daily_records (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  attendance_date date not null,
  shift_id uuid references public.hr_attendance_shifts(id) on delete set null,
  location_id uuid references public.hr_attendance_locations(id) on delete set null,
  scheduled_checkin timestamptz,
  scheduled_checkout timestamptz,
  actual_checkin timestamptz,
  actual_checkout timestamptz,
  status_main text not null default 'hadir',
  late_minutes integer not null default 0,
  attendance_source text not null default 'manual',
  server_checkin_at timestamptz,
  server_checkout_at timestamptz,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, attendance_date),
  check (status_main in ('hadir', 'terlambat')),
  check (actual_checkout is null or actual_checkin is not null)
);

create index if not exists hr_attendance_daily_records_employee_date_idx
  on public.hr_attendance_daily_records (employee_id, attendance_date desc);

create index if not exists hr_attendance_daily_records_date_idx
  on public.hr_attendance_daily_records (attendance_date desc);

drop trigger if exists trg_hr_attendance_daily_records_updated_at on public.hr_attendance_daily_records;
create trigger trg_hr_attendance_daily_records_updated_at
before update on public.hr_attendance_daily_records
for each row execute function public.set_hr_presensi_updated_at();

create or replace function public.hr_presensi_server_now()
returns timestamptz
language sql
volatile
as $$
  select timezone('utc', now());
$$;

create or replace function public.hr_presensi_server_work_date()
returns date
language sql
volatile
as $$
  select timezone('Asia/Jakarta', timezone('utc', now()))::date;
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
  v_work_date date := timezone('Asia/Jakarta', timezone('utc', now()))::date;
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

create or replace function public.hr_presensi_clock_out(
  p_employee_id bigint,
  p_source text default 'manual'
)
returns public.hr_attendance_daily_records
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_existing public.hr_attendance_daily_records%rowtype;
  v_result public.hr_attendance_daily_records%rowtype;
begin
  select *
  into v_existing
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and actual_checkin is not null
    and actual_checkout is null
  order by actual_checkin desc
  limit 1
  for update;

  if not found then
    raise exception 'Belum ada check-in aktif untuk diakhiri.';
  end if;

  update public.hr_attendance_daily_records
  set actual_checkout = v_now,
      attendance_source = coalesce(nullif(p_source, ''), attendance_source),
      server_checkout_at = v_now
  where id = v_existing.id
  returning * into v_result;

  return v_result;
end;
$$;
