create table if not exists public.hr_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  schedule_group_id uuid references public.hr_attendance_schedule_groups(id) on delete set null,
  shift_id uuid references public.hr_attendance_shifts(id) on delete set null,
  location_id uuid references public.hr_attendance_locations(id) on delete set null,
  notes text,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (schedule_group_id is not null or shift_id is not null),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create table if not exists public.hr_attendance_method_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id bigint not null references public.employees(id) on delete restrict,
  attendance_method_id uuid not null references public.hr_attendance_methods(id) on delete restrict,
  location_id uuid references public.hr_attendance_locations(id) on delete set null,
  assignment_scope text not null default 'employee',
  notes text,
  is_active boolean not null default true,
  effective_start_date date not null,
  effective_end_date date,
  created_by_employee_id bigint references public.employees(id) on delete set null,
  updated_by_employee_id bigint references public.employees(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_end_date is null or effective_end_date >= effective_start_date)
);

create index if not exists hr_shift_assignments_employee_idx
  on public.hr_shift_assignments (employee_id, is_active, effective_start_date desc);

create index if not exists hr_method_assignments_employee_idx
  on public.hr_attendance_method_assignments (employee_id, is_active, effective_start_date desc);

drop trigger if exists trg_hr_shift_assignments_updated_at on public.hr_shift_assignments;
create trigger trg_hr_shift_assignments_updated_at
before update on public.hr_shift_assignments
for each row
execute function public.set_hr_presensi_updated_at();

drop trigger if exists trg_hr_attendance_method_assignments_updated_at on public.hr_attendance_method_assignments;
create trigger trg_hr_attendance_method_assignments_updated_at
before update on public.hr_attendance_method_assignments
for each row
execute function public.set_hr_presensi_updated_at();
