import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, GitBranch, LoaderCircle, Network, Settings2, ShieldCheck, UserRound } from "lucide-react";

import { employeeDensity } from "@/components/employees/employeeDensity";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approvalRuleSets } from "@/data/approvalRules";
import { organizationPreviewRecords } from "@/data/organizationPreview";
import { buildApprovalPreview, getApprovalSourceLabel } from "@/lib/approvalMatrix";
import { getEmployeeList } from "@/services/employeeService";
import type { ApprovalRuleSet } from "@/types/approval";
import type { EmployeeRecord } from "@/types/employee";

function MatrixStat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] text-[var(--text-muted)]">{label}</div>
            <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
            <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{note}</div>
          </div>
          <div className="rounded-[10px] bg-[var(--surface-0)] p-2.5 text-[var(--brand-800)]">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatrixDocumentItem({
  rule,
  active,
  onClick,
}: {
  rule: ApprovalRuleSet;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[12px] border px-4 py-3 text-left transition ${
        active
          ? "border-[var(--brand-800)] bg-[rgba(22,61,112,0.06)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          : "border-[var(--border-soft)] bg-white hover:bg-[var(--surface-0)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[var(--text-main)]">{rule.name}</div>
          <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{rule.category}</div>
        </div>
        <div className="shrink-0 rounded-full border border-[var(--border-soft)] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
          {rule.steps.length} langkah
        </div>
      </div>
    </button>
  );
}

function getPreviewRequesterId(rule: ApprovalRuleSet, employees: EmployeeRecord[]) {
  const sorted = [...employees].sort((left, right) => left.nama_lengkap.localeCompare(right.nama_lengkap, "id-ID"));
  const defaultCandidate = sorted.find((item) => item.atasan_employee_id) || sorted[0];
  const hrCandidate = sorted.find((item) => item.atasan_employee_id && item.departemen.toLowerCase().includes("human resources")) || defaultCandidate;

  if (!defaultCandidate) return null;

  if (rule.code === "warning_letter" || rule.code === "promotion_request") {
    return hrCandidate?.id || defaultCandidate.id;
  }

  return defaultCandidate.id;
}

function navigateTo(menu: string) {
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: { menu } }));
}

