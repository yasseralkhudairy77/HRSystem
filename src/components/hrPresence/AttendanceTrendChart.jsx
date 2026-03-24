export default function AttendanceTrendChart({ title, points = [] }) {
  const maxValue = Math.max(1, ...points.map((item) => item.hadir + item.terlambat + item.alpha));

  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
        <div className="text-xs text-[var(--text-muted)]">Tren ringkas untuk membantu HR menangkap pola kehadiran.</div>
      </div>
      <div className="grid grid-cols-7 gap-3">
        {points.map((point) => {
          const total = point.hadir + point.terlambat + point.alpha;
          const height = Math.max(14, Math.round((total / maxValue) * 112));
          return (
            <div key={point.date} className="flex flex-col items-center gap-2">
              <div className="flex h-32 items-end">
                <div className="w-8 rounded-t-2xl bg-[linear-gradient(180deg,#1d4ed8_0%,#60a5fa_100%)]" style={{ height }} />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold text-[var(--text-main)]">{new Date(`${point.date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{total} org</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
