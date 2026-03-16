import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Download,
  FileSignature,
  FileText,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contractDataFields, contractDirectory, contractModuleLinks, contractQuickTabs } from "@/data";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const emptyFilters = {
  usaha: "Semua usaha",
  statusKontrak: "Semua status kontrak",
  statusKerja: "Semua status kerja",
  tanggalBerakhir: "Semua tanggal berakhir",
  penanggungJawab: "Semua penanggung jawab",
};

function formatDate(value) {
  if (!value || value === "-") {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function matchQuickTab(item, tabKey) {
  switch (tabKey) {
    case "aktif":
      return item.statusKontrak === "Aktif";
    case "belum-dibuat":
      return item.statusKontrak === "Belum dibuat";
    case "akan-habis":
      return item.statusKontrak === "Akan habis";
    case "perlu-diperpanjang":
      return item.keputusanBerikutnya === "Perpanjang";
    case "sudah-lewat":
      return item.statusKontrak === "Sudah lewat";
    case "selesai":
      return item.statusKontrak === "Selesai";
    default:
      return true;
  }
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
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

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedContract, setSelectedContract] = useState(null);

  const filterOptions = useMemo(() => {
    const usaha = ["Semua usaha", ...new Set(contractDirectory.map((item) => item.namaCabang))];
    const statusKontrak = ["Semua status kontrak", "Aktif", "Belum dibuat", "Akan habis", "Sudah lewat", "Selesai"];
    const statusKerja = ["Semua status kerja", "Kontrak", "Probation", "Tetap", "Freelance", "Part time"];
    const tanggalBerakhir = ["Semua tanggal berakhir", ...new Set(contractDirectory.map((item) => formatDate(item.tanggalBerakhir)))];
    const penanggungJawab = ["Semua penanggung jawab", ...new Set(contractDirectory.map((item) => item.penanggungJawab))];

    return { usaha, statusKontrak, statusKerja, tanggalBerakhir, penanggungJawab };
  }, []);

  const summaryCards = useMemo(() => {
    const aktif = contractDirectory.filter((item) => item.statusKontrak === "Aktif").length;
    const belumDibuat = contractDirectory.filter((item) => item.statusKontrak === "Belum dibuat").length;
    const akanHabis = contractDirectory.filter((item) => item.statusKontrak === "Akan habis").length;
    const sudahLewat = contractDirectory.filter((item) => item.statusKontrak === "Sudah lewat").length;
    const perluPerhatian = contractDirectory.filter((item) => item.perluPerhatian).length;
    const siapDitandatangani = contractDirectory.filter((item) => item.statusTandaTangan === "Siap ditandatangani").length;

    return [
      { label: "Kontrak aktif", value: aktif, note: "Kontrak yang sedang berjalan dan masih dipakai operasional.", icon: FileText, tone: "emerald" },
      { label: "Belum dibuat", value: belumDibuat, note: "Karyawan sudah perlu kontrak, tapi dokumennya belum jadi.", icon: BriefcaseBusiness, tone: "amber" },
      { label: "Akan habis", value: akanHabis, note: "Perlu diputuskan lanjut, diperpanjang, atau selesai.", icon: CalendarDays, tone: "amber" },
      { label: "Sudah lewat", value: sudahLewat, note: "Masa kontraknya sudah lewat dan perlu tindakan cepat.", icon: ShieldAlert, tone: "rose" },
      { label: "Perlu perhatian", value: perluPerhatian, note: "Masih ada kontrak yang butuh keputusan atau tindak lanjut.", icon: ShieldAlert, tone: "rose" },
      { label: "Siap ditandatangani", value: siapDitandatangani, note: "Isi kontrak sudah siap dan tinggal tanda tangan.", icon: FileSignature, tone: "sky" },
    ];
  }, []);

  const quickTabCounts = useMemo(
    () => Object.fromEntries(contractQuickTabs.map((tab) => [tab.key, contractDirectory.filter((item) => matchQuickTab(item, tab.key)).length])),
    [],
  );

  const filteredContracts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return contractDirectory.filter((item) => {
      if (!matchQuickTab(item, activeTab)) {
        return false;
      }

      if (filters.usaha !== "Semua usaha" && item.namaCabang !== filters.usaha) {
        return false;
      }

      if (filters.statusKontrak !== "Semua status kontrak" && item.statusKontrak !== filters.statusKontrak) {
        return false;
      }

      if (filters.statusKerja !== "Semua status kerja" && item.statusKerja !== filters.statusKerja) {
        return false;
      }

      if (filters.tanggalBerakhir !== "Semua tanggal berakhir" && formatDate(item.tanggalBerakhir) !== filters.tanggalBerakhir) {
        return false;
      }

      if (filters.penanggungJawab !== "Semua penanggung jawab" && item.penanggungJawab !== filters.penanggungJawab) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [item.namaLengkap, item.jabatan, item.namaCabang, item.nomorKontrak, item.penanggungJawab, item.jenisKontrak]
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
            title="Kontrak Kerja"
            subtitle="Pusat untuk melihat kontrak aktif, kontrak yang belum dibuat, yang akan habis, dan keputusan berikutnya agar tidak ada yang terlewat."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <FileText className="mr-2 h-4 w-4" />
              Buat Kontrak
            </Button>
            <Button variant="outline" className="rounded-xl">
              <CalendarDays className="mr-2 h-4 w-4" />
              Perpanjang Kontrak
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, nomor kontrak, jabatan, cabang, atau penanggung jawab"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect
            value={filters.statusKontrak}
            onChange={(event) => handleFilterChange("statusKontrak", event.target.value)}
            options={filterOptions.statusKontrak}
          />
          <FilterSelect
            value={filters.statusKerja}
            onChange={(event) => handleFilterChange("statusKerja", event.target.value)}
            options={filterOptions.statusKerja}
          />
          <FilterSelect
            value={filters.tanggalBerakhir}
            onChange={(event) => handleFilterChange("tanggalBerakhir", event.target.value)}
            options={filterOptions.tanggalBerakhir}
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
          {contractQuickTabs.map((tab) => {
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
                <div className="text-lg font-semibold text-slate-900">Daftar kontrak kerja</div>
                <div className="text-sm text-slate-500">
                  {filteredContracts.length} data ditemukan. Fokus utamanya siapa yang belum dibuatkan kontrak, siapa yang akan habis, dan siapa yang perlu keputusan.
                </div>
              </div>
              <div className="text-sm text-slate-500">Klik "Lihat detail" untuk buka isi kontrak tanpa pindah halaman.</div>
            </div>

            <div className="space-y-3">
              {filteredContracts.map((item) => (
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
                        <StatusBadge value={item.statusKontrak} />
                        <StatusBadge value={item.statusTandaTangan} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kerja</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusKerja}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Jenis kontrak</div>
                          <div className="mt-1 font-medium text-slate-700">{item.jenisKontrak}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal mulai</div>
                          <div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalMulai)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal berakhir</div>
                          <div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalBerakhir)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Masa kontrak</div>
                          <div className="mt-1 font-medium text-slate-700">{item.masaKontrakBulan} bulan</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{item.reminder}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Keputusan berikutnya: {item.keputusanBerikutnya}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[280px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedContract(item)}>
                        Lihat detail
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Buat kontrak
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Perpanjang
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Unduh file
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Tandai selesai
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredContracts.length === 0 && (
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
                Halaman ini disiapkan supaya kontrak kerja bisa dibuat dari awal, dipantau saat berjalan, lalu diteruskan ke modul lain saat perlu tindakan.
              </div>
              <div className="mt-4 space-y-3">
                {contractModuleLinks.map((item) => (
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
              <div className="text-lg font-semibold text-slate-900">Struktur data kontrak</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Field ini mendukung pembuatan kontrak, pemantauan masa kerja, status tanda tangan, dan keputusan berikutnya.
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {contractDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedContract && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedContract.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedContract.nomorKontrak} • {selectedContract.jabatan}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedContract.statusKontrak} />
                <StatusBadge value={selectedContract.statusTandaTangan} />
                <StatusBadge value={selectedContract.statusKerja} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data karyawan</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nama lengkap: {selectedContract.namaLengkap}</div>
                    <div>Jabatan: {selectedContract.jabatan}</div>
                    <div>Cabang: {selectedContract.namaCabang}</div>
                    <div>Status kerja: {selectedContract.statusKerja}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data kontrak</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nomor kontrak: {selectedContract.nomorKontrak}</div>
                    <div>Jenis kontrak: {selectedContract.jenisKontrak}</div>
                    <div>Tanggal mulai: {formatDate(selectedContract.tanggalMulai)}</div>
                    <div>Tanggal berakhir: {formatDate(selectedContract.tanggalBerakhir)}</div>
                    <div>Masa kontrak: {selectedContract.masaKontrakBulan} bulan</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Nilai perjanjian</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Gaji pokok: {selectedContract.gajiPokok}</div>
                    <div>Tunjangan utama: {selectedContract.tunjanganUtama}</div>
                    <div>File kontrak: {selectedContract.fileKontrak}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Tindak lanjut</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Status tanda tangan: {selectedContract.statusTandaTangan}</div>
                    <div>Tanggal review: {formatDate(selectedContract.tanggalReview)}</div>
                    <div>Keputusan berikutnya: {selectedContract.keputusanBerikutnya}</div>
                    <div>Penanggung jawab: {selectedContract.penanggungJawab}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Pengingat</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-700">{selectedContract.reminder}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{selectedContract.statusKontrak}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan HR</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedContract.catatanHr}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Terhubung ke modul</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedContract.linkedModules.map((item) => (
                    <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl">Perpanjang kontrak</Button>
                <Button variant="outline" className="rounded-xl">
                  <Download className="mr-2 h-4 w-4" />
                  Unduh file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
