import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollMonths, payrollProcessRecords as initialPayrollRecords, payrollYears } from "@/data";

const quickTabs = ["Semua", "Belum dicek", "Siap dibayar", "Sudah dibayar"];

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

export default function PayrollProcessPage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Maret");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [companyFilter, setCompanyFilter] = useState("");
  const [processFilter, setProcessFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedPayroll, setSelectedPayroll] = useState(initialPayrollRecords[0] || null);
  const [payrollRecords, setPayrollRecords] = useState(initialPayrollRecords);

  const filterOptions = useMemo(
    () => ({
      companies: [...new Set(payrollRecords.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      processStatuses: [...new Set(payrollRecords.map((item) => item.statusProses))],
      paymentStatuses: [...new Set(payrollRecords.map((item) => item.statusPembayaran))],
    }),
    [payrollRecords],
  );

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return payrollRecords.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.statusKerja]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesMonth = item.periodeBulan === selectedMonth;
      const matchesYear = item.periodeTahun === selectedYear;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesProcess = !processFilter || item.statusProses === processFilter;
      const matchesPayment = !paymentFilter || item.statusPembayaran === paymentFilter;
      const matchesTab =
        activeTab === "Semua" ||
        item.statusProses === activeTab ||
        (activeTab === "Sudah dibayar" && item.statusPembayaran === "Sudah dibayar");

      return matchesSearch && matchesMonth && matchesYear && matchesCompany && matchesProcess && matchesPayment && matchesTab;
    });
  }, [activeTab, companyFilter, paymentFilter, payrollRecords, processFilter, search, selectedMonth, selectedYear]);

  const summaryCards = useMemo(() => {
    const currentPeriodRecords = payrollRecords.filter((item) => item.periodeBulan === selectedMonth && item.periodeTahun === selectedYear);

    return [
      {
        label: "Total karyawan digaji",
        value: String(currentPeriodRecords.length),
        note: "Karyawan yang masuk hitungan gaji bulan ini.",
      },
      {
        label: "Belum dicek",
        value: String(currentPeriodRecords.filter((item) => item.statusProses === "Belum dicek").length),
        note: "Masih perlu dilihat ulang sebelum lanjut ke pembayaran.",
      },
      {
        label: "Siap dibayar",
        value: String(currentPeriodRecords.filter((item) => item.statusProses === "Siap dibayar").length),
        note: "Hitungan gaji sudah rapi dan siap dibayar.",
      },
      {
        label: "Sudah dibayar",
        value: String(currentPeriodRecords.filter((item) => item.statusPembayaran === "Sudah dibayar").length),
        note: "Pembayaran gaji untuk bulan ini sudah selesai.",
      },
      {
        label: "Total gaji bulan ini",
        value: formatCurrency(currentPeriodRecords.reduce((sum, item) => sum + item.totalDiterima, 0)),
        note: "Jumlah yang perlu dibayar ke semua karyawan bulan ini.",
      },
      {
        label: "Total potongan",
        value: formatCurrency(currentPeriodRecords.reduce((sum, item) => sum + item.totalPotongan, 0)),
        note: "Total potongan dari telat, izin, kasbon, BPJS, dan pajak.",
      },
    ];
  }, [payrollRecords, selectedMonth, selectedYear]);

  const markAsReady = (recordId) => {
    setPayrollRecords((current) =>
      current.map((item) => (item.id === recordId ? { ...item, statusProses: "Siap dibayar" } : item)),
    );
  };

  const markAsPaid = (recordId) => {
    setPayrollRecords((current) =>
      current.map((item) =>
        item.id === recordId ? { ...item, statusProses: "Siap dibayar", statusPembayaran: "Sudah dibayar" } : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Proses Gaji"
        subtitle="Pusat kerja bulanan untuk menghitung, mengecek, dan menandai gaji karyawan agar pembayaran lebih rapi dan mudah dipantau."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Filter gaji bulan ini</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Mulai Hitung Gaji</Button>
              <Button variant="outline" className="rounded-2xl">
                Lihat Slip Gaji
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama karyawan, jabatan, usaha, atau cabang..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={selectedMonth} onChange={setSelectedMonth} options={payrollMonths} placeholder="Bulan" />
          <FilterSelect value={selectedYear} onChange={setSelectedYear} options={payrollYears} placeholder="Tahun" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / usaha" />
          <FilterSelect value={processFilter} onChange={setProcessFilter} options={filterOptions.processStatuses} placeholder="Status proses" />
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
                    <div className="text-slate-500">Tambahan</div>
                    <div className="mt-1 font-medium text-emerald-700">{formatCurrency(item.totalTambahan)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Potongan</div>
                    <div className="mt-1 font-medium text-rose-700">{formatCurrency(item.totalPotongan)}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-emerald-700">Total diterima</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-800">{formatCurrency(item.totalDiterima)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedPayroll(item)}>
                    Lihat rincian
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Ubah hitungan
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
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Rincian gaji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPayroll ? (
              <>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedPayroll.namaKaryawan}</div>
                  <div className="text-sm text-slate-500">
                    {selectedPayroll.jabatan} / {selectedPayroll.namaUsaha} / {selectedPayroll.namaCabang}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Periode gaji: {selectedPayroll.periodeBulan} {selectedPayroll.periodeTahun}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Gaji pokok", selectedPayroll.gajiPokok],
                    ["Tunjangan", selectedPayroll.tunjangan],
                    ["Uang makan / transport", selectedPayroll.uangMakan + selectedPayroll.uangTransport],
                    ["Lembur", selectedPayroll.lembur],
                    ["Bonus", selectedPayroll.bonus],
                    ["Potongan telat", selectedPayroll.potonganTelat],
                    ["Potongan izin", selectedPayroll.potonganIzin],
                    ["Potongan kasbon", selectedPayroll.potonganKasbon],
                    ["Potongan BPJS / pajak", selectedPayroll.potonganBpjs + selectedPayroll.potonganPajak],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 p-4 text-sm">
                      <div className="text-slate-500">{label}</div>
                      <div className="mt-1 font-medium text-slate-900">{formatCurrency(value)}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="text-sm text-emerald-700">Total diterima</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-800">{formatCurrency(selectedPayroll.totalDiterima)}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Catatan admin</div>
                  <div className="mt-1 font-medium text-slate-900">{selectedPayroll.catatanAdmin}</div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
                Pilih salah satu data gaji di sebelah kiri untuk melihat rincian hitungannya.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
