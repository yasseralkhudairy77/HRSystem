export default function FinalizationProgressCard({ finalization }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">Progress Finalisasi</div>
          <div className="text-xs text-[var(--text-muted)]">Pantau kesiapan periode sebelum payroll diproses.</div>
        </div>
        <div className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-main)]">{finalization.status}</div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#16a34a_0%,#60a5fa_100%)]" style={{ width: `${finalization.progress_percent || 0}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3"><div className="text-[var(--text-muted)]">Ready</div><div className="mt-1 font-semibold">{finalization.total_ready}</div></div>
        <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3"><div className="text-[var(--text-muted)]">Need review</div><div className="mt-1 font-semibold">{finalization.total_need_review}</div></div>
        <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3"><div className="text-[var(--text-muted)]">Locked</div><div className="mt-1 font-semibold">{finalization.total_locked}</div></div>
      </div>
    </div>
  );
}
