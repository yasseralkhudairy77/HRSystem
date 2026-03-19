import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, GitBranch, LoaderCircle, PencilLine, Printer, ShieldCheck, UserPlus, X } from "lucide-react";

import StatusBadge from "@/components/common/StatusBadge";
import ChangeHistoryTable from "@/components/employees/ChangeHistoryTable";
import EmployeeDataStatusCard from "@/components/employees/EmployeeDataStatusCard";
import { employeeDensity } from "@/components/employees/employeeDensity";
import EmployeeSummaryCard from "@/components/employees/EmployeeSummaryCard";
import EmployeeTabs from "@/components/employees/EmployeeTabs";
import PersonalInfoForm from "@/components/employees/PersonalInfoForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { employeeDetailTabs, employeeProfileRecords, roleAccessBlueprint, rolePreviewOptions } from "@/data/employeeProfiles";
import { mapEmployeeRecordToProfile } from "@/lib/employeeRecordMapper";
import { createManualEmployee, getEmployeeList, updateEmployee } from "@/services/employeeService";
import type {
  EmployeeDocumentRecord,
  EmployeeEducationRecord,
  EmployeeFamilyMember,
  EmployeeProfile,
  EmployeeRole,
  EmployeeTabKey,
} from "@/types/employeeProfile";
import type { EmployeeRecord, ManualEmployeeFormInput } from "@/types/employee";

type StructuredTableColumn<T extends Record<string, string>> = {
  key: keyof T;
  label: string;
};

type EmployeePageFeedback = {
  type: "success" | "info" | "error";
  message: string;
} | null;

const manualEmploymentOptions = ["Probation", "Kontrak", "Tetap", "Freelance", "Part time"];
const manualGenderOptions = ["Laki-laki", "Perempuan"];
const manualMaritalOptions = ["Belum menikah", "Menikah", "Cerai"];
const jobLevelOptions = ["Director", "Head", "Manager", "Supervisor", "Senior Staff", "Staff"];
const EMPLOYEE_NAVIGATION_TARGET_KEY = "employees:navigation-target";

function defaultManualForm(): ManualEmployeeFormInput {
  return {
    namaLengkap: "",
    namaPanggilan: "",
    jabatan: "",
    departemen: "",
    statusKerja: "Probation",
    tanggalMasuk: "",
    cabang: "",
    atasan: "",
    atasanEmployeeId: null,
    jobLevel: "Staff",
    tipeKontrak: "",
    lokasiKerja: "",
    shift: "",
    noHp: "",
    emailPribadi: "",
    alamatDomisili: "",
    jenisKelamin: "",
    statusPernikahan: "",
    tanggalLahir: "",
    kewarganegaraan: "Indonesia",
  };
}

function ManualField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className={employeeDensity.fieldLabel}>
        {label}
        {required ? " *" : ""}
      </div>
      {children}
    </div>
  );
}

