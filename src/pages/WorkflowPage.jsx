import { useMemo, useState } from "react";
import { BookOpen, Briefcase, Building2, CheckCircle2, CircleAlert, Search, Settings2, Users, Wallet, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { workflowDataFields, workflowDirectory, workflowModuleLinks, workflowQuickTabs } from "@/data";

const emptyFilters = {
  jenisProses: "Semua jenis proses",
  divisiMenu: "Semua divisi / menu",
  statusAlur: "Semua status",
  penanggungJawab: "Semua penanggung jawab",
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

const categoryIcons = {
  Rekrutmen: Briefcase,
  Administrasi: Users,
  Penggajian: Wallet,
  "Pengelolaan Sistem": Settings2,
};

export default function WorkflowPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedFlow, setSelectedFlow] = useState(null);

  const filterOptions = useMemo(() => {
    const jenisProses = ["Semua jenis proses", ...new Set(workflowDirectory.map((item) => item.kategoriAlur))];
    const divisiMenu = ["Semua divisi / menu", ...new Set(workflowDirectory.flatMap((item) => item.menuTerkait))];
    const statusAlur = ["Semua status", "Aktif", "Perlu dicek", "Sedang dipakai", "Selesai"];
    const penanggungJawab = ["Semua penanggung jawab", ...new Set(workflowDirectory.map((item) => item.penanggungJawab))];

    return { jenisProses, divisiMenu, statusAlur, penanggungJawab };
  }, []);

  const summaryCards = useMemo(() => {
    const total = workflowDirectory.length;
    const rekrutmen = workflowDirectory.filter((item) => item.kategoriAlur === "Rekrutmen").length;
    const administrasi = workflowDirectory.filter((item) => item.kategoriAlur === "Administrasi").length;
    const penggajian = workflowDirectory.filter((item) => item.kategoriAlur === "Penggajian").length;
    const perluDicek = workflowDirectory.filter((item) => item.statusAlur === "Perlu dicek").length;
    const seringDipakai = workflowDirectory.filter((item) => item.statusAlur === "Sedang dipakai" || item.statusAlur === "Aktif").length;

    return [
      { label: "Total alur kerja", value: total, note: "Semua panduan kerja utama ada di satu tempat.", icon: BookOpen, tone: "slate" },
      { label: "Rekrutmen", value: rekrutmen, note: "Urutan cari orang sampai siap mulai kerja.", icon: Briefcase, tone: "sky" },
      { label: "Administrasi", value: administrasi, note: "Alur data karyawan, kontrak, surat, dan proses keluar.", icon: Users, tone: "emerald" },
      { label: "Penggajian", value: penggajian, note: "Urutan kerja gaji dari data masuk sampai slip terkirim.", icon: Wallet, tone: "sky" },
      { label: "Perlu dicek", value: perluDicek, note: "Ada alur yang masih perlu perhatian supaya tidak macet.", icon: CircleAlert, tone: "amber" },
      { label: "Sering dipakai", value: seringDipakai, note: "Alur yang paling sering dibuka untuk operasional harian.", icon: CheckCircle2, tone: "emerald" },
    ];
  }, []);

  const filteredFlows = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return workflowDirectory.filter((item) => {
      if (activeTab === "rekrutmen" && item.kategoriAlur !== "Rekrutmen") {
        return false;
      }

      if (activeTab === "administrasi" && item.kategoriAlur !== "Administrasi") {
        return false;
      }

      if (activeTab === "penggajian" && item.kategoriAlur !== "Penggajian") {
        return false;
      }

      if (activeTab === "perlu-dicek" && item.statusAlur !== "Perlu dicek") {
        return false;
      }

      if (filters.jenisProses !== "Semua jenis proses" && item.kategoriAlur !== filters.jenisProses) {
        return false;
      }

      if (filters.divisiMenu !== "Semua divisi / menu" && !item.menuTerkait.includes(filters.divisiMenu)) {
        return false;
      }

      if (filters.statusAlur !== "Semua status" && item.statusAlur !== filters.statusAlur) {
        return false;
      }

      if (filters.penanggungJawab !== "Semua penanggung jawab" && item.penanggungJawab !== filters.penanggungJawab) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [
        item.namaAlur,
        item.tujuanAlur,
        item.penanggungJawab,
        item.hasilAkhir,
        item.catatanPenting,
        item.langkahSeringTerlambat,
        item.menuTerkait.join(" "),
        item.dataYangDibutuhkan.join(" "),
        item.daftarLangkah.map((step) => `${step.namaLangkah} ${step.siapaMengerjakan} ${step.yangPerluDisiapkan}`).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, search]);

  const visibleFlows = useMemo(() => {
    if (activeTab === "panduan-singkat") {
      return filteredFlows.map((item) => ({
        ...item,
        daftarLangkah: item.daftarLangkah.slice(0, 3),
      }));
    }

    return filteredFlows;
  }, [activeTab, filteredFlows]);

  const groupedFlows = useMemo(() => {
    const order = ["Rekrutmen", "Administrasi", "Penggajian", "Pengelolaan Sistem"];

    return order
      .map((kategori) => ({
        kategori,
        items: visibleFlows.filter((item) => item.kategoriAlur === kategori),
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleFlows]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Alur Kerja"
            subtitle="Pusat panduan kerja operasional di aplikasi. Dari sini user bisa paham urutan kerja, siapa yang mengerjakan, apa yang perlu disiapkan, dan hasil akhirnya."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <BookOpen className="mr-2 h-4 w-4" />
              Lihat Semua Alur
            </Button>
            <Button variant="outline" className="rounded-xl">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Buka Panduan
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama alur, langkah kerja, data yang perlu disiapkan, atau menu terkait"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.jenisProses} onChange={(event) => handleFilterChange("jenisProses", event.target.value)} options={filterOptions.jenisProses} />
          <FilterSelect value={filters.divisiMenu} onChange={(event) => handleFilterChange("divisiMenu", event.target.value)} options={filterOptions.divisiMenu} />
          <FilterSelect value={filters.statusAlur} onChange={(event) => handleFilterChange("statusAlur", event.target.value)} options={filterOptions.statusAlur} />
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
          {workflowQuickTabs.map((tab) => {
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
        {groupedFlows.map((group) => (
          <div key={group.kategori} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                {(() => {
                  const Icon = categoryIcons[group.kategori] || BookOpen;
                  return <Icon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {group.kategori === "Pengelolaan Sistem" ? "Alur Pengelolaan Sistem" : `Alur ${group.kategori}`}
                </div>
                <div className="text-sm text-slate-500">Urutan kerja utama yang paling sering dibuka untuk kategori ini.</div>
              </div>
            </div>

            {group.items.map((item) => (
              <Card key={item.id} className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{item.namaAlur}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500">{item.tujuanAlur}</div>
                        </div>
                        <StatusBadge value={item.statusAlur} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Siapa yang mengerjakan: {item.penanggungJawab}</div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          Yang perlu disiapkan: {item.dataYangDibutuhkan.slice(0, 2).join(", ")}
                          {item.dataYangDibutuhkan.length > 2 ? " dan lainnya" : ""}
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Hasil akhirnya: {item.hasilAkhir}</div>
                        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Sering terlambat: {item.langkahSeringTerlambat}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">Urutan kerja</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {activeTab === "panduan-singkat" ? "Panduan singkat untuk cepat paham alur utamanya." : "Langkah kerja dari awal sampai hasil akhirnya."}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {item.daftarLangkah.map((step, index) => (
                            <div key={step.id} className="rounded-xl border border-slate-200 p-3">
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-900">{step.namaLangkah}</div>
                                      <div className="text-sm text-slate-500">Siapa yang mengerjakan: {step.siapaMengerjakan}</div>
                                    </div>
                                  </div>
                                  <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                    <div className="rounded-xl bg-slate-50 p-3">Yang perlu disiapkan: {step.yangPerluDisiapkan}</div>
                                    <div className="rounded-xl bg-slate-50 p-3">Hasil akhirnya: {step.hasilLangkah}</div>
                                  </div>
                                </div>
                                <StatusBadge value={step.statusLangkah} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFlow(item)}>
                        Lihat detail
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFlow(item)}>
                        Buka langkah
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        Tandai selesai
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Terhubung ke semua menu utama</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Halaman ini jadi peta induk cara kerja aplikasi, jadi user bisa cepat tahu menu mana yang dibuka setelah satu langkah selesai.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflowModuleLinks.map((item) => (
                <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Struktur data alur</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Field ini disiapkan supaya alur kerja bisa dipakai sebagai panduan lintas menu dan tetap konsisten.</div>
            <div className="mt-4 grid gap-2">
              {workflowDataFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {field}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedFlow && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selectedFlow.namaAlur}</div>
                <div className="mt-1 text-sm text-slate-500">Detail alur kerja</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFlow(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedFlow.statusAlur} />
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{selectedFlow.kategoriAlur}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama alur: {selectedFlow.namaAlur}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Tujuan alur: {selectedFlow.tujuanAlur}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Siapa yang mengerjakan: {selectedFlow.penanggungJawab}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Hasil akhir: {selectedFlow.hasilAkhir}</div>
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">Langkah yang sering terlambat: {selectedFlow.langkahSeringTerlambat}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Catatan penting: {selectedFlow.catatanPenting}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Dokumen / data yang dibutuhkan</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFlow.dataYangDibutuhkan.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Langkah 1 sampai selesai</div>
                <div className="mt-4 space-y-3">
                  {selectedFlow.daftarLangkah.map((step, index) => (
                    <div key={step.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{step.namaLangkah}</div>
                              <div className="text-sm text-slate-500">Siapa yang mengerjakan: {step.siapaMengerjakan}</div>
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Yang perlu disiapkan: {step.yangPerluDisiapkan}</div>
                          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Hasil akhirnya: {step.hasilLangkah}</div>
                        </div>
                        <StatusBadge value={step.statusLangkah} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Menu terkait yang bisa dibuka</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFlow.menuTerkait.map((item) => (
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
