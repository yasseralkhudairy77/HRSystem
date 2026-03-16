import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollMonths, payrollThrBonusRecords as initialPayrollThrBonusRecords, payrollYears } from "@/data";

const quickTabs = ["Semua", "THR", "Bonus", "Insentif", "Siap dibayar", "Sudah dibayar"];

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

export default function PayrollThrBonusPage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Maret");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [companyFilter, setCompanyFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [records, setRecords] = useState(initialPayrollThrBonusRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialPayrollThrBonusRecords[0] || null);

  const filterOptions = useMemo(
    () => ({
      companies: [...new Set(records.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      additionalTypes: [...new Set(records.map((item) => item.jenisTambahan))],
      paymentStatuses: [...new Set(records.map((item) => item.statusPembayaran))],
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return records.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.dasarPemberian]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesMonth = item.periodeBulan === selectedMonth;
      const matchesYear = item.periodeTahun === selectedYear;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesType = !typeFilter || item.jenisTambahan === typeFilter;
      const matchesPayment = !paymentFilter || item.statusPembayaran === paymentFilter;
      const matchesTab =
        activeTab === "Semua" ||
        item.jenisTambahan === activeTab ||
        (activeTab === "Siap dibayar" && item.statusProses === "Siap dibayar") ||
        (activeTab === "Sudah dibayar" && item.statusPembayaran === "Sudah dibayar");

      return matchesSearch && matchesMonth && matchesYear && matchesCompany && matchesType && matchesPayment && matchesTab;
    });
  }, [activeTab, companyFilter, paymentFilter, records, search, selectedMonth, selectedYear, typeFilter]);

  const summaryCards = useMemo(() => {
    const currentPeriodRecords = records.filter((item) => item.periodeBulan === selectedMonth && item.periodeTahun === selectedYear);

    return [
      {
        label: "Total penerima",
        value: String(currentPeriodRecords.length),
        note: "Karyawan yang menerima tambahan penghasilan di periode ini.",
      },
      {
        label: "THR bulan ini",
        value: String(currentPeriodRecords.filter((item) => item.jenisTambahan === "THR").length),
        note: "Jumlah penerima THR untuk periode yang dipilih.",
      },
      {
        label: "Bonus bulan ini",
        value: String(currentPeriodRecords.filter((item) => item.jenisTambahan === "Bonus").length),
        note: "Jumlah penerima bonus pada periode berjalan.",
      },
      {
        label: "Siap dibayar",
        value: String(currentPeriodRecords.filter((item) => item.statusProses === "Siap dibayar").length),
        note: "Nominal sudah rapi dan siap masuk ke pembayaran.",
      },
      {
        label: "Sudah dibayar",
        value: String(currentPeriodRecords.filter((item) => item.statusPembayaran === "Sudah dibayar").length),
        note: "Sudah selesai dibayarkan ke karyawan.",
      },
      {
        label: "Total nominal",
        value: formatCurrency(currentPeriodRecords.reduce((sum, item) => sum + item.nominal, 0)),
        note: "Total tambahan penghasilan yang perlu disiapkan di periode ini.",
      },
    ];
  }, [records, selectedMonth, selectedYear]);

  const markAsReady = (recordId) => {
    setRecords((current) => current.map((item) => (item.id === recordId ? { ...item, statusProses: "Siap dibayar" } : item)));
    setSelectedRecord((current) => (current?.id === recordId ? { ...current, statusProses: "Siap dibayar" } : current));
  };

  const markAsPaid = (recordId) => {
    setRecords((current) =>
      current.map((item) =>
        item.id === recordId ? { ...item, statusProses: "Siap dibayar", statusPembayaran: "Sudah dibayar" } : item,
      ),
    );
    setSelectedRecord((current) =>
      current?.id === recordId ? { ...current, statusProses: "Siap dibayar", statusPembayaran: "Sudah dibayar" } : current,
    );
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="THR & Bonus"
        subtitle="Tempat mengatur tambahan penghasilan di luar gaji bulanan supaya mudah dilihat siapa dapat apa dan sudah dibayar atau belum."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Atur tambahan penghasilan</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Atur THR</Button>
              <Button variant="outline" className="rounded-2xl">
                Tambah Bonus
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama karyawan, jabatan, usaha, cabang, atau dasar pemberian..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={selectedMonth} onChange={setSelectedMonth} options={payrollMonths} placeholder="Bulan" />
          <FilterSelect value={selectedYear} onChange={setSelectedYear} options={payrollYears} placeholder="Tahun" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / usaha" />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} options={filterOptions.additionalTypes} placeholder="Jenis tambahan" />
          <FilterSelect value={paymentFilter} onChange={setPaymentFilter} options={filterOptions.paymentStatuses} placeholder="Status pembayaran" />
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
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={item.statusProses} />
                    <StatusBadge value={item.statusPembayaran} />
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Jenis tambahan</div>
                    <div className="mt-1 font-medium text-slate-900">{item.jenisTambahan}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-emerald-700">Nominal</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-800">{formatCurrency(item.nominal)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Penerima</div>
                    <div className="mt-1 font-medium text-slate-900">{item.jenisTambahan === "THR" ? "Penerima THR" : "Penerima bonus"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Periode</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {item.periodeBulan} {item.periodeTahun}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div className="text-slate-500">Alasan / dasar pemberian</div>
                  <div className="mt-1 font-medium text-slate-900">{item.dasarPemberian}</div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedRecord(item)}>
                    Lihat rincian
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Ubah nominal
                  </Button>
                  {item.statusProses !== "Siap dibayar" ? (
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => markAsReady(item.id)}>
                      Tandai siap dibayar
                    </Button>
                  ) : null}
                  {item.statusPembayaran !== "Sudah dibayar" ? (
                    <Button className="rounded-2xl" onClick={() => markAsPaid(item.id)}>
                      Tandai sudah dibayar
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecords.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 text-sm leading-6 text-slate-500">
                Belum ada data THR atau bonus yang cocok dengan pencarian dan filter saat ini.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Rincian THR & Bonus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRecord ? (
              <>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedRecord.namaKaryawan}</div>
                  <div className="text-sm text-slate-500">
                    {selectedRecord.jabatan} / {selectedRecord.namaUsaha} / {selectedRecord.namaCabang}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Periode: {selectedRecord.periodeBulan} {selectedRecord.periodeTahun}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Jenis tambahan", selectedRecord.jenisTambahan],
                    ["Nominal", formatCurrency(selectedRecord.nominal)],
                    ["Dasar pemberian", selectedRecord.dasarPemberian],
                    ["Status proses", selectedRecord.statusProses],
                    ["Status pembayaran", selectedRecord.statusPembayaran],
                    ["Masa kerja", selectedRecord.masaKerja || "-"],
                    ["THR penuh / prorata", selectedRecord.thrPenuhAtauProrata || "-"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 p-4 text-sm">
                      <div className="text-slate-500">{label}</div>
                      <div className="mt-1 font-medium text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Catatan admin</div>
                  <div className="mt-1 font-medium text-slate-900">{selectedRecord.catatanAdmin}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  Data ini nantinya bisa dipakai bersama Proses Gaji dan Slip Gaji, serta terhubung ke Data Karyawan, Kontrak Kerja, dan Penilaian Kerja.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
                Pilih salah satu data di sebelah kiri untuk melihat rincian THR atau bonus.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