function PreviewToggle({
  label,
  items,
  activeKey,
  onChange,
}: {
  label: string;
  items: Array<{ key: string; label: string; subtitle?: string }>;
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`rounded-[10px] border px-3 py-2 text-left transition ${
                active
                  ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white"
                  : "border-[var(--border-soft)] bg-white text-[var(--text-main)] hover:bg-[var(--surface-0)]"
              }`}
            >
              <div className="text-[13px] font-semibold leading-5">{item.label}</div>
              {item.subtitle ? <div className={`mt-0.5 text-[11px] leading-4 ${active ? "text-slate-200" : "text-[var(--text-muted)]"}`}>{item.subtitle}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActionModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[14px] border border-[rgba(191,204,220,0.78)] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[rgba(214,222,234,0.82)] bg-white px-5 py-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-[10px] border border-[var(--border-soft)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </div>
    </div>
  );
}

function StructuredTable<T extends Record<string, string>>({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: StructuredTableColumn<T>[];
  rows: T[];
}) {
  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className="p-0">
        <div className={employeeDensity.header}>
          <div className={employeeDensity.sectionTitle}>{title}</div>
          <div className={employeeDensity.sectionDescription}>{description}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--surface-0)] text-left">
              <tr>
                {columns.map((column) => (
                  <th key={String(column.key)} className={employeeDensity.tableHeadCell}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-[rgba(214,222,234,0.82)] transition-colors hover:bg-[var(--surface-0)]/65">
                  {columns.map((column) => (
                    <td key={String(column.key)} className={`${employeeDensity.tableCell} text-[var(--text-main)]`}>
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function AccessBlueprintCard({ role }: { role: EmployeeRole }) {
  const blueprint = roleAccessBlueprint[role];

  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-800)]" />
          {blueprint.title}
        </div>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{blueprint.description}</div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Aksi utama</div>
            <div className="mt-1.5 space-y-1.5">
              {blueprint.capabilities.map((item) => (
                <div key={item} className="flex items-start gap-2 text-[13px] leading-5 text-[var(--text-muted)]">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${employeeDensity.inset} p-3.5`}>
            <div className="text-sm font-semibold text-[var(--text-main)]">Bisa diedit</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blueprint.editableNow.map((item) => (
                <span key={item} className="rounded-md border border-[#d6dfec] bg-[#f5f8fd] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-800)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className={`${employeeDensity.inset} p-3.5`}>
            <div className="text-sm font-semibold text-[var(--text-main)]">Perlu verifikasi HR</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blueprint.verificationRequired.map((item) => (
                <span key={item} className="rounded-md border border-[#eadfbf] bg-[#faf6ea] px-2.5 py-1 text-[11px] font-semibold text-[#7a6122]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className={`${employeeDensity.inset} bg-white p-3.5`}>
            <div className="text-sm font-semibold text-[var(--text-main)]">Dibatasi pada mode ini</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blueprint.restricted.map((item) => (
                <span key={item} className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-0)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeDocumentTable({ rows }: { rows: EmployeeDocumentRecord[] }) {
  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className="p-0">
        <div className={employeeDensity.header}>
          <div className={employeeDensity.sectionTitle}>Dokumen Karyawan</div>
          <div className={employeeDensity.sectionDescription}>
            Struktur tab ini disiapkan untuk pengelolaan file karyawan, pengecekan kelengkapan, dan upload dokumen mandiri.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--surface-0)] text-left">
              <tr>
                <th className={employeeDensity.tableHeadCell}>Dokumen</th>
                <th className={employeeDensity.tableHeadCell}>Nomor</th>
                <th className={employeeDensity.tableHeadCell}>Status</th>
                <th className={employeeDensity.tableHeadCell}>Diperbarui</th>
                <th className={employeeDensity.tableHeadCell}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[rgba(214,222,234,0.82)] transition-colors hover:bg-[var(--surface-0)]/65">
                  <td className={`${employeeDensity.tableCell} font-medium text-[var(--text-main)]`}>{row.dokumen}</td>
                  <td className={`${employeeDensity.tableCell} text-[var(--text-muted)]`}>{row.nomor}</td>
                  <td className={employeeDensity.tableCell}>
                    <StatusBadge value={row.status} />
                  </td>
                  <td className={`${employeeDensity.tableCell} text-[var(--text-muted)]`}>{row.diperbarui}</td>
                  <td className={employeeDensity.tableCell}>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" className="rounded-[10px]">
                        Lihat
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-[10px]">
                        Download
                      </Button>
                      <Button size="sm" className="rounded-[10px]">
                        Upload
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationSettingsCard({
  selectedEmployee,
  supervisorOptions,
  onSave,
  isSaving,
}: {
  selectedEmployee: EmployeeProfile;
  supervisorOptions: Array<{ id: string; label: string }>;
  onSave: (values: { atasanEmployeeId: string | null; atasan: string; jobLevel: string }) => void;
  isSaving: boolean;
}) {
  const [atasanEmployeeId, setAtasanEmployeeId] = useState<string>(selectedEmployee.orgMeta?.atasanEmployeeId || "");
  const [jobLevel, setJobLevel] = useState<string>(selectedEmployee.orgMeta?.jobLevel || "Staff");

  useEffect(() => {
    setAtasanEmployeeId(selectedEmployee.orgMeta?.atasanEmployeeId || "");
    setJobLevel(selectedEmployee.orgMeta?.jobLevel || "Staff");
  }, [selectedEmployee]);

  const selectedSupervisor = supervisorOptions.find((option) => option.id === atasanEmployeeId);
  const selectedSupervisorName = selectedSupervisor ? selectedSupervisor.label.split(" / ")[0] : "";
  const issues = [
    !atasanEmployeeId && !["Director", "Head"].includes(jobLevel) ? "Belum punya atasan langsung. Untuk level operasional, isi atasan agar chart lebih akurat." : "",
    atasanEmployeeId === selectedEmployee.id ? "Atasan tidak boleh mengarah ke karyawan yang sama." : "",
  ].filter(Boolean);

  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          <GitBranch className="h-3.5 w-3.5 text-[var(--brand-800)]" />
          Pengaturan Organisasi
        </div>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">
          Atur relasi atasan langsung dan job level agar Data Karyawan otomatis tersambung ke Struktur Organisasi.
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className={employeeDensity.fieldLabel}>Atasan Langsung</div>
            <select
              value={atasanEmployeeId}
              onChange={(event) => setAtasanEmployeeId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
            >
              <option value="">Belum ditetapkan</option>
              {supervisorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={employeeDensity.fieldLabel}>Job Level</div>
            <select
              value={jobLevel}
              onChange={(event) => setJobLevel(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
            >
              {jobLevelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {issues.length ? (
            issues.map((issue) => (
              <div key={issue} className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800">
                {issue}
              </div>
            ))
          ) : (
            <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-5 text-emerald-800">
              Struktur dasar sudah siap. Perubahan ini akan dipakai otomatis oleh menu Struktur Organisasi.
            </div>
          )}
        </div>

        <div className={`${employeeDensity.inset} mt-4 p-3`}>
          <div className={employeeDensity.fieldLabel}>Ringkasan Saat Ini</div>
          <div className="mt-2 space-y-1.5 text-[13px] text-[var(--text-muted)]">
            <div>
              Atasan saat ini: <span className="font-medium text-[var(--text-main)]">{selectedSupervisorName || selectedEmployee.atasan || "Belum ditetapkan"}</span>
            </div>
            <div>
              Job level: <span className="font-medium text-[var(--text-main)]">{jobLevel}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            className="rounded-[10px]"
            onClick={() =>
              onSave({
                atasanEmployeeId: atasanEmployeeId || null,
                atasan: selectedSupervisorName || "Belum ditetapkan",
                jobLevel,
              })
            }
            disabled={isSaving || atasanEmployeeId === selectedEmployee.id}
          >
            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan Struktur
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<EmployeeTabKey>("personal");
  const [activeRole, setActiveRole] = useState<EmployeeRole>("hr");
  const [employeeRawRecords, setEmployeeRawRecords] = useState<EmployeeRecord[]>([]);
  const [employeeRecords, setEmployeeRecords] = useState<EmployeeProfile[]>(employeeProfileRecords);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeProfileRecords[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback");
  const [loadError, setLoadError] = useState("");
  const [pageFeedback, setPageFeedback] = useState<EmployeePageFeedback>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualEmployeeFormInput>(defaultManualForm());
  const [isCreatingManualEmployee, setIsCreatingManualEmployee] = useState(false);
  const [isSavingOrgSettings, setIsSavingOrgSettings] = useState(false);

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    if (!employeeRecords.length) return;
    if (!employeeRecords.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employeeRecords[0].id);
    }
  }, [employeeRecords, selectedEmployeeId]);

  useEffect(() => {
    if (!employeeRecords.length) return;

    const raw = window.sessionStorage.getItem(EMPLOYEE_NAVIGATION_TARGET_KEY);
    if (!raw) return;

    try {
      const target = JSON.parse(raw) as { employeeId?: string; activeTab?: EmployeeTabKey };
      const matchedEmployee = employeeRecords.find((employee) => employee.id === target.employeeId);
      if (!matchedEmployee) return;

      setSelectedEmployeeId(matchedEmployee.id);
      if (target.activeTab) setActiveTab(target.activeTab);
      window.sessionStorage.removeItem(EMPLOYEE_NAVIGATION_TARGET_KEY);
    } catch (error) {
      console.warn("Target navigasi employee tidak valid:", error);
      window.sessionStorage.removeItem(EMPLOYEE_NAVIGATION_TARGET_KEY);
    }
  }, [employeeRecords]);

  async function loadEmployees() {
    setLoading(true);
    setLoadError("");

    try {
      const rows = await getEmployeeList();

      if (rows.length) {
        setEmployeeRawRecords(rows);
        setEmployeeRecords(rows.map(mapEmployeeRecordToProfile));
        setDataSource("live");
        return;
      }

      setEmployeeRawRecords([]);
      setEmployeeRecords(employeeProfileRecords);
      setDataSource("fallback");
      setLoadError("Belum ada data karyawan hasil onboarding yang masuk ke database. Menampilkan preview dummy untuk sementara.");
    } catch (error) {
      console.error("Load employees gagal:", error);
      setEmployeeRawRecords([]);
      setEmployeeRecords(employeeProfileRecords);
      setDataSource("fallback");
      setLoadError(error instanceof Error ? `${error.message} Menampilkan preview dummy untuk sementara.` : "Gagal memuat data karyawan dari database. Menampilkan preview dummy untuk sementara.");
    } finally {
      setLoading(false);
    }
  }

  function updateManualForm<K extends keyof ManualEmployeeFormInput>(key: K, value: ManualEmployeeFormInput[K]) {
    setManualForm((current) => ({ ...current, [key]: value }));
  }

  function openManualModal() {
    setPageFeedback(null);
    setManualForm(defaultManualForm());
    setShowManualModal(true);
  }

  function closeManualModal() {
    if (isCreatingManualEmployee) return;
    setShowManualModal(false);
  }

  async function handleCreateManualEmployee() {
    if (!manualForm.namaLengkap.trim() || !manualForm.jabatan.trim() || !manualForm.tanggalMasuk || !manualForm.cabang.trim()) {
      setPageFeedback({ type: "error", message: "Nama lengkap, jabatan, tanggal masuk, dan cabang wajib diisi sebelum karyawan disimpan." });
      return;
    }

    if (dataSource === "live" && !manualForm.atasanEmployeeId && !["Director", "Head"].includes(manualForm.jobLevel)) {
      setPageFeedback({ type: "error", message: "Untuk level Manager, Supervisor, Senior Staff, atau Staff, pilih atasan langsung agar struktur organisasi tetap konsisten." });
      return;
    }

    setIsCreatingManualEmployee(true);
    setPageFeedback(null);

    try {
      const created = await createManualEmployee(manualForm);
      if (!created) throw new Error("Data karyawan manual tidak berhasil dibuat.");

      const mapped = mapEmployeeRecordToProfile(created);
      setEmployeeRawRecords((current) => {
        const base = dataSource === "fallback" ? [] : current;
        return [created, ...base.filter((item) => item.id !== created.id)];
      });
      setEmployeeRecords((current) => {
        const base = dataSource === "fallback" ? [] : current;
        const next = [mapped, ...base.filter((item) => item.id !== mapped.id)];
        return next;
      });
      setSelectedEmployeeId(mapped.id);
      setActiveTab("personal");
      setDataSource("live");
      setLoadError("");
      setShowManualModal(false);
      setManualForm(defaultManualForm());
      setPageFeedback({ type: "success", message: `${mapped.namaLengkap} berhasil ditambahkan ke Data Karyawan tanpa melalui proses rekrutmen.` });
    } catch (error) {
      console.error("Create manual employee gagal:", error);
      setPageFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal menambahkan karyawan manual ke database.",
      });
    } finally {
      setIsCreatingManualEmployee(false);
    }
  }

  async function handleSaveOrgSettings(values: { atasanEmployeeId: string | null; atasan: string; jobLevel: string }) {
    if (!selectedEmployeeRaw) {
      setPageFeedback({ type: "info", message: "Pengaturan struktur organisasi hanya bisa disimpan untuk data karyawan live di database." });
      return;
    }

    if (!values.atasanEmployeeId && !["Director", "Head"].includes(values.jobLevel)) {
      setPageFeedback({ type: "error", message: "Untuk level operasional, isi atasan langsung terlebih dahulu sebelum menyimpan struktur organisasi." });
      return;
    }

    setIsSavingOrgSettings(true);
    setPageFeedback(null);

    try {
      const updated = await updateEmployee(selectedEmployeeRaw.id, {
        atasan_employee_id: values.atasanEmployeeId ? Number(values.atasanEmployeeId) : null,
        atasan: values.atasan,
        job_level: values.jobLevel,
      });

      if (!updated) throw new Error("Perubahan struktur organisasi belum berhasil disimpan.");

      const mapped = mapEmployeeRecordToProfile(updated);
      setEmployeeRawRecords((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setEmployeeRecords((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
      setPageFeedback({ type: "success", message: `Struktur organisasi ${mapped.namaLengkap} berhasil diperbarui.` });
    } catch (error) {
      console.error("Simpan organization settings gagal:", error);
      setPageFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal menyimpan relasi atasan dan job level.",
      });
    } finally {
      setIsSavingOrgSettings(false);
    }
  }

  const selectedEmployee = useMemo(
    () => employeeRecords.find((employee) => employee.id === selectedEmployeeId) || employeeRecords[0],
    [employeeRecords, selectedEmployeeId],
  );
  const selectedEmployeeRaw = useMemo(
    () => employeeRawRecords.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [employeeRawRecords, selectedEmployeeId],
  );
  const supervisorOptions = useMemo(
    () =>
      employeeRecords
        .filter((employee) => employee.id !== selectedEmployeeId)
        .map((employee) => ({
          id: employee.id,
          label: `${employee.namaLengkap} / ${employee.jabatan}`,
        })),
    [employeeRecords, selectedEmployeeId],
  );
  const selectedEmployeeOrgIssues = useMemo(() => {
    const issues: string[] = [];
    const currentJobLevel = selectedEmployee?.orgMeta?.jobLevel || "Staff";
    const currentSupervisorId = selectedEmployee?.orgMeta?.atasanEmployeeId || null;
    const hasSupervisor = Boolean(currentSupervisorId || (selectedEmployee?.atasan && selectedEmployee.atasan !== "-" && selectedEmployee.atasan !== "Belum ditetapkan"));

    if (selectedEmployee && !hasSupervisor && !["Director", "Head"].includes(currentJobLevel)) {
      issues.push("Karyawan ini belum punya atasan langsung, padahal level jabatannya masih operasional.");
    }

    if (selectedEmployee && currentSupervisorId === selectedEmployee.id) {
      issues.push("Atasan langsung mengarah ke karyawan yang sama dan perlu diperbaiki.");
    }

    return issues;
  }, [selectedEmployee]);

  const organizationSettingsSection = selectedEmployeeRaw ? (
    <OrganizationSettingsCard
      selectedEmployee={selectedEmployee}
      supervisorOptions={supervisorOptions}
      onSave={handleSaveOrgSettings}
      isSaving={isSavingOrgSettings}
    />
  ) : (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          <GitBranch className="h-3.5 w-3.5 text-[var(--brand-800)]" />
          Pengaturan Organisasi
        </div>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">
          Mode preview belum bisa menyimpan relasi atasan berbasis employee id. Aktifkan data karyawan live untuk mengelola struktur organisasi langsung dari halaman ini.
        </div>
      </CardContent>
    </Card>
  );

  const organizationValidationSection = selectedEmployeeOrgIssues.length ? (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className={employeeDensity.sectionTitle}>Validasi Organisasi</div>
        <div className={employeeDensity.sectionDescription}>
          Pemeriksaan cepat untuk memastikan struktur organisasi karyawan ini sudah siap dipakai oleh menu Struktur Organisasi.
        </div>
        <div className="mt-4 space-y-2">
          {selectedEmployeeOrgIssues.map((issue) => (
            <div key={issue} className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800">
              {issue}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ) : null;

  function handleQuickAction(actionId: string) {
    if (actionId === "documents") setActiveTab("documents");
    if (actionId === "history") setActiveTab("history");
    if (actionId === "print") window.print();
  }

  function jumpToOrganizationSection() {
    setActiveTab("job");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById("organization-settings-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
  }

  if (!selectedEmployee) return null;

  const employeePreviewItems = employeeRecords.map((employee) => ({
    key: employee.id,
    label: employee.namaLengkap,
    subtitle: `${employee.employeeId} - ${employee.jabatan}`,
  }));

  const currentTabContent = (() => {
    switch (activeTab) {
      case "personal":
        return (
          <>
            <PersonalInfoForm
              title="Informasi Personal"
              description="Struktur form dua kolom untuk data personal inti karyawan. Tata letaknya dibuat presisi agar mudah dipakai HR dan tetap nyaman untuk employee self-service."
              fields={selectedEmployee.personalFields}
              role={activeRole}
            />
            <ChangeHistoryTable rows={selectedEmployee.changeHistory.slice(0, 3)} />
          </>
        );
      case "identity":
        return (
          <PersonalInfoForm
            title="Informasi Identitas"
            description="Tab ini menyiapkan data identitas legal yang umumnya terkait verifikasi administrasi, payroll, BPJS, dan kepatuhan dokumen."
            fields={selectedEmployee.identityFields}
            role={activeRole}
          />
        );
      case "contact":
        return (
          <PersonalInfoForm
            title="Kontak & Alamat"
            description="Area ini dipakai untuk mengelola data komunikasi dan alamat resmi karyawan, termasuk field yang sering diperbarui melalui self-service."
            fields={selectedEmployee.contactFields}
            role={activeRole}
          />
        );
      case "family":
        return (
          <StructuredTable<EmployeeFamilyMember>
            title="Data Keluarga"
            description="Struktur tabel keluarga disiapkan untuk data tanggungan, kontak darurat, dan pembaruan data keluarga oleh karyawan maupun HR."
            columns={[
              { key: "nama", label: "Nama" },
              { key: "hubungan", label: "Hubungan" },
              { key: "tanggalLahir", label: "Tanggal Lahir" },
              { key: "status", label: "Status" },
            ]}
            rows={selectedEmployee.familyMembers}
          />
        );
      case "education":
        return (
          <StructuredTable<EmployeeEducationRecord>
            title="Riwayat Pendidikan"
            description="Placeholder ini menyiapkan tabel pendidikan formal yang nantinya bisa ditambah atau diperbarui oleh karyawan dengan alur verifikasi HR."
            columns={[
              { key: "jenjang", label: "Jenjang" },
              { key: "institusi", label: "Institusi" },
              { key: "jurusan", label: "Jurusan" },
              { key: "tahunLulus", label: "Tahun Lulus" },
            ]}
            rows={selectedEmployee.educationRecords}
          />
        );
      case "job":
        return (
          <>
            <PersonalInfoForm
              title="Data Pekerjaan"
              description="Field pekerjaan disusun seperti employee master data: formal, stabil, dan menjadi referensi utama untuk kontrak, payroll, serta struktur organisasi. Atasan langsung dan job level kini tampil sebagai bagian dari data kerja utama."
              fields={selectedEmployee.jobFields}
              role={activeRole}
            />
            <div id="organization-settings-section">{organizationSettingsSection}</div>
            {organizationValidationSection}
          </>
        );
      case "documents":
        return <EmployeeDocumentTable rows={selectedEmployee.documentRecords} />;
      case "history":
        return (
          <ChangeHistoryTable
            title="Riwayat Perubahan"
            description="Histori lengkap pembaruan data untuk kebutuhan audit trail internal dan pelacakan approval antara HR dan karyawan."
            rows={selectedEmployee.changeHistory}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      <Card className={employeeDensity.card}>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className={employeeDensity.overline}>HR Administrasi</div>
            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">Detail Data Karyawan</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Data lengkap karyawan untuk kebutuhan administrasi, payroll, dan dokumentasi HR.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-[10px]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <Button variant="outline" className="rounded-[10px]" onClick={openManualModal}>
              <UserPlus className="mr-2 h-4 w-4" />
              Tambah Karyawan Manual
            </Button>
            <Button className="rounded-[10px]">
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={employeeDensity.cardFlat}>
        <CardContent className="grid gap-4 p-5 xl:grid-cols-2">
          <PreviewToggle label={dataSource === "live" ? "Data Karyawan Aktif" : "Preview Data Dummy"} items={employeePreviewItems} activeKey={selectedEmployeeId} onChange={setSelectedEmployeeId} />
          <PreviewToggle label="Mode Akses" items={rolePreviewOptions} activeKey={activeRole} onChange={(key) => setActiveRole(key as EmployeeRole)} />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Memuat data karyawan dari database...
        </div>
      ) : null}

      {loadError ? (
        <div className="flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {pageFeedback ? (
        <div
          className={`flex items-start gap-3 rounded-[12px] border px-4 py-3 text-sm ${
            pageFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : pageFeedback.type === "info"
                ? "border-sky-200 bg-sky-50 text-sky-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pageFeedback.message}</span>
        </div>
      ) : null}

      <EmployeeSummaryCard employee={selectedEmployee} onQuickAction={handleQuickAction} onManageOrganization={jumpToOrganizationSection} />

      <EmployeeTabs tabs={employeeDetailTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <div className="space-y-4">{currentTabContent}</div>

        <div className="space-y-4">
          <EmployeeDataStatusCard status={selectedEmployee.statusOverview} />
          {activeTab !== "job" ? organizationSettingsSection : null}
          {activeTab !== "job" ? organizationValidationSection : null}

          <AccessBlueprintCard role={activeRole} />

          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Ringkasan Sistem</div>
              <div className={employeeDensity.sectionDescription}>
                Halaman ini disiapkan sebagai fondasi satu sumber data karyawan yang nantinya bisa dipakai admin HR, portal karyawan, dan aplikasi Android karyawan.
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Struktur detail dipisah jelas antara summary, tab modul, dan histori perubahan.",
                  "Field master tetap dikelola HR agar data payroll dan administrasi tetap stabil.",
                  "Field self-service dibuat eksplisit supaya pengalaman karyawan tetap sederhana.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--text-soft)]">
                <Printer className="h-3.5 w-3.5" />
                Siap dikembangkan menjadi mode print, approval, dan self-service form di tahap berikutnya.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showManualModal ? (
        <ActionModal
          title="Tambah Karyawan Manual"
          subtitle="Buat data karyawan baru secara langsung untuk kasus yang tidak melalui proses rekrutmen."
          onClose={closeManualModal}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ManualField label="Nama Lengkap" required>
              <Input value={manualForm.namaLengkap} onChange={(event) => updateManualForm("namaLengkap", event.target.value)} placeholder="Nama lengkap karyawan" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Nama Panggilan">
              <Input value={manualForm.namaPanggilan} onChange={(event) => updateManualForm("namaPanggilan", event.target.value)} placeholder="Nama panggilan" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Jabatan" required>
              <Input value={manualForm.jabatan} onChange={(event) => updateManualForm("jabatan", event.target.value)} placeholder="Contoh: Staff Operasional" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Departemen">
              <Input value={manualForm.departemen} onChange={(event) => updateManualForm("departemen", event.target.value)} placeholder="Contoh: Store Operations" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Job Level">
              <select
                value={manualForm.jobLevel}
                onChange={(event) => updateManualForm("jobLevel", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
              >
                {jobLevelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ManualField>

            <ManualField label="Status Kerja">
              <select
                value={manualForm.statusKerja}
                onChange={(event) => updateManualForm("statusKerja", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
              >
                {manualEmploymentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ManualField>

            <ManualField label="Tipe Kontrak">
              <Input value={manualForm.tipeKontrak} onChange={(event) => updateManualForm("tipeKontrak", event.target.value)} placeholder="Contoh: PKWT 12 bulan" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Tanggal Masuk" required>
              <Input type="date" value={manualForm.tanggalMasuk} onChange={(event) => updateManualForm("tanggalMasuk", event.target.value)} className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Cabang" required>
              <Input value={manualForm.cabang} onChange={(event) => updateManualForm("cabang", event.target.value)} placeholder="Contoh: Cabang Bekasi Timur" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Atasan">
              <select
                value={manualForm.atasanEmployeeId ? String(manualForm.atasanEmployeeId) : ""}
                onChange={(event) => {
                  const nextId = event.target.value ? Number(event.target.value) : null;
                  const selectedSupervisor = employeeRecords.find((employee) => employee.id === String(nextId));
                  updateManualForm("atasanEmployeeId", nextId);
                  updateManualForm("atasan", selectedSupervisor?.namaLengkap || "");
                }}
                className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
                disabled={dataSource !== "live" || !employeeRecords.length}
              >
                <option value="">Belum ditetapkan</option>
                {employeeRecords.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.namaLengkap} / {employee.jabatan}
                  </option>
                ))}
              </select>
            </ManualField>

            <ManualField label="Lokasi Kerja">
              <Input value={manualForm.lokasiKerja} onChange={(event) => updateManualForm("lokasiKerja", event.target.value)} placeholder="Lokasi kerja utama" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Shift">
              <Input value={manualForm.shift} onChange={(event) => updateManualForm("shift", event.target.value)} placeholder="Contoh: Regular 08.00 - 17.00" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="No HP">
              <Input value={manualForm.noHp} onChange={(event) => updateManualForm("noHp", event.target.value)} placeholder="08xx" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Email Pribadi">
              <Input value={manualForm.emailPribadi} onChange={(event) => updateManualForm("emailPribadi", event.target.value)} placeholder="nama@email.com" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Jenis Kelamin">
              <select
                value={manualForm.jenisKelamin}
                onChange={(event) => updateManualForm("jenisKelamin", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
              >
                <option value="">Pilih jenis kelamin</option>
                {manualGenderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ManualField>

            <ManualField label="Status Pernikahan">
              <select
                value={manualForm.statusPernikahan}
                onChange={(event) => updateManualForm("statusPernikahan", event.target.value)}
                className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
              >
                <option value="">Pilih status pernikahan</option>
                {manualMaritalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </ManualField>

            <ManualField label="Tanggal Lahir">
              <Input type="date" value={manualForm.tanggalLahir} onChange={(event) => updateManualForm("tanggalLahir", event.target.value)} className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <ManualField label="Kewarganegaraan">
              <Input value={manualForm.kewarganegaraan} onChange={(event) => updateManualForm("kewarganegaraan", event.target.value)} placeholder="Indonesia" className="rounded-[10px] border-[var(--border-soft)]" />
            </ManualField>

            <div className="md:col-span-2">
              <ManualField label="Alamat Domisili">
                <textarea
                  value={manualForm.alamatDomisili}
                  onChange={(event) => updateManualForm("alamatDomisili", event.target.value)}
                  rows={4}
                  placeholder="Alamat domisili saat ini"
                  className="w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
                />
              </ManualField>
            </div>
          </div>

          <div className={`${employeeDensity.inset} p-4 text-[13px] leading-5 text-[var(--text-muted)]`}>
            Data ini langsung membuat master record karyawan aktif. Setelah tersimpan, HR tetap bisa melengkapi identitas, dokumen, keluarga, dan histori perubahan dari tab yang sudah ada.
          </div>

          {dataSource !== "live" ? (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-5 text-amber-800">
              Relasi atasan berbasis employee id akan aktif penuh setelah data karyawan live tersedia di database.
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[rgba(214,222,234,0.82)] pt-4">
            <Button variant="outline" className="rounded-[10px]" onClick={closeManualModal} disabled={isCreatingManualEmployee}>
              Batal
            </Button>
            <Button className="rounded-[10px]" onClick={() => void handleCreateManualEmployee()} disabled={isCreatingManualEmployee}>
              {isCreatingManualEmployee ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Simpan Karyawan
            </Button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );
}
