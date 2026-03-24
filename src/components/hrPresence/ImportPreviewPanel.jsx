export default function ImportPreviewPanel({ preview }) {
  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
      <div className="text-sm font-semibold text-[var(--text-main)]">Preview import</div>
      <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Sebelum finalize import, HR bisa lihat jumlah row valid, duplicate, unmapped, dan conflict.</div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Total row</div><div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{preview.totalRows}</div></div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Valid</div><div className="mt-2 text-lg font-semibold text-emerald-700">{preview.validRows}</div></div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Conflict</div><div className="mt-2 text-lg font-semibold text-rose-700">{preview.conflictRows}</div></div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Duplicate</div><div className="mt-2 text-lg font-semibold text-amber-700">{preview.duplicateRows}</div></div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Belum termapping</div><div className="mt-2 text-lg font-semibold text-sky-700">{preview.unmappedRows}</div></div>
        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Datetime invalid</div><div className="mt-2 text-lg font-semibold text-slate-700">{preview.invalidRows}</div></div>
      </div>
    </div>
  );
}
