create table if not exists public.hr_overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  attendance_record_id uuid references public.hr_attendance_daily_records(id) on delete set null,
  overtime_date date not null,
  proposed_start_at timestamptz not null,
  proposed_end_at timestamptz not null,
  proposed_hours numeric(6,2) not null,
  approved_start_at timestamptz,
  approved_end_at timestamptz,
  approved_hours numeric(6,2),
  reason text not null,
  additional_note text,
  status text not null default 'diajukan',
  reviewer_employee_id bigint references public.employees(id) on delete set null,
  reviewer_role text not null default 'atasan',
  reviewer_note text,
  fallback_to_hr boolean not null default false,
  fallback_reason text,
  is_submitted_on_time boolean not null default false,
  reference_number text not null,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  payroll_ready_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    status in (
      'diajukan',
      'menunggu_persetujuan_atasan',
      'perlu_klarifikasi',
      'disetujui',
      'ditolak',
      'siap_ke_payroll'
    )
  ),
  check (reviewer_role in ('atasan', 'hr')),
  check (proposed_end_at > proposed_start_at),
  check (proposed_hours > 0),
  check (approved_end_at is null or approved_start_at is not null),
  check (approved_hours is null or approved_hours >= 0),
  check (approved_end_at is null or approved_end_at > approved_start_at)
);

create index if not exists hr_overtime_requests_employee_date_idx
  on public.hr_overtime_requests (employee_id, overtime_date desc, submitted_at desc);

create index if not exists hr_overtime_requests_status_idx
  on public.hr_overtime_requests (status, reviewer_employee_id, submitted_at desc);

create unique index if not exists hr_overtime_requests_reference_idx
  on public.hr_overtime_requests (reference_number);

drop trigger if exists trg_hr_overtime_requests_updated_at on public.hr_overtime_requests;
create trigger trg_hr_overtime_requests_updated_at
before update on public.hr_overtime_requests
for each row execute function public.set_hr_presensi_updated_at();

create table if not exists public.hr_overtime_request_logs (
  id uuid primary key default gen_random_uuid(),
  overtime_request_id uuid not null references public.hr_overtime_requests(id) on delete cascade,
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
      'create_overtime',
      'fallback_reviewer',
      'request_clarification',
      'reject_overtime',
      'approve_overtime',
      'apply_approved_hours'
    )
  )
);

create index if not exists hr_overtime_request_logs_request_idx
  on public.hr_overtime_request_logs (overtime_request_id, created_at desc);

drop trigger if exists trg_hr_overtime_request_logs_updated_at on public.hr_overtime_request_logs;
create trigger trg_hr_overtime_request_logs_updated_at
before update on public.hr_overtime_request_logs
for each row execute function public.set_hr_presensi_updated_at();

