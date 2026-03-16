import { useMemo, useState } from "react";
import { BriefcaseBusiness, Download, Eye, FileWarning, ReceiptText, SearchCheck, Users, Wallet } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  reportInsightCards,
  reportPriorityList,
  reportQuickTabs,
  reportSourceModules,
  reportSummaryRecords,
  reportTypes,
} from "@/data";

const defaultFilters = {
  periode: "Maret 2026",
  usaha: "Semua cabang",
  jenisLaporan: "Semua jenis laporan",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
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

function ReportBlock({ title, items }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-1 font-medium text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [activeTab, setActiveTab] = useState("semua");

  const filterOptions = useMemo(() => {
    const periode = [...new Set(reportSummaryRecords.map((item) => item.periode))];
    const usaha = ["Semua cabang", ...new Set(reportSummaryRecords.map((item) => item.namaCabang))];

    return { periode, usaha, jenisLaporan: reportTypes };
  }, []);

  const activeSummary = useMemo(() => {
    const matched = reportSummaryRecords.find(
      (item) =>
        item.periode === filters.periode &&
        (filters.usaha === "Semua cabang" ? item.namaCabang === "Semua cabang" : item.namaCabang === filters.usaha) &&
        (filters.jenisLaporan === "Semua jenis laporan" || true),
    );

    if (matched) {
      return matched;
    }

    return reportSummaryRecords[0];
  }, [filters]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Total karyawan aktif",
        value: activeSummary.totalKaryawanAktif,
        note: "Melihat kondisi tenaga kerja yang sedang berjalan.",
        icon: Users,
        tone: "slate",
      },
      {
        label: "Lowongan sedang dibuka",
        value: activeSummary.totalLowonganAktif,
        note: "Posisi yang masih perlu diisi.",
        icon: BriefcaseBusiness,
        tone: "sky",
      },
      {
        label: "Pelamar sedang diproses",
        value: activeSummary.totalPelamarDiproses,
        note: "Perlu dipantau supaya tidak berhenti di tengah.",
        icon: SearchCheck,
        tone: "sky",
      },
      {
        label: "Kontrak akan habis",
        value: activeSummary.totalKontrakAkanHabis,
        note: "Perlu keputusan lanjut atau selesai.",
        icon: FileWarning,
        tone: "amber",
      },
      {
        label: "Karyawan baru belum lengkap",
        value: activeSummary.totalKaryawanBaruBelumLengkap,
        note: "Masih ada data atau dokumen yang belum selesai.",
        icon: Users,
        tone: "amber",
      },
      {
        label: "Gaji belum selesai diproses",
        value: activeSummary.totalGajiBelumSelesai,
        note: "Perlu dicek agar pembayaran tidak tertunda.",
        icon: Wallet,
        tone: "rose",
      },
    ],
    [activeSummary],
  );

  const visibleBlocks = useMemo(() => {
    const blocks = [
      { key: "rekrutmen", title: "Kondisi Rekrutmen", items: activeSummary.laporanRekrutmen },
      { key: "karyawan", title: "Kondisi Karyawan", items: activeSummary.laporanKaryawan },
      { key: "kontrak", title: "Kondisi Administrasi", items: activeSummary.laporanAdministrasi },
      { key: "penggajian", title: "Kondisi Penggajian", items: activeSummary.laporanPenggajian },
    ];

    if (activeTab === "semua") {
      return blocks;
    }

    if (activeTab === "perlu-perhatian") {
      return [
        {
          key: "perlu-perhatian",
          title: "Masalah yang perlu dicek",
          items: [
            { label: "Kontrak akan habis", value: `${activeSummary.totalKontrakAkanHabis} kontrak` },
            { label: "Karyawan baru belum lengkap", value: `${activeSummary.totalKaryawanBaruBelumLengkap} orang` },
            { label: "Gaji belum selesai diproses", value: `${activeSummary.totalGajiBelumSelesai} data` },
            { label: "Surat yang belum selesai", value: activeSummary.laporanAdministrasi.find((item) => item.label === "Surat yang belum selesai")?.value || "-" },
            {
              label: "Karyawan yang perlu penilaian",
              value: activeSummary.laporanKaryawan.find((item) => item.label === "Karyawan yang perlu penilaian kerja")?.value || "-",
            },
          ],
        },
      ];
    }

    return blocks.filter((block) => block.key === activeTab);
  }, [activeSummary, activeTab]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Laporan"
            subtitle="Ringkasan usaha dari sisi rekrutmen, karyawan, kontrak, administrasi, dan penggajian supaya owner cepat tahu apa yang perlu ditindaklanjuti."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <Download className="mr-2 h-4 w-4" />
              Unduh Laporan
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Eye className="mr-2 h-4 w-4" />
              Lihat Ringkasan
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect value={filters.periode} onChange={(event) => handleFilterChange("periode", event.target.value)} options={filterOptions.periode} />
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect
            value={filters.jenisLaporan}
            onChange={(event) => handleFilterChange("jenisLaporan", event.target.value)}
            options={filterOptions.jenisLaporan}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {reportQuickTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleBlocks.map((block) => (
          <ReportBlock key={block.key} title={block.title} items={block.items} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Insight bulan ini</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Insight ini membantu owner melihat kondisi yang baik, yang perlu dicek, dan yang perlu segera ditindaklanjuti.
            </div>
            <div className="mt-4 space-y-4">
              {reportInsightCards.map((item) => (
                <div key={item.insightJudul} className={`rounded-xl border p-4 ${item.className}`}>
                  <div className="font-medium">{item.insightJudul}</div>
                  <div className="mt-1 text-sm leading-6">{item.insightIsi}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Prioritas laporan</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Bagian ini menampilkan ringkasan yang paling sering dibutuhkan owner dan admin.</div>
              <div className="mt-4 space-y-3">
                {reportPriorityList.map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Sumber data laporan</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Ringkasan ini disusun dari modul utama supaya owner bisa lihat kondisi usaha tanpa buka satu per satu halaman.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {reportSourceModules.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
