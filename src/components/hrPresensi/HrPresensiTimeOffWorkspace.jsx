import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CircleHelp, ClipboardList, HeartPulse, ShieldAlert, ShieldCheck, Stethoscope, WalletCards } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  approveHrPresensiTimeOff,
  finalizeSickAdministration,
  getHrPresensiLeaveBalanceContext,
  getHrPresensiPermissionOptions,
  getHrPresensiSpecialLeaveOptions,
  getHrPresensiTimeOffLogs,
  getHrPresensiTimeOffRequests,
  markSickNeedsVerification,
  receiveSickPhysicalDocument,
  rejectHrPresensiTimeOff,
  requestClarificationHrPresensiTimeOff,
  submitHrPresensiTimeOffRequest,
} from "@/services/hrPresensiTimeOffService";

const domainOptions = [
  { value: "cuti_reguler", label: "Cuti Reguler" },
  { value: "cuti_khusus", label: "Cuti Khusus" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
];

const statusOptions = [
  { value: "all", label: "Semua status" },
  { value: "diajukan", label: "Diajukan" },
  { value: "menunggu_persetujuan_atasan", label: "Menunggu Persetujuan Atasan" },
  { value: "perlu_klarifikasi", label: "Perlu Klarifikasi" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
  { value: "menunggu_dokumen_fisik", label: "Menunggu Dokumen Fisik" },
  { value: "dokumen_fisik_diterima_hr", label: "Dokumen Fisik Diterima HR" },
  { value: "perlu_verifikasi_hr", label: "Perlu Verifikasi HR" },
];

const defaultForm = {
  request_domain: "cuti_reguler",
  start_date: "",
  end_date: "",
  is_half_day: false,
  half_day_slot: "",
  special_leave_type_id: "",
  permission_type_id: "",
  reason: "",
  additional_note: "",
  attachment_note: "",
  has_digital_document: false,
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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
    menunggu_dokumen_fisik: "Menunggu Dokumen Fisik",
    dokumen_fisik_diterima_hr: "Dokumen Fisik Diterima HR",
    perlu_verifikasi_hr: "Perlu Verifikasi HR",
  }[value] || value;
}

function statusClass(value) {
  return {
    diajukan: "border-slate-200 bg-slate-100 text-slate-700",
    menunggu_persetujuan_atasan: "border-sky-200 bg-sky-50 text-sky-700",
    perlu_klarifikasi: "border-amber-200 bg-amber-50 text-amber-700",
    disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ditolak: "border-rose-200 bg-rose-50 text-rose-700",
    menunggu_dokumen_fisik: "border-violet-200 bg-violet-50 text-violet-700",
    dokumen_fisik_diterima_hr: "border-indigo-200 bg-indigo-50 text-indigo-700",
    perlu_verifikasi_hr: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  }[value] || "border-slate-200 bg-slate-100 text-slate-700";
}

function formatAuditAction(value) {
  return {
    create_request: "Pengajuan dibuat",
    fallback_reviewer: "Fallback reviewer",
    request_clarification: "Minta klarifikasi",
    reject_request: "Pengajuan ditolak",
    approve_request: "Pengajuan disetujui",
    receive_physical_document: "Dokumen fisik diterima",
    verify_sick_document: "Verifikasi HR",
    apply_status: "Status diterapkan",
  }[value] || value;
}

function calculateRequestedDays(startDate, endDate, isHalfDay) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  if (isHalfDay) {
    return startDate === endDate ? 0.5 : null;
  }
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return diffDays > 0 ? diffDays : null;
}

function getDomainDescription(domain) {
  return {
    cuti_reguler: "Mengurangi saldo cuti global perusahaan saat approval final.",
    cuti_khusus: "Tidak mengurangi saldo cuti reguler dan membaca jenis dari master data live.",
    izin: "Tidak memakai saldo dan mendukung penuh atau setengah hari.",
    sakit: "Atasan menangani operasional, HR menangani dokumen administrasi dasar.",
  }[domain];
}

