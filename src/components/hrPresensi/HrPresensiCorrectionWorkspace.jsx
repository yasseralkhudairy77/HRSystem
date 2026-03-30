import { useEffect, useMemo, useState } from "react";
import { CheckCheck, CircleHelp, FileEdit, ShieldAlert, ShieldCheck, TimerReset } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  approveHrPresensiCorrection,
  escalateHrPresensiCorrection,
  getHrPresensiCorrectionLogs,
  getHrPresensiCorrections,
  requestClarificationHrPresensiCorrection,
  rejectHrPresensiCorrection,
  submitHrPresensiCorrection,
} from "@/services/hrPresensiCorrectionService";

const correctionTypeOptions = [
  { value: "lupa_masuk", label: "Lupa Masuk" },
  { value: "lupa_pulang", label: "Lupa Pulang" },
  { value: "salah_jam", label: "Salah Jam" },
  { value: "kendala_lokasi_gps", label: "Kendala Lokasi / GPS" },
  { value: "kendala_teknis_device", label: "Kendala Teknis / Device" },
  { value: "lainnya", label: "Lainnya" },
];

const defaultForm = {
  attendance_date: "",
  correction_type: "lupa_masuk",
  requested_checkin_time: "",
  requested_checkout_time: "",
  request_reason: "",
};

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

function formatCorrectionType(value) {
  return correctionTypeOptions.find((item) => item.value === value)?.label || value;
}

function formatCorrectionStatus(value) {
  return {
    diajukan: "Diajukan",
    menunggu_persetujuan_atasan: "Menunggu Persetujuan Atasan",
    perlu_klarifikasi: "Perlu Klarifikasi",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    eskalasi_ke_hr: "Eskalasi ke HR",
  }[value] || value;
}

function statusClass(value) {
  return {
    diajukan: "border-slate-200 bg-slate-100 text-slate-700",
    menunggu_persetujuan_atasan: "border-sky-200 bg-sky-50 text-sky-700",
    perlu_klarifikasi: "border-amber-200 bg-amber-50 text-amber-700",
    disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ditolak: "border-rose-200 bg-rose-50 text-rose-700",
    eskalasi_ke_hr: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  }[value] || "border-slate-200 bg-slate-100 text-slate-700";
}

function actionLabel(value) {
  return {
    create_correction: "Pengajuan dibuat",
    fallback_reviewer: "Fallback reviewer",
    request_clarification: "Minta klarifikasi",
    reject_correction: "Ditolak",
    escalate_to_hr: "Eskalasi ke HR",
    approve_correction: "Disetujui",
    apply_correction: "Perubahan diterapkan",
  }[value] || value;
}

