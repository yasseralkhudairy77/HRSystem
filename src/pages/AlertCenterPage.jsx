import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CircleCheckBig, FileWarning, Search, Wallet, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { alertDataFields, alertModuleLinks, alertQuickTabs, alertRecords } from "@/data";

const emptyFilters = {
  prioritas: "Semua prioritas",
  jenisMasalah: "Semua jenis masalah",
  usahaCabang: "Semua usaha / cabang",
  penanggungJawab: "Semua penanggung jawab",
  statusTindakLanjut: "Semua status tindak lanjut",
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
    emerald: "bg-emerald-50 text-emerald-700",
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

const categoryIcons = {
  "Kontrak Kerja": FileWarning,
  "Karyawan Baru": FileWarning,
  "Surat & Pengumuman": FileWarning,
  "Karyawan Keluar": AlertCircle,
  Penggajian: Wallet,
  "Dokumen Karyawan": FileWarning,
  Rekrutmen: AlertCircle,
  Relasi: CircleCheckBig,
};

export default function AlertCenterPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedItem, setSelectedItem] = useState(null);

  const filterOptions = useMemo(() => {
    const prioritas = ["Semua prioritas", "Harus segera dicek", "Perlu dicek", "Bisa menyusul"];
    const jenisMasalah = ["Semua jenis masalah", ...new Set(alertRecords.map((item) => item.kategoriMasalah))];
    const usahaCabang = ["Semua usaha / cabang", ...new Set(alertRecords.flatMap((item) => [item.namaUsaha, item.namaCabang]))];
    const penanggungJawab = ["Semua penanggung jawab", ...new Set(alertRecords.map((item) => item.penanggungJawab))];
    const statusTindakLanjut = ["Semua status tindak lanjut", "Belum selesai", "Sedang ditindaklanjuti", "Sudah beres hari ini"];

    return { prioritas, jenisMasalah, usahaCabang, penanggungJawab, statusTindakLanjut };
  }, []);

  const summaryCards = useMemo(() => {
    const total = alertRecords.length;
    const segera = alertRecords.filter((item) => item.prioritas === "Harus segera dicek").length;
    const hampir = alertRecords.filter((item) => item.batasWaktu === "Hampir jatuh tempo" || item.batasWaktu.includes("hari lagi")).length;
    const belumSelesai = alertRecords.filter((item) => item.statusTindakLanjut === "Belum selesai").length;
    const sudahLewat = alertRecords.filter((item) => item.batasWaktu === "Sudah lewat").length;
    const beresHariIni = alertRecords.filter((item) => item.statusTindakLanjut === "Sudah beres hari ini").length;

    return [
      { label: "Total yang perlu dicek", value: total, note: "Semua pengingat harian yang perlu dipantau.", icon: AlertCircle, tone: "slate" },
      { label: "Harus segera dicek", value: segera, note: "Yang paling mendesak untuk dibuka dulu.", icon: FileWarning, tone: "rose" },
      { label: "Hampir jatuh tempo", value: hampir, note: "Sudah dekat batas waktu dan jangan sampai terlewat.", icon: CalendarClock, tone: "amber" },
      { label: "Belum selesai", value: belumSelesai, note: "Masih perlu tindakan lanjutan.", icon: AlertCircle, tone: "amber" },
      { label: "Sudah lewat", value: sudahLewat, note: "Sudah terlewat dan harus segera dibereskan.", icon: FileWarning, tone: "rose" },
      { label: "Sudah beres hari ini", value: beresHariIni, note: "Yang sudah selesai dicek hari ini.", icon: CircleCheckBig, tone: "emerald" },
    ];
  }, []);

  const filteredAlerts = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return alertRecords.filter((item) => {
      if (activeTab === "kontrak" && item.kategoriMasalah !== "Kontrak Kerja") {
        return false;
      }
      if (activeTab === "karyawan-baru" && item.kategoriMasalah !== "Karyawan Baru") {
        return false;
      }
      if (activeTab === "surat" && item.kategoriMasalah !== "Surat & Pengumuman") {
        return false;
      }
      if (activeTab === "karyawan-keluar" && item.kategoriMasalah !== "Karyawan Keluar") {
        return false;
      }
      if (activeTab === "gaji" && item.kategoriMasalah !== "Penggajian") {
        return false;
      }
      if (activeTab === "sudah-lewat" && item.batasWaktu !== "Sudah lewat") {
        return false;
      }
      if (activeTab === "harus-segera" && item.prioritas !== "Harus segera dicek") {
        return false;
      }

      if (filters.prioritas !== "Semua prioritas" && item.prioritas !== filters.prioritas) {
        return false;
      }
      if (filters.jenisMasalah !== "Semua jenis masalah" && item.kategoriMasalah !== filters.jenisMasalah) {
        return false;
      }
      if (filters.usahaCabang !== "Semua usaha / cabang" && item.namaUsaha !== filters.usahaCabang && item.namaCabang !== filters.usahaCabang) {
        return false;
      }
      if (filters.penanggungJawab !== "Semua penanggung jawab" && item.penanggungJawab !== filters.penanggungJawab) {
        return false;
      }
      if (filters.statusTindakLanjut !== "Semua status tindak lanjut" && item.statusTindakLanjut !== filters.statusTindakLanjut) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [
        item.kategoriMasalah,
        item.judulMasalah,
        item.namaUsaha,
        item.namaCabang,
        item.batasWaktu,
        item.prioritas,
        item.penanggungJawab,
        item.statusTindakLanjut,
        item.menuTerkait,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, search]);

  const groupedAlerts = useMemo(() => {
    const order = ["Kontrak Kerja", "Karyawan Baru", "Surat & Pengumuman", "Karyawan Keluar", "Penggajian", "Dokumen Karyawan", "Rekrutmen", "Relasi"];
    return order
      .map((kategoriMasalah) => ({
        kategoriMasalah,
        items: filteredAlerts.filter((item) => item.kategoriMasalah === kategoriMasalah),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredAlerts]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Perlu Dicek"
            subtitle="Pusat pengingat harian untuk melihat apa yang belum selesai, hampir jatuh tempo, dan menu mana yang perlu dibuka sekarang."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">Lihat Semua</Button>
            <Button variant="outline" className="rounded-xl">Selesaikan Sekarang</Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari masalah, cabang, penanggung jawab, atau menu terkait"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.prioritas} onChange={(event) => handleFilterChange("prioritas", event.target.value)} options={filterOptions.prioritas} />
          <FilterSelect
            value={filters.jenisMasalah}
            onChange={(event) => handleFilterChange("jenisMasalah", event.target.value)}
            options={filterOptions.jenisMasalah}
          />
          <FilterSelect
            value={filters.usahaCabang}
            onChange={(event) => handleFilterChange("usahaCabang", event.target.value)}
            options={filterOptions.usahaCabang}
          />
          <FilterSelect
            value={filters.penanggungJawab}
            onChange={(event) => handleFilterChange("penanggungJawab", event.target.value)}
            options={filterOptions.penanggungJawab}
          />
          <FilterSelect
            value={filters.statusTindakLanjut}
            onChange={(event) => handleFilterChange("statusTindakLanjut", event.target.value)}
            options={filterOptions.statusTindakLanjut}
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
          {alertQuickTabs.map((tab) => {
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

      <div className="space-y-6">
        {groupedAlerts.map((group) => (
          <div key={group.kategoriMasalah} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                {(() => {
                  const Icon = categoryIcons[group.kategoriMasalah] || AlertCircle;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{group.kategoriMasalah}</div>
                <div className="text-sm text-slate-500">Daftar yang perlu ditindaklanjuti untuk kategori ini.</div>
              </div>
            </div>

            <div className="grid gap-4">
              {group.items.map((item) => (
                <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">{item.judulMasalah}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {item.jumlahKasus} kasus • {item.namaUsaha} • {item.namaCabang}
                            </div>
                          </div>
                          <StatusBadge value={item.prioritas} />
                          <StatusBadge value={item.statusTindakLanjut} />
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 p-3">Jumlah kasus: {item.jumlahKasus}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Batas waktu: {item.batasWaktu}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Tanggung jawab siapa: {item.penanggungJawab}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Menu terkait: {item.menuTerkait}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                        <Button variant="outline" className="rounded-xl" onClick={() => setSelectedItem(item)}>
                          Buka detail
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          Lihat menu terkait
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          Tandai sudah dicek
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Terhubung ke modul utama</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Halaman ini menarik ringkasan pengingat dari rekrutmen, administrasi, relasi, kontrak, proses keluar, penggajian, dan dokumen karyawan.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {alertModuleLinks.map((item) => (
                <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Struktur data pengingat</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Field ini disiapkan supaya tiap pengingat punya tindakan yang jelas dan bisa ditelusuri ke menu terkait.</div>
            <div className="mt-4 grid gap-2">
              {alertDataFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {field}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedItem.judulMasalah}</div>
                <div className="mt-1 text-sm text-slate-500">Detail yang perlu dicek</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedItem.prioritas} />
                <StatusBadge value={selectedItem.statusTindakLanjut} />
                <StatusBadge value={selectedItem.sudahDicekAtauBelum} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Kategori masalah: {selectedItem.kategoriMasalah}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah kasus: {selectedItem.jumlahKasus}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama usaha: {selectedItem.namaUsaha}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama cabang: {selectedItem.namaCabang}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Batas waktu: {selectedItem.batasWaktu}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Tanggung jawab siapa: {selectedItem.penanggungJawab}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status tindak lanjut: {selectedItem.statusTindakLanjut}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Menu terkait: {selectedItem.menuTerkait}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Selesaikan sekarang
                </Button>
                <Button variant="outline" className="rounded-xl">
                  Lihat menu terkait
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
