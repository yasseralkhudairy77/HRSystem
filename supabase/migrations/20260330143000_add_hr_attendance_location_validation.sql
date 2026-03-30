alter table public.hr_attendance_locations
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

alter table public.hr_attendance_locations
  drop constraint if exists hr_attendance_locations_latitude_check;

alter table public.hr_attendance_locations
  add constraint hr_attendance_locations_latitude_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.hr_attendance_locations
  drop constraint if exists hr_attendance_locations_longitude_check;

alter table public.hr_attendance_locations
  add constraint hr_attendance_locations_longitude_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.hr_attendance_daily_records
  add column if not exists checkin_latitude numeric(10,7),
  add column if not exists checkin_longitude numeric(10,7),
  add column if not exists checkin_accuracy_meters numeric(8,2),
  add column if not exists checkin_distance_meters numeric(10,2),
  add column if not exists checkin_location_status text,
  add column if not exists checkout_latitude numeric(10,7),
  add column if not exists checkout_longitude numeric(10,7),
  add column if not exists checkout_accuracy_meters numeric(8,2),
  add column if not exists checkout_distance_meters numeric(10,2),
  add column if not exists checkout_location_status text;

alter table public.hr_attendance_daily_records
  drop constraint if exists hr_attendance_daily_records_checkin_location_status_check;

alter table public.hr_attendance_daily_records
  add constraint hr_attendance_daily_records_checkin_location_status_check
  check (checkin_location_status is null or checkin_location_status in ('dalam_area', 'di_luar_area', 'akurasi_lemah'));

alter table public.hr_attendance_daily_records
  drop constraint if exists hr_attendance_daily_records_checkout_location_status_check;

alter table public.hr_attendance_daily_records
  add constraint hr_attendance_daily_records_checkout_location_status_check
  check (checkout_location_status is null or checkout_location_status in ('dalam_area', 'di_luar_area', 'akurasi_lemah'));

create or replace function public.hr_presensi_distance_meters(
  p_latitude_1 numeric,
  p_longitude_1 numeric,
  p_latitude_2 numeric,
  p_longitude_2 numeric
)
returns numeric
language sql
immutable
as $$
  select round(
    (
      6371000 * 2 * asin(
        sqrt(
          power(sin(radians(((p_latitude_2 - p_latitude_1) / 2)::double precision)), 2)
          + cos(radians(p_latitude_1::double precision))
          * cos(radians(p_latitude_2::double precision))
          * power(sin(radians(((p_longitude_2 - p_longitude_1) / 2)::double precision)), 2)
        )
      )
    )::numeric,
    2
  );
$$;

create or replace function public.hr_presensi_validate_location(
  p_employee_id bigint,
  p_work_date date,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy numeric
)
returns table (
  location_id uuid,
  location_name text,
  attendance_radius_meters integer,
  distance_meters numeric,
  location_status text
)
language plpgsql
as $$
declare
  v_assignment record;
  v_location record;
  v_location_id uuid;
  v_distance_meters numeric;
  v_status text;
begin
  if p_latitude is null or p_longitude is null then
    raise exception 'Lokasi transaksi belum tersedia. Izinkan akses GPS terlebih dulu.';
  end if;

  if p_accuracy is null or p_accuracy <= 0 then
    raise exception 'Akurasi GPS belum valid untuk transaksi absensi.';
  end if;

  select
    sa.location_id,
    sg.default_location_id
  into v_assignment
  from public.hr_shift_assignments sa
  left join public.hr_attendance_schedule_groups sg on sg.id = sa.schedule_group_id
  where sa.employee_id = p_employee_id
    and sa.is_active = true
    and sa.effective_start_date <= p_work_date
    and (sa.effective_end_date is null or sa.effective_end_date >= p_work_date)
  order by sa.effective_start_date desc, sa.created_at desc
  limit 1;

  v_location_id := coalesce(v_assignment.location_id, v_assignment.default_location_id);

  if v_location_id is null then
    raise exception 'Lokasi kantor aktif untuk karyawan ini belum diatur.';
  end if;

  select
    id,
    name,
    attendance_radius_meters,
    latitude,
    longitude
  into v_location
  from public.hr_attendance_locations
  where id = v_location_id
    and is_active = true
    and effective_start_date <= p_work_date
    and (effective_end_date is null or effective_end_date >= p_work_date)
  limit 1;

  if v_location.id is null then
    raise exception 'Lokasi kantor aktif tidak ditemukan untuk validasi absensi.';
  end if;

  if v_location.latitude is null or v_location.longitude is null then
    raise exception 'Titik koordinat lokasi kantor belum lengkap.';
  end if;

  v_distance_meters := public.hr_presensi_distance_meters(
    p_latitude,
    p_longitude,
    v_location.latitude,
    v_location.longitude
  );

  if p_accuracy > v_location.attendance_radius_meters then
    v_status := 'akurasi_lemah';
  elsif v_distance_meters > v_location.attendance_radius_meters then
    v_status := 'di_luar_area';
  else
    v_status := 'dalam_area';
  end if;

  return query
  select
    v_location.id,
    v_location.name,
    v_location.attendance_radius_meters,
    v_distance_meters,
    v_status;
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
  v_work_date date := timezone('Asia/Jakarta', timezone('utc', now()))::date;
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
        location_id = coalesce(v_location_id, location_id),
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
      v_location_id,
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

create or replace function public.hr_presensi_clock_out(
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
  v_existing public.hr_attendance_daily_records%rowtype;
  v_result public.hr_attendance_daily_records%rowtype;
  v_location_validation record;
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

  select *
  into v_location_validation
  from public.hr_presensi_validate_location(
    p_employee_id,
    v_existing.attendance_date,
    p_latitude,
    p_longitude,
    p_accuracy
  );

  if v_location_validation.location_status = 'akurasi_lemah' then
    raise exception 'Akurasi GPS terlalu lemah untuk check-out. Dekatkan perangkat ke titik kantor dan coba lagi.';
  end if;

  if v_location_validation.location_status = 'di_luar_area' then
    raise exception 'Posisi Anda berada di luar radius kantor aktif.';
  end if;

  update public.hr_attendance_daily_records
  set actual_checkout = v_now,
      attendance_source = coalesce(nullif(p_source, ''), attendance_source),
      server_checkout_at = v_now,
      checkout_latitude = p_latitude,
      checkout_longitude = p_longitude,
      checkout_accuracy_meters = p_accuracy,
      checkout_distance_meters = v_location_validation.distance_meters,
      checkout_location_status = v_location_validation.location_status
  where id = v_existing.id
  returning * into v_result;

  return v_result;
end;
$$;
