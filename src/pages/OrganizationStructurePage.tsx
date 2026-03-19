import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, ChevronRight, GitBranch, LoaderCircle, Network, Users } from "lucide-react";

import { employeeDensity } from "@/components/employees/employeeDensity";
import OrganizationChart from "@/components/organization/OrganizationChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { employeeProfileRecords } from "@/data/employeeProfiles";
import { organizationPreviewRecords } from "@/data/organizationPreview";
import { buildOrganizationStructure, type OrganizationIssue, type OrganizationNode } from "@/lib/organizationStructure";
import { getEmployeeList } from "@/services/employeeService";
import type { EmployeeRecord } from "@/types/employee";

const EMPLOYEE_NAVIGATION_TARGET_KEY = "employees:navigation-target";

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
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

function IssueItem({ issue }: { issue: OrganizationIssue }) {
  return (
    <div
      className={`rounded-[10px] border px-3.5 py-3 text-[13px] leading-5 ${
        issue.severity === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <div className="font-semibold">{issue.employeeName}</div>
      <div className="mt-1">{issue.detail}</div>
    </div>
  );
}

export default function OrganizationStructurePage() {
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);

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
        setError("Belum ada data karyawan live di database. Struktur organisasi sementara memakai preview dari data dummy karyawan.");
      }
    } catch (loadError) {
      console.error("Load organization structure gagal:", loadError);
      setRecords([]);
      setError(loadError instanceof Error ? `${loadError.message} Struktur organisasi sementara memakai preview dari data dummy karyawan.` : "Gagal memuat data karyawan live. Struktur organisasi sementara memakai preview dari data dummy karyawan.");
    } finally {
      setLoading(false);
    }
  }

  const structure = useMemo(
    () =>
      buildOrganizationStructure({
        records: records.length ? records : organizationPreviewRecords,
        profiles: employeeProfileRecords,
        branch: branchFilter,
        department: departmentFilter,
        sourceOverride: records.length ? "live" : "fallback",
      }),
    [branchFilter, departmentFilter, records],
  );

  useEffect(() => {
    const flatNodes: OrganizationNode[] = [];
    const stack = [...structure.roots];

    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      flatNodes.push(current);
      stack.unshift(...current.children);
    }

    if (!flatNodes.length) {
      setSelectedNode(null);
      return;
    }

    if (!selectedNode || !flatNodes.some((node) => node.id === selectedNode.id)) {
      setSelectedNode(flatNodes[0]);
    }
  }, [selectedNode, structure.roots]);

  function openEmployeePage(targetTab = "personal") {
    if (selectedNode) {
      window.sessionStorage.setItem(
        EMPLOYEE_NAVIGATION_TARGET_KEY,
        JSON.stringify({
          employeeId: selectedNode.id,
          activeTab: targetTab,
        }),
      );
    }

    window.dispatchEvent(new CustomEvent("app:navigate", { detail: { menu: "employees" } }));
  }

  const stats = [
    { label: "Karyawan tampil", value: String(structure.stats.totalVisible), note: "Jumlah anggota organisasi sesuai filter aktif.", icon: Users },
    { label: "Posisi teratas", value: String(structure.stats.totalRoots), note: "Node level atas yang saat ini menjadi akar struktur.", icon: Network },
    { label: "Relasi atasan valid", value: String(structure.stats.totalResolvedLinks), note: "Karyawan yang sudah berhasil dipetakan ke atasan langsung.", icon: GitBranch },
    { label: "Perlu dirapikan", value: String(structure.stats.totalIssues), note: "Data organisasi yang masih perlu dicek HR.", icon: AlertCircle },
  ];

  return (
    <div className="space-y-4">
      <Card className={employeeDensity.card}>
        <CardContent className="space-y-4 p-5">
          <div className="max-w-3xl">
            <div className={employeeDensity.overline}>HR Administrasi</div>
            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">Struktur Organisasi</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Struktur organisasi dibuat otomatis dari Data Karyawan aktif. Hierarki utamanya dibentuk dari relasi atasan langsung, lalu dilengkapi label jabatan, departemen, dan cabang.
            </p>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
            >
              <option value="">Semua cabang</option>
              {structure.branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-10 rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
            >
              <option value="">Semua departemen</option>
              {structure.departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <div className={`${employeeDensity.inset} bg-white px-4 py-3 text-[13px] text-[var(--text-muted)]`}>
              Sumber data: <span className="font-medium text-[var(--text-main)]">{structure.source === "live" ? "Data Karyawan aktif" : "Preview dummy Data Karyawan"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--text-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Memuat struktur organisasi...
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1.4fr)_320px]">
        <div className="space-y-4">
          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Validasi Struktur</div>
              <div className={employeeDensity.sectionDescription}>
                Panel ini menandai data yang masih perlu dirapikan agar struktur organisasi otomatis bisa semakin akurat.
              </div>

              <div className="mt-4 space-y-2.5">
                {structure.issues.length ? (
                  structure.issues.map((issue) => <IssueItem key={issue.id} issue={issue} />)
                ) : (
                  <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] leading-5 text-emerald-800">
                    Tidak ada issue utama. Relasi organisasi sudah cukup rapi untuk divisualisasikan otomatis.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Cara Kerja</div>
              <div className={employeeDensity.sectionDescription}>
                Versi MVP ini memprioritaskan hasil yang realistis: sistem membaca Data Karyawan, lalu menyusun hierarki berdasarkan atasan langsung yang tersedia.
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Jika relasi atasan tersedia, node ditempatkan otomatis di bawah supervisor yang sesuai.",
                  "Kalau hanya ada nama atasan, sistem mencoba mencocokkan dengan nama karyawan aktif.",
                  "Jika belum ketemu, node tetap tampil tetapi diberi warning agar HR bisa merapikan master data.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={employeeDensity.cardFlat}>
          <CardContent className="rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="text-base font-semibold text-slate-900">Chart Organisasi</div>
              <div className="mt-1 text-sm text-slate-500">
                Struktur ditampilkan sebagai org chart visual dari level teratas ke bawahan. Klik node untuk melihat detail posisi di panel kanan.
              </div>
              <div className="mt-3 border-t border-slate-100" />
            </div>

            <div className="pt-6">
              {structure.roots.length ? (
                <OrganizationChart roots={structure.roots} selectedId={selectedNode?.id || ""} onSelect={setSelectedNode} />
              ) : (
                <div className="rounded-[12px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] p-8 text-center text-sm text-[var(--text-muted)]">
                  Belum ada data yang bisa ditampilkan untuk filter yang dipilih.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <Building2 className="h-3.5 w-3.5 text-[var(--brand-800)]" />
                Detail Posisi
              </div>

              {selectedNode ? (
                <>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-[var(--text-main)]">{selectedNode.name}</div>
                    <div className="mt-1 text-[13px] text-[var(--text-muted)]">{selectedNode.position}</div>
                  </div>

                  <div className="mt-4 space-y-2.5 text-[13px] text-[var(--text-muted)]">
                    <div className={`${employeeDensity.inset} p-3`}>
                      <div className={employeeDensity.fieldLabel}>ID Karyawan</div>
                      <div className="mt-1.5 font-medium text-[var(--text-main)]">{selectedNode.employeeId}</div>
                    </div>
                    <div className={`${employeeDensity.inset} p-3`}>
                      <div className={employeeDensity.fieldLabel}>Departemen</div>
                      <div className="mt-1.5 font-medium text-[var(--text-main)]">{selectedNode.department}</div>
                    </div>
                    <div className={`${employeeDensity.inset} p-3`}>
                      <div className={employeeDensity.fieldLabel}>Cabang</div>
                      <div className="mt-1.5 font-medium text-[var(--text-main)]">{selectedNode.branch}</div>
                    </div>
                    <div className={`${employeeDensity.inset} p-3`}>
                      <div className={employeeDensity.fieldLabel}>Atasan Saat Ini</div>
                      <div className="mt-1.5 font-medium text-[var(--text-main)]">{selectedNode.supervisorName || "Belum ditetapkan"}</div>
                    </div>
                    <div className={`${employeeDensity.inset} p-3`}>
                      <div className={employeeDensity.fieldLabel}>Jumlah Bawahan Langsung</div>
                      <div className="mt-1.5 font-medium text-[var(--text-main)]">{selectedNode.children.length}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="rounded-[10px]" onClick={() => openEmployeePage("personal")}>
                      Buka Data Karyawan
                    </Button>
                    <Button variant="outline" className="rounded-[10px]" onClick={() => openEmployeePage("job")}>
                      Rapikan Atasan
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[10px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-6 text-sm text-[var(--text-muted)]">
                  Pilih salah satu node organisasi untuk melihat detail posisinya.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={employeeDensity.cardFlat}>
            <CardContent className={employeeDensity.mainPadding}>
              <div className={employeeDensity.sectionTitle}>Rekomendasi Berikutnya</div>
              <div className={employeeDensity.sectionDescription}>
                Agar hasil chart semakin presisi, langkah berikutnya paling efektif adalah merapikan relasi atasan langsung di Data Karyawan.
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Tambah field relasi atasan berbasis employee id untuk setiap karyawan.",
                  "Pastikan semua Manager, Supervisor, dan Staff punya atasan langsung yang konsisten.",
                  "Gunakan job level untuk membantu urutan visual tanpa menebak struktur dari nama jabatan saja.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--text-muted)]">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-[var(--brand-800)]" />
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
