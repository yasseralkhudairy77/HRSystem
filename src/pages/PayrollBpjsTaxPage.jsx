import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollBpjsTaxRecords as initialPayrollBpjsTaxRecords } from "@/data";

const quickTabs = ["Semua", "BPJS", "Pajak", "Data belum lengkap", "Siap dipakai"];

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

export default function PayrollBpjsTaxPage() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [bpjsFilter, setBpjsFilter] = useState("");
  const [taxFilter, setTaxFilter] = useState("");
  const [completenessFilter, setCompletenessFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [records, setRecords] = useState(initialPayrollBpjsTaxRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialPayrollBpjsTaxRecords[0] || null);

  const filterOptions = useMemo(
    () => ({
      companies: [...new Set(records.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      bpjsStatuses: [...new Set(records.map((item) => item.statusBpjs))],
      taxStatuses: [...new Set(records.map((item) => item.statusPajak))],
      completenessStatuses: [...new Set(records.map((item) => item.statusData))],
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return records.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.nomorBpjs, item.npwp]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesBpjs = !bpjsFilter || item.statusBpjs === bpjsFilter;
      const matchesTax = !taxFilter || item.statusPajak === taxFilter;
      const matchesCompleteness = !completenessFilter || item.statusData === completenessFilter;
      const matchesTab =
        activeTab === "Semua" ||
        (activeTab === "BPJS" && item.statusBpjs !== "") ||
        (activeTab === "Pajak" && item.statusPajak !== "") ||
        (activeTab === "Data belum lengkap" && item.statusData === "Belum lengkap") ||
        (activeTab === "Siap dipakai" && item.statusData === "Sudah lengkap");

      return matchesSearch && matchesCompany && matchesBpjs && matchesTax && matchesCompleteness && matchesTab;
    });
  }, [activeTab, bpjsFilter, companyFilter, completenessFilter, records, search, taxFilter]);

  const summaryCards = useMemo(() => {
    return [
      {
        label: "Total karyawan",
        value: String(records.length),
        note: "Data karyawan yang punya catatan BPJS dan pajak di sini.",
      },
      {
        label: "Sudah ikut BPJS",
        value: String(records.filter((item) => item.statusBpjs === "Sudah ikut").length),
        note: "Sudah punya data BPJS aktif dan bisa dipakai di gaji.",
      },
      {
        label: "Belum ikut BPJS",
        value: String(records.filter((item) => item.statusBpjs === "Belum ikut" || item.statusBpjs === "Belum aktif").length),
        note: "Masih perlu didaftarkan atau diaktifkan lebih dulu.",
      },
      {
        label: "Data pajak lengkap",
        value: String(records.filter((item) => item.statusPajak === "Sudah ada").length),
        note: "Sudah ada data NPWP atau data pajak yang diperlukan.",
      },
      {
        label: "Data belum lengkap",
        value: String(records.filter((item) => item.statusData === "Belum lengkap").length),
        note: "Masih perlu dilengkapi agar aman dipakai di penggajian.",
      },
      {
        label: "Siap dipakai di gaji",
        value: String(records.filter((item) => item.statusData === "Sudah lengkap").length),
        note: "Siap dipakai oleh Proses Gaji dan Slip Gaji.",
      },
    ];
  }, [records]);

  const markAsComplete = (recordId) => {
    setRecords((current) =>
      current.map((item) => (item.id === recordId ? { ...item, statusData: "Sudah lengkap" } : item)),
    );
    setSelectedRecord((current) => (current?.id === recordId ? { ...current, statusData: "Sudah lengkap" } : current));
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="BPJS & Pajak"
        subtitle="Tempat melihat dan melengkapi data BPJS dan pajak karyawan supaya potongan gaji lebih rapi dan mudah dicek."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Kelola data BPJS dan pajak</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Tambah Data</Button>
              <Button variant="outline" className="rounded-2xl">
                Lengkapi Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama karyawan, jabatan, usaha, cabang, nomor BPJS, atau NPWP..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / usaha" />
          <FilterSelect value={bpjsFilter} onChange={setBpjsFilter} options={filterOptions.bpjsStatuses} placeholder="Status BPJS" />
          <FilterSelect value={taxFilter} onChange={setTaxFilter} options={filterOptions.taxStatuses} placeholder="Status pajak" />
          <FilterSelect value={completenessFilter} onChange={setCompletenessFilter} options={filterOptions.completenessStatuses} placeholder="Data lengkap / belum" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="space-y-4">
          {filteredRecords.map((item) => (
            <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{item.namaKaryawan}</div>
                    <div className="text-sm text-slate-500">
                      {item.jabatan} / {item.namaUsaha} / {item.namaCabang}
                    </div>
                  </div>
                  <StatusBadge value={item.statusData} />
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Status BPJS</div>
                    <div className="mt-1 font-medium text-slate-900">{item.statusBpjs}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Nomor BPJS</div>
                    <div className="mt-1 font-medium text-slate-900">{item.nomorBpjs}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Status pajak</div>
                    <div className="mt-1 font-medium text-slate-900">{item.statusPajak}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">NPWP</div>
                    <div className="mt-1 font-medium text-slate-900">{item.npwp}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-emerald-700">Potongan BPJS / Pajak</div>
                    <div className="mt-1 font-medium text-emerald-800">
                      {formatCurrency(item.potonganBpjs)} / {formatCurrency(item.potonganPajak)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedRecord(item)}>
                    Lihat rincian
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Ubah data
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Lengkapi data
                  </Button>
                  {item.statusData !== "Sudah lengkap" ? (
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => markAsComplete(item.id)}>
                      Tandai sudah lengkap
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecords.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 text-sm leading-6 text-slate-500">
                Belum ada data yang cocok dengan pencarian atau filter saat ini.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Rincian BPJS & Pajak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRecord ? (
              <>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedRecord.namaKaryawan}</div>
                  <div className="text-sm text-slate-500">
                    {selectedRecord.jabatan} / {selectedRecord.namaUsaha} / {selectedRecord.namaCabang}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Status kerja", selectedRecord.statusKerja],
                    ["Status BPJS", selectedRecord.statusBpjs],
                    ["Nomor BPJS", selectedRecord.nomorBpjs],
                    ["Jenis BPJS yang diikuti", selectedRecord.jenisBpjs],
                    ["Status pajak", selectedRecord.statusPajak],
                    ["NPWP", selectedRecord.npwp],
                    ["Potongan BPJS", formatCurrency(selectedRecord.potonganBpjs)],
                    ["Potongan pajak", formatCurrency(selectedRecord.potonganPajak)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 p-4 text-sm">
                      <div className="text-slate-500">{label}</div>
                      <div className="mt-1 font-medium text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Catatan</div>
                  <div className="mt-1 font-medium text-slate-900">{selectedRecord.catatanAdmin}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Status data lengkap / belum</div>
                  <div className="mt-2">
                    <StatusBadge value={selectedRecord.statusData} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  Data ini nantinya bisa dipakai oleh Proses Gaji dan Slip Gaji, serta terhubung ke Data Karyawan dan Karyawan Baru.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
                Pilih salah satu data di sebelah kiri untuk melihat rincian BPJS dan pajaknya.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
