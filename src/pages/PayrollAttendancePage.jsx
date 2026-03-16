import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { payrollAttendanceRecords as initialPayrollAttendanceRecords, payrollMonths, payrollYears } from "@/data";

const quickTabs = ["Semua", "Kehadiran", "Keterlambatan", "Izin / Sakit", "Lembur", "Perlu dicek"];

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

export default function PayrollAttendancePage() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Maret");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [companyFilter, setCompanyFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [attendanceRecords, setAttendanceRecords] = useState(initialPayrollAttendanceRecords);
  const [selectedRecord, setSelectedRecord] = useState(initialPayrollAttendanceRecords[0] || null);

  const filterOptions = useMemo(
    () => ({
      companies: [...new Set(attendanceRecords.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      jobs: [...new Set(attendanceRecords.map((item) => item.jabatan))],
      employmentStatuses: [...new Set(attendanceRecords.map((item) => item.statusKerja))],
    }),
    [attendanceRecords],
  );

  const filteredRecords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return attendanceRecords.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaKaryawan, item.jabatan, item.namaUsaha, item.namaCabang, item.statusKerja]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesMonth = item.periodeBulan === selectedMonth;
      const matchesYear = item.periodeTahun === selectedYear;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesJob = !jobFilter || item.jabatan === jobFilter;
      const matchesEmployment = !employmentFilter || item.statusKerja === employmentFilter;
      const matchesTab =
        activeTab === "Semua" ||
        (activeTab === "Kehadiran" && item.totalHadir > 0) ||
        (activeTab === "Keterlambatan" && item.totalTelat > 0) ||
        (activeTab === "Izin / Sakit" && item.totalIzin + item.totalSakit > 0) ||
        (activeTab === "Lembur" && item.totalLemburJam > 0) ||
        (activeTab === "Perlu dicek" && item.statusRekap === "Perlu dicek");

      return matchesSearch && matchesMonth && matchesYear && matchesCompany && matchesJob && matchesEmployment && matchesTab;
    });
  }, [activeTab, attendanceRecords, companyFilter, employmentFilter, jobFilter, search, selectedMonth, selectedYear]);

  const summaryCards = useMemo(() => {
    const currentPeriodRecords = attendanceRecords.filter((item) => item.periodeBulan === selectedMonth && item.periodeTahun === selectedYear);

    return [
      {
        label: "Total karyawan",
        value: String(currentPeriodRecords.length),
        note: "Karyawan yang masuk rekap kerja bulan ini.",
      },
      {
        label: "Hadir bulan ini",
        value: String(currentPeriodRecords.reduce((sum, item) => sum + item.totalHadir, 0)),
        note: "Total hari masuk kerja dari semua karyawan di periode ini.",
      },
      {
        label: "Telat",
        value: String(currentPeriodRecords.reduce((sum, item) => sum + item.totalTelat, 0)),
        note: "Jumlah keterlambatan yang perlu dipantau untuk hitungan potongan.",
      },
      {
        label: "Izin / Sakit",
        value: String(currentPeriodRecords.reduce((sum, item) => sum + item.totalIzin + item.totalSakit, 0)),
        note: "Gabungan hari izin dan sakit selama periode berjalan.",
      },
      {
        label: "Total lembur",
        value: `${currentPeriodRecords.reduce((sum, item) => sum + item.totalLemburJam, 0)} jam`,
        note: "Total jam lembur yang bisa dipakai untuk proses gaji.",
      },
      {
        label: "Data perlu dicek",
        value: String(currentPeriodRecords.filter((item) => item.statusRekap === "Perlu dicek").length),
        note: "Masih ada rekap yang perlu dipastikan sebelum dipakai untuk gaji.",
      },
    ];
  }, [attendanceRecords, selectedMonth, selectedYear]);

  const markAsChecked = (recordId) => {
    setAttendanceRecords((current) =>
      current.map((item) => (item.id === recordId ? { ...item, statusRekap: "Sudah dicek" } : item)),
    );
    setSelectedRecord((current) => (current?.id === recordId ? { ...current, statusRekap: "Sudah dicek" } : current));
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Kehadiran & Lembur"
        subtitle="Rekap kerja bulanan untuk melihat hadir, telat, izin, sakit, dan lembur sebelum dipakai di proses gaji."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Rekap bulan ini</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-2xl">Input Kehadiran</Button>
              <Button variant="outline" className="rounded-2xl">
                Input Lembur
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
          <FilterSelect value={jobFilter} onChange={setJobFilter} options={filterOptions.jobs} placeholder="Semua jabatan" />
          <FilterSelect value={employmentFilter} onChange={setEmploymentFilter} options={filterOptions.employmentStatuses} placeholder="Semua status kerja" />
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
                  <StatusBadge value={item.statusRekap} />
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Hari kerja</div>
                    <div className="mt-1 font-medium text-slate-900">{item.totalHariKerja} hari</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Masuk kerja</div>
                    <div className="mt-1 font-medium text-slate-900">{item.totalHadir} hari</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Telat</div>
                    <div className="mt-1 font-medium text-amber-700">{item.totalTelat} kali</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Izin</div>
                    <div className="mt-1 font-medium text-slate-900">{item.totalIzin} hari</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Sakit</div>
                    <div className="mt-1 font-medium text-slate-900">{item.totalSakit} hari</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Tidak masuk</div>
                    <div className="mt-1 font-medium text-rose-700">{item.totalTidakMasuk} hari</div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                    <div className="text-sky-700">Lembur</div>
                    <div className="mt-1 font-medium text-sky-800">
                      {item.totalLemburHari} hari / {item.totalLemburJam} jam
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Status kerja</div>
                    <div className="mt-1 font-medium text-slate-900">{item.statusKerja}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-slate-500">Catatan singkat</div>
                    <div className="mt-1 font-medium text-slate-900">{item.catatanAdmin}</div>
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
                    Input lembur
                  </Button>
                  {item.statusRekap !== "Sudah dicek" ? (
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => markAsChecked(item.id)}>
                      Tandai sudah dicek
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecords.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 text-sm leading-6 text-slate-500">
                Belum ada rekap yang cocok dengan pencarian atau filter saat ini. Coba ganti filter atau input data baru.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Rincian rekap kerja</CardTitle>
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
                    ["Total hari kerja", `${selectedRecord.totalHariKerja} hari`],
                    ["Total hadir", `${selectedRecord.totalHadir} hari`],
                    ["Total telat", `${selectedRecord.totalTelat} kali`],
                    ["Total izin", `${selectedRecord.totalIzin} hari`],
                    ["Total sakit", `${selectedRecord.totalSakit} hari`],
                    ["Total tidak masuk", `${selectedRecord.totalTidakMasuk} hari`],
                    ["Jumlah lembur", `${selectedRecord.totalLemburHari} hari`],
                    ["Jam lembur", `${selectedRecord.totalLemburJam} jam`],
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

                <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                  <div className="text-slate-500">Status rekap</div>
                  <div className="mt-2">
                    <StatusBadge value={selectedRecord.statusRekap} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  Rekap ini nantinya bisa dipakai untuk Proses Gaji, Aturan Gaji, dan THR & Bonus, serta disambungkan ke Data Karyawan dan Kontrak Kerja.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm leading-6 text-slate-500">
                Pilih salah satu rekap di sebelah kiri untuk melihat rincian hadir dan lemburnya.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
