import { useEffect, useMemo, useState } from "react";
import { Archive, CalendarDays, CheckCircle2, Lock, Plus, Search, ShieldAlert, Trash2, UserRoundMinus, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { employeeDirectory, offboardingDirectory, offboardingQuickTabs } from "@/data";
import { getEmployeeList, updateEmployee } from "@/services/employeeService";
import { createOffboardingProcess, getOffboardingProcesses, updateOffboardingProcess } from "@/services/offboardingService";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const emptyFilters = { statusProses: "Semua status proses", usaha: "Semua cabang" };
const createFormTemplate = {
  employeeRowId: "",
  employeeId: "",
  namaLengkap: "",
  jabatan: "",
  divisi: "",
  namaUsaha: "",
  namaCabang: "",
  alasanKeluar: "Mengundurkan diri",
  tanggalPengajuanKeluar: new Date().toISOString().slice(0, 10),
  hariKerjaTerakhir: new Date().toISOString().slice(0, 10),
  penanggungJawab: "Tim HR",
  catatanHr: "",
};
const defaultChecklist = [
  { label: "Pengajuan keluar sudah dicatat", done: true, group: "Status keluar", isCustom: false },
  { label: "Hari kerja terakhir sudah ditentukan", done: true, group: "Status keluar", isCustom: false },
  { label: "Persetujuan atasan sudah ada", done: false, group: "Status keluar", isCustom: false },
  { label: "Alasan keluar sudah dicatat", done: true, group: "Status keluar", isCustom: false },
  { label: "Laptop / HP kerja sudah kembali", done: false, group: "Aset & akses", isCustom: false },
  { label: "Akun email / sistem sudah ditutup", done: false, group: "Aset & akses", isCustom: false },
  { label: "Status karyawan sudah dinonaktifkan", done: false, group: "Dokumen akhir", isCustom: false },
];
const checklistGroups = ["Status keluar", "Aset & akses", "Dokumen akhir"];

function formatDate(value) {
  return !value || value === "-" ? "-" : dateFormatter.format(new Date(value));
}

function matchQuickTab(item, tabKey) {
  if (tabKey === "akan-keluar") return item.statusProses === "Akan keluar";
  if (tabKey === "sedang-diproses") return item.statusProses === "Sedang diproses";
  if (tabKey === "belum-lengkap") return item.statusProses === "Belum lengkap";
  if (tabKey === "sudah-selesai") return item.statusProses === "Sudah selesai";
  return true;
}

function buildOffboardingAlert(item) {
  if (item.statusAkses === "Belum ditutup") return { level: "critical", title: "Akses kerja belum ditutup", description: "Perlu tindakan cepat agar akun dan akses operasional tidak tertinggal." };
  if (item.statusAset === "Belum kembali") return { level: "critical", title: "Aset kerja belum kembali", description: "Pastikan semua aset ditagih sebelum proses keluar dinyatakan selesai." };
  if (item.statusProses === "Belum lengkap") return { level: "warning", title: "Proses keluar belum lengkap", description: "Masih ada checklist penting yang perlu dirapikan oleh HR atau atasan." };
  if (item.statusProses === "Akan keluar") return { level: "warning", title: "Hari kerja terakhir sudah dekat", description: "Pastikan aset, akses, dan surat akhir sudah dijadwalkan." };
  return null;
}

function normalizeChecklist(checklist) {
  return (checklist || []).map((item) => ({ ...item, isCustom: Boolean(item.isCustom) }));
}

function isChecklistComplete(checklist) {
  const items = checklist || [];
  return items.length > 0 && items.every((item) => item.done);
}

function getGroupProgress(checklist, group) {
  const items = (checklist || []).filter((item) => item.group === group);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}

function deriveDocumentStatus({ checklistComplete, paklaringReady, documentDone }) {
  if (paklaringReady) return "Siap dikirim";
  if (checklistComplete) return "Siap buat paklaring";
  if (documentDone > 0) return "Sedang dirapikan";
  return "Belum dibuat";
}

function enrichItem(item) {
  const checklist = normalizeChecklist(item.checklist);
  return { ...item, checklist, alert: buildOffboardingAlert({ ...item, checklist }) };
}

function summarizeChecklist(item, checklist) {
  const statusProgress = getGroupProgress(checklist, "Status keluar");
  const assetProgress = getGroupProgress(checklist, "Aset & akses");
  const documentProgress = getGroupProgress(checklist, "Dokumen akhir");
  const checklistComplete = isChecklistComplete(checklist);
  const employeeDeactivated = checklist.some((check) => check.label === "Status karyawan sudah dinonaktifkan" && check.done);

  return {
    checklistComplete,
    processStatus: checklistComplete ? "Sudah selesai" : statusProgress.done > 0 ? "Sedang diproses" : "Akan keluar",
    assetStatus: assetProgress.total && assetProgress.done === assetProgress.total ? "Sudah kembali" : assetProgress.done > 0 ? "Sebagian sudah kembali" : "Belum kembali",
    accessStatus: assetProgress.total && assetProgress.done === assetProgress.total ? "Sudah ditutup" : assetProgress.done > 0 ? "Sebagian sudah ditutup" : "Belum ditutup",
    finalDocumentStatus: deriveDocumentStatus({ checklistComplete, paklaringReady: Boolean(item.paklaringSiap), documentDone: documentProgress.done }),
    handoverReportReady: documentProgress.total > 0 && documentProgress.done === documentProgress.total,
    employeeDeactivated,
    supervisorApproval: checklist.some((check) => check.label === "Persetujuan atasan sudah ada" && check.done) ? "Sudah ada" : "Menunggu persetujuan",
    needsAttention: !checklistComplete,
  };
}

function applyChecklistSummary(item, checklist) {
  const normalizedChecklist = normalizeChecklist(checklist);
  const summary = summarizeChecklist(item, normalizedChecklist);
  return enrichItem({
    ...item,
    checklist: normalizedChecklist,
    statusProses: summary.processStatus,
    statusAset: summary.assetStatus,
    statusAkses: summary.accessStatus,
    statusSuratAkhir: summary.finalDocumentStatus,
    beritaAcaraSiap: summary.handoverReportReady,
    statusKaryawanSudahNonaktif: summary.employeeDeactivated,
    persetujuanAtasan: summary.supervisorApproval,
    perluPerhatian: summary.needsAttention,
  });
}

function mapDbRowToProcess(item) {
  return enrichItem({
    id: item.id,
    sourceEmployeeRowId: item.source_employee_row_id,
    employeeId: item.employee_code,
    namaLengkap: item.employee_name,
    jabatan: item.job_title,
    divisi: item.division_name,
    namaUsaha: item.business_name,
    namaCabang: item.branch_name,
    alasanKeluar: item.exit_reason,
    tanggalPengajuanKeluar: item.exit_request_date,
    hariKerjaTerakhir: item.last_working_date,
    persetujuanAtasan: item.supervisor_approval,
    statusProses: item.process_status,
    statusAset: item.asset_status,
    statusAkses: item.access_status,
    statusSuratAkhir: item.final_document_status,
    paklaringSiap: item.certificate_ready,
    beritaAcaraSiap: item.handover_report_ready,
    statusKaryawanSudahNonaktif: item.employee_deactivated,
    penanggungJawab: item.owner_name,
    catatanHr: item.hr_note,
    asetKerja: item.asset_note,
    aksesKerja: item.access_note,
    suratAkhir: item.final_letter_note,
    checklist: item.checklist || [],
    perluPerhatian: item.needs_attention,
    linkedModules: item.linked_modules || [],
  });
}

function mapProcessToPayload(item) {
  return {
    source_employee_row_id: item.sourceEmployeeRowId || null,
    employee_code: item.employeeId,
    employee_name: item.namaLengkap,
    job_title: item.jabatan || "-",
    division_name: item.divisi || "-",
    business_name: item.namaUsaha || "Perusahaan",
    branch_name: item.namaCabang || "-",
    exit_reason: item.alasanKeluar || "-",
    exit_request_date: item.tanggalPengajuanKeluar || null,
    last_working_date: item.hariKerjaTerakhir || null,
    supervisor_approval: item.persetujuanAtasan || "Menunggu persetujuan",
    process_status: item.statusProses || "Akan keluar",
    asset_status: item.statusAset || "Belum kembali",
    access_status: item.statusAkses || "Belum ditutup",
    final_document_status: item.statusSuratAkhir || "Belum dibuat",
    certificate_ready: Boolean(item.paklaringSiap),
    handover_report_ready: Boolean(item.beritaAcaraSiap),
    employee_deactivated: Boolean(item.statusKaryawanSudahNonaktif),
    owner_name: item.penanggungJawab || "Tim HR",
    hr_note: item.catatanHr || "",
    asset_note: item.asetKerja || "",
    access_note: item.aksesKerja || "",
    final_letter_note: item.suratAkhir || "",
    checklist: item.checklist || [],
    linked_modules: item.linkedModules || [],
    needs_attention: Boolean(item.perluPerhatian),
  };
}

function SummaryCard({ icon: Icon, label, value, note }) {
  return <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex items-start justify-between gap-3 p-5"><div><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div><div className="mt-2 text-sm text-slate-500">{note}</div></div><div className="rounded-2xl bg-slate-50 p-3 text-slate-700"><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function FilterSelect({ value, onChange, options }) {
  return <select value={value} onChange={onChange} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function ProgressStrip({ progress }) {
  return (
    <div className="space-y-1.5">
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="text-xs text-slate-500">
        {progress.done}/{progress.total} selesai
      </div>
    </div>
  );
}

function buildFallbackEmployeeOptions() {
  return employeeDirectory.map((item) => ({ rowId: "", employeeId: item.employeeId, namaLengkap: item.namaLengkap, jabatan: item.jabatan, divisi: item.divisi, namaUsaha: item.namaUsaha, namaCabang: item.namaCabang, atasan: item.atasanLangsung, statusKaryawan: item.statusAktif }));
}

export default function OffboardingPage() {
  const [rows, setRows] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(createFormTemplate);
  const [offboardingTableReady, setOffboardingTableReady] = useState(false);
  const [customChecklistInputs, setCustomChecklistInputs] = useState({});

  const selectedProcess = useMemo(() => rows.find((item) => item.id === selectedProcessId) || null, [rows, selectedProcessId]);

  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        const employees = await getEmployeeList();
        if (!isMounted) return;
        const mapped = employees.map((item) => ({ rowId: String(item.id), employeeId: item.employee_id, namaLengkap: item.nama_lengkap, jabatan: item.jabatan, divisi: item.departemen, namaUsaha: item.nama_usaha, namaCabang: item.cabang, atasan: item.atasan, statusKaryawan: item.status_karyawan }));
        setEmployeeOptions((current) => {
          return mapped;
        });
      } catch (error) {
        console.warn("Lookup karyawan untuk offboarding belum berhasil dimuat.", error);
      }
    }
    void loadEmployees();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadRows() {
      try {
        const records = await getOffboardingProcesses();
        if (!isMounted) return;
        setRows(records.map(mapDbRowToProcess));
        setOffboardingTableReady(true);
      } catch (error) {
        console.warn("Load offboarding dari database belum berhasil.", error);
        if (isMounted) {
          setRows([]);
          setOffboardingTableReady(false);
          setFeedback({ type: "error", message: "Daftar proses keluar belum berhasil dimuat dari Supabase." });
        }
      }
    }
    void loadRows();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filterOptions = useMemo(() => ({ usaha: ["Semua cabang", ...new Set(rows.map((item) => item.namaCabang))], statusProses: ["Semua status proses", "Akan keluar", "Sedang diproses", "Belum lengkap", "Sudah selesai"] }), [rows]);
  const summaryCards = useMemo(() => [
    { label: "Total proses keluar", value: rows.length, note: "Semua proses keluar dipantau di satu tempat.", icon: UserRoundMinus },
    { label: "Akan keluar", value: rows.filter((item) => item.statusProses === "Akan keluar").length, note: "Hari kerja terakhir sudah dekat.", icon: CalendarDays },
    { label: "Belum lengkap", value: rows.filter((item) => item.statusProses === "Belum lengkap").length, note: "Masih ada langkah penting yang tertahan.", icon: ShieldAlert },
    { label: "Sudah selesai", value: rows.filter((item) => item.statusProses === "Sudah selesai").length, note: "Siap masuk arsip akhir.", icon: CheckCircle2 },
  ], [rows]);
  const quickTabCounts = useMemo(() => Object.fromEntries(offboardingQuickTabs.map((tab) => [tab.key, rows.filter((item) => matchQuickTab(item, tab.key)).length])), [rows]);
  const filteredProcesses = useMemo(() => rows.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!matchQuickTab(item, activeTab)) return false;
    if (filters.usaha !== "Semua cabang" && item.namaCabang !== filters.usaha) return false;
    if (filters.statusProses !== "Semua status proses" && item.statusProses !== filters.statusProses) return false;
    return !term || [item.employeeId, item.namaLengkap, item.jabatan, item.namaCabang, item.alasanKeluar, item.penanggungJawab].join(" ").toLowerCase().includes(term);
  }), [activeTab, filters, rows, search]);
  const priorityRows = useMemo(() => rows.filter((item) => item.alert).slice(0, 3), [rows]);
  const availableEmployees = useMemo(() => {
    const usedIds = new Set(rows.map((item) => String(item.employeeId || "").trim().toLowerCase()));
    return employeeOptions.filter((item) => {
      const employeeId = String(item.employeeId || "").trim().toLowerCase();
      return employeeId && !usedIds.has(employeeId) && String(item.statusKaryawan || "").trim().toLowerCase() !== "nonaktif";
    });
  }, [employeeOptions, rows]);

  function upsertRow(nextRow) {
    setRows((current) => [nextRow, ...current.filter((item) => item.id !== nextRow.id)].sort((left, right) => String(right.hariKerjaTerakhir || "").localeCompare(String(left.hariKerjaTerakhir || ""))));
    setSelectedProcessId(nextRow.id);
  }

  async function persistRow(nextRow, message) {
    try {
      let saved = nextRow;
      if (typeof nextRow.id === "number") {
        const updated = await updateOffboardingProcess(nextRow.id, mapProcessToPayload(nextRow));
        if (updated) saved = mapDbRowToProcess(updated);
      } else {
        const created = await createOffboardingProcess(mapProcessToPayload(nextRow));
        if (created) saved = mapDbRowToProcess(created);
      }
      setOffboardingTableReady(true);
      upsertRow(saved);
      setFeedback({ type: "success", message });
      return saved;
    } catch (error) {
      console.error("Simpan offboarding gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Proses keluar belum berhasil disimpan." });
      return null;
    }
  }

  async function handleCreateProcess() {
    if (!createForm.employeeId || !createForm.namaLengkap || !createForm.hariKerjaTerakhir) {
      setFeedback({ type: "error", message: "Pilih karyawan dan isi hari kerja terakhir sebelum menyimpan." });
      return;
    }
    const draft = enrichItem({ id: `off-${Date.now()}`, sourceEmployeeRowId: createForm.employeeRowId ? Number(createForm.employeeRowId) : null, employeeId: createForm.employeeId, namaLengkap: createForm.namaLengkap, jabatan: createForm.jabatan, divisi: createForm.divisi, namaUsaha: createForm.namaUsaha, namaCabang: createForm.namaCabang, alasanKeluar: createForm.alasanKeluar, tanggalPengajuanKeluar: createForm.tanggalPengajuanKeluar, hariKerjaTerakhir: createForm.hariKerjaTerakhir, persetujuanAtasan: "Menunggu persetujuan", statusProses: "Akan keluar", statusAset: "Belum kembali", statusAkses: "Belum ditutup", statusSuratAkhir: "Belum dibuat", paklaringSiap: false, beritaAcaraSiap: false, statusKaryawanSudahNonaktif: false, penanggungJawab: createForm.penanggungJawab || "Tim HR", catatanHr: createForm.catatanHr || "Proses offboarding baru dibuat dan siap ditindaklanjuti oleh HR.", asetKerja: "Daftar aset kerja belum diisi.", aksesKerja: "Akses kerja belum ditutup.", suratAkhir: "Dokumen akhir belum dibuat.", checklist: defaultChecklist, perluPerhatian: true, linkedModules: ["Data Karyawan", "Surat & Pengumuman", "Penggajian", "Karyawan Keluar"] });
    const saved = await persistRow(draft, `Proses keluar ${createForm.namaLengkap} berhasil ditambahkan.`);
    if (saved) {
      setShowCreateModal(false);
      setCreateForm(createFormTemplate);
    }
  }

  async function applyAction(item, action) {
    let nextRow = item;
    let message = "Perubahan proses keluar berhasil disimpan.";
    if (action === "start") {
      nextRow = applyChecklistSummary(item, item.checklist.map((check) => check.label === "Persetujuan atasan sudah ada" ? { ...check, done: true } : check));
      message = `${item.namaLengkap} dipindahkan ke status sedang diproses.`;
    }
    if (action === "paklaring") {
      if (!isChecklistComplete(item.checklist)) {
        setFeedback({ type: "error", message: `Checklist ${item.namaLengkap} belum lengkap. Paklaring baru bisa dibuat setelah semua checklist selesai.` });
        return;
      }
      nextRow = enrichItem({ ...item, paklaringSiap: true, beritaAcaraSiap: true, statusSuratAkhir: "Siap dikirim", suratAkhir: "Paklaring sudah dibuat dan siap dikirim/diarsipkan." });
      message = `Paklaring ${item.namaLengkap} berhasil dibuka dan ditandai siap dikirim.`;
    }
    if (action === "complete") {
      nextRow = applyChecklistSummary(item, item.checklist.map((check) => ({ ...check, done: true })));
      nextRow = enrichItem({ ...nextRow, asetKerja: "Semua aset kerja sudah kembali dan diverifikasi.", aksesKerja: "Seluruh akses kerja sudah ditutup oleh HR/Admin." });
      message = `${item.namaLengkap} berhasil ditandai selesai.`;
    }
    const saved = await persistRow(nextRow, message);
    await syncEmployeeStatus(saved);
  }

  async function toggleChecklistItem(processId, label) {
    const current = rows.find((item) => item.id === processId);
    if (!current || isChecklistComplete(current.checklist)) return;

    const nextChecklist = current.checklist.map((item) => (item.label === label ? { ...item, done: !item.done } : item));
    let nextRow = applyChecklistSummary(current, nextChecklist);

    if (label === "Akun email / sistem sudah ditutup" && nextChecklist.find((item) => item.label === label)?.done) {
      nextRow = enrichItem({ ...nextRow, aksesKerja: "Akun email dan sistem utama sudah ditutup." });
    }

    const saved = await persistRow(nextRow, `Checklist ${current.namaLengkap} berhasil diperbarui.`);
    await syncEmployeeStatus(saved);
  }

  async function addCustomChecklistItem(processId, group) {
    const current = rows.find((item) => item.id === processId);
    const label = String(customChecklistInputs[group] || "").trim();
    if (!current || !label) return;
    if (isChecklistComplete(current.checklist)) {
      setFeedback({ type: "error", message: "Checklist sudah terkunci. Tambahan item baru hanya bisa dilakukan sebelum semua checklist selesai." });
      return;
    }

    const nextChecklist = [...current.checklist, { label, done: false, group, isCustom: true }];
    const saved = await persistRow(applyChecklistSummary(current, nextChecklist), `Checklist custom untuk grup ${group} berhasil ditambahkan.`);
    if (saved) {
      setCustomChecklistInputs((currentState) => ({ ...currentState, [group]: "" }));
    }
  }

  async function removeChecklistItem(processId, label) {
    const current = rows.find((item) => item.id === processId);
    if (!current || isChecklistComplete(current.checklist)) return;
    const nextChecklist = current.checklist.filter((item) => item.label !== label);
    await persistRow(applyChecklistSummary(current, nextChecklist), `Item checklist ${current.namaLengkap} berhasil dihapus.`);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionTitle title="Karyawan Keluar" subtitle="Pantau proses keluar karyawan dari pengajuan, penutupan akses, pengembalian aset, sampai arsip akhir di satu halaman." />
          <Button className="rounded-xl" onClick={() => setShowCreateModal(true)}><UserRoundMinus className="mr-2 h-4 w-4" />Tambah Proses Keluar</Button>
        </div>
        {!offboardingTableReady ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Daftar offboarding belum berhasil dimuat dari Supabase. Periksa koneksi atau tabel `hr_offboarding_processes`.</div> : null}
        {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{feedback.message}</div> : null}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, ID, jabatan, cabang, alasan keluar" className="rounded-xl border-slate-200 bg-white pl-9" /></div>
          <FilterSelect value={filters.usaha} onChange={(event) => setFilters((current) => ({ ...current, usaha: event.target.value }))} options={filterOptions.usaha} />
          <FilterSelect value={filters.statusProses} onChange={(event) => setFilters((current) => ({ ...current, statusProses: event.target.value }))} options={filterOptions.statusProses} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>

      {priorityRows.length ? <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="space-y-3 p-5"><div><div className="text-lg font-semibold text-slate-900">Prioritas proses keluar</div><div className="mt-1 text-sm text-slate-500">Daftar yang paling butuh tindakan cepat dari HR.</div></div><div className="grid gap-3">{priorityRows.map((item) => <div key={item.id} className={`rounded-2xl border px-4 py-3 ${item.alert.level === "critical" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><div className={`text-sm font-semibold ${item.alert.level === "critical" ? "text-rose-800" : "text-amber-800"}`}>{item.namaLengkap} - {item.jabatan}</div><div className={`mt-1 text-sm ${item.alert.level === "critical" ? "text-rose-700" : "text-amber-700"}`}>{item.alert.title}. {item.alert.description}</div></div><div className="flex flex-wrap gap-2"><StatusBadge value={item.statusProses} /><StatusBadge value={item.statusAkses} /></div></div></div>)}</div></CardContent></Card> : null}

      <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex flex-wrap gap-2 p-4">{offboardingQuickTabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${tab.key === activeTab ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{tab.label} ({quickTabCounts[tab.key] || 0})</button>)}</CardContent></Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="space-y-3 p-5">{filteredProcesses.map((item) => { const checklistLocked = isChecklistComplete(item.checklist); return <div key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="space-y-3"><div className="flex flex-wrap items-start gap-3"><div><div className="text-lg font-semibold text-slate-900">{item.namaLengkap}</div><div className="text-sm text-slate-500">{item.employeeId} - {item.jabatan} - {item.namaCabang}</div></div><StatusBadge value={item.statusProses} />{checklistLocked ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Checklist terkunci</span> : null}</div><div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Alasan keluar</div><div className="mt-1 font-medium text-slate-700">{item.alasanKeluar}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Hari kerja terakhir</div><div className="mt-1 font-medium text-slate-700">{formatDate(item.hariKerjaTerakhir)}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status aset</div><div className="mt-1 font-medium text-slate-700">{item.statusAset}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status akses</div><div className="mt-1 font-medium text-slate-700">{item.statusAkses}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Dokumen akhir</div><div className="mt-1 font-medium text-slate-700">{item.statusSuratAkhir}</div></div></div>{item.alert ? <div className={`rounded-xl border px-3 py-2 text-sm leading-6 ${item.alert.level === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="font-semibold">{item.alert.title}</span> {item.alert.description}</div> : null}</div><div className="flex flex-wrap gap-2 xl:max-w-[360px] xl:justify-end"><Button variant="outline" className="rounded-xl" onClick={() => setSelectedProcessId(item.id)}>Lihat detail</Button><Button variant="outline" className="rounded-xl" onClick={() => void applyAction(item, "start")} disabled={checklistLocked}>Lengkapi proses</Button><Button variant="outline" className="rounded-xl" onClick={() => void applyAction(item, "paklaring")} disabled={!checklistLocked || item.paklaringSiap}>{item.paklaringSiap ? "Paklaring siap" : "Buat paklaring"}</Button><Button variant="outline" className="rounded-xl" onClick={() => void applyAction(item, "complete")} disabled={checklistLocked}>Tandai selesai</Button></div></div></div>; })}{filteredProcesses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{offboardingTableReady ? "Belum ada proses karyawan keluar di database. Klik `Tambah Proses Keluar` untuk mulai mencatat offboarding." : "Daftar offboarding belum tersedia karena koneksi Supabase atau tabel offboarding masih bermasalah."}</div> : null}</CardContent></Card>

      {selectedProcess ? (() => { const checklistLocked = isChecklistComplete(selectedProcess.checklist); return <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]"><div className="h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4"><div><div className="text-xl font-semibold text-slate-900">{selectedProcess.namaLengkap}</div><div className="mt-1 text-sm text-slate-500">{selectedProcess.employeeId} - {selectedProcess.jabatan} - {selectedProcess.namaCabang}</div></div><button type="button" onClick={() => setSelectedProcessId(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><div className="flex flex-wrap gap-2"><StatusBadge value={selectedProcess.statusProses} /><StatusBadge value={selectedProcess.statusAset} /><StatusBadge value={selectedProcess.statusAkses} /><StatusBadge value={selectedProcess.statusSuratAkhir} /></div>{checklistLocked ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><div className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" />Checklist sudah lengkap dan otomatis dikunci.</div><div className="mt-1">Akses pembuatan paklaring sekarang terbuka. Checklist tidak bisa diubah lagi agar arsip tetap konsisten.</div></div> : <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Checklist masih berjalan. Paklaring baru bisa dibuat setelah semua checklist selesai.</div>}<div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm font-medium text-slate-700">Data proses keluar</div><div className="mt-3 space-y-2 text-sm text-slate-600"><div>Alasan keluar: {selectedProcess.alasanKeluar}</div><div>Tanggal pengajuan: {formatDate(selectedProcess.tanggalPengajuanKeluar)}</div><div>Hari kerja terakhir: {formatDate(selectedProcess.hariKerjaTerakhir)}</div><div>Penanggung jawab: {selectedProcess.penanggungJawab}</div><div>Persetujuan atasan: {selectedProcess.persetujuanAtasan}</div></div></div><div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm font-medium text-slate-700">Status proses</div><div className="mt-3 space-y-2 text-sm text-slate-600"><div>Aset kerja: {selectedProcess.asetKerja}</div><div>Akses kerja: {selectedProcess.aksesKerja}</div><div>Surat akhir: {selectedProcess.suratAkhir}</div><div>Paklaring: {selectedProcess.paklaringSiap ? "Sudah siap" : "Belum siap"}</div><div>Status karyawan: {selectedProcess.statusKaryawanSudahNonaktif ? "Sudah nonaktif" : "Masih aktif"}</div></div></div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div className="text-sm font-medium text-slate-800">Checklist fleksibel</div><div className="text-xs uppercase tracking-[0.16em] text-slate-400">HR bisa tambah & hapus item</div></div><div className="mt-4 space-y-5">{checklistGroups.map((group) => { const progress = getGroupProgress(selectedProcess.checklist, group); return <div key={group} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><div className="text-sm font-semibold text-slate-800">{group}</div><div className="mt-1 text-xs text-slate-500">Progress grup ini ikut memengaruhi status proses.</div></div><div className="w-full max-w-[220px]"><ProgressStrip progress={progress} /></div></div><div className="space-y-2">{selectedProcess.checklist.filter((item) => item.group === group).map((item) => <div key={item.label} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${item.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><button type="button" onClick={() => void toggleChecklistItem(selectedProcess.id, item.label)} disabled={checklistLocked} className="flex flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-70"><CheckCircle2 className={`h-4 w-4 ${item.done ? "text-emerald-600" : "text-slate-300"}`} /><span className="flex-1">{item.label}</span><span className="text-xs font-medium">{item.done ? "Selesai" : "Belum"}</span></button><button type="button" onClick={() => void removeChecklistItem(selectedProcess.id, item.label)} disabled={checklistLocked} className="rounded-lg border border-slate-200 p-1 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div><div className="flex flex-col gap-2 md:flex-row"><Input value={customChecklistInputs[group] || ""} onChange={(event) => setCustomChecklistInputs((current) => ({ ...current, [group]: event.target.value }))} placeholder={`Tambah item custom untuk ${group.toLowerCase()}`} className="rounded-xl border-slate-200" disabled={checklistLocked} /><Button variant="outline" className="rounded-xl" onClick={() => void addCustomChecklistItem(selectedProcess.id, group)} disabled={checklistLocked || !String(customChecklistInputs[group] || "").trim()}><Plus className="mr-2 h-4 w-4" />Tambah item</Button></div></div>; })}</div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="text-sm font-medium text-slate-800">Catatan HR</div><div className="mt-2 text-sm leading-6 text-slate-600">{selectedProcess.catatanHr || "Belum ada catatan tambahan."}</div></div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5"><Button variant="outline" className="rounded-xl" onClick={() => void applyAction(selectedProcess, "paklaring")} disabled={!checklistLocked || selectedProcess.paklaringSiap}>{selectedProcess.paklaringSiap ? "Paklaring siap dikirim" : "Buka akses buat paklaring"}</Button></div></div></div></div>; })() : null}

      {showCreateModal ? <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/35 p-4"><div className="mx-auto w-full max-w-3xl rounded-[24px] border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><div className="text-lg font-semibold text-slate-900">Tambah proses keluar</div><div className="mt-1 text-sm leading-6 text-slate-500">Pilih karyawan aktif, isi alasan keluar, lalu simpan agar proses offboarding langsung tercatat.</div></div><button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"><X className="h-4 w-4" /></button></div><div className="grid gap-4 px-5 py-5 md:grid-cols-2"><div className="md:col-span-2"><div className="mb-2 text-sm font-medium text-slate-700">Pilih karyawan</div><select value={createForm.employeeId} onChange={(event) => { const selected = availableEmployees.find((item) => item.employeeId === event.target.value); if (!selected) { setCreateForm(createFormTemplate); return; } setCreateForm((current) => ({ ...current, employeeRowId: selected.rowId, employeeId: selected.employeeId, namaLengkap: selected.namaLengkap, jabatan: selected.jabatan, divisi: selected.divisi, namaUsaha: selected.namaUsaha, namaCabang: selected.namaCabang, penanggungJawab: selected.atasan || current.penanggungJawab })); }} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300"><option value="">Pilih karyawan aktif</option>{availableEmployees.map((item) => <option key={item.employeeId} value={item.employeeId}>{item.employeeId} - {item.namaLengkap} - {item.namaCabang}</option>)}</select></div><div><div className="mb-2 text-sm font-medium text-slate-700">Nama karyawan</div><Input value={createForm.namaLengkap} readOnly className="rounded-xl border-slate-200 bg-slate-50" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Jabatan</div><Input value={createForm.jabatan} readOnly className="rounded-xl border-slate-200 bg-slate-50" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Alasan keluar</div><Input value={createForm.alasanKeluar} onChange={(event) => setCreateForm((current) => ({ ...current, alasanKeluar: event.target.value }))} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Penanggung jawab</div><Input value={createForm.penanggungJawab} onChange={(event) => setCreateForm((current) => ({ ...current, penanggungJawab: event.target.value }))} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal pengajuan keluar</div><Input type="date" value={createForm.tanggalPengajuanKeluar} onChange={(event) => setCreateForm((current) => ({ ...current, tanggalPengajuanKeluar: event.target.value }))} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Hari kerja terakhir</div><Input type="date" value={createForm.hariKerjaTerakhir} onChange={(event) => setCreateForm((current) => ({ ...current, hariKerjaTerakhir: event.target.value }))} className="rounded-xl border-slate-200" /></div><div className="md:col-span-2"><div className="mb-2 text-sm font-medium text-slate-700">Catatan HR awal</div><textarea value={createForm.catatanHr} onChange={(event) => setCreateForm((current) => ({ ...current, catatanHr: event.target.value }))} rows={4} className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300" /></div></div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4"><Button variant="outline" className="rounded-xl" onClick={() => setShowCreateModal(false)}>Tutup</Button><Button className="rounded-xl" onClick={() => void handleCreateProcess()}>Simpan proses keluar</Button></div></div></div> : null}
    </div>
  );
}
