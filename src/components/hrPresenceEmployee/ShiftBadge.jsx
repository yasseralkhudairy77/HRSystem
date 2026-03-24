import { MoonStar } from "lucide-react";

import { cn } from "@/lib/utils";

export default function ShiftBadge({ shift, className }) {
  if (!shift) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500", className)}>
        Tidak ada shift
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: shift.color_hex }} />
          <span className="text-sm font-semibold text-slate-900">{shift.shift_name}</span>
        </div>
        {shift.cross_day ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            <MoonStar className="h-3 w-3" />
            Lintas hari
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {shift.checkin_time} - {shift.checkout_time}
      </div>
    </div>
  );
}
