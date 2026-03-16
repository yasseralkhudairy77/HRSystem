import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import HiringNeedPicker from "@/components/recruitment/HiringNeedPicker";
import JobVacancyForm, { createInitialJobForm } from "@/components/recruitment/JobVacancyForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getKebutuhanList, updateKebutuhan } from "@/services/kebutuhanService";
import { createLowongan, deleteLowongan, getLowonganList, updateLowongan } from "@/services/lowonganService";

const jobTabs = ["Semua", "Sedang dibuka", "Belum tayang", "Sudah cukup", "Sudah ditutup", "Arsip"];

function formatDate(dateString) {
  if (!dateString) {
    return "Belum diisi";
  }

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
      className="flex h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]"
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

function getApplicantIndicator(job) {
  if (job.statusLowongan === "Sudah cukup") {
    return { label: "Sudah cukup pelamar", className: "border-sky-200 bg-sky-50 text-sky-700" };
  }

  if (job.applicantsCount === 0) {
    return { label: "Belum ada pelamar", className: "border-slate-200 bg-slate-50 text-slate-600" };
  }

  if (job.applicantsCount <= 10) {
    return { label: "Pelamar masih sedikit", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }

  return { label: "Perlu dibagikan lagi", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function mapNeedToPickerItem(item) {
  const approvalStatus = item.status_persetujuan || "Belum diajukan";

  return {
    id: item.id,
    posisi: item.posisi || "",
    departemen: item.departemen || "",
    cabang: item.cabang || "",
    jumlahKebutuhan: item.jumlah_kebutuhan || 1,
    jenisKebutuhan: item.jenis_kebutuhan || "",
    statusKerja: item.status_kerja || "",
    tipeKerja: item.tipe_kerja || "",
    durasiKontrak: item.durasi_kontrak || "",
    gajiMin: item.gaji_min || "",
    gajiMax: item.gaji_max || "",
    pendidikanMinimal: item.pendidikan_min || "",
    pengalaman: item.pengalaman || "",
    skillUtama: item.skill || [],
    kriteriaTambahan: item.kriteria_tambahan || "",
    tesDiperlukan: item.tes_yang_diperlukan || [],
    alasanKebutuhan: item.alasan_kebutuhan || "",
    targetMulaiKerja: item.target_mulai_kerja || "",
    company: "HireUMKM Demo",
    statusPersetujuan: approvalStatus,
    lowonganSudahDibuat: item.lowongan_sudah_dibuat || false,
  };
}

function mapNeedToJobForm(need) {
  return createInitialJobForm({
    kebutuhanId: need.id,
    judulLowongan: need.posisi,
    posisi: need.posisi,
    departemen: need.departemen,
    cabang: need.cabang,
    jumlahKebutuhan: need.jumlahKebutuhan,
    statusKerja: need.statusKerja,
    tipeKerja: need.tipeKerja,
    durasiKontrak: need.durasiKontrak,
    gajiMin: need.gajiMin,
    gajiMax: need.gajiMax,
    pendidikanMin: need.pendidikanMinimal,
    pengalaman: need.pengalaman,
    skill: need.skillUtama || [],
    skillText: (need.skillUtama || []).join("\n"),
    kriteriaTambahan: need.kriteriaTambahan,
    tesYangDiperlukan: need.tesDiperlukan || [],
    deskripsiPekerjaan: need.alasanKebutuhan,
    ringkasanIklan: `Kami membuka posisi ${need.posisi} untuk mendukung operasional ${need.company || "perusahaan"} di ${need.cabang || "lokasi kerja"}.`,
    tanggungJawab: need.alasanKebutuhan || "",
    tentangPerusahaan: `${need.company || "Perusahaan"} sedang membuka kebutuhan ${need.posisi} untuk penempatan ${need.cabang || "sesuai kebutuhan operasional"}.`,
    lokasiKerja: need.cabang,
    companyName: need.company || "HireUMKM Demo",
    tanggalTayang: "",
    tanggalTutup: need.targetMulaiKerja || "",
  });
}

function mapLowonganRow(item) {
  return {
    id: item.id,
    kebutuhanId: item.kebutuhan_id || null,
    judulLowongan: item.judul_lowongan,
    posisi: item.posisi,
    departemen: item.departemen || "",
    cabang: item.cabang || "",
    companyName: item.company_name || "HireUMKM Demo",
    jumlahKebutuhan: item.jumlah_kebutuhan || 1,
    statusKerja: item.status_kerja || "",
    tipeKerja: item.tipe_kerja || "",
    durasiKontrak: item.durasi_kontrak || "",
    gajiMin: item.gaji_min || "",
    gajiMax: item.gaji_max || "",
    pendidikanMin: item.pendidikan_min || "",
    pengalaman: item.pengalaman || "",
    skill: item.skill || [],
    skillText: item.skill_text || (item.skill || []).join("\n"),
    kriteriaTambahan: item.kriteria_tambahan || "",
    deskripsiPekerjaan: item.deskripsi_pekerjaan || "",
    ringkasanIklan: item.ringkasan_iklan || "",
    tanggungJawab: item.tanggung_jawab || "",
    tentangPerusahaan: item.tentang_perusahaan || "",
    lokasiKerja: item.lokasi_kerja || "",
    benefit: item.benefit || "",
    caraMelamar: item.cara_melamar || "",
    statusLowongan: item.status_lowongan || "Belum tayang",
    tanggalTayang: item.tanggal_tayang || "",
    tanggalTutup: item.tanggal_tutup || "",
    applicantsCount: item.applicants_count || 0,
    sourceType: item.source_type || "manual",
    personInCharge: item.person_in_charge || "-",
    tests: item.tes_yang_diperlukan || [],
    archived: item.archived || false,
    raw: item,
  };
}

function mapJobToForm(job) {
  return createInitialJobForm({
    kebutuhanId: job.kebutuhanId,
    companyName: job.companyName,
    judulLowongan: job.judulLowongan,
    posisi: job.posisi,
    departemen: job.departemen,
    cabang: job.cabang,
    jumlahKebutuhan: job.jumlahKebutuhan,
    statusKerja: job.statusKerja,
    tipeKerja: job.tipeKerja,
    durasiKontrak: job.durasiKontrak,
    gajiMin: job.gajiMin,
    gajiMax: job.gajiMax,
    pendidikanMin: job.pendidikanMin,
    pengalaman: job.pengalaman,
    skill: job.skill || [],
    skillText: job.skillText || (job.skill || []).join("\n"),
    kriteriaTambahan: job.kriteriaTambahan,
    tesYangDiperlukan: job.tests || [],
    deskripsiPekerjaan: job.deskripsiPekerjaan,
    ringkasanIklan: job.ringkasanIklan,
    tanggungJawab: job.tanggungJawab,
    tentangPerusahaan: job.tentangPerusahaan,
    lokasiKerja: job.lokasiKerja,
    benefit: job.benefit,
    caraMelamar: job.caraMelamar,
    statusLowongan: job.statusLowongan,
    tanggalTayang: job.tanggalTayang,
    tanggalTutup: job.tanggalTutup,
    createdBy: job.personInCharge,
  });
}

function mapFormPayloadToLowonganInsert(payload, editingJobId = null) {
  return {
    kebutuhan_id: payload.kebutuhanId ? Number(payload.kebutuhanId) : null,
    judul_lowongan: payload.judulLowongan,
    posisi: payload.posisi,
    departemen: payload.departemen || null,
    cabang: payload.cabang || null,
    company_name: payload.companyName || "HireUMKM Demo",
    jumlah_kebutuhan: Number(payload.jumlahKebutuhan) || 1,
    status_kerja: payload.statusKerja || null,
    tipe_kerja: payload.tipeKerja || null,
    durasi_kontrak: payload.durasiKontrak || null,
    gaji_min: payload.gajiMin ? Number(payload.gajiMin) : null,
    gaji_max: payload.gajiMax ? Number(payload.gajiMax) : null,
    pendidikan_min: payload.pendidikanMin || null,
    pengalaman: payload.pengalaman || null,
    skill: payload.skill || [],
    skill_text: payload.skillText || null,
    kriteria_tambahan: payload.kriteriaTambahan || null,
    tes_yang_diperlukan: payload.tesYangDiperlukan || [],
    deskripsi_pekerjaan: payload.deskripsiPekerjaan || null,
    ringkasan_iklan: payload.ringkasanIklan || null,
    tanggung_jawab: payload.tanggungJawab || null,
    tentang_perusahaan: payload.tentangPerusahaan || null,
    lokasi_kerja: payload.lokasiKerja || null,
    benefit: payload.benefit || null,
    cara_melamar: payload.caraMelamar || null,
    status_lowongan: payload.statusLowongan || "Belum tayang",
    tanggal_tayang: payload.tanggalTayang || null,
    tanggal_tutup: payload.tanggalTutup || null,
    applicants_count: editingJobId ? undefined : 0,
    source_type: payload.kebutuhanId ? "fromHiringNeed" : "manual",
    person_in_charge: payload.createdBy || "Nisa Purnama",
  };
}

export default function JobsPage() {
  const [jobRows, setJobRows] = useState([]);
  const [availableHiringNeeds, setAvailableHiringNeeds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [picFilter, setPicFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [viewMode, setViewMode] = useState("list");
  const [isNeedPickerOpen, setIsNeedPickerOpen] = useState(false);
  const [jobForm, setJobForm] = useState(createInitialJobForm());
  const [formSourceLabel, setFormSourceLabel] = useState("Buat manual");
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [lowonganResult, kebutuhanResult] = await Promise.all([getLowonganList(), getKebutuhanList()]);
      setJobRows(lowonganResult.map(mapLowonganRow));
      setAvailableHiringNeeds(
        kebutuhanResult
          .filter((item) => item.status_persetujuan === "Sudah disetujui" && item.lowongan_sudah_dibuat === false)
          .map(mapNeedToPickerItem),
      );
    } catch (error) {
      console.error("Load lowongan dari database gagal:", error);
      const message = error instanceof Error ? error.message : "Gagal memuat data lowongan.";
      if (message.includes("schema cache") || message.includes("PGRST205")) {
        setErrorMessage("Tabel `lowongan_pekerjaan` belum tersedia di database. Jalankan file SQL yang diperlukan terlebih dahulu.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const openApplicantForm = () => {
    window.open("/form-pelamar/", "_blank", "noopener,noreferrer");
  };

  const filterOptions = useMemo(
    () => ({
      status: [...new Set(jobRows.filter((item) => !item.archived).map((item) => item.statusLowongan))],
      company: [...new Set(jobRows.filter((item) => !item.archived).map((item) => `${item.companyName} - ${item.cabang}`))],
      position: [...new Set(jobRows.filter((item) => !item.archived).map((item) => item.posisi))],
      pic: [...new Set(jobRows.filter((item) => !item.archived).map((item) => item.personInCharge))],
    }),
    [jobRows],
  );

  const filteredJobs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return jobRows.filter((job) => {
      if (activeTab === "Arsip") {
        if (!job.archived) {
          return false;
        }
      } else if (job.archived) {
        return false;
      }

      const matchesSearch =
        !searchTerm ||
        [job.posisi, job.companyName, job.cabang, job.personInCharge, job.deskripsiPekerjaan]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus = !statusFilter || job.statusLowongan === statusFilter;
      const matchesCompany = !companyFilter || `${job.companyName} - ${job.cabang}` === companyFilter;
      const matchesPosition = !positionFilter || job.posisi === positionFilter;
      const matchesPic = !picFilter || job.personInCharge === picFilter;
      const matchesTab = activeTab === "Semua" || activeTab === "Arsip" || job.statusLowongan === activeTab;

      return matchesSearch && matchesStatus && matchesCompany && matchesPosition && matchesPic && matchesTab;
    });
  }, [activeTab, companyFilter, jobRows, picFilter, positionFilter, search, statusFilter]);

  const summaryCards = useMemo(() => {
    const activeJobs = jobRows.filter((item) => !item.archived);
    const totalVacancies = activeJobs.length;
    const openVacancies = activeJobs.filter((item) => item.statusLowongan === "Sedang dibuka").length;
    const notLiveVacancies = activeJobs.filter((item) => item.statusLowongan === "Belum tayang").length;
    const closedVacancies = activeJobs.filter((item) => item.statusLowongan === "Sudah ditutup").length;
    const applicantsTotal = activeJobs.reduce((total, item) => total + item.applicantsCount, 0);
    const lowApplicants = activeJobs.filter((item) => item.statusLowongan === "Sedang dibuka" && item.applicantsCount <= 10).length;

    return [
      { label: "Total lowongan", value: String(totalVacancies), note: "Semua lowongan yang sudah tersimpan di database." },
      { label: "Sedang dibuka", value: String(openVacancies), note: "Masih menerima pelamar dan aktif di database." },
      { label: "Belum tayang", value: String(notLiveVacancies), note: "Sudah disimpan tetapi belum dipublikasikan." },
      { label: "Sudah ditutup", value: String(closedVacancies), note: "Sudah selesai dan siap dipindahkan ke arsip." },
      { label: "Jumlah pelamar", value: String(applicantsTotal), note: "Total pelamar yang tercatat dari semua lowongan aktif." },
      { label: "Masih sepi pelamar", value: String(lowApplicants), note: "Lowongan aktif yang pelamarnya masih sedikit." },
    ];
  }, [jobRows]);

  const openBlankForm = () => {
    setJobForm(createInitialJobForm());
    setFormSourceLabel("Buat manual");
    setEditingJobId(null);
    setViewMode("form");
  };

  const openFormFromNeed = (need) => {
    setJobForm(mapNeedToJobForm(need));
    setFormSourceLabel(`Diambil dari kebutuhan: ${need.posisi}`);
    setEditingJobId(null);
    setIsNeedPickerOpen(false);
    setViewMode("form");
  };

  const handleSaveJob = async () => {
    setErrorMessage("");

    try {
      if (editingJobId) {
        const updated = await updateLowongan(editingJobId, mapFormPayloadToLowonganInsert(jobForm, editingJobId));

        if (updated) {
          const mapped = mapLowonganRow(updated);
          setJobRows((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
          setLastSavedRecord(mapped);
        }
      } else {
        const inserted = await createLowongan(mapFormPayloadToLowonganInsert(jobForm));

        if (inserted) {
          const mapped = mapLowonganRow(inserted);
          setJobRows((current) => [mapped, ...current]);
          setLastSavedRecord(mapped);

          if (jobForm.kebutuhanId) {
            await updateKebutuhan(Number(jobForm.kebutuhanId), {
              lowongan_sudah_dibuat: true,
              lowongan_id: mapped.id,
            });

            setAvailableHiringNeeds((current) => current.filter((item) => item.id !== Number(jobForm.kebutuhanId)));
          }
        }
      }

      setEditingJobId(null);
      setViewMode("list");
      setJobForm(createInitialJobForm());
    } catch (error) {
      console.error("Simpan lowongan ke database gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan lowongan ke database.");
      throw error;
    }
  };

  const handleEditJob = (job) => {
    setEditingJobId(job.id);
    setJobForm(mapJobToForm(job));
    setFormSourceLabel(`Edit lowongan: ${job.posisi}`);
    setViewMode("form");
  };

  const handleCloseJob = async (jobId) => {
    setErrorMessage("");

    try {
      const updated = await updateLowongan(jobId, { status_lowongan: "Sudah ditutup" });

      if (updated) {
        const mapped = mapLowonganRow(updated);
        setJobRows((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
        setLastSavedRecord(mapped);
      }
    } catch (error) {
      console.error("Tutup lowongan gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menutup lowongan.");
    }
  };

  const handleArchiveJob = async (jobId) => {
    setErrorMessage("");

    try {
      const updated = await updateLowongan(jobId, { archived: true });

      if (updated) {
        const mapped = mapLowonganRow(updated);
        setJobRows((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
        setLastSavedRecord(mapped);
      }
    } catch (error) {
      console.error("Arsipkan lowongan gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memindahkan lowongan ke arsip.");
    }
  };

  const handleDeleteArchivedJob = async (jobId) => {
    setErrorMessage("");

    try {
      await deleteLowongan(jobId);
      setJobRows((current) => current.filter((item) => item.id !== jobId));
      setLastSavedRecord({ posisi: "Lowongan arsip", archived: true });
    } catch (error) {
      console.error("Hapus arsip lowongan gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus arsip lowongan.");
    }
  };

  if (viewMode === "form") {
    return (
      <JobVacancyForm
        form={jobForm}
        onChange={setJobForm}
        onCancel={() => {
          setEditingJobId(null);
          setViewMode("list");
        }}
        onSubmit={handleSaveJob}
        sourceLabel={formSourceLabel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Lowongan"
        subtitle="Pusat kerja harian untuk membuat lowongan, memantau status tayang, dan mengelola arsip lowongan langsung dari database."
      />

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Kontrol lowongan</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => void loadData()} disabled={isLoading}>
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Muat ulang data
              </Button>
              <Button onClick={openBlankForm}>Buat Lowongan</Button>
              <Button variant="outline" onClick={() => setIsNeedPickerOpen(true)}>
                Ambil dari Kebutuhan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari posisi, UMKM, cabang, atau penanggung jawab..."
            className="border-[var(--border-soft)]"
          />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.status} placeholder="Semua status" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.company} placeholder="Semua cabang / UMKM" />
          <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.position} placeholder="Semua posisi" />
          <FilterSelect value={picFilter} onChange={setPicFilter} options={filterOptions.pic} placeholder="Semua PIC" />
        </CardContent>
      </Card>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Proses lowongan ke database gagal</div>
              <div className="mt-1 text-sm leading-6">{errorMessage}</div>
            </div>
          </div>
        </div>
      ) : null}

      {lastSavedRecord ? (
        <Card className="rounded-xl border-emerald-200">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-[var(--text-main)]">Lowongan berhasil disinkronkan ke Database</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {lastSavedRecord.judulLowongan || lastSavedRecord.posisi} sudah diperbarui
                  {lastSavedRecord.archived ? " dan status arsipnya ikut tersimpan." : " ke tabel lowongan_pekerjaan."}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {lastSavedRecord.statusLowongan ? <StatusBadge value={lastSavedRecord.statusLowongan} /> : null}
              <Badge variant="outline">Tabel: lowongan_pekerjaan</Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {jobTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition ${
              activeTab === tab
                ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white"
                : "border-[var(--border-soft)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-0)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 p-5 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data lowongan dari database...
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {filteredJobs.map((job) => {
          const indicator = getApplicantIndicator(job);

          return (
            <Card
              key={job.id}
              className="overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5">
                    <div className="text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-main)]">{job.posisi}</div>
                    <div className="text-[15px] text-[var(--text-muted)]">
                      {job.companyName} / {job.cabang}
                    </div>
                  </div>
                  <StatusBadge value={job.statusLowongan} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-lg">
                    {job.sourceType === "fromHiringNeed" ? "Dari kebutuhan karyawan" : "Dibuat manual"}
                  </Badge>
                  {job.kebutuhanId ? <Badge variant="outline" className="rounded-lg">Terhubung ke kebutuhan</Badge> : null}
                  <Badge className={`border rounded-lg ${indicator.className}`}>{indicator.label}</Badge>
                  {job.archived ? <Badge variant="outline" className="rounded-lg">Arsip</Badge> : null}
                </div>

                <div className="grid gap-x-8 gap-y-4 border-y border-[var(--border-soft)] py-5 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--text-soft)]">Jumlah pelamar</div>
                    <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{job.applicantsCount} orang</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--text-soft)]">Jumlah kebutuhan</div>
                    <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{job.jumlahKebutuhan} orang</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--text-soft)]">Penanggung jawab</div>
                    <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{job.personInCharge}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--text-soft)]">Tanggal tayang</div>
                    <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{formatDate(job.tanggalTayang)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-[var(--text-soft)]">Target penutupan</div>
                    <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{formatDate(job.tanggalTutup)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-[var(--text-main)]">Ringkasan singkat</div>
                  <p className="text-sm leading-7 text-[var(--text-muted)]">{job.deskripsiPekerjaan || "-"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {job.tests.length > 0 ? (
                    job.tests.map((test) => (
                      <Badge key={test} variant="outline" className="rounded-lg">
                        {test}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="rounded-lg">Belum ada tes</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-4">
                  <Button variant="outline" className="rounded-xl">Lihat Pelamar</Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => handleEditJob(job)}>
                    Ubah
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={openApplicantForm}>
                    Form Pelamar
                  </Button>
                  {job.statusLowongan === "Sedang dibuka" ? <Button className="rounded-xl" onClick={() => void handleCloseJob(job.id)}>Tutup Lowongan</Button> : null}
                  {job.statusLowongan === "Sudah ditutup" && !job.archived ? (
                    <Button variant="outline" className="rounded-xl" onClick={() => void handleArchiveJob(job.id)}>
                      Arsipkan
                    </Button>
                  ) : null}
                  {activeTab === "Arsip" ? (
                    <Button variant="outline" className="rounded-xl" onClick={() => void handleDeleteArchivedJob(job.id)}>
                      Hapus Arsip
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filteredJobs.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
            {activeTab === "Arsip" ? "Belum ada lowongan di arsip." : "Belum ada lowongan yang sesuai dengan filter atau tab yang sedang dibuka."}
          </CardContent>
        </Card>
      ) : null}

      {isNeedPickerOpen ? (
        <HiringNeedPicker needs={availableHiringNeeds} onClose={() => setIsNeedPickerOpen(false)} onPick={openFormFromNeed} />
      ) : null}
    </div>
  );
}
