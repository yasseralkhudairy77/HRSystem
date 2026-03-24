const tones = {
  late_penalty_candidate: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  alpha_deduction_candidate: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  unpaid_leave_candidate: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  overtime_payment_candidate: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  attendance_allowance_candidate: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  no_checkout_review: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  no_checkin_review: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  early_leave_review: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  holiday_work_candidate: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};

export default function AttendanceImpactBadge({ value }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[value] || "bg-slate-100 text-slate-700"}`}>{value.replaceAll("_", " ")}</span>;
}
