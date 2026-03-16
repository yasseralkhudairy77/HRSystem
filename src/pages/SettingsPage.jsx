import { useMemo, useState } from "react";
import { Bell, BookText, CheckCircle2, CircleAlert, Eye, FileText, Palette, Search, Settings2, ShieldCheck, UserCog, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import SupabaseConnectionCard from "@/components/system/SupabaseConnectionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { businessDirectory, settingsDataFields, settingsDirectory, settingsModuleLinks, settingsQuickTabs } from "@/data";

const emptyFilters = {
  jenisPengaturan: "Semua jenis pengaturan",
  status: "Semua status",
  usahaCabang: "Semua usaha / cabang",
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

const blockIcons = {
  "Hak Akses": ShieldCheck,
  "Pesan & Pemberitahuan": Bell,
  Dokumen: FileText,
  "Tes Kerja": BookText,
  "Tampilan Usaha": Palette,
};

export default function SettingsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedSetting, setSelectedSetting] = useState(null);

  const filterOptions = useMemo(() => {
    const jenisPengaturan = ["Semua jenis pengaturan", ...new Set(settingsDirectory.map((item) => item.jenisPengaturan))];
    const status = ["Semua status", "Sudah diatur", "Belum diatur", "Perlu dicek"];
    const usahaCabang = [
      "Semua usaha / cabang",
      ...new Set(
        settingsDirectory.flatMap((item) => {
          const usaha = businessDirectory.find((business) => business.id === item.usahaId);
          const cabang = usaha?.daftarCabang.find((branch) => branch.id === item.cabangId);
          return [usaha?.namaUsaha, cabang?.namaCabang].filter(Boolean);
        }),
      ),
    ];

    return { jenisPengaturan, status, usahaCabang };
  }, []);

  const summaryCards = useMemo(() => {
    const totalPengaturan = settingsDirectory.length;
    const sudahDiatur = settingsDirectory.filter((item) => item.statusPengaturan === "Sudah diatur").length;
    const belumDiatur = settingsDirectory.filter((item) => item.statusPengaturan === "Belum diatur").length;
    const hakAksesAktif = settingsDirectory.find((item) => item.jenisPengaturan === "Hak Akses")?.daftarItem.filter((entry) => entry.status === "Aktif").length || 0;
    const templateAktif = settingsDirectory
      .filter((item) => item.jenisPengaturan === "Pesan & Pemberitahuan" || item.jenisPengaturan === "Dokumen")
      .reduce((sum, item) => sum + item.daftarItem.filter((entry) => entry.status === "Dipakai").length, 0);
    const perluDicek = settingsDirectory.filter((item) => item.statusPengaturan === "Perlu dicek").length;

    return [
      { label: "Total pengaturan", value: totalPengaturan, note: "Semua pengaturan utama sistem ada di satu halaman.", icon: Settings2, tone: "slate" },
      { label: "Sudah diatur", value: sudahDiatur, note: "Bagian yang sudah siap dipakai untuk operasional harian.", icon: CheckCircle2, tone: "emerald" },
      { label: "Belum diatur", value: belumDiatur, note: "Masih ada pengaturan yang perlu dirapikan dulu.", icon: CircleAlert, tone: "amber" },
      { label: "Hak akses aktif", value: hakAksesAktif, note: "Peran pengguna yang sedang aktif dan bisa masuk sistem.", icon: UserCog, tone: "sky" },
      { label: "Template aktif", value: templateAktif, note: "Pesan dan dokumen yang sudah siap dipakai.", icon: FileText, tone: "emerald" },
      { label: "Perlu dicek", value: perluDicek, note: "Ada pengaturan yang sebaiknya ditindaklanjuti dulu.", icon: Eye, tone: "amber" },
    ];
  }, []);

  const filteredSettings = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return settingsDirectory.filter((item) => {
      if (activeTab === "hak-akses" && item.jenisPengaturan !== "Hak Akses") {
        return false;
      }

      if (activeTab === "pesan" && item.jenisPengaturan !== "Pesan & Pemberitahuan") {
        return false;
      }

      if (activeTab === "dokumen" && item.jenisPengaturan !== "Dokumen") {
        return false;
      }

      if (activeTab === "tes" && item.jenisPengaturan !== "Tes Kerja") {
        return false;
      }

      if (activeTab === "tampilan" && item.jenisPengaturan !== "Tampilan Usaha") {
        return false;
      }

      if (activeTab === "perlu-dicek" && item.statusPengaturan !== "Perlu dicek") {
        return false;
      }

      if (filters.jenisPengaturan !== "Semua jenis pengaturan" && item.jenisPengaturan !== filters.jenisPengaturan) {
        return false;
      }

      if (filters.status !== "Semua status" && item.statusPengaturan !== filters.status) {
        return false;
      }

      if (filters.usahaCabang !== "Semua usaha / cabang") {
        const usaha = businessDirectory.find((business) => business.id === item.usahaId);
        const cabang = usaha?.daftarCabang.find((branch) => branch.id === item.cabangId);
        const matched = usaha?.namaUsaha === filters.usahaCabang || cabang?.namaCabang === filters.usahaCabang;

        if (!matched) {
          return false;
        }
      }

      if (!searchLower) {
        return true;
      }

      return [
        item.namaPengaturan,
        item.jenisPengaturan,
        item.namaPeran,
        item.namaTemplate,
        item.isiTemplate,
        item.nomorDokumenOtomatis,
        item.formatNamaFile,
        item.nilaiLulus,
        item.durasiTes,
        item.logoUsaha,
        item.warnaUtama,
        item.previewDokumen,
        item.catatanAdmin,
        item.daftarAkses?.join(" "),
        item.variabelTemplate?.join(" "),
        item.daftarItem.map((entry) => `${entry.label} ${entry.ringkasan} ${entry.detail}`).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, search]);

  const groupedSettings = useMemo(() => {
    const order = ["Hak Akses", "Pesan & Pemberitahuan", "Dokumen", "Tes Kerja", "Tampilan Usaha"];

    return order
      .map((jenisPengaturan) => ({
        jenisPengaturan,
        items: filteredSettings.filter((item) => item.jenisPengaturan === jenisPengaturan),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredSettings]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Pengaturan"
            subtitle="Pusat kontrol sistem untuk atur hak akses, pesan, dokumen, tes kerja, dan tampilan usaha dengan bahasa yang mudah dipahami."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Simpan Perubahan
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Eye className="mr-2 h-4 w-4" />
              Lihat Pengaturan Utama
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari jenis pengaturan, template, akses pengguna, nomor dokumen, atau tampilan usaha"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect
            value={filters.jenisPengaturan}
            onChange={(event) => handleFilterChange("jenisPengaturan", event.target.value)}
            options={filterOptions.jenisPengaturan}
          />
          <FilterSelect value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)} options={filterOptions.status} />
          <FilterSelect
            value={filters.usahaCabang}
            onChange={(event) => handleFilterChange("usahaCabang", event.target.value)}
            options={filterOptions.usahaCabang}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <SupabaseConnectionCard />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {settingsQuickTabs.map((tab) => {
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
        {groupedSettings.map((group) => (
          <div key={group.jenisPengaturan} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                {(() => {
                  const Icon = blockIcons[group.jenisPengaturan] || Settings2;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">{group.items[0].namaPengaturan}</div>
                <div className="text-sm text-slate-500">
                  {group.jenisPengaturan === "Hak Akses" && "Atur siapa yang boleh buka menu dan cabang tertentu."}
                  {group.jenisPengaturan === "Pesan & Pemberitahuan" && "Siapkan pesan WhatsApp dan pemberitahuan yang sering dipakai."}
                  {group.jenisPengaturan === "Dokumen" && "Atur template surat, nomor dokumen, dan arsip supaya tetap rapi."}
                  {group.jenisPengaturan === "Tes Kerja" && "Atur nilai lulus, durasi, dan aturan tes per posisi."}
                  {group.jenisPengaturan === "Tampilan Usaha" && "Atur logo, warna utama, dan tampilan dokumen usaha."}
                </div>
              </div>
            </div>

            {group.items.map((item) => {
              const usaha = businessDirectory.find((business) => business.id === item.usahaId);
              const cabang = usaha?.daftarCabang.find((branch) => branch.id === item.cabangId);

              return (
                <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start gap-3">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">{item.namaPengaturan}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {usaha?.namaUsaha}
                              {cabang ? ` • ${cabang.namaCabang}` : " • Semua cabang"}
                            </div>
                          </div>
                          <StatusBadge value={item.statusPengaturan} />
                          {item.statusAktif && <StatusBadge value={item.statusAktif} />}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {item.jenisPengaturan === "Hak Akses" && (
                            <>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Peran utama: {item.namaPeran}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Siapa yang boleh akses: {item.daftarItem.length} peran utama</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Usaha / cabang: {usaha?.namaUsaha}</div>
                              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Perlu dicek: akses supervisor dan pengguna lain</div>
                            </>
                          )}

                          {item.jenisPengaturan === "Pesan & Pemberitahuan" && (
                            <>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Pesan WhatsApp siap pakai: {item.daftarItem.filter((entry) => entry.status === "Dipakai").length}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Variabel otomatis: {item.variabelTemplate.join(", ")}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Template aktif: {item.statusAktif}</div>
                              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Perlu dicek: pesan hasil seleksi belum seragam</div>
                            </>
                          )}

                          {item.jenisPengaturan === "Dokumen" && (
                            <>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Template surat: siap dipakai</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Nomor dokumen: {item.nomorDokumenOtomatis}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Format nama file: {item.formatNamaFile}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Arsip dokumen: tersimpan rapi</div>
                            </>
                          )}

                          {item.jenisPengaturan === "Tes Kerja" && (
                            <>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Aturan tes: sudah disiapkan</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Nilai lulus: {item.nilaiLulus}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Durasi tes: {item.durasiTes}</div>
                              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Perlu dicek: nilai lulus kurir dan gudang</div>
                            </>
                          )}

                          {item.jenisPengaturan === "Tampilan Usaha" && (
                            <>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Logo usaha: {item.logoUsaha}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Warna utama: {item.warnaUtama}</div>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Nama usaha di dokumen: {usaha?.namaUsaha}</div>
                              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Perlu dicek: tampilan slip dan laporan belum seragam</div>
                            </>
                          )}
                        </div>

                        <div className="space-y-3">
                          {item.daftarItem.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-slate-900">{entry.label}</div>
                                  <div className="mt-1 text-sm text-slate-500">{entry.ringkasan}</div>
                                  <div className="mt-2 text-sm text-slate-600">{entry.detail}</div>
                                </div>
                                <StatusBadge value={entry.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[250px] xl:justify-end">
                        <Button variant="outline" className="rounded-xl" onClick={() => setSelectedSetting(item)}>
                          Lihat detail
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          {item.jenisPengaturan === "Hak Akses" && "Atur akses"}
                          {item.jenisPengaturan === "Pesan & Pemberitahuan" && "Ubah template"}
                          {item.jenisPengaturan === "Dokumen" && "Ubah template"}
                          {item.jenisPengaturan === "Tes Kerja" && "Ubah aturan"}
                          {item.jenisPengaturan === "Tampilan Usaha" && "Ubah tampilan"}
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          {item.jenisPengaturan === "Hak Akses" && "Tambah pengguna"}
                          {item.jenisPengaturan === "Pesan & Pemberitahuan" && "Simpan"}
                          {item.jenisPengaturan === "Dokumen" && "Lihat contoh"}
                          {item.jenisPengaturan === "Tes Kerja" && "Simpan"}
                          {item.jenisPengaturan === "Tampilan Usaha" && "Simpan pengaturan"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Dipakai oleh modul utama</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Pengaturan ini jadi dasar untuk akses user, pesan WhatsApp, dokumen, tes kerja, slip, dan laporan di semua modul utama.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {settingsModuleLinks.map((item) => (
                <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Struktur data pengaturan</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Field ini disiapkan supaya pengaturan sistem bisa dipakai konsisten oleh semua menu utama.</div>
            <div className="mt-4 grid gap-2">
              {settingsDataFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {field}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSetting && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedSetting.namaPengaturan}</div>
                <div className="mt-1 text-sm text-slate-500">Detail pengaturan</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSetting(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedSetting.statusPengaturan} />
                {selectedSetting.statusAktif && <StatusBadge value={selectedSetting.statusAktif} />}
              </div>

              {selectedSetting.jenisPengaturan === "Hak Akses" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama pengguna / peran: {selectedSetting.namaPeran}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status aktif: {selectedSetting.statusAktif}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Usaha / cabang yang bisa dibuka: sesuai pembagian akses per peran</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Menu yang bisa diakses: rekrutmen, administrasi, penggajian, laporan sesuai peran</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-800">Daftar akses</div>
                    <div className="mt-3 space-y-2">
                      {selectedSetting.daftarAkses.map((entry) => (
                        <div key={entry} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          {entry}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedSetting.jenisPengaturan === "Pesan & Pemberitahuan" && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama template: {selectedSetting.namaTemplate}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status aktif: {selectedSetting.statusAktif}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-800">Isi pesan</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{selectedSetting.isiTemplate}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-800">Variabel otomatis</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSetting.variabelTemplate.map((entry) => (
                        <span key={entry} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                          {entry}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedSetting.jenisPengaturan === "Dokumen" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jenis template: {selectedSetting.namaTemplate}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Format nomor dokumen: {selectedSetting.nomorDokumenOtomatis}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Contoh hasil: {selectedSetting.previewDokumen}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status aktif: {selectedSetting.statusAktif}</div>
                </div>
              )}

              {selectedSetting.jenisPengaturan === "Tes Kerja" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama tes / posisi: {selectedSetting.namaTemplate}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nilai lulus: {selectedSetting.nilaiLulus}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Durasi: {selectedSetting.durasiTes}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Aturan penilaian: bobot nilai dasar dan nilai posisi</div>
                </div>
              )}

              {selectedSetting.jenisPengaturan === "Tampilan Usaha" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Logo: {selectedSetting.logoUsaha}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Warna utama: {selectedSetting.warnaUtama}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Nama usaha: {businessDirectory.find((business) => business.id === selectedSetting.usahaId)?.namaUsaha}
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Preview surat / slip / laporan: {selectedSetting.previewDokumen}</div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan admin</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedSetting.catatanAdmin}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
