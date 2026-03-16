import { useEffect, useMemo, useState } from "react";
import { Building2, FileText, LoaderCircle, Phone, Search, ShieldCheck, UserPlus, Users, Wallet, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { employeeDataFields, employeeModuleLinks, employeeQuickTabs } from "@/data";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createStageHistory } from "@/services/recruitmentWorkflowService";

const ONBOARDING_START = "[[ONBOARDING_FORM]]";
const ONBOARDING_END = "[[/ONBOARDING_FORM]]";
const EMPLOYEE_START = "[[EMPLOYEE_DATA]]";
const EMPLOYEE_END = "[[/EMPLOYEE_DATA]]";

const emptyFilters = {
  usaha: "Semua usaha",
  jabatan: "Semua jabatan",
  statusKerja: "Semua status kerja",
  statusData: "Semua status data",
  statusAktif: "Semua status aktif",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function firstName(value) {
  return String(value || "").trim().split(/\s+/)[0] || "-";
}

function defaultOnboardingForm() {
  return { startDate: "", employmentType: "Belum ditentukan", finalSalary: "", owner: "", offerNote: "" };
}

function defaultEmployeeMeta() {
  return {
    employeeId: "",
    namaUsaha: "HireUMKM",
    namaCabang: "-",
    statusKerja: "",
    statusAktif: "Aktif",
    atasanLangsung: "",
    nomorRekening: "",
    namaBank: "",
    statusBpjs: "Belum ada",
    nomorBpjs: "",
    npwp: "",
    dokumenPenting: ["KTP", "KK", "CV"],
    catatanHr: "",
    tanggalMasuk: "",
  };
}

function parseMarkerDocument(text, startMarker, endMarker, fallback) {
  const raw = typeof text === "string" ? text : "";
  const start = raw.indexOf(startMarker);
  const end = raw.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    return { data: fallback(), remainder: raw.trim() };
  }

  const jsonText = raw.slice(start + startMarker.length, end).trim();
  const before = raw.slice(0, start).trim();
  const after = raw.slice(end + endMarker.length).trim();
  const remainder = [before, after].filter(Boolean).join("\n\n");

  try {
    const parsed = JSON.parse(jsonText);
    const payload = parsed?.form || parsed?.meta || parsed || {};
    return { data: { ...fallback(), ...payload }, remainder };
  } catch {
    return { data: fallback(), remainder: raw.trim() };
  }
}

function parseOnboardingForm(note) {
  return parseMarkerDocument(note, ONBOARDING_START, ONBOARDING_END, defaultOnboardingForm);
}

function parseEmployeeMeta(note) {
  return parseMarkerDocument(note, EMPLOYEE_START, EMPLOYEE_END, defaultEmployeeMeta);
}

function buildEmployeeNoteDocument(meta, noteWithoutEmployee) {
  return `${EMPLOYEE_START}${JSON.stringify({ meta })}${EMPLOYEE_END}${noteWithoutEmployee ? `\n\n${noteWithoutEmployee}` : ""}`;
}

function summarizeExperience(item) {
  const list = Array.isArray(item?.pengalaman_list) ? item.pengalaman_list : [];
  if (list.length) {
    return list
      .slice(0, 2)
      .map((entry) => `${entry?.jabatan || "Posisi"} di ${entry?.perusahaan || "Perusahaan"}`)
      .join("; ");
  }
  if (item?.fresh_graduate) return "Fresh graduate.";
  return item?.pengalaman_utama_deskripsi || "Belum ada ringkasan pengalaman.";
}

function generateEmployeeId(item, onboardingForm, employeeMeta) {
  if (employeeMeta.employeeId) return employeeMeta.employeeId;
  const sourceDate = onboardingForm.startDate || item.updated_at || item.created_at;
  const year = sourceDate ? new Date(sourceDate).getFullYear() : new Date().getFullYear();
  return `HKM-${year}-${String(item.id).padStart(3, "0")}`;
}

