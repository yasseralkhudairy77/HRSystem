import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, FilePlus2, Send } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const employmentStatusOptions = ["PKWT / Kontrak", "Karyawan tetap", "Freelance"];
const workTypeOptions = ["Full time", "Part time", "Shift"];
const skillOptions = ["Komunikasi pelanggan", "Input data", "Administrasi", "Teliti", "Microsoft Excel", "Cash handling", "Negosiasi", "Operasional outlet"];
const approvalStatusOptions = ["Belum diajukan", "Menunggu persetujuan", "Sudah disetujui", "Tidak disetujui"];
const testOptions = ["DISC Ringkas", "Tes Ketelitian", "Tes Logika Dasar", "Attitude Service", "Typing Test"];
const needTypeOptions = ["Tambah karyawan baru", "Pengganti karyawan keluar", "Tambahan workload"];

const currentRequester = "Nisa Purnama";
const currentSubmissionDate = new Date().toISOString().split("T")[0];

const initialFormState = {
  posisi: "",
  cabang: "",
  departemen: "",
  jumlahKebutuhan: 1,
  jenisKebutuhan: "Tambah karyawan baru",
  targetMulaiKerja: "",
  statusKerja: "PKWT / Kontrak",
  tipeKerja: "Full time",
  durasiKontrak: 12,
  gajiMin: "",
  gajiMax: "",
  pendidikanMinimal: "SMA / SMK",
  pengalaman: "Minimal 1 tahun",
  skillUtama: ["Administrasi", "Teliti"],
  kriteriaTambahan: "",
  tesDiperlukan: ["DISC Ringkas", "Tes Ketelitian"],
  alasanKebutuhan: "",
  namaPengaju: currentRequester,
  tanggalPengajuan: currentSubmissionDate,
  statusPersetujuan: "Belum diajukan",
  approvedBy: "",
  tanggalApproval: "",
};

function buildFormState(initialValues) {
  if (!initialValues) {
    return initialFormState;
  }

  return {
    posisi: initialValues.posisi || "",
    cabang: initialValues.cabang || "",
    departemen: initialValues.departemen || "",
    jumlahKebutuhan: initialValues.jumlahKebutuhan ?? 1,
    jenisKebutuhan: initialValues.jenisKebutuhan || "Tambah karyawan baru",
    targetMulaiKerja: initialValues.targetMulaiKerja || "",
    statusKerja: initialValues.statusKerja || "PKWT / Kontrak",
    tipeKerja: initialValues.tipeKerja || "Full time",
    durasiKontrak: initialValues.durasiKontrak ?? 12,
    gajiMin: initialValues.gajiMin || "",
    gajiMax: initialValues.gajiMax || "",
    pendidikanMinimal: initialValues.pendidikanMinimal || "SMA / SMK",
    pengalaman: initialValues.pengalaman || "Minimal 1 tahun",
    skillUtama: initialValues.skillUtama || ["Administrasi", "Teliti"],
    kriteriaTambahan: initialValues.kriteriaTambahan || "",
    tesDiperlukan: initialValues.tesDiperlukan || ["DISC Ringkas", "Tes Ketelitian"],
    alasanKebutuhan: initialValues.alasanKebutuhan || "",
    namaPengaju: initialValues.namaPengaju || currentRequester,
    tanggalPengajuan: initialValues.tanggalPengajuan || currentSubmissionDate,
    statusPersetujuan: initialValues.statusPersetujuan || "Belum diajukan",
    approvedBy: initialValues.approvedBy || "",
    tanggalApproval: initialValues.tanggalApproval || "",
  };
}

function FieldLabel({ title, helper }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
      {helper ? <div className="text-xs text-[var(--text-soft)]">{helper}</div> : null}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]"
    >
      <option value="">Pilih</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SectionCard({ title, children, note }) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="border-b border-[var(--border-soft)]">
        <CardTitle className="text-base">{title}</CardTitle>
        {note ? <div className="text-sm text-[var(--text-muted)]">{note}</div> : null}
      </CardHeader>
      <CardContent className="grid gap-4 p-5">{children}</CardContent>
    </Card>
  );
}

