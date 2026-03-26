import { CheckCircle2, Clock3, MapPinned, ShieldAlert, ShieldCheck } from "lucide-react";

import EmployeeStatusBadge from "@/components/hrPresenceEmployee/EmployeeStatusBadge";
import ShiftBadge from "@/components/hrPresenceEmployee/ShiftBadge";

export default function TodayAttendanceCard({ nowLabel, dateLabel, todayState, settings }) {
  const stepToneMap = {
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    current: "border-sky-200 bg-sky-50 text-sky-700",
    upcoming: "border-slate-200 bg-slate-50 text-slate-500",
    blocked: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Hari ini</div>
          <div className="mt-2 text-[32px] font-semibold leading-none text-slate-900">{nowLabel}</div>
          <div className="mt-2 text-sm text-slate-500">{dateLabel}</div>
        </div>
        <EmployeeStatusBadge value={todayState.statusMain} label={todayState.statusLabel} className="mt-1" />
      </div>
      <div className="mt-4">
        <ShiftBadge shift={todayState.shift} />
      </div>
      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workflow presensi</div>
        <div className="mt-2 text-sm font-semibold text-slate-900">{todayState.nextActionLabel}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{todayState.verificationMessage}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {todayState.sourceOptions.map((source) => (
            <div key={source.key} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
              {source.label}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Check-in</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{todayState.shift?.checkin_time || "-"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Check-out</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{todayState.shift?.checkout_time || "-"}</div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {todayState.workflowSteps.map((step) => (
          <div key={step.key} className={`rounded-2xl border px-3 py-3 ${stepToneMap[step.status] || stepToneMap.upcoming}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : step.status === "blocked" ? <ShieldAlert className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em]">{step.label}</div>
                <div className="mt-1 text-xs leading-5 opacity-80">{step.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          Toleransi terlambat {settings.tolerance_late_minutes} menit
        </div>
        <div className="flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-slate-400" />
          Radius presensi {settings.attendance_radius_meter} meter
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          Selfie {settings.require_selfie ? "wajib" : "opsional"} dan lokasi {settings.require_location ? "aktif" : "tidak wajib"}
        </div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          {todayState.failedScanGuidance}
        </div>
      </div>
    </div>
  );
}
