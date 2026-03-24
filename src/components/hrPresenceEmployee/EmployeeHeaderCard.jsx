import { BriefcaseBusiness, MapPin } from "lucide-react";

export default function EmployeeHeaderCard({ employee, branchName, departmentName }) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_45%,#14532d_100%)] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.26)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Employee Self Service</div>
          <div className="mt-2 text-xl font-semibold">{employee?.employee_name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/75">
            <span className="inline-flex items-center gap-1">
              <BriefcaseBusiness className="h-4 w-4" />
              {employee?.job_title}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {departmentName}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/12 px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">Cabang</div>
          <div className="mt-1 text-sm font-medium">{branchName}</div>
        </div>
      </div>
    </div>
  );
}
