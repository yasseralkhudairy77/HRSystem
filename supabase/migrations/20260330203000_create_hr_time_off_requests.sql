create table if not exists public.hr_time_off_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  request_domain text not null,
  leave_policy_id uuid references public.hr_leave_balance_policies(id) on delete set null,
  special_leave_type_id uuid references public.hr_special_leave_types(id) on delete set null,
  permission_type_id uuid references public.hr_permission_types(id) on delete set null,
  start_date date not null,
  end_date date not null,
  is_half_day boolean not null default false,
  half_day_slot text,
  requested_days numeric(6,2) not null,
  approved_days numeric(6,2),
  deducted_leave_days numeric(6,2) not null default 0,
  reason text not null,
  additional_note text,
  attachment_required boolean not null default false,
  attachment_note text,
  has_digital_document boolean not null default false,
  requires_physical_document boolean not null default false,
  physical_document_received_at timestamptz,
  status text not null default 'diajukan',
  reviewer_employee_id bigint references public.employees(id) on delete set null,
  reviewer_role text not null default 'atasan',
  reviewer_note text,
  hr_reviewer_employee_id bigint references public.employees(id) on delete set null,
  hr_note text,
  fallback_to_hr boolean not null default false,
  fallback_reason text,
  reference_number text not null,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (request_domain in ('cuti_reguler', 'cuti_khusus', 'izin', 'sakit')),
  check (
    status in (
      'diajukan',
      'menunggu_persetujuan_atasan',
      'perlu_klarifikasi',
      'disetujui',
      'ditolak',
      'menunggu_dokumen_fisik',
      'dokumen_fisik_diterima_hr',
      'perlu_verifikasi_hr'
    )
  ),
  check (reviewer_role in ('atasan', 'hr')),
  check (end_date >= start_date),
  check (requested_days > 0),
  check (approved_days is null or approved_days >= 0),
  check (deducted_leave_days >= 0),
  check (half_day_slot is null or half_day_slot in ('pagi', 'siang')),
  check ((is_half_day = false and half_day_slot is null) or (is_half_day = true and half_day_slot is not null)),
  check (
    (request_domain = 'cuti_reguler' and leave_policy_id is not null and special_leave_type_id is null and permission_type_id is null)
    or (request_domain = 'cuti_khusus' and special_leave_type_id is not null and leave_policy_id is null)
    or (request_domain in ('izin', 'sakit') and permission_type_id is not null and leave_policy_id is null)
  )
);

create index if not exists hr_time_off_requests_employee_date_idx
  on public.hr_time_off_requests (employee_id, start_date desc, submitted_at desc);

create index if not exists hr_time_off_requests_status_idx
  on public.hr_time_off_requests (status, reviewer_employee_id, hr_reviewer_employee_id, submitted_at desc);

create unique index if not exists hr_time_off_requests_reference_idx
  on public.hr_time_off_requests (reference_number);

drop trigger if exists trg_hr_time_off_requests_updated_at on public.hr_time_off_requests;
create trigger trg_hr_time_off_requests_updated_at
before update on public.hr_time_off_requests
for each row execute function public.set_hr_presensi_updated_at();

create table if not exists public.hr_time_off_request_logs (
  id uuid primary key default gen_random_uuid(),
  time_off_request_id uuid not null references public.hr_time_off_requests(id) on delete cascade,
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
      'create_request',
      'fallback_reviewer',
      'request_clarification',
      'reject_request',
      'approve_request',
      'receive_physical_document',
      'verify_sick_document',
      'apply_status'
    )
  )
);

create index if not exists hr_time_off_request_logs_request_idx
  on public.hr_time_off_request_logs (time_off_request_id, created_at desc);

drop trigger if exists trg_hr_time_off_request_logs_updated_at on public.hr_time_off_request_logs;
create trigger trg_hr_time_off_request_logs_updated_at
before update on public.hr_time_off_request_logs
for each row execute function public.set_hr_presensi_updated_at();

