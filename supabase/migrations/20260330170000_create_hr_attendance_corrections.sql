create table if not exists public.hr_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  attendance_record_id uuid references public.hr_attendance_daily_records(id) on delete set null,
  attendance_date date not null,
  correction_type text not null,
  requested_checkin timestamptz,
  requested_checkout timestamptz,
  request_reason text not null,
  status text not null default 'diajukan',
  reviewer_employee_id bigint references public.employees(id) on delete set null,
  reviewer_role text not null default 'hr',
  reviewer_note text,
  fallback_to_hr boolean not null default false,
  fallback_reason text,
  is_submitted_on_time boolean not null default false,
  protects_from_alpha boolean not null default false,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  escalated_at timestamptz,
  applied_at timestamptz,
  applied_attendance_record_id uuid references public.hr_attendance_daily_records(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    correction_type in (
      'lupa_masuk',
      'lupa_pulang',
      'salah_jam',
      'kendala_lokasi_gps',
      'kendala_teknis_device',
      'lainnya'
    )
  ),
  check (
    status in (
      'diajukan',
      'menunggu_persetujuan_atasan',
      'perlu_klarifikasi',
      'disetujui',
      'ditolak',
      'eskalasi_ke_hr'
    )
  ),
  check (requested_checkin is not null or requested_checkout is not null),
  check (requested_checkout is null or requested_checkin is not null or attendance_record_id is not null)
);

create table if not exists public.hr_attendance_correction_logs (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.hr_attendance_corrections(id) on delete cascade,
  action_type text not null,
  actor_employee_id bigint references public.employees(id) on delete set null,
  actor_role text not null,
  note text,
  before_payload jsonb not null default '{}'::jsonb,
  after_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    action_type in (
      'create_correction',
      'fallback_reviewer',
      'request_clarification',
      'reject_correction',
      'escalate_to_hr',
      'approve_correction',
      'apply_correction'
    )
  )
);

create index if not exists hr_attendance_corrections_employee_date_idx
  on public.hr_attendance_corrections (employee_id, attendance_date desc, submitted_at desc);

create index if not exists hr_attendance_corrections_status_idx
  on public.hr_attendance_corrections (status, reviewer_employee_id, submitted_at desc);

create index if not exists hr_attendance_correction_logs_correction_idx
  on public.hr_attendance_correction_logs (correction_id, created_at desc);

drop trigger if exists trg_hr_attendance_corrections_updated_at on public.hr_attendance_corrections;
create trigger trg_hr_attendance_corrections_updated_at
before update on public.hr_attendance_corrections
for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_attendance_correction_logs_updated_at on public.hr_attendance_correction_logs;
create trigger trg_hr_attendance_correction_logs_updated_at
before update on public.hr_attendance_correction_logs
for each row execute function public.set_hr_presensi_updated_at();

create or replace function public.hr_presensi_is_active_employee(
  p_employee_id bigint
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.employees
    where id = p_employee_id
      and coalesce(lower(trim(org_status)), 'active') <> 'inactive'
      and lower(trim(coalesce(status_karyawan, 'aktif'))) in ('aktif', 'active', 'probation', 'kontrak', 'tetap', 'freelance', 'part time')
  );
$$;

create or replace function public.hr_presensi_is_hr_employee(
  p_employee_id bigint
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.employees
    where id = p_employee_id
      and public.hr_presensi_is_active_employee(id)
      and (
        lower(coalesce(departemen, '')) like '%hr%'
        or lower(coalesce(departemen, '')) like '%human resources%'
        or lower(coalesce(departemen, '')) like '%human capital%'
        or lower(coalesce(departemen, '')) like '%people%'
        or lower(coalesce(departemen, '')) like '%recruit%'
        or lower(coalesce(jabatan, '')) like '%hr%'
        or lower(coalesce(jabatan, '')) like '%human resources%'
        or lower(coalesce(jabatan, '')) like '%human capital%'
        or lower(coalesce(jabatan, '')) like '%people%'
        or lower(coalesce(jabatan, '')) like '%recruit%'
      )
  );