function buildContractSummary(statusKerja, tanggalMasuk) {
  if (statusKerja === "Tetap") return "Karyawan tetap";
  if (statusKerja === "Probation") return tanggalMasuk ? `Probation sejak ${formatDate(tanggalMasuk)}` : "Probation aktif";
  if (statusKerja === "Kontrak") return tanggalMasuk ? `Kontrak aktif sejak ${formatDate(tanggalMasuk)}` : "Kontrak aktif";
  if (statusKerja === "Freelance") return "Skema freelance";
  if (statusKerja === "Part time") return "Skema part time";
  return "Status kerja belum dilengkapi";
}

function deriveStatusData(meta) {
  const requiredFields = [meta.namaCabang, meta.statusKerja, meta.atasanLangsung, meta.nomorRekening, meta.namaBank];
  return requiredFields.every((value) => String(value || "").trim()) ? "Sudah lengkap" : "Belum lengkap";
}

function mapPelamarToEmployee(item) {
  if (!item || item.archived || item.tahap_proses !== "Sudah masuk kerja") return null;

  const onboarding = parseOnboardingForm(item.catatan_recruiter);
  const employeeDocument = parseEmployeeMeta(onboarding.remainder);
  const meta = {
    ...defaultEmployeeMeta(),
    ...employeeDocument.data,
    namaCabang: employeeDocument.data.namaCabang || "-",
    statusKerja: employeeDocument.data.statusKerja || onboarding.data.employmentType || "Belum ditentukan",
    atasanLangsung: employeeDocument.data.atasanLangsung || onboarding.data.owner || "Recruiter",
    tanggalMasuk: employeeDocument.data.tanggalMasuk || onboarding.data.startDate || item.updated_at || item.created_at,
    catatanHr: employeeDocument.data.catatanHr || onboarding.data.offerNote || "",
  };

  const employeeId = generateEmployeeId(item, onboarding.data, meta);
  const statusData = deriveStatusData(meta);

  return {
    id: item.id,
    employeeId,
    namaLengkap: item.nama_lengkap,
    namaPanggilan: firstName(item.nama_lengkap),
    noWhatsapp: item.no_hp || "-",
    email: item.email || "-",
    alamat: item.alamat_ktp || item.alamat_domisili || "-",
    domisili: item.alamat_domisili || "-",
    jabatan: item.posisi_dilamar || "-",
    namaUsaha: meta.namaUsaha || "HireUMKM",
    namaCabang: meta.namaCabang || "-",
    statusKerja: meta.statusKerja || "Belum ditentukan",
    tanggalMasuk: meta.tanggalMasuk,
    atasanLangsung: meta.atasanLangsung || "Recruiter",
    nomorRekening: meta.nomorRekening || "-",
    namaBank: meta.namaBank || "-",
    statusBpjs: meta.statusBpjs || "Belum ada",
    nomorBpjs: meta.nomorBpjs || "-",
    npwp: meta.npwp || "-",
    statusData,
    statusAktif: meta.statusAktif || "Aktif",
    statusKontrakSingkat: buildContractSummary(meta.statusKerja, meta.tanggalMasuk),
    dokumenCount: Array.isArray(meta.dokumenPenting) ? meta.dokumenPenting.length : 0,
    catatanHr: meta.catatanHr || "Belum ada catatan HR.",
    dokumenPenting: Array.isArray(meta.dokumenPenting) && meta.dokumenPenting.length ? meta.dokumenPenting : ["KTP", "KK", "CV"],
    sumberMasuk: "Masuk dari Karyawan Baru",
    butuhPerhatian: statusData === "Belum lengkap",
    linkedModules: employeeModuleLinks.map((itemLink) => itemLink.title),
    pengalamanSingkat: summarizeExperience(item),
    _rawNoteWithoutEmployee: employeeDocument.remainder,
    _employeeMeta: { ...meta, employeeId },
  };
}

