export default function ImportBatchSummaryCard({ batch }) {
  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">{batch.batch_code}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">{String(batch.import_source).replaceAll("_", " ")}</div>
        </div>
        <div className="text-right text-xs text-[var(--text-muted)]">
          <div>{batch.total_rows} row</div>
          <div className="mt-1">{batch.summary.successRate}% sukses</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-50 px-2 py-2 text-xs text-emerald-700"><div className="font-semibold">{batch.success_rows}</div><div className="mt-1">Berhasil</div></div>
        <div className="rounded-2xl bg-amber-50 px-2 py-2 text-xs text-amber-700"><div className="font-semibold">{batch.duplicate_rows}</div><div className="mt-1">Duplicate</div></div>
        <div className="rounded-2xl bg-rose-50 px-2 py-2 text-xs text-rose-700"><div className="font-semibold">{batch.conflict_rows}</div><div className="mt-1">Conflict</div></div>
        <div className="rounded-2xl bg-slate-100 px-2 py-2 text-xs text-slate-700"><div className="font-semibold">{batch.failed_rows}</div><div className="mt-1">Gagal</div></div>
      </div>
    </div>
  );
}
