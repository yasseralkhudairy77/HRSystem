import EmployeeStatusBadge from "@/components/hrPresenceEmployee/EmployeeStatusBadge";

export default function RequestHistoryCard({ item, typeLabel, statusLabel, relatedEmployeeName, onOpen, onCancel }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
          <div className="mt-1 text-xs text-slate-500">{typeLabel}</div>
        </div>
        <EmployeeStatusBadge value={item.status} label={statusLabel} />
      </div>
      <div className="mt-3 text-sm leading-6 text-slate-600">{item.description}</div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div>
          <div className="uppercase tracking-[0.14em] text-slate-400">Tanggal</div>
          <div className="mt-1 text-sm font-medium text-slate-700">{item.start_date}{item.end_date && item.end_date !== item.start_date ? ` - ${item.end_date}` : ""}</div>
        </div>
        <div>
          <div className="uppercase tracking-[0.14em] text-slate-400">Terkait</div>
          <div className="mt-1 text-sm font-medium text-slate-700">{relatedEmployeeName || "Pengajuan pribadi"}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onOpen} className="text-sm font-semibold text-slate-700">
          Lihat detail
        </button>
        {item.status === "menunggu" || item.status === "draft" ? (
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-rose-600">
            Batalkan
          </button>
        ) : null}
      </div>
    </div>
  );
}