function matchQuickTab(employee, tabKey) {
  switch (tabKey) {
    case "aktif":
      return employee.statusAktif === "Aktif";
    case "baru":
      return new Date(employee.tanggalMasuk) >= new Date("2026-01-01");
    case "kontrak":
      return employee.statusKerja === "Kontrak";
    case "tetap":
      return employee.statusKerja === "Tetap";
    case "belum-lengkap":
      return employee.statusData === "Belum lengkap";
    case "nonaktif":
      return employee.statusAktif === "Nonaktif";
    default:
      return true;
  }
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

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
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editForm, setEditForm] = useState(defaultEmployeeMeta());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    setEditForm(selectedEmployee ? { ...defaultEmployeeMeta(), ...selectedEmployee._employeeMeta } : defaultEmployeeMeta());
  }, [selectedEmployee]);

  async function loadEmployees() {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await getPelamarList();
      setRows(data.map(mapPelamarToEmployee).filter(Boolean));
    } catch (error) {
      console.error("Load data karyawan gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data karyawan.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function syncEmployee(updatedRow) {
    const mapped = mapPelamarToEmployee(updatedRow);
    if (!mapped) {
      setRows((current) => current.filter((item) => item.id !== updatedRow.id));
      setSelectedEmployee((current) => (current?.id === updatedRow.id ? null : current));
      return null;
    }
    setRows((current) => [...current.filter((item) => item.id !== mapped.id), mapped]);
    setSelectedEmployee((current) => (current?.id === mapped.id ? mapped : current));
    return mapped;
  }

  async function saveEmployeeMeta(extraNote = "") {
    if (!selectedEmployee) return null;
    setIsSubmitting(true);
    try {
      const updatedRow = await updatePelamar(selectedEmployee.id, {
        catatan_recruiter: buildEmployeeNoteDocument(editForm, appendRecruiterNote(selectedEmployee._rawNoteWithoutEmployee, extraNote)),
      });
      if (!updatedRow) throw new Error("Data karyawan tidak ditemukan setelah disimpan.");
      return syncEmployee(updatedRow);
    } catch (error) {
      console.error("Simpan data karyawan gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Data karyawan belum berhasil disimpan." });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEmployee() {
    const nextEmployee = await saveEmployeeMeta("Data karyawan diperbarui dari menu Data Karyawan.");
    if (nextEmployee) setFeedback({ type: "success", message: `Data ${nextEmployee.namaLengkap} berhasil diperbarui.` });
  }

  async function handleToggleActiveStatus() {
    if (!selectedEmployee) return;
    const nextStatus = editForm.statusAktif === "Aktif" ? "Nonaktif" : "Aktif";
    const nextForm = { ...editForm, statusAktif: nextStatus };
    setEditForm(nextForm);
    setIsSubmitting(true);
    try {
      const updatedRow = await updatePelamar(selectedEmployee.id, {
        catatan_recruiter: buildEmployeeNoteDocument(nextForm, appendRecruiterNote(selectedEmployee._rawNoteWithoutEmployee, `Status karyawan diubah menjadi ${nextStatus}.`)),
      });
      if (!updatedRow) throw new Error("Data karyawan tidak ditemukan setelah status diubah.");
      await createStageHistory({
        pelamar_id: selectedEmployee.id,
        dari_tahap: "Sudah masuk kerja",
        ke_tahap: "Sudah masuk kerja",
        catatan: `Status aktif karyawan diubah menjadi ${nextStatus}.`,
      }).catch(() => {});
      const mapped = syncEmployee(updatedRow);
      if (mapped) setFeedback({ type: "success", message: `Status ${mapped.namaLengkap} diubah menjadi ${nextStatus}.` });
    } catch (error) {
      console.error("Update status aktif gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Status karyawan belum berhasil diubah." });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleContactEmployee(employee) {
    const normalizedNumber = String(employee.noWhatsapp || "").replace(/\D/g, "");
    if (!normalizedNumber) {
      setFeedback({ type: "error", message: `Nomor WhatsApp ${employee.namaLengkap} belum valid.` });
      return;
    }
    const digits = normalizedNumber.startsWith("62") ? normalizedNumber : normalizedNumber.startsWith("0") ? `62${normalizedNumber.slice(1)}` : normalizedNumber;
    const message = `Halo ${employee.namaPanggilan}, kami dari tim HR HireUMKM. Mohon konfirmasi apabila ada data administrasi kerja yang perlu diperbarui. Terima kasih.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  const filterOptions = useMemo(() => {
    const usaha = ["Semua usaha", ...new Set(rows.map((employee) => employee.namaCabang))];
    const jabatan = ["Semua jabatan", ...new Set(rows.map((employee) => employee.jabatan))];
    const statusKerja = ["Semua status kerja", "Kontrak", "Probation", "Tetap", "Freelance", "Part time", "Belum ditentukan"];
    const statusData = ["Semua status data", "Sudah lengkap", "Belum lengkap"];
    const statusAktif = ["Semua status aktif", "Aktif", "Nonaktif"];
    return { usaha, jabatan, statusKerja, statusData, statusAktif };
  }, [rows]);

  const summaryCards = useMemo(() => {
    const total = rows.length;
    const aktif = rows.filter((employee) => employee.statusAktif === "Aktif").length;
    const baru = rows.filter((employee) => new Date(employee.tanggalMasuk) >= new Date("2026-01-01")).length;
    const belumLengkap = rows.filter((employee) => employee.statusData === "Belum lengkap").length;
    const kontrakAktif = rows.filter((employee) => employee.statusKerja === "Kontrak").length;
    const perluPerhatian = rows.filter((employee) => employee.butuhPerhatian).length;

    return [
      { label: "Total karyawan", value: total, note: "Semua data karyawan resmi yang sudah masuk dari proses onboarding.", icon: Users, tone: "slate" },
      { label: "Karyawan aktif", value: aktif, note: "Dipakai untuk operasional harian dan payroll.", icon: ShieldCheck, tone: "emerald" },
      { label: "Karyawan baru", value: baru, note: "Perlu dipantau adaptasi awal dan administrasi lanjutan.", icon: UserPlus, tone: "sky" },
      { label: "Data belum lengkap", value: belumLengkap, note: "Masih ada field administrasi yang perlu dilengkapi HR.", icon: FileText, tone: "amber" },
      { label: "Status kontrak", value: kontrakAktif, note: "Karyawan kontrak yang perlu dipantau untuk tahap administrasi berikutnya.", icon: Wallet, tone: "amber" },
      { label: "Perlu perhatian", value: perluPerhatian, note: "Masih ada data yang perlu dibereskan agar siap dipakai modul lain.", icon: Building2, tone: "rose" },
    ];
  }, [rows]);

  const quickTabCounts = useMemo(
    () => Object.fromEntries(employeeQuickTabs.map((tab) => [tab.key, rows.filter((employee) => matchQuickTab(employee, tab.key)).length])),
    [rows],
  );

  const filteredEmployees = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return rows.filter((employee) => {
      if (!matchQuickTab(employee, activeTab)) return false;
      if (filters.usaha !== "Semua usaha" && employee.namaCabang !== filters.usaha) return false;
      if (filters.jabatan !== "Semua jabatan" && employee.jabatan !== filters.jabatan) return false;
      if (filters.statusKerja !== "Semua status kerja" && employee.statusKerja !== filters.statusKerja) return false;
      if (filters.statusData !== "Semua status data" && employee.statusData !== filters.statusData) return false;
      if (filters.statusAktif !== "Semua status aktif" && employee.statusAktif !== filters.statusAktif) return false;
      if (!searchLower) return true;

      return [employee.namaLengkap, employee.namaPanggilan, employee.employeeId, employee.jabatan, employee.namaCabang, employee.noWhatsapp]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, rows, search]);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Data Karyawan"
            subtitle="Pusat data semua karyawan yang sudah resmi bekerja. Data ini sekarang diambil dari kandidat yang sudah berstatus masuk kerja."
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-xl" onClick={() => void loadEmployees()} disabled={loading}>
              Muat ulang
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, jabatan, cabang, ID karyawan, atau WhatsApp" className="rounded-xl border-slate-200 bg-white pl-9" />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect value={filters.jabatan} onChange={(event) => handleFilterChange("jabatan", event.target.value)} options={filterOptions.jabatan} />
          <FilterSelect value={filters.statusKerja} onChange={(event) => handleFilterChange("statusKerja", event.target.value)} options={filterOptions.statusKerja} />
          <FilterSelect value={filters.statusData} onChange={(event) => handleFilterChange("statusData", event.target.value)} options={filterOptions.statusData} />
          <FilterSelect value={filters.statusAktif} onChange={(event) => handleFilterChange("statusAktif", event.target.value)} options={filterOptions.statusAktif} />
        </div>
      </div>

      {feedback ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {employeeQuickTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                {tab.label} ({quickTabCounts[tab.key] || 0})
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-4 lg:p-5">
              <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Daftar karyawan</div>
                  <div className="text-sm text-slate-500">{filteredEmployees.length} data ditemukan dari kandidat yang sudah masuk kerja.</div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Memuat data karyawan...
                </div>
              ) : null}

              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">{employee.namaLengkap}</div>
                            <div className="text-sm text-slate-500">{employee.employeeId} • {employee.jabatan}</div>
                          </div>
                          <StatusBadge value={employee.statusAktif} />
                          <StatusBadge value={employee.statusData} />
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Cabang</div>
                            <div className="mt-1 font-medium text-slate-700">{employee.namaCabang}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kerja</div>
                            <div className="mt-1 flex items-center gap-2">
                              <StatusBadge value={employee.statusKerja} />
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal masuk</div>
                            <div className="mt-1 font-medium text-slate-700">{formatDate(employee.tanggalMasuk)}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">WhatsApp</div>
                            <div className="mt-1 font-medium text-slate-700">{employee.noWhatsapp}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status data</div>
                            <div className="mt-1 font-medium text-slate-700">{employee.statusData}</div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kontrak</div>
                            <div className="mt-1 font-medium text-slate-700">{employee.statusKontrakSingkat}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                        <Button variant="outline" className="rounded-xl" onClick={() => setSelectedEmployee(employee)}>
                          Lihat detail
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => handleContactEmployee(employee)}>
                          Hubungi
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && filteredEmployees.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Belum ada data karyawan yang cocok dengan pencarian atau filter yang dipilih.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Terhubung ke modul lain</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Data di halaman ini disiapkan supaya modul administrasi dan penggajian bisa pakai data yang sama tanpa input ulang.</div>
              <div className="mt-4 space-y-3">
                {employeeModuleLinks.map((item) => (
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
              <div className="text-lg font-semibold text-slate-900">Struktur data yang didukung</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Field inti ini sekarang bisa diisi bertahap dari data kandidat yang sudah resmi mulai bekerja.</div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {employeeDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{field}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedEmployee ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedEmployee.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">{selectedEmployee.employeeId} • {selectedEmployee.jabatan}</div>
              </div>
              <button type="button" onClick={() => setSelectedEmployee(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={editForm.statusAktif || selectedEmployee.statusAktif} />
                <StatusBadge value={editForm.statusKerja || selectedEmployee.statusKerja} />
                <StatusBadge value={deriveStatusData(editForm)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Phone className="h-4 w-4" />
                    Kontak
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nomor WhatsApp: {selectedEmployee.noWhatsapp}</div>
                    <div>Email: {selectedEmployee.email}</div>
                    <div>Alamat / domisili: {selectedEmployee.alamat}</div>
                    <div>Domisili: {selectedEmployee.domisili}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Building2 className="h-4 w-4" />
                    Data kerja
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Input value={editForm.namaCabang} onChange={(event) => setEditForm((current) => ({ ...current, namaCabang: event.target.value }))} placeholder="Cabang / lokasi kerja" />
                    <select value={editForm.statusKerja} onChange={(event) => setEditForm((current) => ({ ...current, statusKerja: event.target.value }))} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                      {["Belum ditentukan", "Probation", "Kontrak", "Tetap", "Freelance", "Part time"].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <Input value={editForm.atasanLangsung} onChange={(event) => setEditForm((current) => ({ ...current, atasanLangsung: event.target.value }))} placeholder="Atasan / penanggung jawab" />
                    <Input type="date" value={String(editForm.tanggalMasuk || "").slice(0, 10)} onChange={(event) => setEditForm((current) => ({ ...current, tanggalMasuk: event.target.value }))} />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Wallet className="h-4 w-4" />
                    Bank & pembayaran
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Input value={editForm.nomorRekening} onChange={(event) => setEditForm((current) => ({ ...current, nomorRekening: event.target.value }))} placeholder="Nomor rekening" />
                    <Input value={editForm.namaBank} onChange={(event) => setEditForm((current) => ({ ...current, namaBank: event.target.value }))} placeholder="Nama bank" />
                    <Input value={editForm.employeeId} onChange={(event) => setEditForm((current) => ({ ...current, employeeId: event.target.value }))} placeholder="ID karyawan" />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <ShieldCheck className="h-4 w-4" />
                    BPJS & pajak
                  </div>
                  <div className="mt-3 grid gap-3">
                    <select value={editForm.statusBpjs} onChange={(event) => setEditForm((current) => ({ ...current, statusBpjs: event.target.value }))} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                      {["Belum ada", "Belum ikut", "Sudah ikut"].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <Input value={editForm.nomorBpjs} onChange={(event) => setEditForm((current) => ({ ...current, nomorBpjs: event.target.value }))} placeholder="Nomor BPJS" />
                    <Input value={editForm.npwp} onChange={(event) => setEditForm((current) => ({ ...current, npwp: event.target.value }))} placeholder="NPWP" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Dokumen penting</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(editForm.dokumenPenting) ? editForm.dokumenPenting : []).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{item}</span>
                  ))}
                </div>
                <div className="mt-3">
                  <Input
                    value={(Array.isArray(editForm.dokumenPenting) ? editForm.dokumenPenting : []).join(", ")}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        dokumenPenting: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="Pisahkan dokumen dengan koma"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan HR</div>
                <textarea
                  value={editForm.catatanHr}
                  onChange={(event) => setEditForm((current) => ({ ...current, catatanHr: event.target.value }))}
                  rows={5}
                  className="mt-3 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                  placeholder="Catatan HR untuk administrasi, payroll, atau tindak lanjut lain."
                />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Status data: {deriveStatusData(editForm)}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Dokumen masuk: {(Array.isArray(editForm.dokumenPenting) ? editForm.dokumenPenting : []).length} file</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Nama usaha: {editForm.namaUsaha}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Sumber data: {selectedEmployee.sumberMasuk}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Dipakai oleh modul</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedEmployee.linkedModules.map((item) => (
                    <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">{item}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl" onClick={() => void handleSaveEmployee()} disabled={isSubmitting}>
                  Simpan data
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => handleContactEmployee(selectedEmployee)}>
                  Hubungi
                </Button>
                <Button variant="outline" className={`rounded-xl ${editForm.statusAktif === "Aktif" ? "text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`} onClick={() => void handleToggleActiveStatus()} disabled={isSubmitting}>
                  {editForm.statusAktif === "Aktif" ? "Nonaktifkan" : "Aktifkan lagi"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
