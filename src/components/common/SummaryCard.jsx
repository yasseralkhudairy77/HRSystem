export default function SummaryCard({ label, value, note, accent = "slate" }) {
  const accentClasses = {
    slate: "from-slate-900 via-slate-800 to-slate-700",
    emerald: "from-emerald-700 via-emerald-600 to-teal-600",
    amber: "from-amber-500 via-orange-500 to-orange-400",
    sky: "from-sky-700 via-sky-600 to-cyan-500",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-white shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${accentClasses[accent] || accentClasses.slate}`} />
      <div className="space-y-2 p-5">
        <div className="text-sm text-[var(--text-muted)]">{label}</div>
        <div className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
        <div className="text-sm leading-6 text-[var(--text-muted)]">{note}</div>
      </div>
    </div>
  );
}
