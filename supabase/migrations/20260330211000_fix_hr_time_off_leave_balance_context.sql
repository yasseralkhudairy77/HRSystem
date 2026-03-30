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

  select coalesce(sum(r.deducted_leave_days), 0)
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
