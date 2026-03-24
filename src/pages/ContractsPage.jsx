import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Download, FileSignature, FileText, Plus, Search, ShieldAlert, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contractDataFields, contractDirectory, contractModuleLinks, contractQuickTabs, employeeDirectory } from "@/data";
import { getEmployeeList, updateEmployee } from "@/services/employeeService";
import { createHrContract, getHrContracts, updateHrContract } from "@/services/contractService";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

const emptyFilters = {
  usaha: "Semua usaha",
  statusKontrak: "Semua status kontrak",
  statusKerja: "Semua status kerja",
  tanggalBerakhir: "Semua tanggal berakhir",
  penanggungJawab: "Semua penanggung jawab",
};

const decisionOptions = ["Masih dipertimbangkan", "Perpanjang", "Jadikan tetap", "Selesai"];
const signingOptions = ["Belum ditandatangani", "Siap ditandatangani", "Sudah ditandatangani"];
const contractStatusOptions = ["Belum dibuat", "Aktif", "Akan habis", "Sudah lewat", "Selesai"];

const createFormTemplate = {
  sourceEmployeeRowId: "",
  employeeId: "",
  namaLengkap: "",
  jabatan: "",
  divisi: "",
  namaUsaha: "Perusahaan Aktif",
  namaCabang: "",
  statusKerja: "Kontrak",
  nomorKontrak: "",
  jenisKontrak: "PKWT 12 bulan",
  tanggalMulai: new Date().toISOString().slice(0, 10),
  tanggalBerakhir: "",
  masaKontrakBulan: 12,
  gajiPokok: "",
  tunjanganUtama: "",
  fileKontrak: "Belum ada file",
  statusKontrak: "Belum dibuat",
  statusTandaTangan: "Belum ditandatangani",
  tanggalReview: "",
  keputusanBerikutnya: "Masih dipertimbangkan",
  penanggungJawab: "Tim HR",
  catatanHr: "",
  linkedModules: ["Data Karyawan", "Penggajian", "Surat & Pengumuman"],
};

function formatDate(value) {
  if (!value || value === "-") return "-";
  return dateFormatter.format(new Date(value));
}

