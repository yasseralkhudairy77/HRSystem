export default function HrPresensiSettingsList({ title, description, rows, activeId, onSelect, onCreate }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
        <div>
          <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
          <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{description}</div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-[10px] border border-[var(--border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-0)]"
        >
          Buat baru
        </button>
      </div>
      <div className="divide-y divide-[rgba(214,222,234,0.82)]">
        {rows.length ? (
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`w-full px-5 py-4 text-left transition ${row.id === activeId ? "bg-[var(--surface-0)]" : "bg-white hover:bg-[var(--surface-0)]/75"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">{row.title}</div>
                  <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{row.subtitle}</div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                  {row.isActive ? "Aktif" : "Nonaktif"}
                </div>
              </div>
              <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">{row.meta}</div>
            </button>
          ))
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">Belum ada data live untuk bagian ini.</div>
        )}
      </div>
    </div>
  );
}
