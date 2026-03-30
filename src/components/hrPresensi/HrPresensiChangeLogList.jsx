export default function HrPresensiChangeLogList({ logs }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
        <div className="text-lg font-semibold text-[var(--text-main)]">Riwayat perubahan</div>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">Perubahan sensitif dicatat untuk review dan audit trail.</div>
      </div>
      <div className="divide-y divide-[rgba(214,222,234,0.82)]">
        {logs.length ? (
          logs.map((item) => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-main)]">{item.change_summary}</div>
                  <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">Domain {item.domain_name} | aksi {item.action_type}</div>
                </div>
                <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {new Date(item.created_at).toLocaleDateString("id-ID")}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-6 text-sm text-[var(--text-muted)]">Belum ada riwayat perubahan untuk domain ini.</div>
        )}
      </div>
    </div>
  );
}
