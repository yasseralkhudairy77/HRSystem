import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

const toneClasses = {
  slate: "from-slate-900/95 to-slate-800/95 text-white",
  emerald: "from-emerald-700 to-teal-600 text-white",
  amber: "from-amber-500 to-orange-500 text-white",
  sky: "from-sky-700 to-cyan-600 text-white",
  rose: "from-rose-600 to-rose-500 text-white",
  violet: "from-violet-700 to-fuchsia-600 text-white",
};

export default function PresenceSummaryCard({ label, value, note, tone = "slate", secondary }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className={cn("bg-gradient-to-br p-5", toneClasses[tone] || toneClasses.slate)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">{label}</div>
            <div className="text-3xl font-semibold tracking-[-0.04em]">{value}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-2.5">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 text-sm leading-6 text-white/78">{note}</div>
      </div>
      {secondary ? <div className="border-t border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-3 text-xs font-medium text-[var(--text-muted)]">{secondary}</div> : null}
    </div>
  );
}
