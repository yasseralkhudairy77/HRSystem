import { Clock3, MoonStar } from "lucide-react";

import { cn } from "@/lib/utils";

export default function ShiftColorBadge({ label, time, color, crossDay = false, className }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 shadow-sm", className)}>
      <span className="h-3.5 w-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: color || "#CBD5E1" }} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text-main)]">{label}</div>
        {time ? <div className="text-xs text-[var(--text-muted)]">{time}</div> : null}
      </div>
      {crossDay ? <MoonStar className="h-3.5 w-3.5 text-[var(--text-soft)]" /> : <Clock3 className="h-3.5 w-3.5 text-[var(--text-soft)]" />}
    </div>
  );
}
