export default function TeamAttendanceWidget({ title, rows = [], renderMeta }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
        <div className="text-xs text-[var(--text-muted)]">Ringkasan cepat supaya atasan langsung tahu siapa yang perlu diperhatikan.</div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-start justify-between rounded-2xl border border-[var(--border-soft)] px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">{row.employee_name || row.name || row.title}</div>
              <div className="text-xs text-[var(--text-muted)]">{renderMeta ? renderMeta(row) : row.status_main || row.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
