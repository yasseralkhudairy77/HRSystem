import { useMemo, useState } from "react";
import { Archive, CalendarDays, CheckCircle2, Search, ShieldAlert, UserRoundMinus, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { offboardingDataFields, offboardingDirectory, offboardingModuleLinks, offboardingQuickTabs } from "@/data";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const emptyFilters = {
  usaha: "Semua cabang",
  statusProses: "Semua status proses",
  alasanKeluar: "Semua alasan keluar",
  hariKerjaTerakhir: "Semua hari terakhir",
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
    case "akan-keluar":
      return item.statusProses === "Akan keluar";
    case "sedang-diproses":
      return item.statusProses === "Sedang diproses";
    case "belum-lengkap":
      return item.statusProses === "Belum lengkap";
    case "sudah-selesai":
      return item.statusProses === "Sudah selesai";
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

export default function OffboardingPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedProcess, setSelectedProcess] = useState(null);

  const filterOptions = useMemo(() => {
    const usaha = ["Semua cabang", ...new Set(offboardingDirectory.map((item) => item.namaCabang))];
    const statusProses = ["Semua status proses", "Akan keluar", "Sedang diproses", "Belum lengkap", "Sudah selesai"];
    const alasanKeluar = ["Semua alasan keluar", ...new Set(offboardingDirectory.map((item) => item.alasanKeluar))];
    const hariKerjaTerakhir = ["Semua hari terakhir", ...new Set(offboardingDirectory.map((item) => formatDate(item.hariKerjaTerakhir)))];
    const penanggungJawab = ["Semua penanggung jawab", ...new Set(offboardingDirectory.map((item) => item.penanggungJawab))];

    return { usaha, statusProses, alasanKeluar, hariKerjaTerakhir, penanggungJawab };
  }, []);

  const summaryCards = useMemo(() => {
    const total = offboardingDirectory.length;
    const akanKeluar = offboardingDirectory.filter((item) => item.statusProses === "Akan keluar").length;
    const sedangDiproses = offboardingDirectory.filter((item) => item.statusProses === "Sedang diproses").length;
    const belumLengkap = offboardingDirectory.filter((item) => item.statusProses === "Belum lengkap").length;
    const sudahSelesai = offboardingDirectory.filter((item) => item.statusProses === "Sudah selesai").length;
    const perluPerhatian = offboardingDirectory.filter((item) => item.perluPerhatian).length;

    return [
      { label: "Total proses keluar", value: total, note: "Semua proses karyawan keluar dipantau di satu tempat.", icon: UserRoundMinus, tone: "slate" },
      { label: "Akan keluar", value: akanKeluar, note: "Sudah ada rencana keluar dan hari kerja terakhirnya mulai dekat.", icon: CalendarDays, tone: "sky" },
      { label: "Sedang diproses", value: sedangDiproses, note: "Aset, akses, atau surat akhir masih berjalan.", icon: Archive, tone: "amber" },
      { label: "Belum lengkap", value: belumLengkap, note: "Masih ada langkah penting yang belum beres.", icon: ShieldAlert, tone: "amber" },
      { label: "Sudah selesai", value: sudahSelesai, note: "Semua proses akhir sudah lengkap dan arsip sudah rapi.", icon: CheckCircle2, tone: "emerald" },
      { label: "Perlu perhatian", value: perluPerhatian, note: "Perlu ditindaklanjuti supaya tidak ada yang tertinggal.", icon: ShieldAlert, tone: "rose" },
    ];
  }, []);

  const quickTabCounts = useMemo(
    () => Object.fromEntries(offboardingQuickTabs.map((tab) => [tab.key, offboardingDirectory.filter((item) => matchQuickTab(item, tab.key)).length])),
    [],
  );

  const filteredProcesses = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return offboardingDirectory.filter((item) => {
      if (!matchQuickTab(item, activeTab)) {
        return false;
      }

      if (filters.usaha !== "Semua cabang" && item.namaCabang !== filters.usaha) {
        return false;
      }

      if (filters.statusProses !== "Semua status proses" && item.statusProses !== filters.statusProses) {
        return false;
      }

      if (filters.alasanKeluar !== "Semua alasan keluar" && item.alasanKeluar !== filters.alasanKeluar) {
        return false;
      }

      if (filters.hariKerjaTerakhir !== "Semua hari terakhir" && formatDate(item.hariKerjaTerakhir) !== filters.hariKerjaTerakhir) {
        return false;
      }

      if (filters.penanggungJawab !== "Semua penanggung jawab" && item.penanggungJawab !== filters.penanggungJawab) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [item.namaLengkap, item.jabatan, item.namaCabang, item.alasanKeluar, item.penanggungJawab]
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
            title="Karyawan Keluar"
            subtitle="Pusat proses keluar karyawan supaya owner, admin, dan HR bisa cepat lihat siapa yang akan keluar, apa yang belum selesai, dan apakah semua langkah akhir sudah lengkap."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <UserRoundMinus className="mr-2 h-4 w-4" />
              Tambah Proses Keluar
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Archive className="mr-2 h-4 w-4" />
              Lengkapi Proses
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, jabatan, cabang, alasan keluar, atau penanggung jawab"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect
            value={filters.statusProses}
            onChange={(event) => handleFilterChange("statusProses", event.target.value)}
            options={filterOptions.statusProses}
          />
          <FilterSelect
            value={filters.alasanKeluar}
            onChange={(event) => handleFilterChange("alasanKeluar", event.target.value)}
            options={filterOptions.alasanKeluar}
          />
          <FilterSelect
            value={filters.hariKerjaTerakhir}
            onChange={(event) => handleFilterChange("hariKerjaTerakhir", event.target.value)}
            options={filterOptions.hariKerjaTerakhir}
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
          {offboardingQuickTabs.map((tab) => {
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
                <div className="text-lg font-semibold text-slate-900">Daftar proses keluar</div>
                <div className="text-sm text-slate-500">
                  {filteredProcesses.length} data ditemukan. Fokus utamanya siapa yang akan keluar, apa yang belum lengkap, dan apa yang harus segera ditutup.
                </div>
              </div>
              <div className="text-sm text-slate-500">Klik "Lihat detail" untuk buka checklist lengkap tanpa pindah halaman.</div>
            </div>

            <div className="space-y-3">
              {filteredProcesses.map((item) => (
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
                        <StatusBadge value={item.statusProses} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Alasan keluar</div>
                          <div className="mt-1 font-medium text-slate-700">{item.alasanKeluar}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Hari kerja terakhir</div>
                          <div className="mt-1 font-medium text-slate-700">{formatDate(item.hariKerjaTerakhir)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status aset</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusAset}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status akses</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusAkses}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status surat akhir</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusSuratAkhir}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedProcess(item)}>
                        Lihat detail
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Lengkapi proses
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Buat surat akhir
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Tandai selesai
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredProcesses.length === 0 && (
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
                Proses keluar tidak berdiri sendiri. Data akhir harus tetap nyambung ke modul lain supaya administrasi tetap rapi.
              </div>
              <div className="mt-4 space-y-3">
                {offboardingModuleLinks.map((item) => (
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
              <div className="text-lg font-semibold text-slate-900">Struktur data proses keluar</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Field ini mendukung proses keluar dari awal pengajuan sampai arsip akhir tersimpan.
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {offboardingDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedProcess && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedProcess.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedProcess.jabatan} • {selectedProcess.namaCabang}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProcess(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedProcess.statusProses} />
                <StatusBadge value={selectedProcess.statusAset} />
                <StatusBadge value={selectedProcess.statusAkses} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Data proses keluar</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Nama lengkap: {selectedProcess.namaLengkap}</div>
                    <div>Jabatan: {selectedProcess.jabatan}</div>
                    <div>Cabang: {selectedProcess.namaCabang}</div>
                    <div>Alasan keluar: {selectedProcess.alasanKeluar}</div>
                    <div>Tanggal pengajuan keluar: {formatDate(selectedProcess.tanggalPengajuanKeluar)}</div>
                    <div>Hari kerja terakhir: {formatDate(selectedProcess.hariKerjaTerakhir)}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Status proses</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Persetujuan atasan: {selectedProcess.persetujuanAtasan}</div>
                    <div>Aset kerja: {selectedProcess.asetKerja}</div>
                    <div>Akses kerja: {selectedProcess.aksesKerja}</div>
                    <div>Surat akhir: {selectedProcess.suratAkhir}</div>
                    <div>Paklaring: {selectedProcess.paklaringSiap ? "Sudah siap" : "Belum siap"}</div>
                    <div>Berita acara: {selectedProcess.beritaAcaraSiap ? "Sudah ada" : "Belum ada"}</div>
                  </div>
                </div>
              </div>

              {["Status keluar", "Aset & akses", "Dokumen akhir"].map((group) => (
                <div key={group} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-medium text-slate-800">{group}</div>
                  <div className="mt-3 space-y-2">
                    {selectedProcess.checklist
                      .filter((item) => item.group === group)
                      .map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-emerald-600" : "text-slate-300"}`} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan HR</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedProcess.catatanHr}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Status surat akhir: {selectedProcess.statusSuratAkhir}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    Status karyawan: {selectedProcess.statusKaryawanSudahNonaktif ? "Sudah nonaktif" : "Masih aktif"}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Penanggung jawab: {selectedProcess.penanggungJawab}</div>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Persetujuan atasan: {selectedProcess.persetujuanAtasan}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Terhubung ke modul</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProcess.linkedModules.map((item) => (
                    <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