$$;

create or replace function public.hr_presensi_find_hr_reviewer()
returns bigint
language sql
stable
as $$
  select id
  from public.employees
  where public.hr_presensi_is_hr_employee(id)
  order by id
  limit 1;
$$;

create or replace function public.hr_presensi_insert_correction_log(
  p_correction_id uuid,
  p_action_type text,
  p_actor_employee_id bigint,
  p_actor_role text,
  p_note text default null,
  p_before_payload jsonb default '{}'::jsonb,
  p_after_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  insert into public.hr_attendance_correction_logs (
    correction_id,
    action_type,
    actor_employee_id,
    actor_role,
    note,
    before_payload,
    after_payload
  )
  values (
    p_correction_id,
    p_action_type,
    p_actor_employee_id,
    coalesce(nullif(p_actor_role, ''), 'system'),
    p_note,
    coalesce(p_before_payload, '{}'::jsonb),
    coalesce(p_after_payload, '{}'::jsonb)
  );
end;
$$;

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
  v_shift record;
  v_shift_id uuid;
  v_location_id uuid;
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
      and effective_start_date <= p_attendance_date
      and (effective_end_date is null or effective_end_date >= p_attendance_date)
    limit 1;
  end if;

  if v_shift.scheduled_checkin is not null then
    v_scheduled_checkin := ((p_attendance_date::text || ' ' || v_shift.scheduled_checkin::text || '+07')::timestamptz);
  end if;

  if v_shift.scheduled_checkout is not null then
    v_scheduled_checkout := (((p_attendance_date + case when coalesce(v_shift.cross_day, false) or v_shift.scheduled_checkout <= v_shift.scheduled_checkin then 1 else 0 end)::text || ' ' || v_shift.scheduled_checkout::text || '+07')::timestamptz);
  end if;

  return query
  select
    v_shift_id,
    v_location_id,
    v_scheduled_checkin,
    v_scheduled_checkout,
    coalesce(v_shift.grace_minutes, 0);
end;
$$;

create or replace function public.hr_presensi_resolve_correction_reviewer(
  p_requester_employee_id bigint,
  p_is_late boolean
)
returns table (
  reviewer_employee_id bigint,
  reviewer_role text,
  correction_status text,
  fallback_to_hr boolean,
  fallback_reason text
)
language plpgsql
as $$
declare
  v_supervisor_id bigint;
  v_hr_id bigint;
begin
  if p_is_late then
    v_hr_id := public.hr_presensi_find_hr_reviewer();
    if v_hr_id is null then
      raise exception 'Reviewer HR aktif belum tersedia untuk menangani koreksi absensi.';
    end if;

    return query
    select
      v_hr_id,
      'hr',
      'eskalasi_ke_hr',
      true,
      'Pengajuan koreksi melewati batas H+1 sehingga langsung diarahkan ke HR.';
    return;
  end if;

  select atasan_employee_id
  into v_supervisor_id
  from public.employees
  where id = p_requester_employee_id
  limit 1;

  if v_supervisor_id is not null and public.hr_presensi_is_active_employee(v_supervisor_id) then
    return query
    select
      v_supervisor_id,
      'atasan',
      'menunggu_persetujuan_atasan',
      false,
      null::text;
    return;
  end if;

  v_hr_id := public.hr_presensi_find_hr_reviewer();
  if v_hr_id is null then
    raise exception 'Atasan langsung tidak ditemukan dan reviewer HR aktif belum tersedia.';
  end if;

  return query
  select
    v_hr_id,
    'hr',
    'eskalasi_ke_hr',
    true,
    'Data atasan langsung tidak ditemukan atau tidak aktif, sehingga koreksi diarahkan ke HR.';
end;
$$;

create or replace function public.hr_presensi_apply_correction_to_attendance(
  p_correction_id uuid,
  p_actor_employee_id bigint,
  p_actor_role text
)
returns public.hr_attendance_daily_records
language plpgsql
as $$
declare
  v_correction public.hr_attendance_corrections%rowtype;
  v_attendance public.hr_attendance_daily_records%rowtype;
  v_existing_found boolean := false;
  v_context record;
  v_actual_checkin timestamptz;
  v_actual_checkout timestamptz;
  v_shift_id uuid;
  v_location_id uuid;
  v_scheduled_checkin timestamptz;
  v_scheduled_checkout timestamptz;
  v_grace_minutes integer := 0;
  v_late_minutes integer := 0;
  v_status_main text := 'hadir';
  v_result public.hr_attendance_daily_records%rowtype;
begin
  select *
  into v_correction
  from public.hr_attendance_corrections
  where id = p_correction_id
  for update;

  if not found then
    raise exception 'Pengajuan koreksi absensi tidak ditemukan.';
  end if;

  select *
  into v_attendance
  from public.hr_attendance_daily_records
  where employee_id = v_correction.employee_id
    and attendance_date = v_correction.attendance_date
  order by created_at desc
  limit 1
  for update;

  v_existing_found := found;

  if v_existing_found then
    v_shift_id := v_attendance.shift_id;
    v_location_id := v_attendance.location_id;
    v_scheduled_checkin := v_attendance.scheduled_checkin;
    v_scheduled_checkout := v_attendance.scheduled_checkout;
  end if;

  select *
  into v_context
  from public.hr_presensi_get_attendance_context(v_correction.employee_id, v_correction.attendance_date);

  v_shift_id := coalesce(v_shift_id, v_context.shift_id);
  v_location_id := coalesce(v_location_id, v_context.location_id);
  v_scheduled_checkin := coalesce(v_scheduled_checkin, v_context.scheduled_checkin);
  v_scheduled_checkout := coalesce(v_scheduled_checkout, v_context.scheduled_checkout);
  v_grace_minutes := coalesce(v_context.grace_minutes, 0);

  v_actual_checkin := coalesce(v_correction.requested_checkin, v_attendance.actual_checkin);
  v_actual_checkout := coalesce(v_correction.requested_checkout, v_attendance.actual_checkout);

  if v_actual_checkin is null then
    raise exception 'Koreksi tidak dapat diterapkan karena jam masuk hasil akhir masih kosong.';
  end if;

  if v_actual_checkout is not null and v_actual_checkout < v_actual_checkin then
    raise exception 'Jam pulang hasil koreksi tidak boleh lebih awal dari jam masuk.';
  end if;

  if v_scheduled_checkin is not null then
    v_late_minutes := greatest(0, floor(extract(epoch from (v_actual_checkin - v_scheduled_checkin)) / 60))::integer;
    if v_late_minutes > v_grace_minutes then
      v_status_main := 'terlambat';
    end if;
  end if;

  if v_existing_found then
    perform public.hr_presensi_insert_correction_log(
      v_correction.id,
      'apply_correction',
      p_actor_employee_id,
      p_actor_role,
      'Perubahan koreksi diterapkan ke record absensi yang sudah ada.',
      to_jsonb(v_attendance),
      '{}'::jsonb
    );

    update public.hr_attendance_daily_records
    set shift_id = coalesce(v_shift_id, shift_id),
        location_id = coalesce(v_location_id, location_id),
        scheduled_checkin = coalesce(v_scheduled_checkin, scheduled_checkin),
        scheduled_checkout = coalesce(v_scheduled_checkout, scheduled_checkout),
        actual_checkin = v_actual_checkin,
        actual_checkout = v_actual_checkout,
        status_main = v_status_main,
        late_minutes = v_late_minutes,
        attendance_source = 'correction',
        note = case
          when note is null or note = '' then 'Koreksi absensi diterapkan melalui workflow HR Presensi.'
          else note || E'\nKoreksi absensi diterapkan melalui workflow HR Presensi.'
        end
    where id = v_attendance.id
    returning * into v_result;
  else
    perform public.hr_presensi_insert_correction_log(
      v_correction.id,
      'apply_correction',
      p_actor_employee_id,
      p_actor_role,
      'Koreksi membuat record absensi baru karena data hari tersebut belum ada.',
      '{}'::jsonb,
      '{}'::jsonb
    );

    insert into public.hr_attendance_daily_records (
      employee_id,
      attendance_date,
      shift_id,
      location_id,
      scheduled_checkin,
      scheduled_checkout,
      actual_checkin,
      actual_checkout,
      status_main,
      late_minutes,
      attendance_source,
      note
    )
    values (
      v_correction.employee_id,
      v_correction.attendance_date,
      v_shift_id,
      v_location_id,
      v_scheduled_checkin,
      v_scheduled_checkout,
      v_actual_checkin,
      v_actual_checkout,
      v_status_main,
      v_late_minutes,
      'correction',
      'Record absensi dibuat melalui workflow koreksi HR Presensi.'
    )
    returning * into v_result;
  end if;

  update public.hr_attendance_correction_logs
  set after_payload = to_jsonb(v_result)
  where correction_id = v_correction.id
    and action_type = 'apply_correction'
    and created_at = (
      select max(created_at)
      from public.hr_attendance_correction_logs
      where correction_id = v_correction.id
        and action_type = 'apply_correction'
    );

  update public.hr_attendance_corrections
  set attendance_record_id = coalesce(attendance_record_id, v_result.id),
      applied_attendance_record_id = v_result.id,
      applied_at = timezone('utc', now())
  where id = v_correction.id;

  return v_result;
end;
$$;

create or replace function public.hr_presensi_submit_correction(
  p_employee_id bigint,
  p_attendance_date date,
  p_correction_type text,
  p_requested_checkin timestamptz default null,
  p_requested_checkout timestamptz default null,
  p_request_reason text default null
)
returns public.hr_attendance_corrections
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_work_date date := public.hr_presensi_server_work_date();
  v_is_on_time boolean;
  v_existing public.hr_attendance_corrections%rowtype;
  v_attendance public.hr_attendance_daily_records%rowtype;
  v_reviewer record;
  v_result public.hr_attendance_corrections%rowtype;
begin
  if p_attendance_date is null then
    raise exception 'Tanggal absensi yang dikoreksi wajib diisi.';
  end if;

  if p_request_reason is null or trim(p_request_reason) = '' then
    raise exception 'Alasan koreksi absensi wajib diisi.';
  end if;

  if p_attendance_date > v_work_date then
    raise exception 'Tanggal koreksi tidak boleh melebihi tanggal server hari ini.';
  end if;

  if p_requested_checkin is null and p_requested_checkout is null then
    raise exception 'Minimal satu jam usulan koreksi wajib diisi.';
  end if;

  if p_requested_checkin is not null and (timezone('Asia/Jakarta', p_requested_checkin))::date <> p_attendance_date then
    raise exception 'Jam masuk usulan harus berada pada tanggal absensi yang dikoreksi.';
  end if;

  if p_requested_checkout is not null and (timezone('Asia/Jakarta', p_requested_checkout))::date < p_attendance_date then
    raise exception 'Jam pulang usulan tidak valid untuk tanggal absensi yang dikoreksi.';
  end if;

  select *
  into v_existing
  from public.hr_attendance_corrections
  where employee_id = p_employee_id
    and attendance_date = p_attendance_date
    and status in ('diajukan', 'menunggu_persetujuan_atasan', 'perlu_klarifikasi', 'eskalasi_ke_hr')
  order by created_at desc
  limit 1
  for update;

  if found then
    raise exception 'Masih ada pengajuan koreksi aktif untuk tanggal tersebut.';
  end if;

  select *
  into v_attendance
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and attendance_date = p_attendance_date
  order by created_at desc
  limit 1;

  v_is_on_time := p_attendance_date >= (v_work_date - 1);

  select *
  into v_reviewer
  from public.hr_presensi_resolve_correction_reviewer(p_employee_id, not v_is_on_time);

  insert into public.hr_attendance_corrections (
    employee_id,
    attendance_record_id,
    attendance_date,
    correction_type,
    requested_checkin,
    requested_checkout,
    request_reason,
    status,
    reviewer_employee_id,
    reviewer_role,
    fallback_to_hr,
    fallback_reason,
    is_submitted_on_time,
    protects_from_alpha,
    submitted_at
  )
  values (
    p_employee_id,
    v_attendance.id,
    p_attendance_date,
    p_correction_type,
    p_requested_checkin,
    p_requested_checkout,
    trim(p_request_reason),
    v_reviewer.correction_status,
    v_reviewer.reviewer_employee_id,
    v_reviewer.reviewer_role,
    v_reviewer.fallback_to_hr,
    v_reviewer.fallback_reason,
    v_is_on_time,
    v_is_on_time,
    v_now
  )
  returning * into v_result;

  perform public.hr_presensi_insert_correction_log(
    v_result.id,
    'create_correction',
    p_employee_id,
    'karyawan',
    trim(p_request_reason),
    case when v_attendance.id is null then '{}'::jsonb else to_jsonb(v_attendance) end,
    to_jsonb(v_result)
  );

  if v_reviewer.fallback_to_hr then
    perform public.hr_presensi_insert_correction_log(
      v_result.id,
      'fallback_reviewer',
      p_employee_id,
      'system',
      v_reviewer.fallback_reason,
      '{}'::jsonb,
      jsonb_build_object(
        'reviewer_employee_id', v_reviewer.reviewer_employee_id,
        'reviewer_role', v_reviewer.reviewer_role,
        'status', v_reviewer.correction_status
      )
    );
  end if;

  return v_result;
end;
$$;

create or replace function public.hr_presensi_request_correction_clarification(
  p_correction_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_attendance_corrections
language plpgsql
as $$
declare
  v_correction public.hr_attendance_corrections%rowtype;
  v_is_hr boolean := public.hr_presensi_is_hr_employee(p_actor_employee_id);
  v_result public.hr_attendance_corrections%rowtype;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Catatan klarifikasi wajib diisi.';
  end if;

  select *
  into v_correction
  from public.hr_attendance_corrections
  where id = p_correction_id
  for update;

  if not found then
    raise exception 'Pengajuan koreksi absensi tidak ditemukan.';
  end if;

  if not (v_correction.reviewer_employee_id = p_actor_employee_id or v_is_hr) then
    raise exception 'Anda tidak berwenang meminta klarifikasi untuk pengajuan ini.';
  end if;

  update public.hr_attendance_corrections
  set status = 'perlu_klarifikasi',
      reviewer_note = trim(p_note)
  where id = p_correction_id
  returning * into v_result;

  perform public.hr_presensi_insert_correction_log(
    p_correction_id,
    'request_clarification',
    p_actor_employee_id,
    case when v_is_hr then 'hr' else v_correction.reviewer_role end,
    trim(p_note),
    to_jsonb(v_correction),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_reject_correction(
  p_correction_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_attendance_corrections
language plpgsql
as $$
declare
  v_correction public.hr_attendance_corrections%rowtype;
  v_is_hr boolean := public.hr_presensi_is_hr_employee(p_actor_employee_id);
  v_result public.hr_attendance_corrections%rowtype;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  select *
  into v_correction
  from public.hr_attendance_corrections
  where id = p_correction_id
  for update;

  if not found then
    raise exception 'Pengajuan koreksi absensi tidak ditemukan.';
  end if;

  if not (v_correction.reviewer_employee_id = p_actor_employee_id or v_is_hr) then
    raise exception 'Anda tidak berwenang menolak pengajuan ini.';
  end if;

  update public.hr_attendance_corrections
  set status = 'ditolak',
      reviewer_note = trim(p_note),
      decided_at = timezone('utc', now())
  where id = p_correction_id
  returning * into v_result;

  perform public.hr_presensi_insert_correction_log(
    p_correction_id,
    'reject_correction',
    p_actor_employee_id,
    case when v_is_hr then 'hr' else v_correction.reviewer_role end,
    trim(p_note),
    to_jsonb(v_correction),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_escalate_correction_to_hr(
  p_correction_id uuid,
  p_actor_employee_id bigint,
  p_note text default null
)
returns public.hr_attendance_corrections
language plpgsql
as $$
declare
  v_correction public.hr_attendance_corrections%rowtype;
  v_is_hr boolean := public.hr_presensi_is_hr_employee(p_actor_employee_id);
  v_hr_id bigint;
  v_result public.hr_attendance_corrections%rowtype;
  v_note text := coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Pengajuan koreksi dieskalasikan ke HR untuk review lanjutan.');
begin
  select *
  into v_correction
  from public.hr_attendance_corrections
  where id = p_correction_id
  for update;

  if not found then
    raise exception 'Pengajuan koreksi absensi tidak ditemukan.';
  end if;

  if not (v_correction.reviewer_employee_id = p_actor_employee_id or v_is_hr) then
    raise exception 'Anda tidak berwenang melakukan eskalasi ke HR.';
  end if;

  v_hr_id := public.hr_presensi_find_hr_reviewer();
  if v_hr_id is null then
    raise exception 'Reviewer HR aktif belum tersedia untuk menerima eskalasi.';
  end if;

  update public.hr_attendance_corrections
  set status = 'eskalasi_ke_hr',
      reviewer_employee_id = v_hr_id,
      reviewer_role = 'hr',
      reviewer_note = v_note,
      fallback_to_hr = true,
      fallback_reason = coalesce(fallback_reason, v_note),
      escalated_at = timezone('utc', now())
  where id = p_correction_id
  returning * into v_result;

  perform public.hr_presensi_insert_correction_log(
    p_correction_id,
    'escalate_to_hr',
    p_actor_employee_id,
    case when v_is_hr then 'hr' else v_correction.reviewer_role end,
    v_note,
    to_jsonb(v_correction),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_approve_correction(
  p_correction_id uuid,
  p_actor_employee_id bigint,
  p_note text default null
)
returns public.hr_attendance_corrections
language plpgsql
as $$
declare
  v_correction public.hr_attendance_corrections%rowtype;
  v_is_hr boolean := public.hr_presensi_is_hr_employee(p_actor_employee_id);
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_result public.hr_attendance_corrections%rowtype;
  v_attendance_result public.hr_attendance_daily_records%rowtype;
  v_actor_role text;
begin
  select *
  into v_correction
  from public.hr_attendance_corrections
  where id = p_correction_id
  for update;

  if not found then
    raise exception 'Pengajuan koreksi absensi tidak ditemukan.';
  end if;

  if not (v_correction.reviewer_employee_id = p_actor_employee_id or v_is_hr) then
    raise exception 'Anda tidak berwenang menyetujui pengajuan ini.';
  end if;

  v_actor_role := case when v_is_hr then 'hr' else v_correction.reviewer_role end;

  update public.hr_attendance_corrections
  set status = 'disetujui',
      reviewer_note = coalesce(v_note, reviewer_note),
      decided_at = timezone('utc', now())
  where id = p_correction_id
  returning * into v_result;

  perform public.hr_presensi_insert_correction_log(
    p_correction_id,
    'approve_correction',
    p_actor_employee_id,
    v_actor_role,
    coalesce(v_note, 'Koreksi absensi disetujui.'),
    to_jsonb(v_correction),
    to_jsonb(v_result)
  );

  select *
  into v_attendance_result
  from public.hr_presensi_apply_correction_to_attendance(
    p_correction_id,
    p_actor_employee_id,
    v_actor_role
  );

  update public.hr_attendance_corrections
  set applied_attendance_record_id = v_attendance_result.id,
      attendance_record_id = coalesce(attendance_record_id, v_attendance_result.id),
      applied_at = timezone('utc', now())
  where id = p_correction_id
  returning * into v_result;

  return v_result;
end;
$$;
