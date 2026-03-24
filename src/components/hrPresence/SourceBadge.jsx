import { cn } from "@/lib/utils";

const sourceClasses = {
  Fingerprint: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Mobile: "border-sky-200 bg-sky-50 text-sky-700",
  Manual: "border-slate-200 bg-slate-100 text-slate-700",
  "Face Recognition": "border-violet-200 bg-violet-50 text-violet-700",
};

export default function SourceBadge({ value, className }) {
  const label = String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", sourceClasses[label] || "border-slate-200 bg-slate-100 text-slate-700", className)}>{label}</span>;
}