function diffDays(targetDate) {
  if (!targetDate) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

function buildReminder(item) {
  if (!item.tanggalBerakhir) return item.statusKontrak === "Belum dibuat" ? "Perlu dibuat minggu ini" : "Belum ada tanggal akhir kontrak";
  const remaining = diffDays(item.tanggalBerakhir);
  if (remaining === null) return "Pantau masa kontrak";
  if (remaining < 0) return "Sudah lewat masa kontrak";
  if (remaining === 0) return "Berakhir hari ini";
  if (remaining <= 30) return `Akan habis ${remaining} hari lagi`;
  return "Masih aktif";
}

function inferContractStatus(item) {
  if (item.statusKontrak === "Selesai") return "Selesai";
  if (!item.nomorKontrak || item.nomorKontrak === "-" || item.fileKontrak === "Belum ada file") return "Belum dibuat";
  const remaining = diffDays(item.tanggalBerakhir);
  if (remaining === null) return item.statusKontrak || "Aktif";
  if (remaining < 0) return "Sudah lewat";
  if (remaining <= 30) return "Akan habis";
  return "Aktif";
}

function buildContractAlert(item) {
  if (item.statusKontrak === "Sudah lewat") return { level: "critical", title: "Kontrak sudah lewat masa berlakunya", description: "Perlu keputusan cepat agar status kerja dan dokumen tidak menggantung." };
  if (item.statusKontrak === "Belum dibuat") return { level: "warning", title: "Kontrak belum dibuat", description: "Dokumen kontrak perlu disiapkan agar administrasi karyawan tetap rapi." };
  if (item.statusKontrak === "Akan habis" || item.keputusanBerikutnya === "Perpanjang") return { level: "warning", title: "Kontrak mendekati keputusan berikutnya", description: `Arah tindak lanjut saat ini: ${item.keputusanBerikutnya}.` };
  if (item.statusTandaTangan === "Belum ditandatangani") return { level: "warning", title: "Kontrak belum ditandatangani", description: "Follow up tanda tangan supaya dokumen aktif bisa dipakai operasional." };
  return null;
}

function enrichContract(item) {
  const statusKontrak = inferContractStatus(item);
  const reminder = buildReminder({ ...item, statusKontrak });
  return {
    ...item,
    statusKontrak,
    reminder,
    perluPerhatian: Boolean(item.perluPerhatian || statusKontrak !== "Aktif" || item.statusTandaTangan !== "Sudah ditandatangani"),
    alert: buildContractAlert({ ...item, statusKontrak }),
  };
}

function matchQuickTab(item, tabKey) {
  switch (tabKey) {
    case "aktif":
      return item.statusKontrak === "Aktif";
    case "belum-dibuat":
      return item.statusKontrak === "Belum dibuat";
    case "akan-habis":
      return item.statusKontrak === "Akan habis";
    case "perlu-diperpanjang":
      return item.keputusanBerikutnya === "Perpanjang";
    case "sudah-lewat":
      return item.statusKontrak === "Sudah lewat";
    case "selesai":
      return item.statusKontrak === "Selesai";
    default:
      return true;
  }
}

function buildContractNumber(employeeId, effectiveDate, rows) {
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  const monthCodes = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const prefix = employeeId ? String(employeeId).split("-")[0] || "HR" : "HR";
  const seq = String(rows.length + 1).padStart(3, "0");
  return `PKWT/${prefix}/${monthCodes[date.getMonth()]}/${date.getFullYear()}/${seq}`;
}

function buildFallbackEmployeeOptions() {
  return employeeDirectory.map((item) => ({
    rowId: "",
    employeeId: item.employeeId,
    namaLengkap: item.namaLengkap,
    jabatan: item.jabatan,
    divisi: item.divisi,
    namaUsaha: item.namaUsaha,
    namaCabang: item.namaCabang,
    statusKerja: item.statusAktif || "Aktif",
  }));
}

function mapDbRowToContract(item) {
  return enrichContract({
    id: item.id,
    sourceEmployeeRowId: item.source_employee_row_id,
    employeeId: item.employee_code,
    namaLengkap: item.employee_name,
    jabatan: item.job_title,
    divisi: item.division_name,
    namaUsaha: item.business_name,
    namaCabang: item.branch_name,
    statusKerja: item.employment_status,
    nomorKontrak: item.contract_number,
    jenisKontrak: item.contract_type,
    tanggalMulai: item.start_date,
    tanggalBerakhir: item.end_date,
    masaKontrakBulan: item.contract_months,
    gajiPokok: item.base_salary,
    tunjanganUtama: item.main_allowance,
    fileKontrak: item.contract_file,
    statusKontrak: item.contract_status,
    statusTandaTangan: item.signing_status,
    tanggalReview: item.review_date,
    keputusanBerikutnya: item.next_decision,
    penanggungJawab: item.owner_name,
    catatanHr: item.hr_note,
    reminder: item.reminder,
    perluPerhatian: item.needs_attention,
    linkedModules: item.linked_modules || [],
  });
}

function mapContractToPayload(item) {
  return {
    source_employee_row_id: item.sourceEmployeeRowId ? Number(item.sourceEmployeeRowId) : null,
    employee_code: item.employeeId || "",
    employee_name: item.namaLengkap || "",
    job_title: item.jabatan || "-",
    division_name: item.divisi || "-",
    business_name: item.namaUsaha || "Perusahaan",
    branch_name: item.namaCabang || "-",
    employment_status: item.statusKerja || "Kontrak",
    contract_number: item.nomorKontrak || "-",
    contract_type: item.jenisKontrak || "-",
    start_date: item.tanggalMulai || null,
    end_date: item.tanggalBerakhir || null,
    contract_months: Number(item.masaKontrakBulan || 0),
    base_salary: item.gajiPokok || "-",
    main_allowance: item.tunjanganUtama || "-",
    contract_file: item.fileKontrak || "Belum ada file",
    contract_status: item.statusKontrak || "Belum dibuat",
    signing_status: item.statusTandaTangan || "Belum ditandatangani",
    review_date: item.tanggalReview || null,
    next_decision: item.keputusanBerikutnya || "Masih dipertimbangkan",
    owner_name: item.penanggungJawab || "Tim HR",
    hr_note: item.catatanHr || "",
    reminder: item.reminder || "",
    needs_attention: Boolean(item.perluPerhatian),
    linked_modules: item.linkedModules || [],
  };
}

function createFormFromEmployee(employee, rows) {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 12);
  const next = {
    ...createFormTemplate,
    sourceEmployeeRowId: employee?.rowId ? String(employee.rowId) : "",
    employeeId: employee?.employeeId || "",
    namaLengkap: employee?.namaLengkap || "",
    jabatan: employee?.jabatan || "",
    divisi: employee?.divisi || "",
    namaUsaha: employee?.namaUsaha || "Perusahaan Aktif",
    namaCabang: employee?.namaCabang || "",
    statusKerja: employee?.statusKerja || "Kontrak",
    tanggalMulai: startDate,
    tanggalBerakhir: endDate.toISOString().slice(0, 10),
    tanggalReview: endDate.toISOString().slice(0, 10),
  };
  next.nomorKontrak = buildContractNumber(next.employeeId, next.tanggalMulai, rows);
  return enrichContract(next);
}

function createFormFromContract(item) {
  return enrichContract({
    ...createFormTemplate,
    ...item,
    sourceEmployeeRowId: item?.sourceEmployeeRowId ? String(item.sourceEmployeeRowId) : "",
  });
}

function buildContractArticles(item) {
  return [
    {
      title: "Pasal 1 - Penempatan",
      body: `${item.namaLengkap || "Karyawan"} ditempatkan sebagai ${item.jabatan || "jabatan terkait"} pada ${item.namaCabang || "unit kerja"} di ${item.namaUsaha || "perusahaan"}.`,
    },
    {
      title: "Pasal 2 - Masa Kerja",
      body: `Perjanjian ini berlaku sejak ${formatDate(item.tanggalMulai)} sampai dengan ${formatDate(item.tanggalBerakhir)} dengan jenis ${item.jenisKontrak || "-"}.`,
    },
    {
      title: "Pasal 3 - Kompensasi",
      body: `Gaji pokok yang disepakati adalah ${item.gajiPokok || "-"} dengan tunjangan utama ${item.tunjanganUtama || "-"}.`,
    },
    {
      title: "Pasal 4 - Ketentuan Lanjutan",
      body: `Status tanda tangan saat ini ${item.statusTandaTangan || "-"}, dan keputusan berikutnya diarahkan ke ${item.keputusanBerikutnya || "-"}.`,
    },
  ];
}

