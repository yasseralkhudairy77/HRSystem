import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const presenceStatusClasses = {
  Hadir: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Terlambat: "border-amber-200 bg-amber-50 text-amber-700",
  Alpha: "border-rose-200 bg-rose-50 text-rose-700",
  Izin: "border-sky-200 bg-sky-50 text-sky-700",
  Sakit: "border-violet-200 bg-violet-50 text-violet-700",
  Cuti: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Lembur: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Pulang cepat": "border-orange-200 bg-orange-50 text-orange-700",
  "Tidak absen masuk": "border-rose-200 bg-rose-50 text-rose-700",
  "Tidak absen pulang": "border-amber-200 bg-amber-50 text-amber-700",
  Online: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Offline: "border-slate-200 bg-slate-100 text-slate-700",
  "Perlu cek": "border-amber-200 bg-amber-50 text-amber-700",
  Aktif: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Nonaktif: "border-slate-200 bg-slate-100 text-slate-700",
  Nasional: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Perusahaan: "border-sky-200 bg-sky-50 text-sky-700",
  Departemen: "border-violet-200 bg-violet-50 text-violet-700",
  Disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Menunggu: "border-amber-200 bg-amber-50 text-amber-700",
  Ditolak: "border-rose-200 bg-rose-50 text-rose-700",
  "5 kerja 2 libur": "border-slate-200 bg-slate-100 text-slate-700",
  "6 kerja 1 libur": "border-slate-200 bg-slate-100 text-slate-700",
  "Rotasi shift": "border-sky-200 bg-sky-50 text-sky-700",
  Fleksibel: "border-violet-200 bg-violet-50 text-violet-700",
  Manual: "border-slate-200 bg-slate-100 text-slate-700",
  Sistem: "border-sky-200 bg-sky-50 text-sky-700",
  Import: "border-violet-200 bg-violet-50 text-violet-700",
  Fingerprint: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Mobile: "border-sky-200 bg-sky-50 text-sky-700",
  "Face recognition": "border-violet-200 bg-violet-50 text-violet-700",
};

export default function PresenceStatusBadge({ value, className }) {
  return (
    <Badge className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", presenceStatusClasses[value] || "border-slate-200 bg-slate-100 text-slate-700", className)}>
      {value}
    </Badge>
  );
}
