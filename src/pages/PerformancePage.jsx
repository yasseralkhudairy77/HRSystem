import { useMemo, useState } from "react";
import { BookUser, ClipboardCheck, FilePenLine, Search, ShieldAlert, Trophy, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { performanceDataFields, performanceDirectory, performanceModuleLinks, performanceQuickTabs } from "@/data";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const emptyFilters = {
  usaha: "Semua cabang",
  jabatan: "Semua jabatan",
  periode: "Semua periode",
  statusPenilaian: "Semua status penilaian",
  penanggungJawab: "Semua atasan",
};

function formatDate(value) {
  if (!value || value === "-") {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function matchQuickTab(item, tabKey) {
  switch (tabKey) {
    case "masa-percobaan":
      return item.statusKerja === "Probation";
    case "rutin":
      return item.statusKerja !== "Probation";
    case "perlu-dibina":
      return item.hasilPenilaian === "Perlu dibina";
    case "siap-diputuskan":
      return item.keputusanAkhir === "Tetap" || item.keputusanAkhir === "Tidak lanjut" || item.keputusanAkhir === "Dipertimbangkan";
    case "selesai":
      return item.statusPenilaian === "Sudah dinilai";
    default:
      return true;
  }
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
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

export default function PerformancePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedReview, setSelectedReview] = useState(null);

  const filterOptions = useMemo(() => {
    const usaha = ["Semua cabang", ...new Set(performanceDirectory.map((item) => item.namaCabang))];
    const jabatan = ["Semua jabatan", ...new Set(performanceDirectory.map((item) => item.jabatan))];
    const periode = ["Semua periode", ...new Set(performanceDirectory.map((item) => item.periodePenilaian))];
    const statusPenilaian = ["Semua status penilaian", "Belum dinilai", "Sedang dinilai", "Sudah dinilai"];
    const penanggungJawab = ["Semua atasan", ...new Set(performanceDirectory.map((item) => item.penanggungJawab))];

    return { usaha, jabatan, periode, statusPenilaian, penanggungJawab };
  }, []);

  const summaryCards = useMemo(() => {
    const total = performanceDirectory.length;
    const probation = performanceDirectory.filter((item) => item.statusKerja === "Probation").length;
    const bagus = performanceDirectory.filter((item) => item.hasilPenilaian === "Kerja bagus").length;
    const dibina = performanceDirectory.filter((item) => item.hasilPenilaian === "Perlu dibina").length;
    const siapDiputuskan = performanceDirectory.filter(
      (item) => item.keputusanAkhir === "Tetap" || item.keputusanAkhir === "Tidak lanjut" || item.keputusanAkhir === "Dipertimbangkan",
    ).length;
    const perhatian = performanceDirectory.filter((item) => item.hasilPenilaian === "Perlu perhatian").length;

    return [
      { label: "Total yang dinilai", value: total, note: "Semua penilaian kerja ada di satu tempat.", icon: ClipboardCheck, tone: "slate" },
      { label: "Masa percobaan", value: probation, note: "Perlu dilihat apakah sudah cocok dan layak lanjut.", icon: BookUser, tone: "sky" },
      { label: "Kerja bagus", value: bagus, note: "Bisa jadi dasar keputusan positif atau tambahan tanggung jawab.", icon: Trophy, tone: "emerald" },
      { label: "Perlu dibina", value: dibina, note: "Masih perlu arahan dan pendampingan kerja.", icon: FilePenLine, tone: "amber" },
      { label: "Siap diputuskan", value: siapDiputuskan, note: "Sudah ada bahan untuk keputusan lanjut, tetap, atau tidak lanjut.", icon: ClipboardCheck, tone: "sky" },
      { label: "Perlu perhatian", value: perhatian, note: "Ada hal yang perlu dibahas cepat oleh atasan atau HR.", icon: ShieldAlert, tone: "rose" },
    ];
  }, []);

  const quickTabCounts = useMemo(
    () => Object.fromEntries(performanceQuickTabs.map((tab) => [tab.key, performanceDirectory.filter((item) => matchQuickTab(item, tab.key)).length])),
    [],
  );

  const filteredReviews = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return performanceDirectory.filter((item) => {
      if (!matchQuickTab(item, activeTab)) {
        return false;
      }

      if (filters.usaha !== "Semua cabang" && item.namaCabang !== filters.usaha) {
        return false;
      }

      if (filters.jabatan !== "Semua jabatan" && item.jabatan !== filters.jabatan) {
        return false;
      }

      if (filters.periode !== "Semua periode" && item.periodePenilaian !== filters.periode) {
        return false;
      }

      if (filters.statusPenilaian !== "Semua status penilaian" && item.statusPenilaian !== filters.statusPenilaian) {
        return false;
      }

      if (filters.penanggungJawab !== "Semua atasan" && item.penanggungJawab !== filters.penanggungJawab) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [item.namaLengkap, item.jabatan, item.namaCabang, item.periodePenilaian, item.penanggungJawab]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, search]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Penilaian Kerja"
            subtitle="Pusat untuk menilai kerja karyawan, mencatat pembinaan, dan membantu atasan mengambil keputusan sederhana yang dibutuhkan UMKM."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Tambah Penilaian
            </Button>
            <Button variant="outline" className="rounded-xl">
              <FilePenLine className="mr-2 h-4 w-4" />
              Catat Pembinaan
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, jabatan, cabang, periode, atau atasan"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect value={filters.jabatan} onChange={(event) => handleFilterChange("jabatan", event.target.value)} options={filterOptions.jabatan} />
          <FilterSelect value={filters.periode} onChange={(event) => handleFilterChange("periode", event.target.value)} options={filterOptions.periode} />
          <FilterSelect
            value={filters.statusPenilaian}
            onChange={(event) => handleFilterChange("statusPenilaian", event.target.value)}
            options={filterOptions.statusPenilaian}
          />
          <FilterSelect
            value={filters.penanggungJawab}
            onChange={(event) => handleFilterChange("penanggungJawab", event.target.value)}
            options={filterOptions.penanggungJawab}
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
          {performanceQuickTabs.map((tab) => {
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
                {tab.label} ({quickTabCounts[tab.key] || 0})
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-4 lg:p-5">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">Daftar penilaian kerja</div>
                <div className="text-sm text-slate-500">
                  {filteredReviews.length} data ditemukan. Fokusnya siapa yang kerja bagus, siapa yang perlu dibina, dan siapa yang perlu keputusan lanjutan.
                </div>
              </div>
              <div className="text-sm text-slate-500">Klik "Lihat detail" untuk buka hasil nilai dan catatan atasan tanpa pindah halaman.</div>
            </div>

            <div className="space-y-3">
              {filteredReviews.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{item.namaLengkap}</div>
                          <div className="text-sm text-slate-500">
                            {item.jabatan} • {item.namaCabang}
                          </div>
                        </div>
                        <StatusBadge value={item.statusPenilaian} />
                        <StatusBadge value={item.hasilPenilaian} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Periode</div>
                          <div className="mt-1 font-medium text-slate-700">{item.periodePenilaian}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kerja</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusKerja}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Hasil kerja</div>
                          <div className="mt-1 font-medium text-slate-700">{item.hasilKerja}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Kedisiplinan</div>
                          <div className="mt-1 font-medium text-slate-700">{item.kedisiplinan}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Sikap kerja</div>
                          <div className="mt-1 font-medium text-slate-700">{item.sikapKerja}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Keputusan sementara: {item.keputusanAkhir}</span>
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">Atasan: {item.penanggungJawab}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[270px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedReview(item)}>
                        Lihat detail
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Isi penilaian
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Catat pembinaan
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Simpan hasil
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Tandai selesai
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredReviews.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Belum ada data yang cocok dengan pencarian atau filter yang dipilih.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Terhubung ke modul lain</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Hasil penilaian kerja tidak berdiri sendiri. Dari sini keputusan bisa diteruskan ke modul lain sesuai kebutuhan.
              </div>
              <div className="mt-4 space-y-3">
                {performanceModuleLinks.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-200 p-3">
                    <div className="font-medium text-slate-800">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Struktur data penilaian</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Field ini mendukung penilaian masa percobaan, penilaian rutin, pembinaan, dan keputusan lanjutan.
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {performanceDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedReview && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedReview.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedReview.jabatan} • {selectedReview.periodePenilaian}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedReview.statusPenilaian} />
                <StatusBadge value={selectedReview.hasilPenilaian} />
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{selectedReview.keputusanAkhir}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data penilaian</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nama lengkap: {selectedReview.namaLengkap}</div>
                    <div>Jabatan: {selectedReview.jabatan}</div>
                    <div>Cabang: {selectedReview.namaCabang}</div>
                    <div>Tanggal masuk: {formatDate(selectedReview.tanggalMasuk)}</div>
                    <div>Status kerja: {selectedReview.statusKerja}</div>
                    <div>Periode penilaian: {selectedReview.periodePenilaian}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Poin penilaian</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Hasil kerja: {selectedReview.hasilKerja}</div>
                    <div>Ketepatan kerja: {selectedReview.ketepatanKerja}</div>
                    <div>Kedisiplinan: {selectedReview.kedisiplinan}</div>
                    <div>Sikap kerja: {selectedReview.sikapKerja}</div>
                    <div>Kerja sama: {selectedReview.kerjaSama}</div>
                    <div>Tanggung jawab: {selectedReview.tanggungJawab}</div>
                    <div>Mau belajar: {selectedReview.mauBelajar}</div>
                    <div>Siap ikut aturan kerja: {selectedReview.ikutAturanKerja}</div>
                  </div>
                </div>

                {selectedReview.statusKerja === "Probation" && (
                  <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                    <div className="text-sm font-medium text-slate-700">Catatan masa percobaan</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                      <div>Cepat belajar: {selectedReview.cepatBelajar}</div>
                      <div>Cocok dengan posisi: {selectedReview.cocokDenganPosisi}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan atasan</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedReview.catatanAtasan}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan pembinaan</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedReview.catatanPembinaan}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Hasil akhir</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Hasil penilaian: {selectedReview.hasilPenilaian}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Keputusan akhir: {selectedReview.keputusanAkhir}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Atasan / penanggung jawab: {selectedReview.penanggungJawab}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
