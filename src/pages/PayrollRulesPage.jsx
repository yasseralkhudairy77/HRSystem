import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollSalaryRules as initialPayrollSalaryRules } from "@/data";

const quickTabs = ["Semua", "Per Jabatan", "Per Karyawan", "Aktif", "Belum lengkap"];

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function RuleDetailModal({ rule, onClose }) {
  if (!rule) {
    return null;
  }

  const ruleName = rule.jenisAturan === "karyawan" ? rule.namaKaryawan : rule.jabatan;
  const berlakuUntuk =
    rule.jenisAturan === "karyawan"
      ? `${rule.namaKaryawan} / ${rule.jabatan}`
      : `${rule.jabatan} / ${rule.namaUsaha} / ${rule.namaCabang}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <div className="text-xl font-semibold text-slate-900">{ruleName}</div>
            <div className="mt-1 text-sm text-slate-500">Rincian dasar hitungan gaji yang bisa dipakai ulang saat proses gaji bulanan.</div>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={onClose}>
            Tutup
          </Button>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Nama aturan</div>
                <div className="mt-1 font-medium text-slate-900">{ruleName}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Berlaku untuk</div>
                <div className="mt-1 font-medium text-slate-900">{berlakuUntuk}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Gaji pokok</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.gajiPokok)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Tunjangan tetap</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.tunjanganTetap)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Uang makan</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.uangMakan)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Uang transport</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.uangTransport)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Bonus tetap</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.bonusTetap)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Bonus target</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.bonusTarget)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Potongan telat</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.potonganTelat)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Potongan izin</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.potonganIzin)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Potongan kasbon</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.potonganKasbon)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">BPJS</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.potonganBpjs)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="text-slate-500">Pajak</div>
                <div className="mt-1 font-medium text-slate-900">{formatCurrency(rule.potonganPajak)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm md:col-span-2">
                <div className="text-slate-500">Aturan lembur</div>
                <div className="mt-1 font-medium text-slate-900">{rule.aturanLembur}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm md:col-span-2">
                <div className="text-slate-500">Catatan tambahan</div>
                <div className="mt-1 font-medium text-slate-900">{rule.catatanTambahan}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="text-slate-500">Status aktif</div>
              <div className="mt-2">
                <StatusBadge value={rule.statusAktif ? "Masih aktif" : "Tidak aktif"} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="text-slate-500">Kelengkapan aturan</div>
              <div className="mt-2">
                <StatusBadge value={rule.lengkapAtauBelum} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="text-slate-500">Dipakai juga oleh</div>
              <div className="mt-2 space-y-2 text-slate-900">
                <div>Proses Gaji</div>
                <div>THR & Bonus</div>
                <div>Slip Gaji</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <div className="text-slate-500">Sumber data yang nanti bisa dipakai</div>
              <div className="mt-2 space-y-2 text-slate-900">
                <div>Data Karyawan</div>
                <div>Kontrak Kerja</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRulesPage() {
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedRule, setSelectedRule] = useState(null);
  const [salaryRules, setSalaryRules] = useState(initialPayrollSalaryRules);

  const filterOptions = useMemo(
    () => ({
      jobs: [...new Set(salaryRules.map((item) => item.jabatan))],
      companies: [...new Set(salaryRules.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      employmentStatuses: [...new Set(salaryRules.map((item) => item.statusKerja))],
      activeStatuses: ["Masih aktif", "Tidak aktif"],
    }),
    [salaryRules],
  );

  const filteredRules = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return salaryRules.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.catatanTambahan]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesJob = !jobFilter || item.jabatan === jobFilter;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesEmployment = !employmentFilter || item.statusKerja === employmentFilter;
      const matchesActive =
        !activeFilter || (activeFilter === "Masih aktif" ? item.statusAktif : !item.statusAktif);

      const matchesTab =
        activeTab === "Semua" ||
        (activeTab === "Per Jabatan" && item.jenisAturan === "jabatan") ||
        (activeTab === "Per Karyawan" && item.jenisAturan === "karyawan") ||
        (activeTab === "Aktif" && item.statusAktif) ||
        (activeTab === "Belum lengkap" && item.lengkapAtauBelum === "Aturan belum lengkap");

      return matchesSearch && matchesJob && matchesCompany && matchesEmployment && matchesActive && matchesTab;
    });
  }, [activeFilter, activeTab, companyFilter, employmentFilter, jobFilter, salaryRules, search]);

  const summaryCards = useMemo(() => {
    const activeRules = salaryRules.filter((item) => item.statusAktif);
    const perJobCount = new Set(salaryRules.filter((item) => item.jenisAturan === "jabatan").map((item) => item.jabatan)).size;
    const specialEmployeeCount = salaryRules.filter((item) => item.jenisAturan === "karyawan").length;
    const incompleteCount = salaryRules.filter((item) => item.lengkapAtauBelum === "Aturan belum lengkap").length;

    return [
      {
        label: "Total aturan gaji",
        value: String(salaryRules.length),
        note: "Semua aturan yang jadi dasar hitungan gaji saat ini.",
      },
      {
        label: "Jabatan yang sudah diatur",
        value: String(perJobCount),
        note: "Jabatan yang sudah punya aturan gaji dasar.",
      },
      {
        label: "Karyawan dengan aturan khusus",
        value: String(specialEmployeeCount),
        note: "Dipakai jika hitungan gajinya berbeda dari aturan jabatan.",
      },
      {
        label: "Aturan aktif",
        value: String(activeRules.length),
        note: "Masih dipakai untuk proses gaji bulan berjalan.",
      },
      {
        label: "Aturan belum lengkap",
        value: String(incompleteCount),
        note: "Masih ada bagian yang perlu dilengkapi sebelum dipakai penuh.",
      },
    ];
  }, [salaryRules]);

  const cloneRule = (rule) => {
    const duplicatedRule = {
      ...rule,
      id: `${rule.id}-copy`,
      statusAktif: false,
      lengkapAtauBelum: "Aturan belum lengkap",
      catatanTambahan: `Salinan dari aturan ${rule.jenisAturan === "karyawan" ? rule.namaKaryawan : rule.jabatan}.`,
    };

    setSalaryRules((current) => [duplicatedRule, ...current]);
  };

  const deactivateRule = (ruleId) => {
    setSalaryRules((current) => current.map((item) => (item.id === ruleId ? { ...item, statusAktif: false } : item)));
    setSelectedRule((current) => (current?.id === ruleId ? { ...current, statusAktif: false } : current));
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Aturan Gaji"
        subtitle="Tempat mengatur dasar hitungan gaji supaya proses gaji bulanan tidak perlu mulai dari nol setiap bulan."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Atur dasar hitungan gaji</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Tambah Aturan</Button>
              <Button variant="outline" className="rounded-2xl">
                Atur Gaji Karyawan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari jabatan, nama karyawan, usaha, atau catatan aturan..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={jobFilter} onChange={setJobFilter} options={filterOptions.jobs} placeholder="Semua jabatan" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / usaha" />
          <FilterSelect value={employmentFilter} onChange={setEmploymentFilter} options={filterOptions.employmentStatuses} placeholder="Semua status kerja" />
          <FilterSelect value={activeFilter} onChange={setActiveFilter} options={filterOptions.activeStatuses} placeholder="Aturan aktif / tidak" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_320px]">
        <div className="space-y-4">
          {filteredRules.map((item) => {
            const ruleName = item.jenisAturan === "karyawan" ? item.namaKaryawan : item.jabatan;
            const additionalAmount = item.tunjanganTetap + item.uangMakan + item.uangTransport + item.bonusTetap + item.bonusTarget;
            const deductionAmount = item.potonganTelat + item.potonganIzin + item.potonganKasbon + item.potonganBpjs + item.potonganPajak;

            return (
              <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{ruleName}</div>
                      <div className="text-sm text-slate-500">
                        {item.jenisAturan === "karyawan" ? `${item.jabatan} / aturan khusus karyawan` : "Aturan per jabatan"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {item.namaUsaha} / {item.namaCabang}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.statusAktif ? "Masih aktif" : "Tidak aktif"} />
                      <StatusBadge value={item.lengkapAtauBelum} />
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-slate-500">Status kerja</div>
                      <div className="mt-1 font-medium text-slate-900">{item.statusKerja}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-slate-500">Gaji pokok</div>
                      <div className="mt-1 font-medium text-slate-900">{formatCurrency(item.gajiPokok)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-slate-500">Tambahan tetap</div>
                      <div className="mt-1 font-medium text-emerald-700">{formatCurrency(additionalAmount)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-slate-500">Potongan yang berlaku</div>
                      <div className="mt-1 font-medium text-rose-700">{formatCurrency(deductionAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-slate-500">Lembur / bonus</div>
                      <div className="mt-1 font-medium text-slate-900">
                        {item.aturanLembur}
                        {(item.bonusTetap || item.bonusTarget) ? ` Bonus sampai ${formatCurrency(item.bonusTetap + item.bonusTarget)}.` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="text-slate-500">Catatan singkat</div>
                    <div className="mt-1 font-medium text-slate-900">{item.catatanTambahan}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedRule(item)}>
                      Lihat rincian
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      Ubah aturan
                    </Button>
                    <Button variant="outline" className="rounded-2xl" onClick={() => cloneRule(item)}>
                      Salin aturan
                    </Button>
                    {item.statusAktif ? (
                      <Button variant="outline" className="rounded-2xl" onClick={() => deactivateRule(item.id)}>
                        Nonaktifkan
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredRules.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 text-sm leading-6 text-slate-500">
                Belum ada aturan yang cocok dengan pencarian atau filter saat ini. Coba ganti filter atau tambahkan aturan baru.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Aturan yang paling sering dipakai</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">Aturan per jabatan</div>
                <div className="mt-1 text-slate-500">Cocok untuk karyawan dengan hitungan gaji yang sama dalam satu jabatan.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="font-medium text-slate-900">Aturan khusus per karyawan</div>
                <div className="mt-1 text-slate-500">Dipakai jika ada kasbon, bonus khusus, atau hitungan yang berbeda dari aturan jabatan.</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Dipakai oleh menu lain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 p-4">Proses Gaji memakai aturan ini sebagai dasar hitungan bulanan.</div>
              <div className="rounded-2xl border border-slate-200 p-4">THR & Bonus bisa mengambil aturan tambahan tetap dan bonus target.</div>
              <div className="rounded-2xl border border-slate-200 p-4">Slip Gaji memakai rincian aturan agar isi slip tetap konsisten.</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RuleDetailModal rule={selectedRule} onClose={() => setSelectedRule(null)} />
    </div>
  );
}