export default function HrPresensiTimeOffWorkspace({ access }) {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [logs, setLogs] = useState([]);
  const [specialLeaveOptions, setSpecialLeaveOptions] = useState([]);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [form, setForm] = useState({ ...defaultForm, start_date: todayDate(), end_date: todayDate() });
  const [actionNote, setActionNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadWorkspace({ preserveSelected = true } = {}) {
    if (access.status !== "ready") return;

    setIsLoading(true);
    try {
      const [nextRows, nextSpecialLeave, nextPermissions] = await Promise.all([
        getHrPresensiTimeOffRequests(access, { status: statusFilter, domain: domainFilter }),
        getHrPresensiSpecialLeaveOptions(),
        getHrPresensiPermissionOptions(),
      ]);

      setRows(nextRows);
      setSpecialLeaveOptions(nextSpecialLeave);
      setPermissionOptions(nextPermissions);
      setSelectedId((current) => (preserveSelected && current ? current : nextRows[0]?.id || ""));
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat pengajuan Cuti, Izin & Sakit." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (access.status === "ready") {
      void loadWorkspace({ preserveSelected: false });
    }
  }, [access.status, statusFilter, domainFilter]);

  useEffect(() => {
    if (access.status !== "ready" || form.request_domain !== "cuti_reguler" || !form.start_date) {
      setLeaveBalance(null);
      return;
    }

    let mounted = true;

    async function loadBalance() {
      try {
        const nextBalance = await getHrPresensiLeaveBalanceContext(access, form.start_date);
        if (mounted) {
          setLeaveBalance(nextBalance);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setLeaveBalance(null);
        }
      }
    }

    void loadBalance();
    return () => {
      mounted = false;
    };
  }, [access, form.request_domain, form.start_date]);

  const selectedRow = useMemo(() => rows.find((item) => item.id === selectedId) || null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedRow) {
      setLogs([]);
      setActionNote("");
      return;
    }

    setActionNote(selectedRow.reviewer_note || selectedRow.hr_note || "");

    let mounted = true;

    async function loadAudit() {
      try {
        const nextLogs = await getHrPresensiTimeOffLogs(access, selectedRow.id);
        if (mounted) {
          setLogs(nextLogs);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat audit trail pengajuan." });
        }
      }
    }

    void loadAudit();
    return () => {
      mounted = false;
    };
  }, [access, selectedRow?.id]);

  const requestedDaysPreview = useMemo(
    () => calculateRequestedDays(form.start_date, form.end_date, form.is_half_day),
    [form.start_date, form.end_date, form.is_half_day],
  );

  const specialLeaveType = useMemo(
    () => specialLeaveOptions.find((item) => item.id === form.special_leave_type_id) || null,
    [specialLeaveOptions, form.special_leave_type_id],
  );

  const permissionType = useMemo(
    () => permissionOptions.find((item) => item.id === form.permission_type_id) || null,
    [permissionOptions, form.permission_type_id],
  );

  const filteredPermissionOptions = useMemo(() => {
    if (form.request_domain === "izin") {
      return permissionOptions.filter((item) => item.category?.toLowerCase() === "izin");
    }
    if (form.request_domain === "sakit") {
      return permissionOptions.filter((item) => item.category?.toLowerCase() === "sakit");
    }
    return [];
  }, [permissionOptions, form.request_domain]);

  function setFormValue(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "request_domain") {
        next.special_leave_type_id = "";
        next.permission_type_id = "";
        next.attachment_note = "";
        next.has_digital_document = false;
        next.is_half_day = false;
        next.half_day_slot = "";
      }
      if (key === "is_half_day" && !value) {
        next.half_day_slot = "";
      }
      if (key === "start_date" && current.is_half_day) {
        next.end_date = value;
      }
      return next;
    });
  }

  async function handleSubmit() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const row = await submitHrPresensiTimeOffRequest(access, form);
      await loadWorkspace({ preserveSelected: false });
      setSelectedId(row.id);
      setForm({ ...defaultForm, start_date: todayDate(), end_date: todayDate() });
      setFeedback({
        type: "success",
        message:
          row.reviewer_role === "atasan"
            ? "Pengajuan berhasil dikirim ke atasan untuk direview."
            : "Pengajuan berhasil dicatat dan diarahkan ke fallback monitor HR.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Pengajuan belum berhasil disimpan." });
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
        await requestClarificationHrPresensiTimeOff(access, selectedRow, actionNote);
      }
      if (actionType === "reject") {
        await rejectHrPresensiTimeOff(access, selectedRow, actionNote);
      }
      if (actionType === "approve") {
        await approveHrPresensiTimeOff(access, selectedRow, actionNote);
      }
      if (actionType === "receive-physical") {
        await receiveSickPhysicalDocument(access, selectedRow, actionNote);
      }
      if (actionType === "verify") {
        await markSickNeedsVerification(access, selectedRow, actionNote);
      }
      if (actionType === "finalize-sick") {
        await finalizeSickAdministration(access, selectedRow, actionNote);
      }

      await loadWorkspace();
      setFeedback({
        type: "success",
        message:
          actionType === "approve"
            ? "Pengajuan berhasil disetujui sesuai reviewer aktif."
            : actionType === "reject"
              ? "Pengajuan berhasil ditolak."
              : actionType === "clarify"
                ? "Permintaan klarifikasi berhasil dikirim."
                : actionType === "receive-physical"
                  ? "Dokumen fisik sakit berhasil dicatat."
                  : actionType === "verify"
                    ? "Pengajuan sakit berhasil ditandai perlu verifikasi HR."
                    : "Administrasi sakit berhasil diselesaikan.",
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Aksi pengajuan belum berhasil dijalankan." });
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit = access.role === "karyawan";
  const canReviewAsSupervisor =
    access.role === "atasan" &&
    selectedRow?.reviewer_role === "atasan" &&
    selectedRow?.reviewer_employee_id === access.employee?.id &&
    ["menunggu_persetujuan_atasan", "perlu_klarifikasi"].includes(selectedRow.status);

  const canReviewAsHrFallback =
    access.role === "hr" &&
    selectedRow?.reviewer_role === "hr" &&
    ["diajukan", "perlu_klarifikasi"].includes(selectedRow.status);

  const canHandleSickAdmin =
    access.role === "hr" &&
    selectedRow?.request_domain === "sakit" &&
    ["menunggu_dokumen_fisik", "dokumen_fisik_diterima_hr", "perlu_verifikasi_hr"].includes(selectedRow.status);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Data Pengajuan</div>
            <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">List live dasar untuk cuti, cuti khusus, izin, dan sakit sesuai scope role aktif.</div>
          </div>

          <div className="grid gap-3">
            <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
              <span>Filter domain</span>
              <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                <option value="all">Semua domain</option>
                {domainOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
              <span>Filter status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {rows.length === 0 && !isLoading ? (
            <EmptyState title="Belum ada pengajuan live" description="Pengajuan pertama untuk Cuti, Izin, atau Sakit akan muncul di list ini sesuai scope role aktif." />
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
                      <div className="mt-1 text-[12px] text-[var(--text-muted)]">{row.type_label} | {row.reference_number}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(row.status)}`}>
                      {formatStatus(row.status)}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                    {formatDate(row.start_date)}{row.start_date !== row.end_date ? ` - ${formatDate(row.end_date)}` : ""}<br />
                    Durasi: <span className="font-semibold text-[var(--text-main)]">{row.requested_days} hari</span>
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
                <div className="text-lg font-semibold text-[var(--text-main)]">Form Pengajuan Live</div>
                <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{getDomainDescription(form.request_domain)}</div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Domain pengajuan</span>
                  <select value={form.request_domain} onChange={(event) => setFormValue("request_domain", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                    {domainOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-muted)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Durasi pengajuan</div>
                  <div className="mt-2 font-semibold text-[var(--text-main)]">
                    {requestedDaysPreview ? `${requestedDaysPreview} hari` : "Isi tanggal dengan benar"}
                  </div>
                </div>

                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Tanggal mulai</span>
                  <input type="date" value={form.start_date} onChange={(event) => setFormValue("start_date", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>

                <label className="space-y-1.5 text-sm text-[var(--text-muted)]">
                  <span>Tanggal selesai</span>
                  <input type="date" value={form.end_date} onChange={(event) => setFormValue("end_date", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" disabled={form.is_half_day} />
                </label>

                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Mode durasi</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setFormValue("is_half_day", false)} className={`rounded-[10px] border px-3 py-2 text-sm ${!form.is_half_day ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white" : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"}`}>
                      Penuh
                    </button>
                    <button type="button" onClick={() => setFormValue("is_half_day", true)} className={`rounded-[10px] border px-3 py-2 text-sm ${form.is_half_day ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white" : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"}`}>
                      Setengah Hari
                    </button>
                  </div>
                </label>

                {form.is_half_day ? (
                  <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                    <span>Slot setengah hari</span>
                    <select value={form.half_day_slot} onChange={(event) => setFormValue("half_day_slot", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                      <option value="">Pilih slot</option>
                      <option value="pagi">Pagi</option>
                      <option value="siang">Siang</option>
                    </select>
                  </label>
                ) : null}

                {form.request_domain === "cuti_khusus" ? (
                  <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                    <span>Jenis cuti khusus</span>
                    <select value={form.special_leave_type_id} onChange={(event) => setFormValue("special_leave_type_id", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                      <option value="">Pilih jenis cuti khusus</option>
                      {specialLeaveOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {["izin", "sakit"].includes(form.request_domain) ? (
                  <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                    <span>Jenis pengajuan</span>
                    <select value={form.permission_type_id} onChange={(event) => setFormValue("permission_type_id", event.target.value)} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                      <option value="">Pilih jenis pengajuan</option>
                      {filteredPermissionOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Alasan</span>
                  <textarea value={form.reason} onChange={(event) => setFormValue("reason", event.target.value)} rows={4} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>

                <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                  <span>Catatan tambahan</span>
                  <textarea value={form.additional_note} onChange={(event) => setFormValue("additional_note", event.target.value)} rows={3} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                </label>

                {(specialLeaveType?.requires_attachment || permissionType?.requires_attachment) ? (
                  <label className="space-y-1.5 text-sm text-[var(--text-muted)] md:col-span-2">
                    <span>Catatan lampiran sementara</span>
                    <textarea value={form.attachment_note} onChange={(event) => setFormValue("attachment_note", event.target.value)} rows={3} className="w-full rounded-[10px] border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]" />
                  </label>
                ) : null}

                {form.request_domain === "sakit" ? (
                  <label className="flex items-center gap-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-3 text-sm text-[var(--text-muted)] md:col-span-2">
                    <input type="checkbox" checked={form.has_digital_document} onChange={(event) => setFormValue("has_digital_document", event.target.checked)} />
                    Saya sudah memiliki dokumen digital awal untuk pengajuan sakit ini
                  </label>
                ) : null}
              </div>

              <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleSubmit()}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Ajukan Sekarang
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <HeartPulse className="h-4 w-4 text-[var(--brand-800)]" />
              Detail Pengajuan
            </div>

            {isLoading ? (
              <div className="text-sm text-[var(--text-muted)]">Memuat pengajuan live dari Supabase...</div>
            ) : selectedRow ? (
              <>
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{selectedRow.employee_name}</div>
                  <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{selectedRow.type_label} | {selectedRow.reference_number}</div>
                </div>

                <div className="space-y-2 text-sm text-[var(--text-muted)]">
                  <div>Status: <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(selectedRow.status)}`}>{formatStatus(selectedRow.status)}</span></div>
                  <div>Periode: <span className="font-semibold text-[var(--text-main)]">{formatDate(selectedRow.start_date)}{selectedRow.start_date !== selectedRow.end_date ? ` - ${formatDate(selectedRow.end_date)}` : ""}</span></div>
                  <div>Durasi diajukan: <span className="font-semibold text-[var(--text-main)]">{selectedRow.requested_days} hari</span></div>
                  <div>Durasi disetujui: <span className="font-semibold text-[var(--text-main)]">{selectedRow.approved_days ?? "-"}</span></div>
                  <div>Potongan saldo reguler: <span className="font-semibold text-[var(--text-main)]">{selectedRow.deducted_leave_days} hari</span></div>
                  <div>Setengah hari: <span className="font-semibold text-[var(--text-main)]">{selectedRow.is_half_day ? `Ya (${selectedRow.half_day_slot})` : "Tidak"}</span></div>
                  <div>Reviewer aktif: <span className="font-semibold text-[var(--text-main)]">{selectedRow.reviewer_name || (selectedRow.reviewer_role === "hr" ? "HR" : "Atasan")}</span></div>
                  <div>Submit: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.submitted_at)}</span></div>
                  <div>Diputuskan: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.decided_at)}</span></div>
                  {selectedRow.request_domain === "sakit" ? (
                    <>
                      <div>Dokumen digital awal: <span className="font-semibold text-[var(--text-main)]">{selectedRow.has_digital_document ? "Ada" : "Belum"}</span></div>
                      <div>Dokumen fisik diterima: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.physical_document_received_at)}</span></div>
                    </>
                  ) : null}
                </div>

                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Alasan pengajuan</div>
                  <div className="mt-2">{selectedRow.reason}</div>
                </div>

                {selectedRow.additional_note ? (
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Catatan tambahan</div>
                    <div className="mt-2">{selectedRow.additional_note}</div>
                  </div>
                ) : null}

                {selectedRow.attachment_note ? (
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Catatan lampiran</div>
                    <div className="mt-2">{selectedRow.attachment_note}</div>
                  </div>
                ) : null}

                {selectedRow.fallback_reason ? (
                  <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                    {selectedRow.fallback_reason}
                  </div>
                ) : null}

                {canReviewAsSupervisor || canReviewAsHrFallback ? (
                  <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-main)]">
                      {canReviewAsHrFallback ? "Review Fallback HR" : "Review Atasan"}
                    </div>
                    <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} rows={4} placeholder="Catatan review..." className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]" />
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
                ) : null}

                {canHandleSickAdmin ? (
                  <div className="space-y-3 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                      <Stethoscope className="h-4 w-4 text-[var(--brand-800)]" />
                      Kontrol HR Untuk Sakit
                    </div>
                    <textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} rows={4} placeholder="Catatan administrasi HR..." className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]" />
                    <div className="flex flex-wrap gap-2">
                      {selectedRow.status === "menunggu_dokumen_fisik" ? (
                        <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("receive-physical")}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Dokumen Fisik Diterima
                        </Button>
                      ) : null}
                      {["menunggu_dokumen_fisik", "dokumen_fisik_diterima_hr"].includes(selectedRow.status) ? (
                        <Button variant="outline" className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("verify")}>
                          <CircleHelp className="mr-2 h-4 w-4" />
                          Tandai Perlu Verifikasi
                        </Button>
                      ) : null}
                      {["dokumen_fisik_diterima_hr", "perlu_verifikasi_hr"].includes(selectedRow.status) ? (
                        <Button className="rounded-[10px]" disabled={isSaving} onClick={() => void handleReviewAction("finalize-sick")}>
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          Finalisasi Administratif
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {access.role === "hr" && !canReviewAsHrFallback && !canHandleSickAdmin ? (
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                    Mode HR pada fase ini memonitor semua data, menangani fallback reviewer jika atasan tidak tersedia, dan menyelesaikan administrasi sakit dasar.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Pilih satu pengajuan di list untuk melihat detail, review, dan audit trail.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <WalletCards className="h-4 w-4 text-[var(--brand-800)]" />
              Saldo Cuti Live
            </div>
            {leaveBalance ? (
              <div className="space-y-3">
                <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{leaveBalance.policy_name}</div>
                  <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">Saldo dihitung live dari policy aktif dikurangi cuti reguler berstatus disetujui.</div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">
                    Kuota tahunan: <span className="font-semibold text-[var(--text-main)]">{leaveBalance.annual_quota_days} hari</span>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">
                    Sudah terpakai: <span className="font-semibold text-[var(--text-main)]">{leaveBalance.used_days} hari</span>
                  </div>
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">
                    Tersisa: <span className="font-semibold text-[var(--text-main)]">{leaveBalance.available_days} hari</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">
                {form.request_domain === "cuti_reguler"
                  ? "Saldo cuti live akan muncul setelah tanggal mulai terisi dan policy aktif tersedia."
                  : "Saldo cuti live hanya ditampilkan untuk pengajuan Cuti Reguler."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-800)]" />
              Audit Trail
            </div>
            {logs.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">Audit trail pengajuan akan muncul setelah pengajuan atau aksi review dijalankan.</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-main)]">{formatAuditAction(log.action_type)}</div>
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
    </div>
  );
}
