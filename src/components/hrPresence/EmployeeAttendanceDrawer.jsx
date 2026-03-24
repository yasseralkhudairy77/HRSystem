export default function EmployeeAttendanceDrawer({ summary, employeeName, onClose }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-[var(--border-soft)] bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">Detail Rekap Karyawan</div>
          <div className="text-xs text-[var(--text-muted)]">{employeeName}</div>
        </div>
        <button type="button" className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-sm" onClick={onClose}>Tutup</button>
      </div>
      <div className="space-y-4 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4"><div className="text-xs text-[var(--text-muted)]">Hari kerja</div><div className="mt-1 text-lg font-semibold">{summary.scheduled_work_days}</div></div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4"><div className="text-xs text-[var(--text-muted)]">Hadir</div><div className="mt-1 text-lg font-semibold">{summary.present_days}</div></div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4"><div className="text-xs text-[var(--text-muted)]">Total telat</div><div className="mt-1 text-lg font-semibold">{summary.total_late_minutes} menit</div></div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4"><div className="text-xs text-[var(--text-muted)]">Total lembur</div><div className="mt-1 text-lg font-semibold">{summary.total_overtime_minutes} menit</div></div>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] p-4">
          <div className="text-sm font-semibold text-[var(--text-main)]">Status payroll</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">{summary.payroll_readiness_status} • {summary.attendance_final_status}</div>
        </div>
      </div>
    </div>
  );
}