create or replace function public.hr_presensi_generate_time_off_reference(
  p_start_date date
)
returns text
language sql
volatile
as $$
  select 'REQ-' || to_char(coalesce(p_start_date, public.hr_presensi_server_work_date()), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create or replace function public.hr_presensi_insert_time_off_log(
  p_time_off_request_id uuid,
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
  insert into public.hr_time_off_request_logs (
    time_off_request_id,
    action_type,
    actor_employee_id,
    actor_role,
    note,
    before_payload,
    after_payload
  )
  values (
    p_time_off_request_id,
    p_action_type,
    p_actor_employee_id,
    coalesce(nullif(p_actor_role, ''), 'system'),
    p_note,
    coalesce(p_before_payload, '{}'::jsonb),
    coalesce(p_after_payload, '{}'::jsonb)
  );
end;
$$;

create or replace function public.hr_presensi_calculate_time_off_days(
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean
)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_start_date is null or p_end_date is null then
    raise exception 'Tanggal mulai dan tanggal selesai pengajuan wajib diisi.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.';
  end if;

  if coalesce(p_is_half_day, false) then
    if p_start_date <> p_end_date then
      raise exception 'Pengajuan setengah hari hanya boleh untuk satu tanggal.';
    end if;

    return 0.5;
  end if;

  return (p_end_date - p_start_date + 1)::numeric;
end;
$$;

create or replace function public.hr_presensi_get_active_leave_policy(
  p_reference_date date
)
returns public.hr_leave_balance_policies
language plpgsql
as $$
declare
  v_policy public.hr_leave_balance_policies%rowtype;
begin
  select *
  into v_policy
  from public.hr_leave_balance_policies
  where is_active = true
    and effective_start_date <= p_reference_date
    and (effective_end_date is null or effective_end_date >= p_reference_date)
  order by effective_start_date desc, created_at desc
  limit 1;

  if not found then
    raise exception 'Kebijakan cuti aktif belum tersedia untuk tanggal pengajuan ini.';
  end if;

  return v_policy;
end;
$$;

create or replace function public.hr_presensi_get_leave_balance_context(
  p_employee_id bigint,
  p_reference_date date,
  p_exclude_request_id uuid default null
)
returns table (
  leave_policy_id uuid,
  policy_name text,
  annual_quota_days numeric,
  used_days numeric,
  available_days numeric
)
language plpgsql
as $$
declare
  v_policy public.hr_leave_balance_policies%rowtype;
  v_used_days numeric := 0;
begin
  v_policy := public.hr_presensi_get_active_leave_policy(p_reference_date);

  select coalesce(sum(deducted_leave_days), 0)
  into v_used_days
  from public.hr_time_off_requests r
  where r.employee_id = p_employee_id
    and r.request_domain = 'cuti_reguler'
    and r.status = 'disetujui'
    and r.leave_policy_id = v_policy.id
    and (p_exclude_request_id is null or r.id <> p_exclude_request_id);

  return query
  select
    v_policy.id,
    v_policy.name,
    v_policy.annual_quota_days,
    v_used_days,
    greatest(0, v_policy.annual_quota_days - v_used_days);
end;
$$;

create or replace function public.hr_presensi_validate_time_off_conflicts(
  p_employee_id bigint,
  p_request_domain text,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean,
  p_exclude_request_id uuid default null
)
returns void
language plpgsql
as $$
declare
  v_day date;
begin
  if exists (
    select 1
    from public.hr_time_off_requests r
    where r.employee_id = p_employee_id
      and (p_exclude_request_id is null or r.id <> p_exclude_request_id)
      and r.status <> 'ditolak'
      and daterange(r.start_date, r.end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then
    raise exception 'Sudah ada pengajuan aktif atau final pada tanggal yang bentrok.';
  end if;

  if coalesce(p_is_half_day, false) = false then
    for v_day in select generate_series(p_start_date, p_end_date, interval '1 day')::date
    loop
      if exists (
        select 1
        from public.hr_attendance_daily_records a
        where a.employee_id = p_employee_id
          and a.attendance_date = v_day
          and (a.actual_checkin is not null or a.actual_checkout is not null)
      ) then
        raise exception 'Tanggal % sudah memiliki data hadir final sehingga pengajuan penuh tidak dapat diproses.', v_day;
      end if;

      if p_request_domain in ('cuti_reguler', 'cuti_khusus', 'izin', 'sakit')
         and exists (
           select 1
           from public.hr_overtime_requests o
           where o.employee_id = p_employee_id
             and o.overtime_date = v_day
             and o.status <> 'ditolak'
         ) then
        raise exception 'Tanggal % bentrok dengan data lembur aktif/final.', v_day;
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public.hr_presensi_resolve_time_off_reviewer(
  p_requester_employee_id bigint
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
    'Data atasan langsung tidak ditemukan atau tidak aktif, sehingga pengajuan diarahkan ke monitor HR.';
end;
$$;

create or replace function public.hr_presensi_submit_time_off_request(
  p_employee_id bigint,
  p_request_domain text,
  p_start_date date,
  p_end_date date,
  p_is_half_day boolean default false,
  p_half_day_slot text default null,
  p_special_leave_type_id uuid default null,
  p_permission_type_id uuid default null,
  p_reason text default null,
  p_additional_note text default null,
  p_attachment_note text default null,
  p_has_digital_document boolean default false
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_requested_days numeric(6,2);
  v_leave_policy public.hr_leave_balance_policies%rowtype;
  v_special_leave public.hr_special_leave_types%rowtype;
  v_permission public.hr_permission_types%rowtype;
  v_reviewer record;
  v_reference text;
  v_result public.hr_time_off_requests%rowtype;
begin
  if p_request_domain not in ('cuti_reguler', 'cuti_khusus', 'izin', 'sakit') then
    raise exception 'Domain pengajuan tidak dikenal.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Alasan pengajuan wajib diisi.';
  end if;

  if coalesce(p_is_half_day, false) and coalesce(nullif(p_half_day_slot, ''), '') not in ('pagi', 'siang') then
    raise exception 'Slot setengah hari wajib dipilih pagi atau siang.';
  end if;

  v_requested_days := public.hr_presensi_calculate_time_off_days(p_start_date, p_end_date, p_is_half_day);

  perform public.hr_presensi_validate_time_off_conflicts(
    p_employee_id,
    p_request_domain,
    p_start_date,
    p_end_date,
    p_is_half_day,
    null
  );

  if p_request_domain = 'cuti_reguler' then
    v_leave_policy := public.hr_presensi_get_active_leave_policy(p_start_date);

    if (select available_days from public.hr_presensi_get_leave_balance_context(p_employee_id, p_start_date, null) limit 1) < v_requested_days then
      raise exception 'Saldo cuti reguler tidak mencukupi untuk pengajuan ini.';
    end if;
  end if;

  if p_request_domain = 'cuti_khusus' then
    if p_special_leave_type_id is null then
      raise exception 'Jenis cuti khusus wajib dipilih.';
    end if;

    select *
    into v_special_leave
    from public.hr_special_leave_types
    where id = p_special_leave_type_id
      and is_active = true
      and effective_start_date <= p_start_date
      and (effective_end_date is null or effective_end_date >= p_start_date)
    limit 1;

    if not found then
      raise exception 'Jenis cuti khusus aktif tidak ditemukan.';
    end if;

    if v_special_leave.requires_attachment and coalesce(nullif(trim(coalesce(p_attachment_note, '')), ''), '') = '' then
      raise exception 'Jenis cuti khusus ini membutuhkan catatan lampiran sampai upload file nyata tersedia.';
    end if;
  end if;

  if p_request_domain in ('izin', 'sakit') then
    if p_permission_type_id is null then
      raise exception 'Jenis pengajuan wajib dipilih.';
    end if;

    select *
    into v_permission
    from public.hr_permission_types
    where id = p_permission_type_id
      and is_active = true
      and effective_start_date <= p_start_date
      and (effective_end_date is null or effective_end_date >= p_start_date)
    limit 1;

    if not found then
      raise exception 'Jenis izin/sakit aktif tidak ditemukan.';
    end if;

    if p_request_domain = 'izin' and lower(coalesce(v_permission.category, '')) <> 'izin' then
      raise exception 'Jenis yang dipilih bukan kategori izin.';
    end if;

    if p_request_domain = 'sakit' and lower(coalesce(v_permission.category, '')) <> 'sakit' then
      raise exception 'Jenis yang dipilih bukan kategori sakit.';
    end if;

    if v_permission.requires_attachment and coalesce(nullif(trim(coalesce(p_attachment_note, '')), ''), '') = '' and coalesce(p_has_digital_document, false) = false then
      raise exception 'Pengajuan ini membutuhkan catatan lampiran atau penanda dokumen digital.';
    end if;
  end if;

  select *
  into v_reviewer
  from public.hr_presensi_resolve_time_off_reviewer(p_employee_id);

  loop
    v_reference := public.hr_presensi_generate_time_off_reference(p_start_date);
    exit when not exists (select 1 from public.hr_time_off_requests where reference_number = v_reference);
  end loop;

  insert into public.hr_time_off_requests (
    employee_id,
    request_domain,
    leave_policy_id,
    special_leave_type_id,
    permission_type_id,
    start_date,
    end_date,
    is_half_day,
    half_day_slot,
    requested_days,
    reason,
    additional_note,
    attachment_required,
    attachment_note,
    has_digital_document,
    requires_physical_document,
    status,
    reviewer_employee_id,
    reviewer_role,
    hr_reviewer_employee_id,
    fallback_to_hr,
    fallback_reason,
    reference_number,
    submitted_at
  )
  values (
    p_employee_id,
    p_request_domain,
    case when p_request_domain = 'cuti_reguler' then v_leave_policy.id else null end,
    p_special_leave_type_id,
    p_permission_type_id,
    p_start_date,
    p_end_date,
    coalesce(p_is_half_day, false),
    case when coalesce(p_is_half_day, false) then p_half_day_slot else null end,
    v_requested_days,
    trim(p_reason),
    nullif(trim(coalesce(p_additional_note, '')), ''),
    case
      when p_request_domain = 'cuti_khusus' then coalesce(v_special_leave.requires_attachment, false)
      when p_request_domain in ('izin', 'sakit') then coalesce(v_permission.requires_attachment, false)
      else false
    end,
    nullif(trim(coalesce(p_attachment_note, '')), ''),
    coalesce(p_has_digital_document, false),
    case when p_request_domain = 'sakit' then true else false end,
    v_reviewer.request_status,
    v_reviewer.reviewer_employee_id,
    v_reviewer.reviewer_role,
    public.hr_presensi_find_hr_reviewer(),
    v_reviewer.fallback_to_hr,
    v_reviewer.fallback_reason,
    v_reference,
    timezone('utc', now())
  )
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    v_result.id,
    'create_request',
    p_employee_id,
    'karyawan',
    trim(p_reason),
    '{}'::jsonb,
    to_jsonb(v_result)
  );

  if v_reviewer.fallback_to_hr then
    perform public.hr_presensi_insert_time_off_log(
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

create or replace function public.hr_presensi_request_time_off_clarification(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
  v_actor_role text;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Catatan klarifikasi wajib diisi.';
  end if;

  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if v_request.reviewer_role = 'atasan' then
    if v_request.reviewer_employee_id <> p_actor_employee_id then
      raise exception 'Hanya atasan reviewer yang dapat meminta klarifikasi pengajuan ini.';
    end if;
    v_actor_role := 'atasan';
  elsif v_request.reviewer_role = 'hr' then
    if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
      raise exception 'Hanya HR reviewer yang dapat meminta klarifikasi pengajuan fallback ini.';
    end if;
    v_actor_role := 'hr';
  else
    raise exception 'Reviewer pengajuan ini tidak valid.';
  end if;

  update public.hr_time_off_requests
  set status = 'perlu_klarifikasi',
      reviewer_note = trim(p_note)
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'request_clarification',
    p_actor_employee_id,
    v_actor_role,
    trim(p_note),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_reject_time_off_request(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
  v_actor_role text;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if v_request.reviewer_role = 'atasan' then
    if v_request.reviewer_employee_id <> p_actor_employee_id then
      raise exception 'Hanya atasan reviewer yang dapat menolak pengajuan ini.';
    end if;
    v_actor_role := 'atasan';
  elsif v_request.reviewer_role = 'hr' then
    if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
      raise exception 'Hanya HR reviewer yang dapat menolak pengajuan fallback ini.';
    end if;
    v_actor_role := 'hr';
  else
    raise exception 'Reviewer pengajuan ini tidak valid.';
  end if;

  update public.hr_time_off_requests
  set status = 'ditolak',
      reviewer_note = trim(p_note),
      decided_at = timezone('utc', now())
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'reject_request',
    p_actor_employee_id,
    v_actor_role,
    trim(p_note),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_approve_time_off_request(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text default null
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
  v_balance record;
  v_final_status text;
  v_actor_role text;
begin
  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if v_request.reviewer_role = 'atasan' then
    if v_request.reviewer_employee_id <> p_actor_employee_id then
      raise exception 'Hanya atasan reviewer yang dapat menyetujui pengajuan ini.';
    end if;
    v_actor_role := 'atasan';
  elsif v_request.reviewer_role = 'hr' then
    if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
      raise exception 'Hanya HR reviewer yang dapat menyetujui pengajuan fallback ini.';
    end if;
    v_actor_role := 'hr';
  else
    raise exception 'Reviewer pengajuan ini tidak valid.';
  end if;

  if v_request.request_domain = 'cuti_reguler' then
    select *
    into v_balance
    from public.hr_presensi_get_leave_balance_context(v_request.employee_id, v_request.start_date, v_request.id);

    if coalesce(v_balance.available_days, 0) < v_request.requested_days then
      raise exception 'Saldo cuti reguler tidak mencukupi saat approval final.';
    end if;
  end if;

  v_final_status := case
    when v_request.request_domain = 'sakit' and coalesce(v_request.requires_physical_document, false) then 'menunggu_dokumen_fisik'
    when v_request.request_domain = 'sakit' then 'perlu_verifikasi_hr'
    else 'disetujui'
  end;

  update public.hr_time_off_requests
  set status = v_final_status,
      approved_days = requested_days,
      deducted_leave_days = case when request_domain = 'cuti_reguler' then requested_days else 0 end,
      reviewer_note = case when v_actor_role = 'atasan' then nullif(trim(coalesce(p_note, '')), '') else reviewer_note end,
      hr_note = case when v_actor_role = 'hr' then nullif(trim(coalesce(p_note, '')), '') else hr_note end,
      decided_at = timezone('utc', now())
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'approve_request',
    p_actor_employee_id,
    v_actor_role,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Pengajuan disetujui oleh atasan.'),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'apply_status',
    p_actor_employee_id,
    v_actor_role,
    'Status final pengajuan diterapkan setelah approval atasan.',
    jsonb_build_object('status', v_request.status),
    jsonb_build_object('status', v_result.status, 'deducted_leave_days', v_result.deducted_leave_days)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_receive_sick_physical_document(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text default null
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
begin
  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan sakit tidak ditemukan.';
  end if;

  if v_request.request_domain <> 'sakit' then
    raise exception 'Aksi ini hanya berlaku untuk pengajuan sakit.';
  end if;

  if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
    raise exception 'Hanya HR yang dapat menandai dokumen fisik sakit.';
  end if;

  update public.hr_time_off_requests
  set status = 'dokumen_fisik_diterima_hr',
      physical_document_received_at = timezone('utc', now()),
      hr_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'receive_physical_document',
    p_actor_employee_id,
    'hr',
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Dokumen fisik sakit diterima oleh HR.'),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_mark_sick_needs_verification(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
begin
  if p_note is null or trim(p_note) = '' then
    raise exception 'Catatan verifikasi HR wajib diisi.';
  end if;

  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan sakit tidak ditemukan.';
  end if;

  if v_request.request_domain <> 'sakit' then
    raise exception 'Aksi ini hanya berlaku untuk pengajuan sakit.';
  end if;

  if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
    raise exception 'Hanya HR yang dapat memverifikasi pengajuan sakit.';
  end if;

  update public.hr_time_off_requests
  set status = 'perlu_verifikasi_hr',
      hr_note = trim(p_note)
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'verify_sick_document',
    p_actor_employee_id,
    'hr',
    trim(p_note),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;

create or replace function public.hr_presensi_finalize_sick_administration(
  p_time_off_request_id uuid,
  p_actor_employee_id bigint,
  p_note text default null
)
returns public.hr_time_off_requests
language plpgsql
as $$
declare
  v_request public.hr_time_off_requests%rowtype;
  v_result public.hr_time_off_requests%rowtype;
begin
  select *
  into v_request
  from public.hr_time_off_requests
  where id = p_time_off_request_id
  for update;

  if not found then
    raise exception 'Pengajuan sakit tidak ditemukan.';
  end if;

  if v_request.request_domain <> 'sakit' then
    raise exception 'Aksi ini hanya berlaku untuk pengajuan sakit.';
  end if;

  if v_request.hr_reviewer_employee_id <> p_actor_employee_id and not public.hr_presensi_is_hr_employee(p_actor_employee_id) then
    raise exception 'Hanya HR yang dapat menyelesaikan administrasi sakit.';
  end if;

  update public.hr_time_off_requests
  set status = 'disetujui',
      hr_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), hr_note)
  where id = p_time_off_request_id
  returning * into v_result;

  perform public.hr_presensi_insert_time_off_log(
    p_time_off_request_id,
    'apply_status',
    p_actor_employee_id,
    'hr',
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Administrasi sakit selesai dan status final diterapkan.'),
    to_jsonb(v_request),
    to_jsonb(v_result)
  );

  return v_result;
end;
$$;
