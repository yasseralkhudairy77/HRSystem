import { Clock3 } from "lucide-react";

import EmployeeStatusBadge from "@/components/hrPresenceEmployee/EmployeeStatusBadge";
import ShiftBadge from "@/components/hrPresenceEmployee/ShiftBadge";

export default function AttendanceHistoryCard({ item, shift, dateLabel, onCorrection }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{dateLabel}</div>
          <div className="mt-1 text-xs text-slate-500">Sumber: {String(item.source).replaceAll("_", " ")}</div>
        </div>
        <EmployeeStatusBadge value={item.status_main} />
      </div>
      <div className="mt-3">
        <ShiftBadge shift={shift} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Masuk</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{item.actual_checkin ? new Date(item.actual_checkin).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</div>
          <div className="mt-1 text-xs text-slate-500">Jadwal {shift?.checkin_time || "-"}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Pulang</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">{item.actual_checkout ? new Date(item.actual_checkout).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</div>
          <div className="mt-1 text-xs text-slate-500">Jadwal {shift?.checkout_time || "-"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          Terlambat {item.late_minutes || 0} menit - Lembur {item.overtime_minutes || 0} menit
        </div>
        {["alpha", "tidak_absen_masuk", "tidak_absen_pulang", "pulang_cepat", "terlambat"].includes(item.status_main) ? (
          <button type="button" onClick={onCorrection} className="font-semibold text-emerald-700">
            Ajukan koreksi
          </button>
        ) : null}
      </div>
    </div>
  );
}
