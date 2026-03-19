create table if not exists public.approval_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_rule_steps (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.approval_rule_sets(id) on delete cascade,
  step_order integer not null,
  approver_source text not null,
  approver_role text,
  approver_job_level text,
  custom_employee_id bigint references public.employees(id) on delete set null,
  fallback_source text,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  reference_id text,
  requester_employee_id bigint not null references public.employees(id) on delete restrict,
  current_step integer not null default 1,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_request_steps (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  step_order integer not null,
  approver_employee_id bigint references public.employees(id) on delete set null,
  approver_label text,
  status text not null default 'pending',
  acted_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_delegations (
  id uuid primary key default gen_random_uuid(),
  from_employee_id bigint not null references public.employees(id) on delete cascade,
  to_employee_id bigint not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_rule_steps_rule_set_idx
  on public.approval_rule_steps (rule_set_id, step_order);

create index if not exists approval_requests_requester_idx
  on public.approval_requests (requester_employee_id, status);

create index if not exists approval_request_steps_request_idx
  on public.approval_request_steps (approval_request_id, step_order);

create index if not exists approval_delegations_from_idx
  on public.approval_delegations (from_employee_id, is_active, start_date, end_date);

insert into public.approval_rule_sets (code, name, description, is_active)
values
  ('leave_request', 'Pengajuan Cuti', 'Approval cuti karyawan', true),
  ('permission_request', 'Izin / Sakit', 'Approval izin dan sakit karyawan', true),
  ('warning_letter', 'Surat Peringatan', 'Approval surat peringatan', true),
  ('promotion_request', 'Promosi Jabatan', 'Approval promosi karyawan', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

delete from public.approval_rule_steps
where rule_set_id in (
  select id
  from public.approval_rule_sets
  where code in ('leave_request', 'permission_request', 'warning_letter', 'promotion_request')
);

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 1, 'direct_supervisor', 'department_head', true
from public.approval_rule_sets
where code = 'leave_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 2, 'hr_role', 'none', true
from public.approval_rule_sets
where code = 'leave_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 1, 'direct_supervisor', 'department_head', true
from public.approval_rule_sets
where code = 'permission_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 2, 'hr_role', 'none', true
from public.approval_rule_sets
where code = 'permission_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 1, 'direct_supervisor', 'department_head', true
from public.approval_rule_sets
where code = 'warning_letter';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 2, 'department_head', 'hr_role', true
from public.approval_rule_sets
where code = 'warning_letter';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 3, 'hr_role', 'director_role', true
from public.approval_rule_sets
where code = 'warning_letter';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 1, 'direct_supervisor', 'department_head', true
from public.approval_rule_sets
where code = 'promotion_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 2, 'department_head', 'hr_role', true
from public.approval_rule_sets
where code = 'promotion_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 3, 'hr_role', 'director_role', true
from public.approval_rule_sets
where code = 'promotion_request';

insert into public.approval_rule_steps (rule_set_id, step_order, approver_source, fallback_source, is_required)
select id, 4, 'director_role', 'none', true
from public.approval_rule_sets
where code = 'promotion_request';
