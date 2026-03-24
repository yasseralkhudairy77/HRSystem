export default function AttendanceIssueWidget({ title, items = [], emptyLabel = "Belum ada issue aktif." }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
        <div className="text-xs text-[var(--text-muted)]">Daftar issue yang paling berpotensi menghambat operasional atau payroll.</div>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[var(--border-soft)] px-4 py-3">
              <div className="text-sm font-semibold text-[var(--text-main)]">{item.employee_name || item.employee_name_raw || item.employeeRaw || item.conflict_description || item.title}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{item.note || item.conflict_description || item.reason || item.status_main}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] px-4 py-6 text-sm text-[var(--text-muted)]">{emptyLabel}</div>
      )}
    </div>
  );
}
