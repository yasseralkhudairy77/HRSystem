import { X } from "lucide-react";

import SourceBadge from "@/components/hrPresence/SourceBadge";
import SyncStatusBadge from "@/components/hrPresence/SyncStatusBadge";
import { Button } from "@/components/ui/button";

export default function RawLogDetailDrawer({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-[1px]">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Detail raw log</div>
            <div className="mt-1 text-sm text-slate-500">{log.log_datetime}</div>
          </div>
          <Button variant="outline" className="rounded-full px-3" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <SourceBadge value={log.source_type} />
            <SyncStatusBadge value={log.sync_status} />
            <SyncStatusBadge value={log.process_status} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div>Kode eksternal: {log.external_employee_code || "-"}</div>
              <div className="mt-2">Nama raw: {log.employee_name_raw || "-"}</div>
              <div className="mt-2">Employee internal: {log.employee_id || "-"}</div>
              <div className="mt-2">Direction: {log.direction || "-"}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div>Device: {log.device_name || "-"}</div>
              <div className="mt-2">Verification: {log.verification_type || "-"}</div>
              <div className="mt-2">Latitude: {log.latitude ?? "-"}</div>
              <div className="mt-2">Longitude: {log.longitude ?? "-"}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">Payload mentah</div>
            <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(log.raw_payload, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
