import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

import HiringNeedForm from "@/components/recruitment/HiringNeedForm";
import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createKebutuhan, getKebutuhanList, updateKebutuhan } from "@/services/kebutuhanService";

const CLOSED_STATUSES = new Set(["Sudah terpenuhi", "Tidak disetujui", "Dibatalkan"]);

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(item) {
  if (!item.referenceDate) {
    return false;
  }

  const today = new Date();
  const targetDate = new Date(item.referenceDate);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return targetDate < today && !CLOSED_STATUSES.has(item.status);
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

function mapKebutuhanRow(item) {
  const approvalStatus = item.status_persetujuan || "Belum diajukan";
  const employmentLabel = [item.status_kerja, item.tipe_kerja].filter(Boolean).join(" / ");

  return {
    id: item.id,
    role: item.posisi,
    company: "HireUMKM",
    branch: item.cabang || "-",
    qty: item.jumlah_kebutuhan || 0,
    priority: item.status_persetujuan === "Sudah disetujui" ? "Tinggi" : "Sedang",
    status: item.lowongan_sudah_dibuat ? "Lowongan sudah dibuat" : approvalStatus,
    referenceDate: item.tanggal_pengajuan,
    requester: item.pengaju || "-",
    needType: item.jenis_kebutuhan || "-",
    employmentType: employmentLabel || "-",
    tests: item.tes_yang_diperlukan || [],
    reason: item.alasan_kebutuhan || "-",
    vacancyCreated: item.lowongan_sudah_dibuat || false,
    tableName: "kebutuhan_karyawan",
    approvalStatus,
    raw: item,
  };
}

function mapKebutuhanRowToFormValues(item) {
  return {
    id: item.id,
    posisi: item.raw?.posisi || item.role,
    cabang: item.raw?.cabang || item.branch,
    departemen: item.raw?.departemen || "",
    jumlahKebutuhan: item.raw?.jumlah_kebutuhan || item.qty,
    jenisKebutuhan: item.raw?.jenis_kebutuhan || item.needType,
    targetMulaiKerja: item.raw?.target_mulai_kerja || "",
    statusKerja: item.raw?.status_kerja || "",
    tipeKerja: item.raw?.tipe_kerja || "",
    durasiKontrak: item.raw?.durasi_kontrak || "",
    gajiMin: item.raw?.gaji_min || "",
    gajiMax: item.raw?.gaji_max || "",
    pendidikanMinimal: item.raw?.pendidikan_min || "",
    pengalaman: item.raw?.pengalaman || "",
    skillUtama: item.raw?.skill || [],
    kriteriaTambahan: item.raw?.kriteria_tambahan || "",
    tesDiperlukan: item.raw?.tes_yang_diperlukan || [],
    alasanKebutuhan: item.raw?.alasan_kebutuhan || "",
    namaPengaju: item.raw?.pengaju || item.requester,
    tanggalPengajuan: item.raw?.tanggal_pengajuan || "",
    statusPersetujuan: item.raw?.status_persetujuan || item.approvalStatus,
    approvedBy: item.raw?.approved_by || "",
    tanggalApproval: item.raw?.tanggal_approval || "",
  };
}

function mapFormPayloadToKebutuhanInsert(payload, mode) {
  return {
    posisi: payload.posisi,
    departemen: payload.departemen || null,
    cabang: payload.cabang || null,
    jumlah_kebutuhan: Number(payload.jumlahKebutuhan) || 0,
    jenis_kebutuhan: payload.jenisKebutuhan || null,
    status_kerja: payload.statusKerja || null,
    tipe_kerja: payload.tipeKerja || null,
    durasi_kontrak: payload.durasiKontrak ? Number(payload.durasiKontrak) : null,
    gaji_min: payload.gajiMin ? Number(payload.gajiMin) : null,
    gaji_max: payload.gajiMax ? Number(payload.gajiMax) : null,
    pendidikan_min: payload.pendidikanMinimal || null,
    pengalaman: payload.pengalaman || null,
    skill: payload.skillUtama || [],
    kriteria_tambahan: payload.kriteriaTambahan || null,
    tes_yang_diperlukan: payload.tesDiperlukan || [],
    alasan_kebutuhan: payload.alasanKebutuhan || null,
    pengaju: payload.namaPengaju || null,
    tanggal_pengajuan: payload.tanggalPengajuan || null,
    status_persetujuan: mode === "submit" ? payload.statusPersetujuan : "Belum diajukan",
    approved_by: payload.approvedBy || null,
    tanggal_approval: payload.tanggalApproval || null,
    lowongan_sudah_dibuat: false,
    lowongan_id: null,
  };
}

export default function HiringPlanPage() {
  const [hiringNeeds, setHiringNeeds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [lastSavedRecord, setLastSavedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    void loadHiringNeeds();
  }, []);

  async function loadHiringNeeds() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getKebutuhanList();
      setHiringNeeds(result.map(mapKebutuhanRow));
    } catch (error) {
      console.error("Load kebutuhan_karyawan di halaman utama gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data kebutuhan karyawan.");
    } finally {
      setIsLoading(false);
    }
  }

  const filterOptions = useMemo(
    () => ({
      status: [...new Set(hiringNeeds.map((item) => item.status))],
      priority: [...new Set(hiringNeeds.map((item) => item.priority))],
      company: [...new Set(hiringNeeds.map((item) => `${item.company} - ${item.branch}`))],
      requester: [...new Set(hiringNeeds.map((item) => item.requester))],
    }),
    [hiringNeeds],
  );

  const filteredHiringPlans = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return hiringNeeds.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.role, item.company, item.branch, item.requester, item.reason, item.needType, item.employmentType]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesPriority = !priorityFilter || item.priority === priorityFilter;
      const matchesCompany = !companyFilter || `${item.company} - ${item.branch}` === companyFilter;
      const matchesRequester = !requesterFilter || item.requester === requesterFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesCompany && matchesRequester;
    });
  }, [companyFilter, hiringNeeds, priorityFilter, requesterFilter, search, statusFilter]);

  const summaryCards = useMemo(() => {
    const totalActive = hiringNeeds.filter((item) => !CLOSED_STATUSES.has(item.status)).length;
    const waitingApproval = hiringNeeds.filter((item) => item.approvalStatus === "Menunggu persetujuan").length;
    const approved = hiringNeeds.filter((item) => item.approvalStatus === "Sudah disetujui").length;
    const withoutVacancy = hiringNeeds.filter((item) => item.approvalStatus === "Sudah disetujui" && !item.vacancyCreated).length;
    const overdue = hiringNeeds.filter(isOverdue).length;

    return [
      { label: "Total kebutuhan", value: String(totalActive), note: "Jumlah kebutuhan karyawan yang masih berjalan." },
      { label: "Menunggu persetujuan", value: String(waitingApproval), note: "Masih menunggu keputusan sebelum bisa dilanjutkan." },
      { label: "Sudah disetujui", value: String(approved), note: "Sudah siap dilanjutkan ke pembuatan lowongan." },
      { label: "Lowongan belum dibuat", value: String(withoutVacancy), note: "Sudah disetujui, tetapi lowongan belum dibuka." },
      { label: "Perlu perhatian", value: String(overdue), note: "Data lama yang masih perlu dicek lagi." },
    ];
  }, [hiringNeeds]);

  async function handleCreateHiringNeed(payload, mode) {
    setErrorMessage("");

    try {
      const inserted = await createKebutuhan(mapFormPayloadToKebutuhanInsert(payload, mode));

      if (inserted) {
        const mapped = mapKebutuhanRow(inserted);
        setHiringNeeds((current) => [mapped, ...current]);
        setLastSavedRecord(mapped);
        setViewMode("list");
      }
    } catch (error) {
      console.error("Simpan kebutuhan dari form utama gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan kebutuhan karyawan ke database.");
      throw error;
    }
  }

  async function handleUpdateHiringNeed(payload, mode) {
    if (!editingRecord?.id) {
      return;
    }

    setErrorMessage("");

    try {
      const updated = await updateKebutuhan(editingRecord.id, {
        ...mapFormPayloadToKebutuhanInsert(payload, mode),
      });

      if (updated) {
        const mapped = mapKebutuhanRow(updated);
        setHiringNeeds((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
        setLastSavedRecord(mapped);
        setEditingRecord(null);
        setViewMode("list");
      }
    } catch (error) {
      console.error("Update kebutuhan dari form utama gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengubah data kebutuhan karyawan di database.");
      throw error;
    }
  }

  async function handleApproveHiringNeed(item) {
    setActionLoadingId(item.id);
    setErrorMessage("");

    try {
      const approvalDate = new Date().toISOString().split("T")[0];
      const updated = await updateKebutuhan(item.id, {
        status_persetujuan: "Sudah disetujui",
        approved_by: "Owner UMKM",
        tanggal_approval: approvalDate,
      });

      if (updated) {
        const mapped = mapKebutuhanRow(updated);
        setHiringNeeds((current) => current.map((entry) => (entry.id === mapped.id ? mapped : entry)));
        setLastSavedRecord(mapped);
      }
    } catch (error) {
      console.error("Setujui kebutuhan gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal menyetujui kebutuhan karyawan.");
    } finally {
      setActionLoadingId(null);
    }
  }

  if (viewMode === "form") {
    return (
      <HiringNeedForm
        onCancel={() => {
          setEditingRecord(null);
          setViewMode("list");
        }}
        onSubmit={editingRecord ? handleUpdateHiringNeed : handleCreateHiringNeed}
        initialValues={editingRecord ? mapKebutuhanRowToFormValues(editingRecord) : null}
        submitLabel={editingRecord ? { draft: "Simpan Perubahan", submit: "Simpan & Ajukan Lagi" } : null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Kebutuhan Karyawan"
        subtitle="Halaman ini dipakai untuk mencatat, meninjau, dan menindaklanjuti kebutuhan karyawan sebelum dibuka menjadi lowongan."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Filter kebutuhan karyawan</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => void loadHiringNeeds()} disabled={isLoading}>
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Muat ulang data
              </Button>
              <Button onClick={() => setViewMode("form")}>Tambah kebutuhan</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari posisi, UMKM, cabang, atau alasan kebutuhan..."
            className="border-[var(--border-soft)]"
          />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.status} placeholder="Semua status" />
          <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={filterOptions.priority} placeholder="Semua prioritas" />
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.company} placeholder="Semua cabang / UMKM" />
          <FilterSelect value={requesterFilter} onChange={setRequesterFilter} options={filterOptions.requester} placeholder="Semua pengaju" />
        </CardContent>
      </Card>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Proses ke database gagal</div>
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
                <div className="font-semibold text-[var(--text-main)]">Form berhasil tersimpan ke tabel `kebutuhan_karyawan`</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {lastSavedRecord.role} untuk {lastSavedRecord.branch} sudah masuk ke daftar kebutuhan dengan status {lastSavedRecord.status}.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge value={lastSavedRecord.status} />
              <Badge variant="outline">Tabel: {lastSavedRecord.tableName}</Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 p-5 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data kebutuhan dari database...
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {filteredHiringPlans.map((item) => {
          const overdue = isOverdue(item);

          return (
            <Card
              key={item.id}
              className="overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
            >
              <CardContent className="p-0">
                <div className="space-y-6 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="text-[1.8rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-main)]">
                        {item.role}
                      </div>
                      <div className="text-[15px] text-[var(--text-muted)]">
                        {item.company} / {item.branch}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <StatusBadge value={item.priority} />
                      <StatusBadge value={item.status} />
                      {overdue ? (
                        <Badge className="border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                          Perlu perhatian
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-x-8 gap-y-4 border-y border-[var(--border-soft)] py-5 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Jumlah kebutuhan</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{item.qty} orang</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Tanggal pengajuan</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{formatDate(item.referenceDate)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Pengaju</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{item.requester}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Jenis kebutuhan</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{item.needType}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Status kerja</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{item.employmentType}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-[var(--text-soft)]">Lowongan sudah dibuat</div>
                      <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">{item.vacancyCreated ? "Ya" : "Belum"}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[var(--text-main)]">Paket tes</div>
                    <div className="flex flex-wrap gap-2">
                      {item.tests.length > 0 ? item.tests.map((test) => (
                        <Badge
                          key={test}
                          variant="outline"
                          className="rounded-lg border-[var(--border-soft)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                        >
                          {test}
                        </Badge>
                      )) : (
                        <Badge variant="outline" className="rounded-lg border-[var(--border-soft)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                          Belum diisi
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-[var(--text-main)]">Alasan kebutuhan</div>
                    <p className="text-sm leading-7 text-[var(--text-muted)]">{item.reason}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-0)] px-6 py-4">
                  <Button variant="outline" className="rounded-xl">
                    Lihat detail
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setEditingRecord(item);
                      setViewMode("form");
                    }}
                  >
                    Ubah data
                  </Button>
                  {item.status === "Menunggu persetujuan" ? (
                    <Button className="rounded-xl" onClick={() => void handleApproveHiringNeed(item)} disabled={actionLoadingId === item.id}>
                      {actionLoadingId === item.id ? "Menyetujui..." : "Setujui"}
                    </Button>
                  ) : null}
                  {item.status === "Sudah disetujui" && !item.vacancyCreated ? (
                    <Button className="rounded-xl border-emerald-700 bg-emerald-700 hover:border-emerald-800 hover:bg-emerald-800">
                      Buat lowongan
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && filteredHiringPlans.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center text-sm text-[var(--text-muted)]">
            Belum ada data kebutuhan yang tampil. Tambah kebutuhan baru atau muat ulang data dari database.
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
