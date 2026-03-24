export default function PendingApprovalWidget({ items = [] }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">Antrian Approval</div>
        <div className="text-xs text-[var(--text-muted)]">Pengajuan presensi yang masih menunggu keputusan.</div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--border-soft)] px-4 py-3">
            <div className="text-sm font-semibold text-[var(--text-main)]">{item.title}</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">{item.request_type} • {item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
