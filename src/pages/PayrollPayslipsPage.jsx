import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollMonths, payrollPayslipRecords as initialPayrollPayslipRecords, payrollYears } from "@/data";

const quickTabs = ["Semua", "Belum dikirim", "Sudah dikirim", "Sudah dibayar"];

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

export default function PayrollPayslipsPage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Maret");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sendFilter, setSendFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [records, setRecords] = useState(initialPayrollPayslipRecords);
  const [selectedSlip, setSelectedSlip] = useState(initialPayrollPayslipRecords[0] || null);

  const filterOptions = useMemo(
    () => ({
      companies: [...new Set(records.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      sendStatuses: [...new Set(records.map((item) => item.statusKirim))],
      paymentStatuses: [...new Set(records.map((item) => item.statusPembayaran))],
    }),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return records.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.catatanAdmin]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesMonth = item.periodeBulan === selectedMonth;
      const matchesYear = item.periodeTahun === selectedYear;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesSend = !sendFilter || item.statusKirim === sendFilter;
      const matchesPayment = !paymentFilter || item.statusPembayaran === paymentFilter;
      const matchesTab =
        activeTab === "Semua" ||
        (activeTab === "Belum dikirim" && item.statusKirim === "Belum dikirim") ||
        (activeTab === "Sudah dikirim" && item.statusKirim === "Sudah dikirim") ||
        (activeTab === "Sudah dibayar" && item.statusPembayaran === "Sudah dibayar");

      return matchesSearch && matchesMonth && matchesYear && matchesCompany && matchesSend && matchesPayment && matchesTab;
    });
  }, [activeTab, companyFilter, paymentFilter, records, search, selectedMonth, selectedYear, sendFilter]);

  const summaryCards = useMemo(() => {
    const currentPeriodRecords = records.filter((item) => item.periodeBulan === selectedMonth && item.periodeTahun === selectedYear);

    return [
      {
        label: "Total slip bulan ini",
        value: String(currentPeriodRecords.length),
        note: "Slip gaji yang sudah tersedia untuk periode ini.",
      },
      {
        label: "Sudah dibuat",
        value: String(currentPeriodRecords.length),
        note: "Slip sudah siap dilihat untuk semua data gaji yang masuk periode ini.",
      },
      {
        label: "Belum dikirim",
        value: String(currentPeriodRecords.filter((item) => item.statusKirim === "Belum dikirim").length),
        note: "Masih perlu dikirim ke karyawan.",
      },
      {
        label: "Sudah dikirim",
        value: String(currentPeriodRecords.filter((item) => item.statusKirim === "Sudah dikirim").length),
        note: "Slip sudah dikirim ke karyawan untuk dicek.",
      },
      {
        label: "Sudah dibayar",
        value: String(currentPeriodRecords.filter((item) => item.statusPembayaran === "Sudah dibayar").length),
        note: "Pembayaran gaji untuk slip ini sudah selesai.",
      },
      {
        label: "Total gaji dibayar",
        value: formatCurrency(currentPeriodRecords.reduce((sum, item) => sum + item.totalDiterima, 0)),
        note: "Total nilai gaji dari semua slip dalam periode ini.",
      },
    ];
  }, [records, selectedMonth, selectedYear]);

  const markAsSent = (recordId) => {
    setRecords((current) => current.map((item) => (item.id === recordId ? { ...item, statusKirim: "Sudah dikirim" } : item)));
    setSelectedSlip((current) => (current?.id === recordId ? { ...current, statusKirim: "Sudah dikirim" } : current));
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Slip Gaji"
        subtitle="Tempat melihat hasil akhir gaji per karyawan, mengecek rincian gaji, lalu mengirim atau mengunduh slip dengan lebih rapi."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Kelola slip gaji</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Buat Slip</Button>
              <Button variant="outline" className="rounded-2xl">
                Kirim Slip
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama karyawan, jabatan, usaha, cabang, atau catatan..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={selectedMonth} onChange={setSelectedMonth} options={payrollMonths} placeholder="Bulan" />
          <FilterSelect value={selectedYear} onChange={setSelectedYear} options={payrollYears} placeholder="Tahun" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / usaha" />
          <FilterSelect value={sendFilter} onChange={setSendFilter} options={filterOptions.sendStatuses} placeholder="Status kirim" />
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
                    <StatusBadge value={item.statusKirim} />
                    <StatusBadge value={item.statusPembayaran} />
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Periode gaji</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {item.periodeBulan} {item.periodeTahun}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-emerald-700">Total diterima</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-800">{formatCurrency(item.totalDiterima)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Status kirim</div>
                    <div className="mt-1 font-medium text-slate-900">{item.statusKirim}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Status pembayaran</div>
                    <div className="mt-1 font-medium text-slate-900">{item.statusPembayaran}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedSlip(item)}>
                    Lihat Slip
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Kirim Slip
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    Unduh Slip
                  </Button>
                  {item.statusKirim !== "Sudah dikirim" ? (
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => markAsSent(item.id)}>
                      Tandai sudah dikirim
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecords.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 text-sm leading-6 text-slate-500">
                Belum ada slip yang cocok dengan pencarian atau filter saat ini.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Preview slip gaji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSlip ? (
              <>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{selectedSlip.namaKaryawan}</div>
                  <div className="text-sm text-slate-500">
                    {selectedSlip.jabatan} / {selectedSlip.namaUsaha} / {selectedSlip.namaCabang}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Periode gaji: {selectedSlip.periodeBulan} {selectedSlip.periodeTahun}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Gaji pokok", formatCurrency(selectedSlip.gajiPokok)],
                    ["Tambahan", formatCurrency(selectedSlip.totalTambahan)],
                    ["Potongan", formatCurrency(selectedSlip.totalPotongan)],
                    ["Tunjangan", formatCurrency(selectedSlip.tunjangan)],
                    ["Uang makan / transport", formatCurrency(selectedSlip.uangMakan + selectedSlip.uangTransport)],
                    ["Lembur", formatCurrency(selectedSlip.lembur)],
                    ["Bonus", formatCurrency(selectedSlip.bonus)],
                    ["Potongan telat", formatCurrency(selectedSlip.potonganTelat)],
                    ["Potongan izin", formatCurrency(selectedSlip.potonganIzin)],
                    ["Potongan kasbon", formatCurrency(selectedSlip.potonganKasbon)],
                    ["BPJS / pajak", formatCurrency(selectedSlip.potonganBpjs + selectedSlip.potonganPajak)],
                    ["Tanggal pembayaran", selectedSlip.tanggalPembayaran],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 p-4 text-sm">
                      <div className="text-slate-500">{label}</div>
                      <div className="mt-1 font-medium text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="text-sm text-emerald-700">Total diterima</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-800">{formatCurrency(selectedSlip.totalDiterima)}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Catatan</div>
                  <div className="mt-1 font-medium text-slate-900">{selectedSlip.catatanAdmin}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  Slip ini nantinya bisa mengambil data dari Proses Gaji, Aturan Gaji, THR & Bonus, dan Data Karyawan tanpa perlu diisi manual dari nol.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
                Pilih salah satu data di sebelah kiri untuk melihat rincian slip gajinya.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