export default function HiringNeedForm({ onCancel, onSubmit, initialValues = null, submitLabel = null }) {
  const [form, setForm] = useState(() => buildFormState(initialValues));
  const [isSaving, setIsSaving] = useState(false);

  const approvalSummary = useMemo(
    () => ({
      status: form.statusPersetujuan,
      canCreateVacancy: form.statusPersetujuan === "Sudah disetujui",
      rangeGaji:
        form.gajiMin && form.gajiMax
          ? `Rp${Number(form.gajiMin).toLocaleString("id-ID")} - Rp${Number(form.gajiMax).toLocaleString("id-ID")}`
          : "Belum diisi",
    }),
    [form.gajiMax, form.gajiMin, form.statusPersetujuan],
  );

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleArrayValue = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  };

  const handleSave = async (mode) => {
    const statusPersetujuan = mode === "draft" ? form.statusPersetujuan || "Belum diajukan" : form.statusPersetujuan === "Sudah disetujui" ? "Sudah disetujui" : "Menunggu persetujuan";

    const payload = {
      ...form,
      statusPersetujuan,
      tabelTujuan: "kebutuhan_karyawan",
    };

    setIsSaving(true);

    try {
      await onSubmit(payload, mode);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-800)]">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar kebutuhan
          </button>
          <SectionTitle title="Form Tambah Kebutuhan Karyawan" subtitle="Catat kebutuhan tim sebelum dibuka menjadi lowongan. Isi singkat, jelas, dan mudah ditindaklanjuti." />
        </div>

        <Card className="w-full max-w-sm rounded-xl">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-main)]">Status pengajuan</div>
              <StatusBadge value={approvalSummary.status} />
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Tabel tujuan: <span className="font-semibold text-[var(--text-main)]">kebutuhan_karyawan</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Range gaji: <span className="font-semibold text-[var(--text-main)]">{approvalSummary.rangeGaji}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionCard title="Section 1: Informasi Posisi">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel title="Posisi yang dibutuhkan" />
            <Input value={form.posisi} onChange={(event) => updateField("posisi", event.target.value)} placeholder="Contoh: Admin Marketplace" />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Cabang / Outlet" />
            <Input value={form.cabang} onChange={(event) => updateField("cabang", event.target.value)} placeholder="Contoh: Cabang Antapani" />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Departemen" />
            <Input value={form.departemen} onChange={(event) => updateField("departemen", event.target.value)} placeholder="Contoh: Operasional" />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Jumlah kebutuhan" />
            <Input type="number" min="1" value={form.jumlahKebutuhan} onChange={(event) => updateField("jumlahKebutuhan", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Target mulai kerja" />
            <Input type="date" value={form.targetMulaiKerja} onChange={(event) => updateField("targetMulaiKerja", event.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel title="Jenis kebutuhan" />
          <div className="grid gap-3 md:grid-cols-3">
            {needTypeOptions.map((option) => (
              <button
                key={option}
                onClick={() => updateField("jenisKebutuhan", option)}
                className={`rounded-lg border p-3 text-left text-sm ${
                  form.jenisKebutuhan === option
                    ? "border-[var(--brand-800)] bg-[rgba(30,79,143,0.08)] text-[var(--brand-900)]"
                    : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Section 2: Status Kerja">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <FieldLabel title="Status kerja" />
            <SelectField value={form.statusKerja} onChange={(value) => updateField("statusKerja", value)} options={employmentStatusOptions} />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Tipe kerja" />
            <SelectField value={form.tipeKerja} onChange={(value) => updateField("tipeKerja", value)} options={workTypeOptions} />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Durasi kontrak" />
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={form.durasiKontrak} onChange={(event) => updateField("durasiKontrak", event.target.value)} />
              <Badge variant="outline">Bulan</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel title="Range gaji" helper="Isi gaji minimum dan maksimum" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Min" value={form.gajiMin} onChange={(event) => updateField("gajiMin", event.target.value)} />
              <Input type="number" placeholder="Max" value={form.gajiMax} onChange={(event) => updateField("gajiMax", event.target.value)} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Section 3: Kualifikasi Kandidat">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel title="Pendidikan minimal" />
            <Input
              value={form.pendidikanMinimal}
              onChange={(event) => updateField("pendidikanMinimal", event.target.value)}
              placeholder="Contoh: SMA / SMK"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel title="Pengalaman" />
            <Input value={form.pengalaman} onChange={(event) => updateField("pengalaman", event.target.value)} placeholder="Contoh: Minimal 1 tahun" />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel title="Skill utama" helper="Bisa pilih lebih dari satu" />
          <div className="flex flex-wrap gap-2">
            {skillOptions.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleArrayValue("skillUtama", skill)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  form.skillUtama.includes(skill)
                    ? "border-[var(--brand-800)] bg-[rgba(30,79,143,0.08)] text-[var(--brand-900)]"
                    : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel title="Kriteria tambahan" />
          <textarea
            value={form.kriteriaTambahan}
            onChange={(event) => updateField("kriteriaTambahan", event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
            placeholder="Contoh: domisili dekat outlet, siap kerja akhir pekan, atau terbiasa target harian."
          />
        </div>
      </SectionCard>

      <SectionCard title="Section 4: Tes yang diperlukan">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {testOptions.map((test) => {
            const checked = form.tesDiperlukan.includes(test);

            return (
              <button
                key={test}
                onClick={() => toggleArrayValue("tesDiperlukan", test)}
                className={`rounded-lg border p-3 text-left text-sm ${
                  checked
                    ? "border-[var(--brand-800)] bg-[rgba(30,79,143,0.08)] text-[var(--brand-900)]"
                    : "border-[var(--border-soft)] bg-white text-[var(--text-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{test}</span>
                  {checked ? <CheckCircle2 className="h-4 w-4" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Section 5: Alasan kebutuhan">
        <textarea
          value={form.alasanKebutuhan}
          onChange={(event) => updateField("alasanKebutuhan", event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          placeholder="Tulis alasan singkat kenapa posisi ini dibutuhkan."
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Section 6: Informasi pengaju" note="Diisi otomatis dari akun yang sedang aktif.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">Nama pengaju</div>
              <div className="mt-2 font-semibold text-[var(--text-main)]">{form.namaPengaju}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">Tanggal pengajuan</div>
              <div className="mt-2 flex items-center gap-2 font-semibold text-[var(--text-main)]">
                <CalendarDays className="h-4 w-4 text-[var(--brand-700)]" />
                {form.tanggalPengajuan}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Section 7: Status persetujuan">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel title="Status persetujuan" />
              <SelectField value={form.statusPersetujuan} onChange={(value) => updateField("statusPersetujuan", value)} options={approvalStatusOptions} />
            </div>
            <div className="space-y-2">
              <FieldLabel title="Approved by" />
              <Input value={form.approvedBy} onChange={(event) => updateField("approvedBy", event.target.value)} placeholder="Nama penyetuju" />
            </div>
            <div className="space-y-2">
              <FieldLabel title="Tanggal approval" />
              <Input type="date" value={form.tanggalApproval} onChange={(event) => updateField("tanggalApproval", event.target.value)} />
            </div>
          </div>
        </SectionCard>
      </div>

      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="text-sm text-[var(--text-muted)]">Aksi akan menyimpan data ke tabel <span className="font-semibold text-[var(--text-main)]">kebutuhan_karyawan</span>.</div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button variant="subtle" className="gap-2" onClick={() => void handleSave("draft")} disabled={isSaving}>
              <FilePlus2 className="h-4 w-4" />
              {isSaving ? "Menyimpan..." : submitLabel?.draft || "Simpan Draft"}
            </Button>
            <Button className="gap-2" onClick={() => void handleSave("submit")} disabled={isSaving}>
              <Send className="h-4 w-4" />
              {isSaving ? "Menyimpan..." : submitLabel?.submit || "Ajukan Persetujuan"}
            </Button>
            {approvalSummary.canCreateVacancy ? (
              <Button className="gap-2 border-emerald-700 bg-emerald-700 hover:border-emerald-800 hover:bg-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Buat Lowongan
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
