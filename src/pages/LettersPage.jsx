import { useMemo, useState } from "react";
import {
  Archive,
  FilePlus2,
  FileText,
  Megaphone,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { documentAutoFeatures, documentDataFields, documentDirectory, documentModuleLinks, documentQuickTabs } from "@/data";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const emptyFilters = {
  jenisDokumen: "Semua jenis dokumen",
  usaha: "Semua cabang",
  namaKaryawan: "Semua karyawan",
  statusDokumen: "Semua status dokumen",
  periodeTanggal: "Semua periode",
};

function formatDate(value) {
  if (!value || value === "-") {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function matchQuickTab(item, tabKey) {
  switch (tabKey) {
    case "surat-karyawan":
      return item.kategoriDokumen === "surat";
    case "pengumuman":
      return item.kategoriDokumen === "pengumuman";
    case "belum-selesai":
      return item.statusDokumen === "Belum dibuat" || item.statusDokumen === "Sedang dibuat";
    case "sudah-dikirim":
      return item.statusDokumen === "Sudah dikirim";
    case "arsip":
      return item.statusDokumen === "Sudah diarsipkan";
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

export default function LettersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const filterOptions = useMemo(() => {
    const jenisDokumen = ["Semua jenis dokumen", ...new Set(documentDirectory.map((item) => item.jenisDokumen))];
    const usaha = ["Semua cabang", ...new Set(documentDirectory.map((item) => item.namaCabang))];
    const namaKaryawan = ["Semua karyawan", ...new Set(documentDirectory.map((item) => item.namaKaryawan).filter(Boolean))];
    const statusDokumen = ["Semua status dokumen", "Belum dibuat", "Sedang dibuat", "Siap dikirim", "Sudah dikirim", "Sudah diarsipkan"];
    const periodeTanggal = ["Semua periode", ...new Set(documentDirectory.map((item) => formatDate(item.tanggalDibuat)))];

    return { jenisDokumen, usaha, namaKaryawan, statusDokumen, periodeTanggal };
  }, []);

  const summaryCards = useMemo(() => {
    const total = documentDirectory.length;
    const belumSelesai = documentDirectory.filter((item) => item.statusDokumen === "Belum dibuat" || item.statusDokumen === "Sedang dibuat").length;
    const siapDikirim = documentDirectory.filter((item) => item.statusDokumen === "Siap dikirim").length;
    const sudahDikirim = documentDirectory.filter((item) => item.statusDokumen === "Sudah dikirim").length;
    const sudahDiarsipkan = documentDirectory.filter((item) => item.statusDokumen === "Sudah diarsipkan").length;
    const menempel = documentDirectory.filter((item) => item.menempelKeDataKaryawan).length;

    return [
      { label: "Total dokumen", value: total, note: "Surat kerja dan pengumuman internal ada di satu tempat.", icon: FileText, tone: "slate" },
      { label: "Belum selesai", value: belumSelesai, note: "Masih ada draft yang perlu dirapikan atau dilengkapi.", icon: FilePlus2, tone: "amber" },
      { label: "Siap dikirim", value: siapDikirim, note: "Dokumen sudah siap dan tinggal dikirim ke pihak terkait.", icon: Send, tone: "sky" },
      { label: "Sudah dikirim", value: sudahDikirim, note: "Dokumen sudah dibagikan ke karyawan atau cabang terkait.", icon: Megaphone, tone: "emerald" },
      { label: "Sudah diarsipkan", value: sudahDiarsipkan, note: "Dokumen final sudah rapi masuk arsip.", icon: Archive, tone: "emerald" },
      { label: "Menempel ke data karyawan", value: menempel, note: "Dokumen penting bisa langsung masuk ke profil karyawan.", icon: Users, tone: "sky" },
    ];
  }, []);

  const quickTabCounts = useMemo(
    () => Object.fromEntries(documentQuickTabs.map((tab) => [tab.key, documentDirectory.filter((item) => matchQuickTab(item, tab.key)).length])),
    [],
  );

  const filteredDocuments = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return documentDirectory.filter((item) => {
      if (!matchQuickTab(item, activeTab)) {
        return false;
      }

      if (filters.jenisDokumen !== "Semua jenis dokumen" && item.jenisDokumen !== filters.jenisDokumen) {
        return false;
      }

      if (filters.usaha !== "Semua cabang" && item.namaCabang !== filters.usaha) {
        return false;
      }

      if (filters.namaKaryawan !== "Semua karyawan" && item.namaKaryawan !== filters.namaKaryawan) {
        return false;
      }

      if (filters.statusDokumen !== "Semua status dokumen" && item.statusDokumen !== filters.statusDokumen) {
        return false;
      }

      if (filters.periodeTanggal !== "Semua periode" && formatDate(item.tanggalDibuat) !== filters.periodeTanggal) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [item.jenisDokumen, item.namaKaryawan, item.namaCabang, item.nomorSurat, item.penanggungJawab, item.judulDokumen]
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
            title="Surat & Pengumuman"
            subtitle="Pusat untuk membuat, menyimpan, mengirim, dan mengarsipkan surat kerja maupun pengumuman internal agar semua dokumen tetap rapi dan mudah dicari."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <FileText className="mr-2 h-4 w-4" />
              Buat Surat
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Megaphone className="mr-2 h-4 w-4" />
              Buat Pengumuman
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari jenis dokumen, nama karyawan, cabang, nomor surat, atau penanggung jawab"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect
            value={filters.jenisDokumen}
            onChange={(event) => handleFilterChange("jenisDokumen", event.target.value)}
            options={filterOptions.jenisDokumen}
          />
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect
            value={filters.namaKaryawan}
            onChange={(event) => handleFilterChange("namaKaryawan", event.target.value)}
            options={filterOptions.namaKaryawan}
          />
          <FilterSelect
            value={filters.statusDokumen}
            onChange={(event) => handleFilterChange("statusDokumen", event.target.value)}
            options={filterOptions.statusDokumen}
          />
          <FilterSelect
            value={filters.periodeTanggal}
            onChange={(event) => handleFilterChange("periodeTanggal", event.target.value)}
            options={filterOptions.periodeTanggal}
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
          {documentQuickTabs.map((tab) => {
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
                <div className="text-lg font-semibold text-slate-900">Daftar surat dan pengumuman</div>
                <div className="text-sm text-slate-500">
                  {filteredDocuments.length} data ditemukan. Fokus utamanya dokumen yang perlu diselesaikan, dikirim, atau disimpan ke arsip.
                </div>
              </div>
              <div className="text-sm text-slate-500">Dokumen personal bisa menempel ke data karyawan, pengumuman tetap tersimpan per cabang atau usaha.</div>
            </div>

            <div className="space-y-3">
              {filteredDocuments.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{item.jenisDokumen}</div>
                          <div className="text-sm text-slate-500">
                            {item.namaKaryawan ? `${item.namaKaryawan} • ` : ""}
                            {item.namaCabang}
                          </div>
                        </div>
                        <StatusBadge value={item.statusDokumen} />
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Nomor surat</div>
                          <div className="mt-1 font-medium text-slate-700">{item.nomorSurat}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal dibuat</div>
                          <div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalDibuat)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status dokumen</div>
                          <div className="mt-1 font-medium text-slate-700">{item.statusDokumen}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Penanggung jawab</div>
                          <div className="mt-1 font-medium text-slate-700">{item.penanggungJawab}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedDocument(item)}>
                        Lihat detail
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Ubah
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Unduh PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Kirim
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Simpan ke arsip
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredDocuments.length === 0 && (
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
              <div className="text-lg font-semibold text-slate-900">Fitur yang membantu kerja harian</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Fitur ini disiapkan supaya owner dan admin tidak perlu bolak-balik bikin dokumen manual dari nol.
              </div>
              <div className="mt-4 space-y-3">
                {documentAutoFeatures.map((item) => (
                  <div key={item} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Terhubung ke modul lain</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Dokumen penting tidak berdiri sendiri. Setiap surat bisa dipakai lagi di alur administrasi lain saat dibutuhkan.
              </div>
              <div className="mt-4 space-y-3">
                {documentModuleLinks.map((item) => (
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
              <div className="text-lg font-semibold text-slate-900">Struktur data dokumen</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                Data ini mendukung surat kerja per karyawan dan pengumuman internal per cabang atau usaha.
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                {documentDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedDocument.judulDokumen}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedDocument.nomorSurat} • {selectedDocument.jenisDokumen}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocument(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedDocument.statusDokumen} />
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  {selectedDocument.kategoriDokumen === "surat" ? "Surat karyawan" : "Pengumuman"}
                </span>
              </div>

              {selectedDocument.kategoriDokumen === "surat" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-700">Data surat</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div>Jenis dokumen: {selectedDocument.jenisDokumen}</div>
                      <div>Nomor surat: {selectedDocument.nomorSurat}</div>
                      <div>Nama karyawan: {selectedDocument.namaKaryawan}</div>
                      <div>Jabatan: {selectedDocument.jabatan}</div>
                      <div>Cabang: {selectedDocument.namaCabang}</div>
                      <div>Tanggal dibuat: {formatDate(selectedDocument.tanggalDibuat)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-700">Isi dan file</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div>Isi ringkas: {selectedDocument.isiRingkas}</div>
                      <div>Status dokumen: {selectedDocument.statusDokumen}</div>
                      <div>File PDF: {selectedDocument.filePdf}</div>
                      <div>Menempel ke data karyawan: {selectedDocument.menempelKeDataKaryawan ? "Ya" : "Tidak"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-700">Data pengumuman</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div>Judul pengumuman: {selectedDocument.judulDokumen}</div>
                      <div>Ditujukan untuk: {selectedDocument.ditujukanUntuk}</div>
                      <div>Cabang mana: {selectedDocument.namaCabang}</div>
                      <div>Tanggal berlaku: {formatDate(selectedDocument.tanggalBerlaku)}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-700">Isi dan file</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div>Isi pengumuman: {selectedDocument.isiRingkas}</div>
                      <div>Status dokumen: {selectedDocument.statusDokumen}</div>
                      <div>File PDF: {selectedDocument.filePdf}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan HR / admin</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedDocument.catatanAdmin}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl">Kirim</Button>
                <Button variant="outline" className="rounded-xl">
                  Unduh PDF
                </Button>
                <Button variant="outline" className="rounded-xl">
                  Simpan ke arsip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
