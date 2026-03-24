import { Button } from "@/components/ui/button";

export default function PayrollCutoffPanel({ finalization, onReady, onLock, onUnlock, onExport }) {
  return (
    <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-[var(--text-main)]">Cutoff & Finalisasi</div>
        <div className="text-xs text-[var(--text-muted)]">Checkpoint sebelum data presensi dilepas ke payroll.</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Button className="rounded-xl" onClick={onReady}>Tandai Siap Payroll</Button>
        <Button variant="outline" className="rounded-xl" onClick={onLock}>Lock Periode</Button>
        <Button variant="outline" className="rounded-xl" onClick={onUnlock}>Unlock Dengan Otorisasi</Button>
        <Button variant="outline" className="rounded-xl" onClick={onExport}>Export Rekap</Button>
      </div>
      <div className="mt-4 text-xs text-[var(--text-muted)]">Status saat ini: {finalization.status}. {finalization.note}</div>
    </div>
  );
}