function buildTimestamp(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  return `${dateValue}T${timeValue}:00+07:00`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function HrPresensiCorrectionWorkspace({ access, onAttendanceChanged }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [form, setForm] = useState({ ...defaultForm, attendance_date: todayDate() });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadCorrections({ preserveSelected = true } = {}) {
    if (access.status !== "ready") return;

    setIsLoading(true);
    try {
      const nextRows = await getHrPresensiCorrections(access);
      setRows(nextRows);
      setSelectedId((current) => (preserveSelected && current ? current : nextRows[0]?.id || ""));
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat data Koreksi Absensi." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (access.status === "ready") {
      void loadCorrections({ preserveSelected: false });
    }
  }, [access.status]);

  const selectedRow = useMemo(() => rows.find((item) => item.id === selectedId) || null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRow) {
      setLogs([]);
      return;
    }

    let isMounted = true;

    async function loadLogs() {
      try {
        const nextLogs = await getHrPresensiCorrectionLogs(access, selectedRow.id);
        if (isMounted) {
          setLogs(nextLogs);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat audit trail Koreksi Absensi." });
        }
      }
    }

    void loadLogs();

    return () => {
      isMounted = false;
    };
  }, [access, selectedRow?.id]);

  function setFormValue(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const row = await submitHrPresensiCorrection(access, {
        attendance_date: form.attendance_date,
        correction_type: form.correction_type,
        requested_checkin: buildTimestamp(form.attendance_date, form.requested_checkin_time),
        requested_checkout: buildTimestamp(form.attendance_date, form.requested_checkout_time),
        request_reason: form.request_reason,
      });

      await loadCorrections({ preserveSelected: false });
      setSelectedId(row.id);
      setForm({ ...defaultForm, attendance_date: todayDate() });
      setFeedback({
        type: "success",
        message: row.status === "eskalasi_ke_hr"
          ? "Koreksi absensi berhasil diajukan dan langsung diarahkan ke HR."
          : "Koreksi absensi berhasil diajukan ke alur review.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Pengajuan Koreksi Absensi belum berhasil." });
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
        await requestClarificationHrPresensiCorrection(access, selectedRow, actionNote);
      }
      if (actionType === "reject") {
        await rejectHrPresensiCorrection(access, selectedRow, actionNote);
      }
      if (actionType === "escalate") {
        await escalateHrPresensiCorrection(access, selectedRow, actionNote);
      }
      if (actionType === "approve") {
        await approveHrPresensiCorrection(access, selectedRow, actionNote);
        if (onAttendanceChanged) {
          await onAttendanceChanged();
        }
      }

      await loadCorrections();
      setActionNote("");
      setFeedback({
        type: "success",
        message:
          actionType === "approve"
            ? "Koreksi absensi disetujui dan perubahan record absensi sudah diterapkan."
            : actionType === "reject"
              ? "Pengajuan koreksi berhasil ditolak."
              : actionType === "clarify"
                ? "Permintaan klarifikasi berhasil dikirim."
                : "Pengajuan koreksi berhasil dieskalasikan ke HR.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Aksi review belum berhasil." });
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit = access.role === "karyawan";
  const canReview = access.role === "atasan" || access.role === "hr";
  const showReviewActions =
    canReview &&
    selectedRow &&
    ["menunggu_persetujuan_atasan", "eskalasi_ke_hr", "perlu_klarifikasi", "diajukan"].includes(selectedRow.status);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Koreksi Absensi</div>
            <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">List live dasar dengan status review, reviewer aktif, dan perlindungan submit tepat waktu.</div>
          </div>

          {rows.length === 0 && !isLoading ? (
            <EmptyState title="Belum ada koreksi absensi" description="Pengajuan koreksi pertama akan muncul di list ini sesuai scope role aktif." />
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
                      <div className="mt-1 text-[12px] text-[var(--text-muted)]">{formatDate(row.attendance_date)} | {formatCorrectionType(row.correction_type)}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(row.status)}`}>
                      {formatCorrectionStatus(row.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                    Reviewer: <span className="font-semibold text-[var(--text-main)]">{row.reviewer_name || (row.reviewer_role === "hr" ? "HR" : "Atasan")}</span><br />
                    Proteksi alpha: <span className="font-semibold text-[var(--text-main)]">{row.protects_from_alpha ? "Aktif" : "Belum aktif"}</span>
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
                <div className="text-lg font-semibold text-[var(--text-main)]">Form Ajukan Koreksi Absensi</div>
                <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">H+1 dihitung dari waktu server. Submit tepat waktu menandai pengajuan agar melindungi user dari alpha final pada fase ini.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Tanggal absensi</span>
                  <input type="date" value={form.attendance_date} onChange={(event) => setFormValue("attendance_date", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Jenis koreksi</span>
                  <select value={form.correction_type} onChange={(event) => setFormValue("correction_type", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                    {correctionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Jam masuk usulan</span>
                  <input type="time" value={form.requested_checkin_time} onChange={(event) => setFormValue("requested_checkin_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Jam pulang usulan</span>
                  <input type="time" value={form.requested_checkout_time} onChange={(event) => setFormValue("requested_checkout_time", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Alasan koreksi</span>
                  <textarea value={form.request_reason} onChange={(event) => setFormValue("request_reason", event.target.value)} rows={4} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>
              </div>
              <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleSubmit()}>
                <FileEdit className="mr-2 h-4 w-4" />
                Ajukan Koreksi
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <TimerReset className="h-4 w-4 text-[var(--brand-800)]" />
              Detail Koreksi
            </div>

            {isLoading ? (
              <div className="text-sm text-[var(--text-muted)]">Memuat data Koreksi Absensi live dari Supabase...</div>
            ) : selectedRow ? (
              <>
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{selectedRow.employee_name}</div>
                  <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{formatDate(selectedRow.attendance_date)} | {formatCorrectionType(selectedRow.correction_type)}</div>
                </div>
                <div className="space-y-2 text-sm text-[var(--text-muted)]">
                  <div>Status: <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(selectedRow.status)}`}>{formatCorrectionStatus(selectedRow.status)}</span></div>
                  <div>Reviewer aktif: <span className="font-semibold text-[var(--text-main)]">{selectedRow.reviewer_name || (selectedRow.reviewer_role === "hr" ? "HR" : "Atasan")}</span></div>
                  <div>Jam masuk usulan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.requested_checkin)}</span></div>
                  <div>Jam pulang usulan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.requested_checkout)}</span></div>
                  <div>Submit tepat waktu: <span className="font-semibold text-[var(--text-main)]">{selectedRow.is_submitted_on_time ? "Ya" : "Tidak"}</span></div>
                  <div>Proteksi alpha: <span className="font-semibold text-[var(--text-main)]">{selectedRow.protects_from_alpha ? "Aktif" : "Belum aktif"}</span></div>
                  <div>Fallback ke HR: <span className="font-semibold text-[var(--text-main)]">{selectedRow.fallback_to_hr ? "Ya" : "Tidak"}</span></div>
                  <div>Dibuat: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.submitted_at)}</span></div>
                  <div>Diputuskan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.decided_at)}</span></div>
                  <div>Diterapkan ke absensi: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.applied_at)}</span></div>
                </div>
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Alasan pengajuan</div>
                  <div className="mt-2">{selectedRow.request_reason}</div>
                </div>
                {selectedRow.fallback_reason ? (
                  <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {selectedRow.fallback_reason}
                  </div>
                ) : null}

                {showReviewActions ? (
                  <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-main)]">Aksi review dasar</div>
                    <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} rows={4} placeholder="Catatan aksi reviewer..." className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]" />
                    <div className="flex flex-wrap gap-2">
                      <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("approve")}>
                        <CheckCheck className="mr-2 h-4 w-4" />
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
                      {access.role === "atasan" ? (
                        <Button variant="outline" className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("escalate")}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Eskalasi ke HR
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Pilih satu pengajuan koreksi di list untuk melihat detail dan audit trail.</div>
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
            <div className="text-sm text-[var(--text-muted)]">Audit trail akan muncul setelah pengajuan atau aksi review dilakukan.</div>
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