function buildContractPreviewText(item) {
  const articles = buildContractArticles(item);
  return [
    "PERJANJIAN KERJA",
    `${item.namaUsaha || "Perusahaan"}`,
    "",
    `Nomor Kontrak : ${item.nomorKontrak || "-"}`,
    `Unit Kerja    : ${item.namaCabang || "-"}`,
    `Status Kerja  : ${item.statusKerja || "-"}`,
    "",
    "PIHAK KEDUA",
    `${item.namaLengkap || "-"}`,
    `${item.employeeId || "-"}`,
    `${item.jabatan || "-"}`,
    "",
    ...articles.flatMap((article) => [article.title, article.body, ""]),
    "Catatan HR",
    item.catatanHr || "Tidak ada catatan tambahan.",
    "",
    `${item.namaCabang || "Unit kerja"}, ${formatDate(item.tanggalMulai)}`,
    "",
    "Pihak Perusahaan,",
    item.penanggungJawab || "Tim HR",
    "",
    "",
    "Pihak Karyawan,",
    item.namaLengkap || "-",
  ].join("\n");
}

async function downloadContractDraft(item) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let cursorY = 20;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(item.namaUsaha || "Perusahaan", margin, 14);
  doc.setFontSize(9);
  doc.text("Draft Perjanjian Kerja", margin, 20);

  doc.setTextColor(15, 23, 42);
  cursorY = 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PERJANJIAN KERJA", pageWidth / 2, cursorY, { align: "center" });

  cursorY += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const headerLines = [
    `Nomor Kontrak: ${item.nomorKontrak || "-"}`,
    `Jenis Kontrak: ${item.jenisKontrak || "-"}`,
    `Unit Kerja: ${item.namaCabang || "-"}`,
    `Status Kerja: ${item.statusKerja || "-"}`,
  ];
  headerLines.forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 6;
  });

  cursorY += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Pihak Kedua", margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  [item.namaLengkap || "-", item.employeeId || "-", item.jabatan || "-"].forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 6;
  });

  cursorY += 4;
  buildContractArticles(item).forEach((article) => {
    doc.setFont("helvetica", "bold");
    doc.text(article.title, margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(article.body, pageWidth - margin * 2);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 5 + 4;
  });

  doc.setFont("helvetica", "bold");
  doc.text("Catatan HR", margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  const notes = doc.splitTextToSize(item.catatanHr || "Tidak ada catatan tambahan.", pageWidth - margin * 2);
  doc.text(notes, margin, cursorY);
  cursorY += notes.length * 5 + 10;

  doc.text(`${item.namaCabang || "Unit kerja"}, ${formatDate(item.tanggalMulai)}`, margin, cursorY);
  cursorY += 10;
  doc.text("Pihak Perusahaan,", margin, cursorY);
  doc.text("Pihak Karyawan,", pageWidth - margin - 35, cursorY);
  cursorY += 18;
  doc.text(item.penanggungJawab || "Tim HR", margin, cursorY);
  doc.text(item.namaLengkap || "-", pageWidth - margin - 35, cursorY);

  doc.save(`${String(item.fileKontrak || item.nomorKontrak || item.namaLengkap || "draft_kontrak").replace(/[^\w.-]/g, "_")}.pdf`);
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700" };
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{note}</div>
          </div>
          <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export default function ContractsPage() {
  const defaultRows = useMemo(() => contractDirectory.map(enrichContract), []);
  const [rows, setRows] = useState(defaultRows);
  const [employeeOptions, setEmployeeOptions] = useState(buildFallbackEmployeeOptions);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [previewContract, setPreviewContract] = useState(null);
  const [form, setForm] = useState(createFormFromEmployee(null, defaultRows));
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contractsTableReady, setContractsTableReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      try {
        const dbRows = await getEmployeeList();
        if (!mounted) return;
        const mapped = dbRows.map((item) => ({
          rowId: item.id,
          employeeId: item.employee_id,
          namaLengkap: item.nama_lengkap,
          jabatan: item.jabatan,
          divisi: item.departemen,
          namaUsaha: item.nama_usaha,
          namaCabang: item.cabang,
          statusKerja: item.status_kerja,
        }));
        setEmployeeOptions(mapped.length ? mapped : buildFallbackEmployeeOptions());
      } catch (error) {
        console.warn("Load employee options fallback:", error);
        if (mounted) setEmployeeOptions(buildFallbackEmployeeOptions());
      }
    };

    const loadContracts = async () => {
      try {
        const dbRows = await getHrContracts();
        if (!mounted) return;
        setContractsTableReady(true);
        setRows(dbRows.map(mapDbRowToContract));
      } catch (error) {
        console.warn("Load kontrak HR fallback:", error);
        if (!mounted) return;
        setContractsTableReady(false);
        setRows(defaultRows);
        setFeedback({ type: "warning", message: "Halaman kontrak masih memakai fallback lokal. Jalankan migration Supabase `hr_contracts` agar data kontrak tersimpan ke database." });
      }
    };

    void loadEmployees();
    void loadContracts();

    return () => {
      mounted = false;
    };
  }, [defaultRows]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filterOptions = useMemo(() => {
    const usaha = ["Semua usaha", ...new Set(rows.map((item) => item.namaCabang).filter(Boolean))];
    const statusKontrak = ["Semua status kontrak", ...contractStatusOptions];
    const statusKerja = ["Semua status kerja", ...new Set(rows.map((item) => item.statusKerja).filter(Boolean))];
    const tanggalBerakhir = ["Semua tanggal berakhir", ...new Set(rows.map((item) => formatDate(item.tanggalBerakhir)).filter((value) => value !== "-"))];
    const penanggungJawab = ["Semua penanggung jawab", ...new Set(rows.map((item) => item.penanggungJawab).filter(Boolean))];
    return { usaha, statusKontrak, statusKerja, tanggalBerakhir, penanggungJawab };
  }, [rows]);

  const summaryCards = useMemo(() => {
    const aktif = rows.filter((item) => item.statusKontrak === "Aktif").length;
    const belumDibuat = rows.filter((item) => item.statusKontrak === "Belum dibuat").length;
    const akanHabis = rows.filter((item) => item.statusKontrak === "Akan habis").length;
    const sudahLewat = rows.filter((item) => item.statusKontrak === "Sudah lewat").length;
    const perluPerhatian = rows.filter((item) => item.perluPerhatian).length;
    const siapDitandatangani = rows.filter((item) => item.statusTandaTangan === "Siap ditandatangani").length;

    return [
      { label: "Kontrak aktif", value: aktif, note: "Kontrak yang sedang berjalan dan masih dipakai operasional.", icon: FileText, tone: "emerald" },
      { label: "Belum dibuat", value: belumDibuat, note: "Karyawan sudah perlu kontrak, tapi dokumennya belum jadi.", icon: BriefcaseBusiness, tone: "amber" },
      { label: "Akan habis", value: akanHabis, note: "Perlu diputuskan lanjut, diperpanjang, atau selesai.", icon: CalendarDays, tone: "amber" },
      { label: "Sudah lewat", value: sudahLewat, note: "Masa kontraknya sudah lewat dan perlu tindakan cepat.", icon: ShieldAlert, tone: "rose" },
      { label: "Perlu perhatian", value: perluPerhatian, note: "Masih ada kontrak yang butuh keputusan atau tindak lanjut.", icon: ShieldAlert, tone: "rose" },
      { label: "Siap ditandatangani", value: siapDitandatangani, note: "Isi kontrak sudah siap dan tinggal tanda tangan.", icon: FileSignature, tone: "sky" },
    ];
  }, [rows]);

  const quickTabCounts = useMemo(() => Object.fromEntries(contractQuickTabs.map((tab) => [tab.key, rows.filter((item) => matchQuickTab(item, tab.key)).length])), [rows]);

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((item) => {
      if (!matchQuickTab(item, activeTab)) return false;
      if (filters.usaha !== "Semua usaha" && item.namaCabang !== filters.usaha) return false;
      if (filters.statusKontrak !== "Semua status kontrak" && item.statusKontrak !== filters.statusKontrak) return false;
      if (filters.statusKerja !== "Semua status kerja" && item.statusKerja !== filters.statusKerja) return false;
      if (filters.tanggalBerakhir !== "Semua tanggal berakhir" && formatDate(item.tanggalBerakhir) !== filters.tanggalBerakhir) return false;
      if (filters.penanggungJawab !== "Semua penanggung jawab" && item.penanggungJawab !== filters.penanggungJawab) return false;
      if (!term) return true;

      return [item.namaLengkap, item.jabatan, item.namaCabang, item.nomorKontrak, item.penanggungJawab, item.jenisKontrak].join(" ").toLowerCase().includes(term);
    });
  }, [activeTab, filters, rows, search]);

  const contractAlerts = useMemo(() => rows.filter((item) => item.alert), [rows]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const syncSelectedContract = (nextItem) => {
    setSelectedContract((current) => (current && String(current.id) === String(nextItem.id) ? nextItem : current));
  };

  const handleFormChange = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "sourceEmployeeRowId") {
        const matched = employeeOptions.find((item) => String(item.rowId || "") === String(value || ""));
        if (matched) {
          next.sourceEmployeeRowId = matched.rowId ? String(matched.rowId) : "";
          next.employeeId = matched.employeeId || "";
          next.namaLengkap = matched.namaLengkap || "";
          next.jabatan = matched.jabatan || "";
          next.divisi = matched.divisi || "";
          next.namaUsaha = matched.namaUsaha || next.namaUsaha;
          next.namaCabang = matched.namaCabang || "";
          next.statusKerja = matched.statusKerja || next.statusKerja;
          next.nomorKontrak = buildContractNumber(next.employeeId, next.tanggalMulai, rows);
        }
      }

      if (key === "masaKontrakBulan" || key === "tanggalMulai") {
        const startDate = new Date(next.tanggalMulai || new Date().toISOString());
        const months = Number(next.masaKontrakBulan || 0);
        if (months > 0) {
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + months);
          endDate.setDate(endDate.getDate() - 1);
          next.tanggalBerakhir = endDate.toISOString().slice(0, 10);
          next.tanggalReview = endDate.toISOString().slice(0, 10);
        }
      }

      return enrichContract(next);
    });
  };

  const openCreateModal = () => {
    setEditorMode("create");
    setForm(createFormFromEmployee(employeeOptions[0] || null, rows));
    setShowCreateModal(true);
  };

  const openEditModal = (item) => {
    setEditorMode("edit");
    setForm(createFormFromContract(item));
    setShowCreateModal(true);
  };

  const saveContract = async () => {
    if (!form.employeeId.trim() || !form.namaLengkap.trim() || !form.jabatan.trim()) {
      setFeedback({ type: "error", message: "Pilih karyawan dulu agar ID, nama, dan jabatan kontrak terisi dengan benar." });
      return;
    }
    if (!form.tanggalMulai || !form.tanggalBerakhir) {
      setFeedback({ type: "error", message: "Tanggal mulai dan tanggal berakhir kontrak wajib diisi." });
      return;
    }

    const normalized = enrichContract({ ...form, nomorKontrak: form.nomorKontrak || buildContractNumber(form.employeeId, form.tanggalMulai, rows) });

    setSaving(true);
    try {
      if (editorMode === "edit") {
        await persistRowUpdate(normalized, `Kontrak ${normalized.namaLengkap} berhasil diperbarui.`);
      } else {
        if (contractsTableReady) {
          const created = await createHrContract(mapContractToPayload(normalized));
          if (created) {
            const mapped = mapDbRowToContract(created);
            setRows((current) => [mapped, ...current]);
            setSelectedContract(mapped);
          }
        } else {
          const fallbackRow = { ...normalized, id: `local-${Date.now()}` };
          setRows((current) => [fallbackRow, ...current]);
          setSelectedContract(fallbackRow);
        }

        setFeedback({ type: "success", message: `${normalized.namaLengkap} berhasil masuk ke register kontrak kerja.` });
      }

      setShowCreateModal(false);
    } catch (error) {
      console.error("Gagal simpan kontrak:", error);
      setFeedback({ type: "error", message: "Kontrak belum berhasil disimpan. Cek koneksi Supabase atau migration kontrak HR." });
    } finally {
      setSaving(false);
    }
  };

  const syncEmployeeStatus = async (item) => {
    if (!item.sourceEmployeeRowId) return;
    if (item.keputusanBerikutnya === "Jadikan tetap") await updateEmployee(Number(item.sourceEmployeeRowId), { status_kerja: "Tetap", tipe_kontrak: "PKWTT", status_karyawan: "Aktif" });
    if (item.keputusanBerikutnya === "Perpanjang") await updateEmployee(Number(item.sourceEmployeeRowId), { status_kerja: "Kontrak", tipe_kontrak: item.jenisKontrak || "PKWT" });
  };

  const persistRowUpdate = async (nextItem, successMessage) => {
    const enriched = enrichContract(nextItem);
    try {
      if (contractsTableReady && typeof enriched.id === "number") {
        const updated = await updateHrContract(enriched.id, mapContractToPayload(enriched));
        if (updated) {
          const mapped = mapDbRowToContract(updated);
          setRows((current) => current.map((item) => (String(item.id) === String(mapped.id) ? mapped : item)));
          syncSelectedContract(mapped);
        }
      } else {
        setRows((current) => current.map((item) => (String(item.id) === String(enriched.id) ? enriched : item)));
        syncSelectedContract(enriched);
      }

      await syncEmployeeStatus(enriched);
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      console.error("Gagal update kontrak:", error);
      setFeedback({ type: "error", message: "Perubahan kontrak belum tersimpan. Cek Supabase atau coba lagi." });
    }
  };

  const handleCreateContract = async (item) => {
    const next = {
      ...item,
      nomorKontrak: item.nomorKontrak && item.nomorKontrak !== "-" ? item.nomorKontrak : buildContractNumber(item.employeeId, item.tanggalMulai, rows),
      statusKontrak: "Aktif",
      statusTandaTangan: "Siap ditandatangani",
      fileKontrak: item.fileKontrak === "Belum ada file" ? `Draft_${String(item.namaLengkap || "Kontrak").replace(/\s+/g, "_")}.pdf` : item.fileKontrak,
      catatanHr: item.catatanHr || "Draft kontrak sudah dibuat dan siap dirapikan lebih lanjut oleh HR.",
    };
    await persistRowUpdate(next, `Draft kontrak ${item.namaLengkap} sudah dibuat.`);
  };

  const handleExtendContract = async (item) => {
    const months = Number(item.masaKontrakBulan || 0) || 6;
    const baseDate = item.tanggalBerakhir ? new Date(item.tanggalBerakhir) : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    const endDate = new Date(baseDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1);

    const next = {
      ...item,
      tanggalMulai: baseDate.toISOString().slice(0, 10),
      tanggalBerakhir: endDate.toISOString().slice(0, 10),
      tanggalReview: endDate.toISOString().slice(0, 10),
      statusKontrak: "Aktif",
      statusTandaTangan: "Siap ditandatangani",
      keputusanBerikutnya: "Masih dipertimbangkan",
      catatanHr: `${item.catatanHr ? `${item.catatanHr} ` : ""}Kontrak diperpanjang dan menunggu tanda tangan versi terbaru.`,
    };
    await persistRowUpdate(next, `Kontrak ${item.namaLengkap} berhasil diperpanjang.`);
  };

  const handleMarkComplete = async (item) => {
    const next = {
      ...item,
      statusKontrak: "Selesai",
      statusTandaTangan: "Sudah ditandatangani",
      catatanHr: `${item.catatanHr ? `${item.catatanHr} ` : ""}Administrasi kontrak sudah dirapikan sebagai dokumen final.`,
    };
    await persistRowUpdate(next, `Kontrak ${item.namaLengkap} ditandai selesai.`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle title="Kontrak Kerja" subtitle="Pusat untuk melihat kontrak aktif, kontrak yang belum dibuat, yang akan habis, dan keputusan berikutnya agar tidak ada yang terlewat." />
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Buat Kontrak
            </Button>
          </div>
        </div>

        {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : feedback.type === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{feedback.message}</div> : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, nomor kontrak, jabatan, cabang, atau penanggung jawab" className="rounded-xl border-slate-200 bg-white pl-9" />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect value={filters.statusKontrak} onChange={(event) => handleFilterChange("statusKontrak", event.target.value)} options={filterOptions.statusKontrak} />
          <FilterSelect value={filters.statusKerja} onChange={(event) => handleFilterChange("statusKerja", event.target.value)} options={filterOptions.statusKerja} />
          <FilterSelect value={filters.tanggalBerakhir} onChange={(event) => handleFilterChange("tanggalBerakhir", event.target.value)} options={filterOptions.tanggalBerakhir} />
          <FilterSelect value={filters.penanggungJawab} onChange={(event) => handleFilterChange("penanggungJawab", event.target.value)} options={filterOptions.penanggungJawab} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}
      </div>

      {contractAlerts.length ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">Prioritas tindakan kontrak</div>
              <div className="mt-1 text-sm text-slate-500">Ringkasan cepat untuk kontrak yang paling butuh tindakan dari HR hari ini.</div>
            </div>
            <div className="grid gap-3">
              {contractAlerts.slice(0, 4).map((item) => (
                <div key={`contract-alert-${item.id}`} className={`rounded-2xl border px-4 py-3 ${item.alert.level === "critical" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className={`text-sm font-semibold ${item.alert.level === "critical" ? "text-rose-800" : "text-amber-800"}`}>{item.namaLengkap} • {item.jabatan}</div>
                      <div className={`mt-1 text-sm ${item.alert.level === "critical" ? "text-rose-700" : "text-amber-700"}`}>{item.alert.title}. {item.alert.description}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.statusKontrak} />
                      <StatusBadge value={item.statusTandaTangan} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {contractQuickTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {tab.label} ({quickTabCounts[tab.key] || 0})
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-4 lg:p-5">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">Daftar kontrak kerja</div>
                <div className="text-sm text-slate-500">{filteredContracts.length} data ditemukan. Fokus utamanya siapa yang belum dibuatkan kontrak, siapa yang akan habis, dan siapa yang perlu keputusan.</div>
              </div>
              <div className="text-sm text-slate-500">Klik "Lihat detail" untuk buka isi kontrak tanpa pindah halaman.</div>
            </div>

            <div className="space-y-3">
              {filteredContracts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{item.namaLengkap}</div>
                          <div className="text-sm text-slate-500">{item.jabatan} • {item.namaCabang}</div>
                        </div>
                        <StatusBadge value={item.statusKontrak} />
                        <StatusBadge value={item.statusTandaTangan} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kerja</div><div className="mt-1 font-medium text-slate-700">{item.statusKerja}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Jenis kontrak</div><div className="mt-1 font-medium text-slate-700">{item.jenisKontrak}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal mulai</div><div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalMulai)}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal berakhir</div><div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalBerakhir)}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Masa kontrak</div><div className="mt-1 font-medium text-slate-700">{item.masaKontrakBulan} bulan</div></div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{item.reminder}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Keputusan berikutnya: {item.keputusanBerikutnya}</span>
                      </div>
                      {item.alert ? <div className={`rounded-xl border px-3 py-2 text-sm leading-6 ${item.alert.level === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className="font-semibold">{item.alert.title}</span> {item.alert.description}</div> : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedContract(item)}>Lihat detail</Button>
                      {item.statusKontrak === "Belum dibuat" ? <Button variant="outline" className="rounded-xl" onClick={() => void handleCreateContract(item)}>Buat kontrak</Button> : null}
                      {item.statusKontrak === "Aktif" || item.statusKontrak === "Akan habis" || item.statusKontrak === "Sudah lewat" ? <Button variant="outline" className="rounded-xl" onClick={() => void handleExtendContract(item)}>Perpanjang</Button> : null}
                      <Button variant="outline" className="rounded-xl" onClick={() => setPreviewContract(item)}>Preview draft</Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => downloadContractDraft(item)}><Download className="mr-2 h-4 w-4" />Unduh file</Button>
                      {item.statusKontrak !== "Selesai" ? <Button variant="outline" className="rounded-xl" onClick={() => void handleMarkComplete(item)}>Tandai selesai</Button> : null}
                    </div>
                  </div>
                </div>
              ))}

              {filteredContracts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{contractsTableReady ? "Belum ada data kontrak di database. Klik \"Buat Kontrak\" untuk mulai membuat register kontrak HR." : "Belum ada data yang cocok dengan pencarian atau filter yang dipilih."}</div> : null}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Terhubung ke modul lain</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Halaman ini disiapkan supaya kontrak kerja bisa dibuat dari awal, dipantau saat berjalan, lalu diteruskan ke modul lain saat perlu tindakan.</div>
              <div className="mt-4 space-y-3">
                {contractModuleLinks.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 p-3">
                    <div className="font-medium text-slate-800">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Struktur data kontrak</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Field ini mendukung pembuatan kontrak, pemantauan masa kerja, status tanda tangan, dan keputusan berikutnya.</div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {contractDataFields.map((field) => <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{field}</div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedContract ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]" onClick={() => setSelectedContract(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedContract.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">{selectedContract.nomorKontrak} • {selectedContract.jabatan}</div>
              </div>
              <button type="button" onClick={() => setSelectedContract(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedContract.statusKontrak} />
                <StatusBadge value={selectedContract.statusTandaTangan} />
                <StatusBadge value={selectedContract.statusKerja} />
              </div>

              {selectedContract.alert ? <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${selectedContract.alert.level === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><div className="font-semibold">{selectedContract.alert.title}</div><div>{selectedContract.alert.description}</div></div> : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data karyawan</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nama lengkap: {selectedContract.namaLengkap}</div>
                    <div>ID karyawan: {selectedContract.employeeId}</div>
                    <div>Jabatan: {selectedContract.jabatan}</div>
                    <div>Divisi: {selectedContract.divisi}</div>
                    <div>Cabang: {selectedContract.namaCabang}</div>
                    <div>Status kerja: {selectedContract.statusKerja}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data kontrak</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nomor kontrak: {selectedContract.nomorKontrak}</div>
                    <div>Jenis kontrak: {selectedContract.jenisKontrak}</div>
                    <div>Tanggal mulai: {formatDate(selectedContract.tanggalMulai)}</div>
                    <div>Tanggal berakhir: {formatDate(selectedContract.tanggalBerakhir)}</div>
                    <div>Masa kontrak: {selectedContract.masaKontrakBulan} bulan</div>
                    <div>Tanggal review: {formatDate(selectedContract.tanggalReview)}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Nilai perjanjian</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Gaji pokok: {selectedContract.gajiPokok || "-"}</div>
                    <div>Tunjangan utama: {selectedContract.tunjanganUtama || "-"}</div>
                    <div>File kontrak: {selectedContract.fileKontrak || "Belum ada file"}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Kontrol HR</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Penanggung jawab: {selectedContract.penanggungJawab}</div>
                    <div>Reminder: {selectedContract.reminder}</div>
                    <div>Keputusan berikutnya: {selectedContract.keputusanBerikutnya}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-700">Catatan HR</div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedContract.catatanHr || "Belum ada catatan HR."}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => openEditModal(selectedContract)}>Ubah kontrak</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setPreviewContract(selectedContract)}>Preview draft</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => downloadContractDraft(selectedContract)}><Download className="mr-2 h-4 w-4" />Unduh file</Button>
                {selectedContract.statusKontrak === "Belum dibuat" ? <Button className="rounded-xl" onClick={() => void handleCreateContract(selectedContract)}>Buat kontrak</Button> : null}
                {selectedContract.statusKontrak !== "Selesai" ? <Button variant="outline" className="rounded-xl" onClick={() => void handleExtendContract(selectedContract)}>Perpanjang kontrak</Button> : null}
                {selectedContract.statusKontrak !== "Selesai" ? <Button variant="outline" className="rounded-xl" onClick={() => void handleMarkComplete(selectedContract)}>Tandai selesai</Button> : null}
                <Button variant="outline" className="rounded-xl" onClick={() => setSelectedContract(null)}>Tutup</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewContract ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]" onClick={() => setPreviewContract(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">Preview draft kontrak</div>
                <div className="mt-1 text-sm text-slate-500">{previewContract.nomorKontrak || "Nomor kontrak belum diisi"} / {previewContract.namaLengkap}</div>
              </div>
              <button type="button" onClick={() => setPreviewContract(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Preview ini dibuat dari data kontrak yang tersimpan saat ini. Jika ada yang perlu dibenahi, gunakan tombol `Ubah kontrak` lalu generate ulang.
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="rounded-t-[28px] bg-slate-900 px-6 py-5 text-white">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-300">Draft Perjanjian Kerja</div>
                  <div className="mt-2 text-2xl font-semibold">{previewContract.namaUsaha || "Perusahaan"}</div>
                  <div className="mt-1 text-sm text-slate-300">{previewContract.namaCabang || "Unit kerja"} / {previewContract.penanggungJawab || "Tim HR"}</div>
                </div>
                <div className="space-y-6 px-6 py-6 text-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-slate-900">PERJANJIAN KERJA</div>
                    <div className="mt-2 text-sm text-slate-500">Nomor kontrak {previewContract.nomorKontrak || "-"}</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Pihak Perusahaan</div>
                      <div className="mt-2 font-medium text-slate-900">{previewContract.namaUsaha || "Perusahaan"}</div>
                      <div className="mt-1 text-sm text-slate-600">{previewContract.namaCabang || "Unit kerja"}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Pihak Karyawan</div>
                      <div className="mt-2 font-medium text-slate-900">{previewContract.namaLengkap || "-"}</div>
                      <div className="mt-1 text-sm text-slate-600">{previewContract.employeeId || "-"} / {previewContract.jabatan || "-"}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Periode</div>
                      <div className="mt-2 font-medium text-slate-900">{formatDate(previewContract.tanggalMulai)} - {formatDate(previewContract.tanggalBerakhir)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Kompensasi</div>
                      <div className="mt-2 font-medium text-slate-900">{previewContract.gajiPokok || "-"}</div>
                      <div className="mt-1 text-sm text-slate-600">{previewContract.tunjanganUtama || "-"}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {buildContractArticles(previewContract).map((article) => (
                      <div key={article.title} className="rounded-2xl border border-slate-200 p-4">
                        <div className="font-semibold text-slate-900">{article.title}</div>
                        <div className="mt-2 text-sm leading-7 text-slate-600">{article.body}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Catatan HR</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">{previewContract.catatanHr || "Tidak ada catatan tambahan."}</div>
                  </div>

                  <div className="grid gap-6 border-t border-dashed border-slate-200 pt-6 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-slate-500">Pihak perusahaan</div>
                      <div className="mt-12 font-medium text-slate-900">{previewContract.penanggungJawab || "Tim HR"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Pihak karyawan</div>
                      <div className="mt-12 font-medium text-slate-900">{previewContract.namaLengkap || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setPreviewContract(null)}>Tutup</Button>
              <Button className="rounded-xl" onClick={() => downloadContractDraft(previewContract)}><Download className="mr-2 h-4 w-4" />Unduh draft</Button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]" onClick={() => setShowCreateModal(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-2xl font-semibold text-slate-900">{editorMode === "edit" ? "Ubah kontrak kerja" : "Buat kontrak kerja"}</div>
                <div className="mt-1 text-sm text-slate-500">{editorMode === "edit" ? "Perbarui detail kontrak, lalu simpan agar register dan detail kontrak tetap sinkron." : "Pilih karyawan aktif, rapikan masa kontrak, lalu simpan agar register kontrak HR tetap rapi di database."}</div>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="mb-2 text-sm font-medium text-slate-700">Pilih karyawan</div>
                  <select value={form.sourceEmployeeRowId} onChange={(event) => handleFormChange("sourceEmployeeRowId", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">
                    {employeeOptions.map((item) => <option key={`${item.rowId || item.employeeId}`} value={item.rowId ? String(item.rowId) : ""}>{item.employeeId} - {item.namaLengkap}</option>)}
                  </select>
                </div>

                <div><div className="mb-2 text-sm font-medium text-slate-700">ID karyawan</div><Input value={form.employeeId} onChange={(event) => handleFormChange("employeeId", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Nama lengkap</div><Input value={form.namaLengkap} onChange={(event) => handleFormChange("namaLengkap", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Jabatan</div><Input value={form.jabatan} onChange={(event) => handleFormChange("jabatan", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Divisi</div><Input value={form.divisi} onChange={(event) => handleFormChange("divisi", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Nama usaha</div><Input value={form.namaUsaha} onChange={(event) => handleFormChange("namaUsaha", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Cabang / unit</div><Input value={form.namaCabang} onChange={(event) => handleFormChange("namaCabang", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Status kerja</div><Input value={form.statusKerja} onChange={(event) => handleFormChange("statusKerja", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Nomor kontrak</div><Input value={form.nomorKontrak} onChange={(event) => handleFormChange("nomorKontrak", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Jenis kontrak</div><Input value={form.jenisKontrak} onChange={(event) => handleFormChange("jenisKontrak", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal mulai</div><Input type="date" value={form.tanggalMulai} onChange={(event) => handleFormChange("tanggalMulai", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Masa kontrak (bulan)</div><Input type="number" min="1" value={form.masaKontrakBulan} onChange={(event) => handleFormChange("masaKontrakBulan", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal berakhir</div><Input type="date" value={form.tanggalBerakhir} onChange={(event) => handleFormChange("tanggalBerakhir", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal review</div><Input type="date" value={form.tanggalReview} onChange={(event) => handleFormChange("tanggalReview", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Gaji pokok</div><Input value={form.gajiPokok} onChange={(event) => handleFormChange("gajiPokok", event.target.value)} className="rounded-xl border-slate-200" placeholder="Contoh: Rp4.500.000" /></div>
                <div><div className="mb-2 text-sm font-medium text-slate-700">Tunjangan utama</div><Input value={form.tunjanganUtama} onChange={(event) => handleFormChange("tunjanganUtama", event.target.value)} className="rounded-xl border-slate-200" placeholder="Contoh: Tunjangan makan Rp500.000" /></div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">Status tanda tangan</div>
                  <select value={form.statusTandaTangan} onChange={(event) => handleFormChange("statusTandaTangan", event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">
                    {signingOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">Keputusan berikutnya</div>
                  <select value={form.keputusanBerikutnya} onChange={(event) => handleFormChange("keputusanBerikutnya", event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">
                    {decisionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">Status kontrak</div>
                  <select value={form.statusKontrak} onChange={(event) => handleFormChange("statusKontrak", event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">
                    {contractStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2"><div className="mb-2 text-sm font-medium text-slate-700">Penanggung jawab</div><Input value={form.penanggungJawab} onChange={(event) => handleFormChange("penanggungJawab", event.target.value)} className="rounded-xl border-slate-200" /></div>
                <div className="md:col-span-2"><div className="mb-2 text-sm font-medium text-slate-700">Catatan HR</div><textarea value={form.catatanHr} onChange={(event) => handleFormChange("catatanHr", event.target.value)} rows={5} className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300" /></div>
              </div>

              <div className="space-y-4">
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="text-lg font-semibold text-slate-900">Ringkasan kontrak</div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="rounded-xl border border-slate-200 p-3">Karyawan: {form.employeeId || "-"} / {form.namaLengkap || "-"}</div>
                      <div className="rounded-xl border border-slate-200 p-3">Periode: {formatDate(form.tanggalMulai)} - {formatDate(form.tanggalBerakhir)}</div>
                      <div className="rounded-xl border border-slate-200 p-3">Reminder: {enrichContract(form).reminder}</div>
                      <div className="rounded-xl border border-slate-200 p-3">Keputusan berikutnya: {form.keputusanBerikutnya}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="text-lg font-semibold text-slate-900">Checklist sebelum simpan</div>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="rounded-xl border border-slate-200 p-3">Pilih karyawan aktif supaya ID, nama, jabatan, dan cabang konsisten dengan Data Karyawan.</div>
                      <div className="rounded-xl border border-slate-200 p-3">Pastikan masa kontrak, nomor kontrak, dan keputusan berikutnya sudah sesuai kebutuhan HR.</div>
                      <div className="rounded-xl border border-slate-200 p-3">Isi catatan HR bila kontrak belum ditandatangani atau masih menunggu review owner.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowCreateModal(false)}>Tutup</Button>
              <Button className="rounded-xl" onClick={() => void saveContract()} disabled={saving}>{saving ? "Menyimpan..." : editorMode === "edit" ? "Simpan perubahan" : "Simpan kontrak"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
