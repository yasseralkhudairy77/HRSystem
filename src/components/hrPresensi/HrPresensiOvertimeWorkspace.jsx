import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CircleHelp, ClipboardList, ShieldAlert, ShieldCheck, TimerReset } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  approveHrPresensiOvertime,
  getHrPresensiOvertimeLogs,
  getHrPresensiOvertimeRequests,
  requestClarificationHrPresensiOvertime,
  rejectHrPresensiOvertime,
  submitHrPresensiOvertimeRequest,
} from "@/services/hrPresensiOvertimeService";

const statusOptions = [
  { value: "all", label: "Semua status" },
  { value: "diajukan", label: "Diajukan" },
  { value: "menunggu_persetujuan_atasan", label: "Menunggu Persetujuan Atasan" },
  { value: "perlu_klarifikasi", label: "Perlu Klarifikasi" },
  { value: "ditolak", label: "Ditolak" },
  { value: "siap_ke_payroll", label: "Siap ke Payroll" },
];

const defaultForm = {
  overtime_date: "",
  proposed_start_time: "",
  proposed_end_time: "",
  reason: "",
  additional_note: "",
};

const defaultApprovalForm = {
  approved_start_time: "",
  approved_end_time: "",
  note: "",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildTimestamp(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  return `${dateValue}T${timeValue}:00+07:00`;
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return null;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return null;
  }

  return ((endMinutes - startMinutes) / 60).toFixed(2);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(value) {
  return {
    diajukan: "Diajukan",
    menunggu_persetujuan_atasan: "Menunggu Persetujuan Atasan",
    perlu_klarifikasi: "Perlu Klarifikasi",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    siap_ke_payroll: "Siap ke Payroll",
  }[value] || value;
}

function statusClass(value) {
  return {
    diajukan: "border-slate-200 bg-slate-100 text-slate-700",
    menunggu_persetujuan_atasan: "border-sky-200 bg-sky-50 text-sky-700",
    perlu_klarifikasi: "border-amber-200 bg-amber-50 text-amber-700",
    disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ditolak: "border-rose-200 bg-rose-50 text-rose-700",
    siap_ke_payroll: "border-violet-200 bg-violet-50 text-violet-700",
  }[value] || "border-slate-200 bg-slate-100 text-slate-700";
}

function actionLabel(value) {
  return {
    create_overtime: "Pengajuan lembur dibuat",
    fallback_reviewer: "Fallback reviewer",
    request_clarification: "Minta klarifikasi",
    reject_overtime: "Lembur ditolak",
    approve_overtime: "Lembur disetujui",
    apply_approved_hours: "Jam disetujui diterapkan",
  }[value] || value;
}

export default function HrPresensiOvertimeWorkspace({ access }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ ...defaultForm, overtime_date: todayDate() });
  const [approvalForm, setApprovalForm] = useState({ ...defaultApprovalForm });
  const [actionNote, setActionNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadRequests({ preserveSelected = true } = {}) {
    if (access.status !== "ready") return;

    setIsLoading(true);
    try {
      const nextRows = await getHrPresensiOvertimeRequests(access, statusFilter);
      setRows(nextRows);
      setSelectedId((current) => (preserveSelected && current ? current : nextRows[0]?.id || ""));
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat data lembur." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (access.status === "ready") {
      void loadRequests({ preserveSelected: false });
    }
  }, [access.status, statusFilter]);

  const selectedRow = useMemo(() => rows.find((item) => item.id === selectedId) || null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRow) {
      setLogs([]);
      setApprovalForm({ ...defaultApprovalForm });
      setActionNote("");
      return;
    }

    setApprovalForm({
      approved_start_time: selectedRow.approved_start_at ? new Date(selectedRow.approved_start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      approved_end_time: selectedRow.approved_end_at ? new Date(selectedRow.approved_end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      note: selectedRow.reviewer_note || "",
    });
    setActionNote(selectedRow.reviewer_note || "");

    let isMounted = true;

    async function loadAudit() {
      try {
        const nextLogs = await getHrPresensiOvertimeLogs(access, selectedRow.id);
        if (isMounted) {
          setLogs(nextLogs);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat audit trail lembur." });
        }
      }
    }

    void loadAudit();

    return () => {
      isMounted = false;
    };
  }, [access, selectedRow?.id]);

  function setFormValue(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setApprovalValue(key, value) {
    setApprovalForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const row = await submitHrPresensiOvertimeRequest(access, {
        overtime_date: form.overtime_date,
        proposed_start_at: buildTimestamp(form.overtime_date, form.proposed_start_time),
        proposed_end_at: buildTimestamp(form.overtime_date, form.proposed_end_time),
        reason: form.reason,
        additional_note: form.additional_note,
      });

      await loadRequests({ preserveSelected: false });
      setSelectedId(row.id);
      setForm({ ...defaultForm, overtime_date: todayDate() });
      setFeedback({
        type: "success",
        message: row.reviewer_role === "atasan"
          ? "Pengajuan lembur berhasil dikirim ke atasan untuk direview."
          : "Pengajuan lembur berhasil dicatat dan diarahkan ke monitor HR.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Pengajuan lembur belum berhasil." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReviewAction(actionType) {
    if (!selectedRow) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      if (actionType === "clarify") {
        await requestClarificationHrPresensiOvertime(access, selectedRow, actionNote);
      }

      if (actionType === "reject") {
        await rejectHrPresensiOvertime(access, selectedRow, actionNote);
      }

      if (actionType === "approve") {
        await approveHrPresensiOvertime(access, selectedRow, {
          approved_start_at: buildTimestamp(selectedRow.overtime_date, approvalForm.approved_start_time),
          approved_end_at: buildTimestamp(selectedRow.overtime_date, approvalForm.approved_end_time),
          note: approvalForm.note,
        });
      }

      await loadRequests();
      setFeedback({
        type: "success",
        message:
          actionType === "approve"
            ? "Lembur berhasil disetujui dan ditandai siap ke payroll."
            : actionType === "reject"
              ? "Pengajuan lembur berhasil ditolak."
              : "Permintaan klarifikasi lembur berhasil dikirim.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Aksi review lembur belum berhasil." });
    } finally {
      setIsSaving(false);
    }
  }

  const proposedHours = useMemo(() => calculateHours(form.proposed_start_time, form.proposed_end_time), [form.proposed_start_time, form.proposed_end_time]);
  const approvedHours = useMemo(() => calculateHours(approvalForm.approved_start_time, approvalForm.approved_end_time), [approvalForm.approved_start_time, approvalForm.approved_end_time]);

  const canSubmit = access.role === "karyawan";
  const canReview =
    access.role === "atasan" &&
    selectedRow?.reviewer_role === "atasan" &&
    selectedRow?.reviewer_employee_id === access.employee?.id &&
    ["menunggu_persetujuan_atasan", "perlu_klarifikasi"].includes(selectedRow.status);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Lembur Dasar</div>
            <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">List live lembur dengan pembeda jam diajukan, jam disetujui, dan status kesiapan payroll.</div>
          </div>

          <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
            <span>Filter status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {rows.length === 0 && !isLoading ? (
            <EmptyState title="Belum ada data lembur" description="Pengajuan lembur pertama akan muncul di list ini sesuai scope role aktif." />
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full rounded-[12px] border p-3 text-left transition ${selectedId === row.id ? "border-[var(--brand-800)] bg-[var(--surface-0)]" : "border-[var(--border-soft)] bg-white hover:bg-[var(--surface-0)]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-main)]">{row.employee_name}</div>
                      <div className="mt-1 text-[12px] text-[var(--text-muted)]">{formatDate(row.overtime_date)} | {row.reference_number}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(row.status)}`}>
                      {formatStatus(row.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                    Diajukan: <span className="font-semibold text-[var(--text-main)]">{row.proposed_hours} jam</span><br />
                    Disetujui: <span className="font-semibold text-[var(--text-main)]">{row.approved_hours ?? "-"} jam</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {feedback ? (
          <div className={`rounded-[12px] border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {feedback.message}
          </div>
        ) : null}

        {canSubmit ? (
          <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="text-lg font-semibold text-[var(--text-main)]">Form Ajukan Lembur</div>
                <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">Lembur dapat diajukan H-1, hari H, atau H+1 berdasarkan jam server. Lewat H+1 akan diarahkan ke monitor HR, bukan diproses normal.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Tanggal lembur</span>
                  <input type="date" value={form.overtime_date} onChange={(event) => setFormValue("overtime_date", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-muted)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Total jam diajukan</div>
                  <div className="mt-2 font-semibold text-[var(--text-main)]">{proposedHours ? `${proposedHours} jam` : "Isi jam mulai dan selesai"}</div>
                </div>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Jam mulai</span>
                  <input type="time" value={form.proposed_start_time} onChange={(event) => setFormValue("proposed_start_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Jam selesai</span>
                  <input type="time" value={form.proposed_end_time} onChange={(event) => setFormValue("proposed_end_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Alasan lembur</span>
                  <textarea value={form.reason} onChange={(event) => setFormValue("reason", event.target.value)} rows={4} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Catatan tambahan</span>
                  <textarea value={form.additional_note} onChange={(event) => setFormValue("additional_note", event.target.value)} rows={3} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
              </div>
              <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleSubmit()}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Ajukan Lembur
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <TimerReset className="h-4 w-4 text-[var(--brand-800)]" />
              Detail Lembur
            </div>

            {isLoading ? (
              <div className="text-sm text-[var(--text-muted)]">Memuat data lembur live dari Supabase...</div>
            ) : selectedRow ? (
              <>
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{selectedRow.employee_name}</div>
                  <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{formatDate(selectedRow.overtime_date)} | {selectedRow.reference_number}</div>
                </div>
                <div className="space-y-2 text-sm text-[var(--text-muted)]">
                  <div>Status: <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(selectedRow.status)}`}>{formatStatus(selectedRow.status)}</span></div>
                  <div>Reviewer aktif: <span className="font-semibold text-[var(--text-main)]">{selectedRow.reviewer_name || (selectedRow.reviewer_role === "hr" ? "HR" : "Atasan")}</span></div>
                  <div>Jam diajukan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.proposed_start_at)} - {formatDateTime(selectedRow.proposed_end_at)}</span></div>
                  <div>Total jam diajukan: <span className="font-semibold text-[var(--text-main)]">{selectedRow.proposed_hours} jam</span></div>
                  <div>Jam disetujui: <span className="font-semibold text-[var(--text-main)]">{selectedRow.approved_start_at ? `${formatDateTime(selectedRow.approved_start_at)} - ${formatDateTime(selectedRow.approved_end_at)}` : "-"}</span></div>
                  <div>Total jam disetujui: <span className="font-semibold text-[var(--text-main)]">{selectedRow.approved_hours ?? "-"} jam</span></div>
                  <div>Submit tepat waktu: <span className="font-semibold text-[var(--text-main)]">{selectedRow.is_submitted_on_time ? "Ya" : "Tidak"}</span></div>
                  <div>Dikirim: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.submitted_at)}</span></div>
                  <div>Diputuskan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.decided_at)}</span></div>
                  <div>Siap ke payroll: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.payroll_ready_at)}</span></div>
                </div>

                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Alasan lembur</div>
                  <div className="mt-2">{selectedRow.reason}</div>
                </div>

                {selectedRow.additional_note ? (
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Catatan tambahan</div>
                    <div className="mt-2">{selectedRow.additional_note}</div>
                  </div>
                ) : null}

                {selectedRow.fallback_reason ? (
                  <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {selectedRow.fallback_reason}
                  </div>
                ) : null}

                {canReview ? (
                  <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-main)]">Review Atasan</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                        <span>Jam mulai disetujui</span>
                        <input type="time" value={approvalForm.approved_start_time} onChange={(event) => setApprovalValue("approved_start_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-[var(--text-main)]" />
                      </label>
                      <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                        <span>Jam selesai disetujui</span>
                        <input type="time" value={approvalForm.approved_end_time} onChange={(event) => setApprovalValue("approved_end_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-[var(--text-main)]" />
                      </label>
                    </div>
                    <div className="rounded-[12px] border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-muted)]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Total jam disetujui</div>
                      <div className="mt-2 font-semibold text-[var(--text-main)]">{approvedHours ? `${approvedHours} jam` : "Isi jam mulai dan selesai"}</div>
                    </div>
                    <textarea value={approvalForm.note} onChange={(event) => setApprovalValue("note", event.target.value)} rows={3} placeholder="Catatan review atasan..." className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]" />
                    <div className="flex flex-wrap gap-2">
                      <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("approve")}>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Setujui
                      </Button>
                      <Button variant="outline" className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("clarify")}>
                        <CircleHelp className="mr-2 h-4 w-4" />
                        Minta Klarifikasi
                      </Button>
                      <Button variant="outline" className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("reject")}>
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Tolak
                      </Button>
                    </div>
                  </div>
                ) : access.role === "hr" ? (
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                    Mode HR pada fase ini hanya memonitor seluruh data lembur dan membaca jam diajukan vs jam disetujui. Jam final tetap ditentukan oleh atasan.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Pilih satu pengajuan lembur di list untuk melihat detail dan audit trail.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
            <ShieldCheck className="h-4 w-4 text-[var(--brand-800)]" />
            Audit Trail
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)]">Audit trail lembur akan muncul setelah pengajuan atau aksi review dilakukan.</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-main)]">{actionLabel(log.action_type)}</div>
                      <div className="mt-1 text-[12px] text-[var(--text-muted)]">{log.actor_name || "System"} | {formatDateTime(log.created_at)}</div>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {log.actor_role}
                    </span>
                  </div>
                  {log.note ? <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{log.note}</div> : null}
                  <div className="mt-3 grid gap-2 text-[12px] leading-5 text-[var(--text-muted)]">
                    <div>Before payload: <span className="font-medium text-[var(--text-main)]">{Object.keys(log.before_payload || {}).length ? "Tercatat" : "-"}</span></div>
                    <div>After payload: <span className="font-medium text-[var(--text-main)]">{Object.keys(log.after_payload || {}).length ? "Tercatat" : "-"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
