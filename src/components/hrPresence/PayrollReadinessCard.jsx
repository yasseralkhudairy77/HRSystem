export default function PayrollReadinessCard({ summary, finalization }) {
  return (
    <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-lg">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Kesiapan Payroll</div>
      <div className="mt-3 text-3xl font-semibold">{summary.total_data_siap_payroll || summary.total_ready || 0}</div>
      <div className="mt-1 text-sm text-white/70">data sudah rapi untuk dibawa ke payroll.</div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/10 px-4 py-3">
          <div className="text-white/60">Need review</div>
          <div className="mt-1 font-semibold">{summary.total_data_belum_valid || summary.total_need_review || 0}</div>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-3">
          <div className="text-white/60">Progress finalisasi</div>
          <div className="mt-1 font-semibold">{finalization?.progress_percent || 0}%</div>
        </div>
      </div>
    </div>
  );
}
