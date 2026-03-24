import { cn } from "@/lib/utils";

const syncClasses = {
  Imported: "border-sky-200 bg-sky-50 text-sky-700",
  Synced: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-rose-200 bg-rose-50 text-rose-700",
  Duplicate: "border-amber-200 bg-amber-50 text-amber-700",
  Pending: "border-slate-200 bg-slate-100 text-slate-700",
  Processed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Previewed: "border-sky-200 bg-sky-50 text-sky-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Running: "border-sky-200 bg-sky-50 text-sky-700",
  Queued: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function SyncStatusBadge({ value, className }) {
  const label = String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", syncClasses[label] || "border-slate-200 bg-slate-100 text-slate-700", className)}>{label}</span>;
}
