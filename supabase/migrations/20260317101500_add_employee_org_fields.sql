alter table public.employees
  add column if not exists atasan_employee_id bigint references public.employees(id) on delete set null,
  add column if not exists job_level text,
  add column if not exists org_status text not null default 'active';

create index if not exists employees_atasan_employee_id_idx
  on public.employees (atasan_employee_id);

create index if not exists employees_org_status_idx
  on public.employees (org_status);
