import { CalendarDays } from "lucide-react";

import ShiftBadge from "@/components/hrPresenceEmployee/ShiftBadge";
import { cn } from "@/lib/utils";

export default function ScheduleListCard({ item, isToday, label }) {
  return (
    <div className={cn("rounded-[24px] border p-4 shadow-sm", isToday ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {label}
          </div>
          <div className="mt-1 text-xs text-slate-500">{isToday ? "Jadwal hari ini" : "Jadwal terencana"}</div>
        </div>
        {isToday ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Hari ini</span> : null}
      </div>
      <div className="mt-3">
        <ShiftBadge shift={item.shift} />
      </div>
      {item.note ? <div className="mt-3 text-xs leading-5 text-slate-500">{item.note}</div> : null}
    </div>
  );
}
