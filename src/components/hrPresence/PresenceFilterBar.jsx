import { CalendarRange, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PresenceFilterField({ icon: Icon = Search, label, value, wide = false }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2.5 shadow-sm", wide ? "md:col-span-2" : "")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</div>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-[var(--text-main)]">
        <Icon className="h-4 w-4 text-[var(--text-soft)]" />
        <span>{value}</span>
      </div>
    </div>
  );
}

export default function PresenceFilterBar({ filters = [], rightActions, className }) {
  return (
    <div className={cn("rounded-[28px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] p-4 shadow-sm lg:p-5", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {filters.map((filter) => (
            <PresenceFilterField
              key={filter.label}
              icon={filter.type === "date" ? CalendarRange : filter.type === "advanced" ? SlidersHorizontal : Search}
              label={filter.label}
              value={filter.placeholder}
              wide={filter.wide}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="outline" className="rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          {rightActions}
        </div>
      </div>
    </div>
  );
}