export default function ApprovalMatrixPage() {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRuleCode, setSelectedRuleCode] = useState(approvalRuleSets[0]?.code || "");
  const [selectedRequesterId, setSelectedRequesterId] = useState<number | null>(null);

  useEffect(() => {
    void loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    setError("");

    try {
      const rows = await getEmployeeList();
      setRecords(rows);
      if (!rows.length) {
        setError("Belum ada data approval live di database. Matriks approval sementara memakai preview dummy yang sinkron dengan struktur organisasi.");
      }
    } catch (loadError) {
      console.error("Load approval matrix gagal:", loadError);
      setRecords([]);
      setError(loadError instanceof Error ? `${loadError.message} Matriks approval sementara memakai preview dummy.` : "Gagal memuat data live. Matriks approval sementara memakai preview dummy.");
    } finally {
      setLoading(false);
    }
  }

  const dataSource = records.length ? records : organizationPreviewRecords;
  const activeEmployees = useMemo(
    () =>
      dataSource
        .filter((item) => ["aktif", "active", "probation", "tetap", "kontrak"].includes(String(item.status_karyawan || "").trim().toLowerCase()))
        .sort((left, right) => left.nama_lengkap.localeCompare(right.nama_lengkap, "id-ID")),
    [dataSource],
  );

  const selectedRule = approvalRuleSets.find((item) => item.code === selectedRuleCode) || approvalRuleSets[0];

  useEffect(() => {
    if (!selectedRule) return;
    const candidateId = getPreviewRequesterId(selectedRule, activeEmployees);
    if (!selectedRequesterId || !activeEmployees.some((item) => item.id === selectedRequesterId)) {
      setSelectedRequesterId(candidateId);
    }
  }, [activeEmployees, selectedRequesterId, selectedRule]);

  const previewResult = useMemo(() => {
    if (!selectedRule) return { steps: [], warnings: [] };
    return buildApprovalPreview({
      ruleSet: selectedRule,
      requesterId: selectedRequesterId,
      employees: activeEmployees,
    });
  }, [activeEmployees, selectedRequesterId, selectedRule]);

  const selectedRequester = activeEmployees.find((item) => item.id === selectedRequesterId) || null;
  const resolvedCount = previewResult.steps.filter((item) => item.status === "resolved").length;
  const fallbackCount = previewResult.steps.filter((item) => item.status === "fallback").length;

  const stats = [
    {
      label: "Rule aktif",
      value: String(approvalRuleSets.filter((item) => item.isActive).length),
      note: "Template flow approval yang siap dipakai modul transaksi.",
      icon: ShieldCheck,
    },
    {
      label: "Langkah approval",
      value: String(selectedRule?.steps.length || 0),
      note: "Jumlah level approval pada dokumen yang sedang dipreview.",
      icon: GitBranch,
    },
    {
      label: "Approver ter-resolve",
      value: String(resolvedCount),
      note: "Step yang sudah berhasil menemukan approver dari struktur organisasi.",
      icon: CheckCircle2,
    },
    {
      label: "Fallback terpakai",
      value: String(fallbackCount),
      note: "Step yang memakai approver cadangan agar proses tidak macet.",
      icon: Network,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className={employeeDensity.card}>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className={employeeDensity.overline}>HR Administrasi</div>
              <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">Matriks Approval</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Atur jalur persetujuan otomatis untuk cuti, izin, surat peringatan, promosi, dan administrasi HR lainnya. Approval matrix ini dibangun di atas struktur organisasi dan data karyawan aktif.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-[10px]" onClick={() => navigateTo("organization-structure")}>
                Lihat Struktur Organisasi
              </Button>
              <Button className="rounded-[10px]" onClick={() => navigateTo("employees")}>
                Buka Data Karyawan
              </Button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className={`${employeeDensity.inset} px-4 py-3 text-[13px] text-[var(--text-muted)]`}>
              Sumber data approval preview: <span className="font-medium text-[var(--text-main)]">{records.length ? "Data Karyawan aktif" : "Preview dummy organisasi"}</span>
            </div>
            <div className={`${employeeDensity.inset} px-4 py-3 text-[13px] text-[var(--text-muted)]`}>
              Tujuan modul: <span className="font-medium text-[var(--text-main)]">fondasi approval berjenjang untuk cuti, SP, promosi, demosi, dan surat HR.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Memuat data approval matrix...
        </div>
      ) : null}

      {error ? <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <MatrixStat key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1.4fr)_340px]">
        <div className="space-y-4">
          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Jenis Dokumen</div>
              <div className={employeeDensity.sectionDescription}>Pilih jenis administrasi yang approval chain-nya ingin dilihat atau disesuaikan.</div>

              <div className="mt-4 space-y-2.5">
                {approvalRuleSets.map((rule) => (
                  <MatrixDocumentItem key={rule.id} rule={rule} active={selectedRule?.code === rule.code} onClick={() => setSelectedRuleCode(rule.code)} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Fondasi Approval</div>
              <div className={employeeDensity.sectionDescription}>Modul ini disiapkan agar semua pengajuan nanti bisa menentukan approver secara otomatis, tanpa pilih manual setiap submit.</div>

              <div className="mt-4 space-y-2">
                {[
                  "Struktur Organisasi menjadi sumber relasi atasan langsung dan jalur eskalasi.",
                  "Matriks Approval menyimpan rule per dokumen, bukan satu flow untuk semua proses.",
                  "Fallback approver menjaga pengajuan tetap berjalan jika data atasan belum lengkap.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={employeeDensity.cardFlat}>
          <CardContent className={employeeDensity.mainPadding}>
            {selectedRule ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(214,222,234,0.82)] pb-4">
                  <div className="min-w-0">
                    <div className={employeeDensity.overline}>{selectedRule.category}</div>
                    <div className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-main)]">{selectedRule.name}</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{selectedRule.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                      {selectedRule.isActive ? "Aktif" : "Draft"}
                    </div>
                    <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {selectedRule.steps.length} langkah
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[12px] border border-[rgba(191,204,220,0.72)]">
                  <table className="min-w-full divide-y divide-[rgba(214,222,234,0.72)]">
                    <thead className="bg-[var(--surface-0)]">
                      <tr>
                        <th className={employeeDensity.tableHeadCell}>Urutan</th>
                        <th className={employeeDensity.tableHeadCell}>Sumber Approver</th>
                        <th className={employeeDensity.tableHeadCell}>Deskripsi</th>
                        <th className={employeeDensity.tableHeadCell}>Fallback</th>
                        <th className={employeeDensity.tableHeadCell}>Wajib</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(214,222,234,0.68)] bg-white">
                      {selectedRule.steps
                        .slice()
                        .sort((left, right) => left.stepOrder - right.stepOrder)
                        .map((step) => (
                          <tr key={step.id}>
                            <td className={employeeDensity.tableCell}>
                              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-0)] text-[12px] font-semibold text-[var(--text-main)]">
                                {step.stepOrder}
                              </div>
                            </td>
                            <td className={employeeDensity.tableCell}>
                              <div className="font-medium text-[var(--text-main)]">{getApprovalSourceLabel(step.approverSource)}</div>
                            </td>
                            <td className={employeeDensity.tableCell}>
                              <div className="text-[var(--text-main)]">{step.description}</div>
                            </td>
                            <td className={employeeDensity.tableCell}>
                              <div className="text-[var(--text-muted)]">{step.fallbackSource && step.fallbackSource !== "none" ? getApprovalSourceLabel(step.fallbackSource) : "-"}</div>
                            </td>
                            <td className={employeeDensity.tableCell}>
                              <div className={step.isRequired ? "font-medium text-[var(--text-main)]" : "text-[var(--text-muted)]"}>{step.isRequired ? "Wajib" : "Opsional"}</div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className={`${employeeDensity.inset} p-4`}>
                    <div className={employeeDensity.fieldLabel}>Trigger transaksi</div>
                    <div className="mt-1.5 text-sm font-medium text-[var(--text-main)]">{selectedRule.transactionLabel}</div>
                  </div>
                  <div className={`${employeeDensity.inset} p-4`}>
                    <div className={employeeDensity.fieldLabel}>Approver utama</div>
                    <div className="mt-1.5 text-sm font-medium text-[var(--text-main)]">{getApprovalSourceLabel(selectedRule.steps[0]?.approverSource || "none")}</div>
                  </div>
                  <div className={`${employeeDensity.inset} p-4`}>
                    <div className={employeeDensity.fieldLabel}>Final approval</div>
                    <div className="mt-1.5 text-sm font-medium text-[var(--text-main)]">
                      {getApprovalSourceLabel(selectedRule.steps[selectedRule.steps.length - 1]?.approverSource || "none")}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className="text-sm font-semibold text-[var(--text-main)]">Catatan Implementasi</div>
                  <div className="mt-3 space-y-2">
                    {selectedRule.notes.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <UserRound className="h-3.5 w-3.5 text-[var(--brand-800)]" />
                Preview Jalur Approval
              </div>
              <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">Pilih karyawan contoh untuk melihat siapa approver yang akan dipanggil otomatis oleh sistem.</div>

              <div className="mt-4">
                <div className={employeeDensity.fieldLabel}>Karyawan contoh</div>
                <select
                  value={selectedRequesterId || ""}
                  onChange={(event) => setSelectedRequesterId(event.target.value ? Number(event.target.value) : null)}
                  className="mt-1.5 h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
                >
                  <option value="">Pilih karyawan</option>
                  {activeEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nama_lengkap} - {employee.jabatan}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRequester ? (
                <div className="mt-4 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                  <div className={employeeDensity.fieldLabel}>Requester</div>
                  <div className="mt-1.5 text-sm font-semibold text-[var(--text-main)]">{selectedRequester.nama_lengkap}</div>
                  <div className="mt-1 text-[13px] text-[var(--text-muted)]">{selectedRequester.jabatan}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-[var(--text-muted)]">
                    <div>
                      <div className={employeeDensity.fieldLabel}>Departemen</div>
                      <div className="mt-1 text-[var(--text-main)]">{selectedRequester.departemen}</div>
                    </div>
                    <div>
                      <div className={employeeDensity.fieldLabel}>Cabang</div>
                      <div className="mt-1 text-[var(--text-main)]">{selectedRequester.cabang}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {previewResult.steps.map((step) => (
                  <div key={`${step.stepOrder}-${step.sourceLabel}`} className="rounded-[12px] border border-[var(--border-soft)] bg-white p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Step {step.stepOrder}</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{step.sourceLabel}</div>
                      </div>
                      <div
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          step.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700"
                            : step.status === "fallback"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {step.status === "resolved" ? "Resolved" : step.status === "fallback" ? "Fallback" : "Missing"}
                      </div>
                    </div>

                    <div className="mt-3 border-l border-[var(--border-soft)] pl-3">
                      <div className="text-[13px] font-medium text-[var(--text-main)]">{step.approverName}</div>
                      <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{step.approverPosition}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--text-soft)]">{step.approverEmployeeId}</div>
                    </div>

                    <div className="mt-3 text-[12px] leading-5 text-[var(--text-muted)]">{step.note}</div>
                    <div className="mt-2 text-[11px] text-[var(--text-soft)]">Fallback: {step.fallbackLabel}</div>
                  </div>
                ))}
              </div>

              {previewResult.warnings.length ? (
                <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-semibold text-amber-900">Warning preview</div>
                  <div className="mt-2 space-y-2">
                    {previewResult.warnings.map((warning) => (
                      <div key={warning} className="text-[13px] leading-5 text-amber-800">
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <Settings2 className="h-3.5 w-3.5 text-[var(--brand-800)]" />
                Implementasi Berikutnya
              </div>
              <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">Fondasi UI ini sudah siap untuk disambungkan ke modul transaksi dan tabel approval di database.</div>

              <div className="mt-4 space-y-2">
                {[
                  "Sambungkan cuti dan izin agar approval request dibuat otomatis saat user submit form.",
                  "Tambahkan inbox persetujuan per approver supaya atasan, HR, dan direktur punya antrian kerja masing-masing.",
                  "Siapkan delegasi approval saat approver utama cuti, resign, atau belum aktif.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
