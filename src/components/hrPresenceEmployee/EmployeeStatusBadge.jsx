import { cn } from "@/lib/utils";

const toneMap = {
  hadir: "border-emerald-200 bg-emerald-50 text-emerald-700",
  terlambat: "border-amber-200 bg-amber-50 text-amber-700",
  alpha: "border-rose-200 bg-rose-50 text-rose-700",
  izin: "border-sky-200 bg-sky-50 text-sky-700",
  sakit: "border-violet-200 bg-violet-50 text-violet-700",
  cuti: "border-slate-200 bg-slate-100 text-slate-700",
  lembur: "border-cyan-200 bg-cyan-50 text-cyan-700",
  pulang_cepat: "border-orange-200 bg-orange-50 text-orange-700",
  tidak_absen_masuk: "border-rose-200 bg-rose-50 text-rose-700",
  tidak_absen_pulang: "border-amber-200 bg-amber-50 text-amber-700",
  hari_libur: "border-indigo-200 bg-indigo-50 text-indigo-700",
  off_schedule: "border-slate-200 bg-slate-100 text-slate-600",
  menunggu: "border-amber-200 bg-amber-50 text-amber-700",
  disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ditolak: "border-rose-200 bg-rose-50 text-rose-700",
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  dibatalkan: "border-slate-200 bg-slate-100 text-slate-500",
  aktif: "border-emerald-200 bg-emerald-50 text-emerald-700",
  perlu_perbarui: "border-amber-200 bg-amber-50 text-amber-700",
  belum_terdaftar: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function EmployeeStatusBadge({ value, label, className }) {
  const normalized = String(value || "").toLowerCase();
  const content = label || String(value || "-").replaceAll("_", " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em]",
        toneMap[normalized] || "border-slate-200 bg-slate-100 text-slate-700",
        className,
      )}
    >
      {content}
    </span>
  );
}
