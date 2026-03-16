import { useMemo, useState } from "react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { pipelineStages } from "@/data";

const attentionStyles = {
  "Belum ditindaklanjuti": "border-amber-200 bg-amber-50 text-amber-700",
  "Sudah lama di tahap ini": "border-rose-200 bg-rose-50 text-rose-700",
  "Menunggu hasil": "border-sky-200 bg-sky-50 text-sky-700",
  "Perlu dicek": "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function PipelinePage() {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [showTestStage, setShowTestStage] = useState(true);
  const pipelineCandidates = [];

  const filterOptions = useMemo(
    () => ({
      positions: [...new Set(pipelineCandidates.map((item) => item.posisiDilamar))],
      jobs: [...new Set(pipelineCandidates.map((item) => item.lowonganId))],
      companies: [...new Set(pipelineCandidates.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      stages: pipelineStages.map((item) => item.title),
      owners: [...new Set(pipelineCandidates.map((item) => item.penanggungJawab))],
    }),
    [pipelineCandidates],
  );

  const visibleStages = useMemo(
    () =>
      pipelineStages.filter((stage) => {
        if (stage.key === "lanjut-tes" && !showTestStage) {
          return false;
        }

        return stage.enabled;
      }),
    [showTestStage],
  );

  const filteredCandidates = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return pipelineCandidates.filter((item) => {
      const stageTitle = pipelineStages.find((stage) => stage.key === item.tahapSaatIni)?.title || "";
      const matchesSearch =
        !searchTerm ||
        [item.namaPelamar, item.posisiDilamar, item.namaUsaha, item.namaCabang, item.penanggungJawab, item.catatanSingkat]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesPosition = !positionFilter || item.posisiDilamar === positionFilter;
      const matchesJob = !jobFilter || item.lowonganId === jobFilter;
      const matchesCompany = !companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter;
      const matchesStage = !stageFilter || stageTitle === stageFilter;
      const matchesOwner = !ownerFilter || item.penanggungJawab === ownerFilter;

      return matchesSearch && matchesPosition && matchesJob && matchesCompany && matchesStage && matchesOwner;
    });
  }, [companyFilter, jobFilter, ownerFilter, pipelineCandidates, positionFilter, search, stageFilter]);

  const summaryCards = useMemo(() => {
    const total = pipelineCandidates.length;
    const newApplicants = pipelineCandidates.filter((item) => item.tahapSaatIni === "pelamar-masuk").length;
    const inProgress = pipelineCandidates.filter((item) =>
      ["lolos-seleksi-awal", "lanjut-tes", "wawancara"].includes(item.tahapSaatIni),
    ).length;
    const waitingInterview = pipelineCandidates.filter((item) => item.tahapSaatIni === "wawancara").length;
    const offering = pipelineCandidates.filter((item) => item.tahapSaatIni === "penawaran-kerja").length;
    const hired = pipelineCandidates.filter((item) => item.tahapSaatIni === "diterima").length;

    return [
      { label: "Total pelamar", value: String(total), note: "Semua pelamar yang masih tercatat di papan alur." },
      { label: "Pelamar baru", value: String(newApplicants), note: "Baru masuk dan perlu segera ditindaklanjuti." },
      { label: "Sedang diproses", value: String(inProgress), note: "Masih berjalan di tahap seleksi, tes, atau wawancara." },
      { label: "Menunggu wawancara", value: String(waitingInterview), note: "Sudah masuk tahap wawancara dan menunggu hasil." },
      { label: "Penawaran kerja", value: String(offering), note: "Sudah masuk tahap akhir sebelum diterima." },
      { label: "Diterima", value: String(hired), note: "Sudah siap lanjut ke proses masuk kerja." },
    ];
  }, [pipelineCandidates]);

  const groupedCandidates = useMemo(
    () =>
      visibleStages.map((stage) => ({
        ...stage,
        items: filteredCandidates.filter((item) => item.tahapSaatIni === stage.key),
      })),
    [filteredCandidates, visibleStages],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Alur Pelamar"
        subtitle="Papan kerja untuk melihat perjalanan pelamar dari awal masuk sampai diterima kerja, agar tim mudah tahu siapa ada di tahap mana."
      />

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Filter alur pelamar</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl">
                Lihat semua pelamar
              </Button>
              <Button className="rounded-2xl">Pindah tahap</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama pelamar, posisi, usaha, atau penanggung jawab..."
            className="rounded-2xl border-slate-200"
          />
          <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
          <FilterSelect value={jobFilter} onChange={setJobFilter} options={filterOptions.jobs} placeholder="Semua lowongan" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / UMKM" />
          <FilterSelect value={stageFilter} onChange={setStageFilter} options={filterOptions.stages} placeholder="Semua tahap" />
          <FilterSelect value={ownerFilter} onChange={setOwnerFilter} options={filterOptions.owners} placeholder="Semua penanggung jawab" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {summaryCards.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium text-slate-900">Pengaturan alur</div>
            <div className="text-sm text-slate-500">Tahap tes bisa ditampilkan atau disembunyikan sesuai proses rekrutmen yang dipakai.</div>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={() => setShowTestStage((current) => !current)}>
            {showTestStage ? "Sembunyikan tahap tes" : "Tampilkan tahap tes"}
          </Button>
        </CardContent>
      </Card>

      {pipelineCandidates.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-900">Belum ada data alur pelamar</div>
            <div className="max-w-2xl text-sm leading-6 text-slate-500">
              Data dummy untuk menu ini sudah dihapus. Nanti halaman ini bisa dipakai kembali saat alur pelamar
              sudah dihubungkan ke data kandidat asli dari proses screening, tes, dan wawancara.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-6">
            {groupedCandidates
              .filter((stage) => stage.isMain)
              .map((stage) => (
                <Card key={stage.key} className="rounded-2xl border-slate-200 bg-slate-50/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{stage.title}</div>
                      <Badge variant="outline">{stage.items.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {stage.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                          <div className="font-medium text-slate-900">{item.namaPelamar}</div>
                          <div className="mt-1 text-slate-500">
                            {item.posisiDilamar} / {item.namaUsaha} / {item.namaCabang}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">Masuk: {formatDate(item.tanggalMasuk)}</div>
                          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{item.catatanSingkat}</div>
                          {item.alasanStatus ? (
                            <div className="mt-2">
                              <Badge
                                className={`rounded-full border ${attentionStyles[item.alasanStatus] || "border-slate-200 bg-slate-50 text-slate-700"}`}
                              >
                                {item.alasanStatus}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {groupedCandidates
              .filter((stage) => !stage.isMain)
              .map((stage) => (
                <Card key={stage.key} className="rounded-2xl border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{stage.title}</div>
                      <Badge variant="outline">{stage.items.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {stage.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                          <div className="font-medium text-slate-900">{item.namaPelamar}</div>
                          <div className="mt-1 text-slate-500">
                            {item.posisiDilamar} / {item.namaUsaha} / {item.namaCabang}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">Penanggung jawab: {item.penanggungJawab}</div>
                          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{item.catatanSingkat}</div>
                          <div className="mt-2">
                            <Badge className={`rounded-full border ${attentionStyles[item.alasanStatus] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                              {item.alasanStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
