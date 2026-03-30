create or replace function public.set_hr_presensi_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.hr_attendance_locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  address text,
  timezone text not null default 'Asia/Jakarta',
  attendance_radius_meters integer not null default 100,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_attendance_shifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  scheduled_checkin time not null,
  scheduled_checkout time not null,
  break_start time,
  break_end time,
  grace_minutes integer not null default 0,
  cross_day boolean not null default false,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_attendance_schedule_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  default_location_id uuid references public.hr_attendance_locations(id) on delete set null,
  default_shift_id uuid references public.hr_attendance_shifts(id) on delete set null,
  work_pattern jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_attendance_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  method_type text not null,
  description text,
  requires_location_validation boolean not null default false,
  requires_biometric_verification boolean not null default false,
  fallback_method_code text,
  is_primary_method boolean not null default false,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_leave_balance_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  annual_quota_days numeric(6,2) not null default 0,
  carry_forward_days numeric(6,2) not null default 0,
  reset_month integer not null default 1,
  reset_day integer not null default 1,
  is_prorated boolean not null default true,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_special_leave_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  default_days numeric(6,2) not null default 0,
  requires_attachment boolean not null default false,
  deducts_leave_balance boolean not null default false,
  approval_flow_code text,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_permission_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  description text,
  requires_attachment boolean not null default false,
  requires_approval boolean not null default true,
  affects_payroll boolean not null default false,
  default_approval_rule_code text,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_payroll_period_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  cutoff_start_day integer not null,
  cutoff_end_day integer not null,
  lock_days_before_payroll integer not null default 0,
  includes_approved_overtime boolean not null default true,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cutoff_start_day between 1 and 31),
  check (cutoff_end_day between 1 and 31),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_setting_change_logs (
  id uuid primary key default gen_random_uuid(),
  module_code text not null default 'hr_presensi',
  domain_name text not null,
  record_id text,
  action_type text not null,
  change_summary text not null,
  before_payload jsonb not null default '{}'::jsonb,
  after_payload jsonb not null default '{}'::jsonb,
  effective_start_date date,
  effective_end_date date,
  changed_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_start_date is null or effective_end_date >= effective_start_date)
);

create index if not exists hr_attendance_locations_active_idx on public.hr_attendance_locations (is_active, effective_start_date desc);
create index if not exists hr_attendance_shifts_active_idx on public.hr_attendance_shifts (is_active, effective_start_date desc);
create index if not exists hr_attendance_schedule_groups_active_idx on public.hr_attendance_schedule_groups (is_active, effective_start_date desc);
create index if not exists hr_attendance_methods_active_idx on public.hr_attendance_methods (is_active, effective_start_date desc);
create index if not exists hr_leave_balance_policies_active_idx on public.hr_leave_balance_policies (is_active, effective_start_date desc);
create index if not exists hr_special_leave_types_active_idx on public.hr_special_leave_types (is_active, effective_start_date desc);
create index if not exists hr_permission_types_active_idx on public.hr_permission_types (is_active, effective_start_date desc);
create index if not exists hr_payroll_period_policies_active_idx on public.hr_payroll_period_policies (is_active, effective_start_date desc);
create index if not exists hr_setting_change_logs_domain_idx on public.hr_setting_change_logs (domain_name, created_at desc);

drop trigger if exists trg_hr_attendance_locations_updated_at on public.hr_attendance_locations;
create trigger trg_hr_attendance_locations_updated_at before update on public.hr_attendance_locations for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_attendance_shifts_updated_at on public.hr_attendance_shifts;
create trigger trg_hr_attendance_shifts_updated_at before update on public.hr_attendance_shifts for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_attendance_schedule_groups_updated_at on public.hr_attendance_schedule_groups;
create trigger trg_hr_attendance_schedule_groups_updated_at before update on public.hr_attendance_schedule_groups for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_attendance_methods_updated_at on public.hr_attendance_methods;
create trigger trg_hr_attendance_methods_updated_at before update on public.hr_attendance_methods for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_leave_balance_policies_updated_at on public.hr_leave_balance_policies;
create trigger trg_hr_leave_balance_policies_updated_at before update on public.hr_leave_balance_policies for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_special_leave_types_updated_at on public.hr_special_leave_types;
create trigger trg_hr_special_leave_types_updated_at before update on public.hr_special_leave_types for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_permission_types_updated_at on public.hr_permission_types;
create trigger trg_hr_permission_types_updated_at before update on public.hr_permission_types for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_payroll_period_policies_updated_at on public.hr_payroll_period_policies;
create trigger trg_hr_payroll_period_policies_updated_at before update on public.hr_payroll_period_policies for each row execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_setting_change_logs_updated_at on public.hr_setting_change_logs;
create trigger trg_hr_setting_change_logs_updated_at before update on public.hr_setting_change_logs for each row execute function public.set_hr_presensi_updated_at();