create or replace function public.hr_presensi_calculate_overtime_hours(
  p_start_at timestamptz,
  p_end_at timestamptz
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_hours numeric;
begin
  if p_start_at is null or p_end_at is null then
    return null;
  end if;

  if p_end_at <= p_start_at then
    raise exception 'Jam selesai lembur harus lebih besar dari jam mulai.';
  end if;

  v_hours := round((extract(epoch from (p_end_at - p_start_at)) / 3600.0)::numeric, 2);

  if v_hours <= 0 then
    raise exception 'Total jam lembur harus lebih besar dari nol.';
  end if;

  return v_hours;
end;
$$;

create or replace function public.hr_presensi_generate_overtime_reference(
  p_overtime_date date
)
returns text
language sql
volatile
as $$
  select 'OVT-' || to_char(coalesce(p_overtime_date, public.hr_presensi_server_work_date()), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create or replace function public.hr_presensi_insert_overtime_log(
  p_overtime_request_id uuid,
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
  insert into public.hr_overtime_request_logs (
    overtime_request_id,
    action_type,
    actor_employee_id,
    actor_role,
    note,
    before_payload,
    after_payload
  )
  values (
    p_overtime_request_id,
    p_action_type,
    p_actor_employee_id,
    coalesce(nullif(p_actor_role, ''), 'system'),
    p_note,
    coalesce(p_before_payload, '{}'::jsonb),
    coalesce(p_after_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.hr_presensi_validate_overtime_context(
  p_employee_id bigint,
  p_overtime_date date
)
returns void
language plpgsql
as $$
declare
  v_record record;
begin
  select id, status_main
  into v_record
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and attendance_date = p_overtime_date
  order by created_at desc
  limit 1;

  if found and coalesce(v_record.status_main, 'hadir') not in ('hadir', 'terlambat') then
    raise exception 'Status utama harian tidak mendukung pengajuan lembur untuk tanggal tersebut.';
  end if;
end;
$$;

create or replace function public.hr_presensi_resolve_overtime_reviewer(
  p_requester_employee_id bigint,
  p_requires_fallback boolean
)
returns table (
  reviewer_employee_id bigint,
  reviewer_role text,
  request_status text,
  fallback_to_hr boolean,
  fallback_reason text
)
language plpgsql
as $$
declare
  v_supervisor_id bigint;
  v_hr_id bigint;
begin
  if p_requires_fallback then
    v_hr_id := public.hr_presensi_find_hr_reviewer();
    if v_hr_id is null then
      raise exception 'Reviewer HR aktif belum tersedia untuk memonitor pengajuan lembur ini.';
    end if;

    return query
    select
      v_hr_id,
      'hr',
      'diajukan',
      true,
      'Pengajuan lembur melewati batas H+1 sehingga diarahkan ke monitor HR.';
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
    'diajukan',
    true,
    'Data atasan langsung tidak ditemukan atau tidak aktif, sehingga pengajuan lembur diarahkan ke monitor HR.';
end;
$$;

create or replace function public.hr_presensi_submit_overtime_request(
  p_employee_id bigint,
  p_overtime_date date,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_reason text,
  p_additional_note text default null
)
returns public.hr_overtime_requests
language plpgsql
as $$
declare
  v_work_date date := public.hr_presensi_server_work_date();
  v_is_on_time boolean;
  v_existing public.hr_overtime_requests%rowtype;
  v_attendance public.hr_attendance_daily_records%rowtype;
  v_reviewer record;
  v_result public.hr_overtime_requests%rowtype;
  v_reference text;
  v_proposed_hours numeric(6,2);
begin
  if p_overtime_date is null then
    raise exception 'Tanggal lembur wajib diisi.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Alasan lembur wajib diisi.';
  end if;

  if p_start_at is null or p_end_at is null then
    raise exception 'Jam mulai dan jam selesai lembur wajib diisi.';
  end if;

  if (timezone('Asia/Jakarta', p_start_at))::date <> p_overtime_date then
    raise exception 'Jam mulai lembur harus berada pada tanggal lembur yang diajukan.';
  end if;

  if (timezone('Asia/Jakarta', p_end_at))::date <> p_overtime_date then
    raise exception 'Jam selesai lembur harus berada pada tanggal lembur yang diajukan.';
  end if;

  if p_overtime_date > (v_work_date + 1) then
    raise exception 'Pengajuan lembur hanya dapat dibuat maksimal H-1 dari tanggal lembur.';
  end if;

  v_proposed_hours := public.hr_presensi_calculate_overtime_hours(p_start_at, p_end_at);
  v_is_on_time := p_overtime_date >= (v_work_date - 1);

  perform public.hr_presensi_validate_overtime_context(p_employee_id, p_overtime_date);

  select *
  into v_existing
  from public.hr_overtime_requests
  where employee_id = p_employee_id
    and overtime_date = p_overtime_date
    and status in ('diajukan', 'menunggu_persetujuan_atasan', 'perlu_klarifikasi')
  order by created_at desc
  limit 1
  for update;

  if found then
    raise exception 'Masih ada pengajuan lembur aktif untuk tanggal tersebut.';
  end if;

  select *
  into v_attendance
  from public.hr_attendance_daily_records
  where employee_id = p_employee_id
    and attendance_date = p_overtime_date
  order by created_at desc
  limit 1;

  select *
  into v_reviewer
  from public.hr_presensi_resolve_overtime_reviewer(p_employee_id, not v_is_on_time);

  loop
    v_reference := public.hr_presensi_generate_overtime_reference(p_overtime_date);
    exit when not exists (
      select 1 from public.hr_overtime_requests where reference_number = v_reference
    );
  end loop;

  insert into public.hr_overtime_requests (
    employee_id,
    attendance_record_id,
    overtime_date,
    proposed_start_at,
    proposed_end_at,
    proposed_hours,
    reason,
    additional_note,
    status,
    reviewer_employee_id,
    reviewer_role,
    fallback_to_hr,
    fallback_reason,
    is_submitted_on_time,
    reference_number,
    submitted_at
  )
  values (
    p_employee_id,
    v_attendance.id,
    p_overtime_date,
    p_start_at,
    p_end_at,
    v_proposed_hours,
    trim(p_reason),
    nullif(trim(coalesce(p_additional_note, '')), ''),
    v_reviewer.request_status,
    v_reviewer.reviewer_employee_id,
    v_reviewer.reviewer_role,
    v_reviewer.fallback_to_hr,
    v_reviewer.fallback_reason,
    v_is_on_time,
    v_reference,
    timezone('utc', now())
  )
  returning * into v_result;

  perform public.hr_presensi_insert_overtime_log(
    v_result.id,
    'create_overtime',
    p_employee_id,
    'karyawan',
    trim(p_reason),
    case when v_attendance.id is null then '{}'::jsonb else to_jsonb(v_attendance) end,
    to_jsonb(v_result)
  );

  if v_reviewer.fallback_to_hr then
    perform public.hr_presensi_insert_overtime_log(
      v_result.id,
      'fallback_reviewer',
      p_employee_id,
      'system',
      v_reviewer.fallback_reason,
      '{}'::jsonb,
      jsonb_build_object(
        'reviewer_employee_id', v_reviewer.reviewer_employee_id,
        'reviewer_role', v_reviewer.reviewer_role,
        'status', v_reviewer.request_status
      )
    );
  end if;

  return v_result;
end;
$$;

create or replace function public.hr_presensi_request_overtime_clarification(
  p_overtime_request_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_overtime_requests
language plpgsql
as $$
declare
  v_request public.hr_overtime_requests%rowtype;
  v_result public.hr_overtime_requests%rowtype;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Catatan klarifikasi lembur wajib diisi.';
  end if;

  select *
  into v_request
  from public.hr_overtime_requests
  where id = p_overtime_request_id
  for update;

  if not found then
    raise exception 'Pengajuan lembur tidak ditemukan.';
  end if;

  if v_request.reviewer_role <> 'atasan' or v_request.reviewer_employee_id <> p_actor_employee_id then
    raise exception 'Hanya atasan reviewer yang dapat meminta klarifikasi pengajuan lembur.';
  end if;

  update public.hr_overtime_requests
  set status = 'perlu_klarifikasi',
      reviewer_note = trim(p_note)
  where id = p_overtime_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_overtime_log(
    p_overtime_request_id,
    'request_clarification',
    p_actor_employee_id,
    'atasan',
    trim(p_note),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_reject_overtime_request(
  p_overtime_request_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_overtime_requests
language plpgsql
as $$
declare
  v_request public.hr_overtime_requests%rowtype;
  v_result public.hr_overtime_requests%rowtype;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Alasan penolakan lembur wajib diisi.';
  end if;

  select *
  into v_request
  from public.hr_overtime_requests
  where id = p_overtime_request_id
  for update;

  if not found then
    raise exception 'Pengajuan lembur tidak ditemukan.';
  end if;

  if v_request.reviewer_role <> 'atasan' or v_request.reviewer_employee_id <> p_actor_employee_id then
    raise exception 'Hanya atasan reviewer yang dapat menolak pengajuan lembur.';
  end if;

  update public.hr_overtime_requests
  set status = 'ditolak',
      reviewer_note = trim(p_note),
      decided_at = timezone('utc', now())
  where id = p_overtime_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_overtime_log(
    p_overtime_request_id,
    'reject_overtime',
    p_actor_employee_id,
    'atasan',
    trim(p_note),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_approve_overtime_request(
  p_overtime_request_id uuid,
  p_actor_employee_id bigint,
  p_approved_start_at timestamptz,
  p_approved_end_at timestamptz,
  p_note text default null
)
returns public.hr_overtime_requests
language plpgsql
as $$
declare
  v_request public.hr_overtime_requests%rowtype;
  v_result public.hr_overtime_requests%rowtype;
  v_approved_hours numeric(6,2);
begin
  if p_approved_start_at is null or p_approved_end_at is null then
    raise exception 'Jam lembur disetujui wajib diisi lengkap oleh atasan.';
  end if;

  select *
  into v_request
  from public.hr_overtime_requests
  where id = p_overtime_request_id
  for update;

  if not found then
    raise exception 'Pengajuan lembur tidak ditemukan.';
  end if;

  if v_request.reviewer_role <> 'atasan' or v_request.reviewer_employee_id <> p_actor_employee_id then
    raise exception 'Hanya atasan reviewer yang dapat menyetujui pengajuan lembur.';
  end if;

  if (timezone('Asia/Jakarta', p_approved_start_at))::date <> v_request.overtime_date then
    raise exception 'Jam mulai lembur disetujui harus berada pada tanggal lembur yang sama.';
  end if;

  if (timezone('Asia/Jakarta', p_approved_end_at))::date <> v_request.overtime_date then
    raise exception 'Jam selesai lembur disetujui harus berada pada tanggal lembur yang sama.';
  end if;

  v_approved_hours := public.hr_presensi_calculate_overtime_hours(p_approved_start_at, p_approved_end_at);

  update public.hr_overtime_requests
  set status = 'disetujui',
      approved_start_at = p_approved_start_at,
      approved_end_at = p_approved_end_at,
      approved_hours = v_approved_hours,
      reviewer_note = nullif(trim(coalesce(p_note, '')), ''),
      decided_at = timezone('utc', now())
  where id = p_overtime_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_overtime_log(
    p_overtime_request_id,
    'approve_overtime',
    p_actor_employee_id,
    'atasan',
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Lembur disetujui oleh atasan.'),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  update public.hr_overtime_requests
  set status = 'siap_ke_payroll',
      payroll_ready_at = timezone('utc', now())
  where id = p_overtime_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_overtime_log(
    p_overtime_request_id,
    'apply_approved_hours',
    p_actor_employee_id,
    'atasan',
    'Jam lembur disetujui ditandai siap ke payroll.',
    jsonb_build_object(
      'status', 'disetujui',
      'approved_start_at', p_approved_start_at,
      'approved_end_at', p_approved_end_at,
      'approved_hours', v_approved_hours
    ),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;
