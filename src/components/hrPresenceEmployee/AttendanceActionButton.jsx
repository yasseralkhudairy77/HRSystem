import { cn } from "@/lib/utils";

export default function AttendanceActionButton({ icon: Icon, label, subtitle, tone = "primary", disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[84px] w-full items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition",
        tone === "primary"
          ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.28)]"
          : "border-slate-200 bg-white text-slate-800 shadow-sm",
        disabled && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 shadow-none",
      )}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", tone === "primary" && !disabled ? "bg-white/15" : "bg-slate-100")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{label}</div>
        {subtitle ? <div className={cn("mt-1 text-xs", tone === "primary" && !disabled ? "text-white/80" : "text-slate-500")}>{subtitle}</div> : null}
      </div>
    </button>
  );
}
