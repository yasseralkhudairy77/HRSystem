import { useMemo, useState } from "react";
import { ArrowLeft, Copy, FilePlus2 } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusOptions = ["Belum tayang", "Sedang dibuka", "Sudah cukup", "Sudah ditutup"];
const statusKerjaOptions = ["PKWT / Kontrak", "Karyawan tetap", "Freelance"];
const tipeKerjaOptions = ["Full time", "Part time", "Shift"];
const pendidikanOptions = ["SMP", "SMA / SMK", "D3", "S1", "Tidak dibatasi"];
const pengalamanOptions = ["Fresh graduate", "Minimal 1 tahun", "Minimal 2 tahun", "Minimal 3 tahun", "Diutamakan berpengalaman"];

function parseTextList(value) {
  return (value || "")
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBulletLines(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatSalaryRange(min, max) {
  if (!min && !max) {
    return "Kompetitif";
  }

  if (min && max) {
    return `Rp${Number(min).toLocaleString("id-ID")} - Rp${Number(max).toLocaleString("id-ID")}`;
  }

  if (min) {
    return `Mulai dari Rp${Number(min).toLocaleString("id-ID")}`;
  }

  return `Maksimal Rp${Number(max).toLocaleString("id-ID")}`;
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

function FieldLabel({ label }) {
  return <div className="text-sm font-semibold text-[var(--text-main)]">{label}</div>;
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

export function createInitialJobForm(prefill = {}) {
  return {
    kebutuhanId: prefill.kebutuhanId || "",
    companyName: prefill.companyName || "HireUMKM Demo",
    judulLowongan: prefill.judulLowongan || prefill.posisi || "",
    posisi: prefill.posisi || "",
    departemen: prefill.departemen || "",
    cabang: prefill.cabang || "",
    jumlahKebutuhan: prefill.jumlahKebutuhan || 1,
    statusKerja: prefill.statusKerja || "",
    tipeKerja: prefill.tipeKerja || "",
    durasiKontrak: prefill.durasiKontrak || "",
    gajiMin: prefill.gajiMin || "",
    gajiMax: prefill.gajiMax || "",
    pendidikanMin: prefill.pendidikanMin || prefill.pendidikanMinimal || "",
    pengalaman: prefill.pengalaman || "",
    skill: prefill.skill || prefill.skillUtama || [],
    skillText: prefill.skillText || (prefill.skill || prefill.skillUtama || []).join("\n"),
    kriteriaTambahan: prefill.kriteriaTambahan || "",
    tesYangDiperlukan: prefill.tesYangDiperlukan || prefill.tesDiperlukan || [],
    deskripsiPekerjaan: prefill.deskripsiPekerjaan || "",
    ringkasanIklan: prefill.ringkasanIklan || "",
    tanggungJawab: prefill.tanggungJawab || "",
    tentangPerusahaan: prefill.tentangPerusahaan || "",
    lokasiKerja: prefill.lokasiKerja || prefill.cabang || "",
    benefit: prefill.benefit || "",
    caraMelamar: prefill.caraMelamar || "Kirim data lewat link lowongan atau hubungi admin rekrutmen.",
    jalurBagikan: prefill.jalurBagikan || [],
    statusLowongan: prefill.statusLowongan || "Belum tayang",
    tanggalTayang: prefill.tanggalTayang || "",
    tanggalTutup: prefill.tanggalTutup || "",
    createdBy: prefill.createdBy || "Nisa Purnama",
  };
}

export default function JobVacancyForm({ form, onChange, onCancel, onSubmit, sourceLabel }) {
  const [copyFeedback, setCopyFeedback] = useState("");
  const updateField = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  const updateSkillText = (value) =>
    onChange((current) => ({
      ...current,
      skillText: value,
      skill: parseTextList(value),
    }));
  const toggleArray = (key, value) =>
    onChange((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));

  const generatedDrafts = useMemo(() => {
    const salaryRange = formatSalaryRange(form.gajiMin, form.gajiMax);
    const responsibilityItems = parseTextList(form.tanggungJawab || form.deskripsiPekerjaan);
    const additionalCriteriaItems = parseTextList(form.kriteriaTambahan);
    const benefitItems = parseTextList(form.benefit);
    const qualificationItems = [
      form.pendidikanMin ? `Pendidikan minimal ${form.pendidikanMin}` : "",
      form.pengalaman ? form.pengalaman : "",
      ...form.skill.map((item) => `Memiliki skill ${item}`),
      ...additionalCriteriaItems,
    ].filter(Boolean);

    const summaryText =
      form.ringkasanIklan ||
      `Kami mencari ${form.posisi || "kandidat"} untuk mendukung operasional ${form.companyName || "perusahaan"} di ${form.cabang || "lokasi kerja"}.`;

    const glintsDraft = [
      `Posisi: ${form.judulLowongan || form.posisi || "-"}`,
      `Perusahaan: ${form.companyName || "-"}`,
      `Lokasi: ${form.lokasiKerja || form.cabang || "-"}`,
      `Status kerja: ${[form.statusKerja, form.tipeKerja].filter(Boolean).join(" / ") || "-"}`,
      `Range gaji: ${salaryRange}`,
      "",
      "Tentang Peran",
      summaryText,
      "",
      "Job Descriptions",
      responsibilityItems.length ? toBulletLines(responsibilityItems) : "- Isi tanggung jawab utama di form webapp.",
      "",
      "Job Requirements",
      qualificationItems.length ? toBulletLines(qualificationItems) : "- Isi kualifikasi utama di form webapp.",
      "",
      "Benefit",
      benefitItems.length ? toBulletLines(benefitItems) : "- Benefit belum diisi.",
      "",
      "Tentang Perusahaan",
      form.tentangPerusahaan || `${form.companyName || "Perusahaan"} sedang membuka kebutuhan ${form.posisi || "posisi ini"} untuk penempatan ${form.cabang || "sesuai kebutuhan bisnis"}.`,
      "",
      "Cara Melamar",
      form.caraMelamar || "-",
      form.tanggalTutup ? `Batas apply: ${form.tanggalTutup}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const socialCaptionDraft = [
      `${form.judulLowongan || form.posisi || "LOWONGAN KERJA"}`,
      `${form.companyName || "HireUMKM"} - ${form.cabang || form.lokasiKerja || "Lokasi penempatan"}`,
      "",
      summaryText,
      "",
      "Kualifikasi singkat:",
      qualificationItems.slice(0, 5).length ? toBulletLines(qualificationItems.slice(0, 5)) : "- Isi kualifikasi utama di form webapp.",
      "",
      `Gaji: ${salaryRange}`,
      `Cara melamar: ${form.caraMelamar || "-"}`,
    ].join("\n");

    return {
      glintsDraft,
      socialCaptionDraft,
    };
  }, [form]);

  const copyText = async (value, fallbackLabel, successLabel) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(successLabel);
      window.setTimeout(() => {
        setCopyFeedback((current) => (current === successLabel ? "" : current));
      }, 2200);
    } catch {
      window.prompt(`Salin ${fallbackLabel} berikut:`, value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-800)]">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar lowongan
          </button>
          <SectionTitle title="Form Tambah Lowongan" subtitle="Siapkan lowongan baru dari nol atau dari kebutuhan yang sudah disetujui. Tetap bisa disesuaikan sebelum disimpan." />
        </div>

        <Card className="w-full max-w-sm rounded-xl">
          <CardContent className="space-y-3 p-5">
            <div className="text-sm font-semibold text-[var(--text-main)]">Sumber form</div>
            <Badge variant="outline">{sourceLabel}</Badge>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Route aktif: <span className="font-semibold text-[var(--text-main)]">/lowongan/tambah</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionCard title="Informasi posisi">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["judulLowongan", "Judul lowongan"],
            ["posisi", "Posisi"],
            ["departemen", "Departemen"],
            ["cabang", "Cabang / UMKM"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-2">
              <FieldLabel label={label} />
              <Input value={form[key]} onChange={(event) => updateField(key, event.target.value)} />
            </div>
          ))}
          <div className="space-y-2">
            <FieldLabel label="Jumlah kebutuhan" />
            <Input type="number" min="1" value={form.jumlahKebutuhan} onChange={(event) => updateField("jumlahKebutuhan", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Status kerja" />
            <SelectField value={form.statusKerja} onChange={(value) => updateField("statusKerja", value)} options={statusKerjaOptions} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Tipe kerja" />
            <SelectField value={form.tipeKerja} onChange={(value) => updateField("tipeKerja", value)} options={tipeKerjaOptions} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Durasi kontrak" />
            <Input type="number" min="0" value={form.durasiKontrak} onChange={(event) => updateField("durasiKontrak", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Gaji minimum" />
            <Input type="number" value={form.gajiMin} onChange={(event) => updateField("gajiMin", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Gaji maksimum" />
            <Input type="number" value={form.gajiMax} onChange={(event) => updateField("gajiMax", event.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Kualifikasi">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel label="Pendidikan minimal" />
            <SelectField value={form.pendidikanMin} onChange={(value) => updateField("pendidikanMin", value)} options={pendidikanOptions} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Pengalaman" />
            <SelectField value={form.pengalaman} onChange={(value) => updateField("pengalaman", value)} options={pengalamanOptions} />
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel label="Skill utama" />
          <textarea
            rows={4}
            value={form.skillText ?? form.skill.join("\n")}
            onChange={(event) => updateSkillText(event.target.value)}
            placeholder={"Tulis 1 skill per baris.\nContoh: Negotiation\nVendor sourcing\nMicrosoft Excel"}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel label="Kriteria tambahan" />
          <textarea
            rows={4}
            value={form.kriteriaTambahan}
            onChange={(event) => updateField("kriteriaTambahan", event.target.value)}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
      </SectionCard>

      <SectionCard title="Detail lowongan">
        <div className="space-y-2">
          <FieldLabel label="Ringkasan peran" />
          <textarea
            rows={3}
            value={form.ringkasanIklan}
            onChange={(event) => updateField("ringkasanIklan", event.target.value)}
            placeholder="Contoh: Posisi ini bertanggung jawab memastikan operasional outlet berjalan rapi, cepat, dan sesuai SOP."
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel label="Tanggung jawab utama" />
          <textarea
            rows={5}
            value={form.tanggungJawab}
            onChange={(event) => updateField("tanggungJawab", event.target.value)}
            placeholder={"Tulis 1 poin per baris.\nContoh: Melayani pelanggan dengan ramah\nMenginput transaksi harian\nMenjaga area kerja tetap rapi"}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel label="Tentang perusahaan" />
          <textarea
            rows={4}
            value={form.tentangPerusahaan}
            onChange={(event) => updateField("tentangPerusahaan", event.target.value)}
            placeholder="Contoh: Ayam Bakar Nusa Rasa adalah bisnis F&B yang fokus pada pelayanan cepat, rasa konsisten, dan pengalaman pelanggan yang baik."
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel label="Catatan deskripsi internal" />
          <textarea
            rows={3}
            value={form.deskripsiPekerjaan}
            onChange={(event) => updateField("deskripsiPekerjaan", event.target.value)}
            placeholder="Catatan tambahan untuk tim internal bila perlu."
            className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel label="Lokasi kerja" />
            <Input value={form.lokasiKerja} onChange={(event) => updateField("lokasiKerja", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Benefit" />
            <textarea
              rows={3}
              value={form.benefit}
              onChange={(event) => updateField("benefit", event.target.value)}
              placeholder={"Tulis 1 benefit per baris.\nContoh: Gaji pokok\nInsentif kehadiran\nJenjang karier"}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Cara melamar" />
            <Input value={form.caraMelamar} onChange={(event) => updateField("caraMelamar", event.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Output siap copy untuk job portal" note="HR bisa langsung copy hasil ini lalu paste ke Glints, Dealls, atau job portal lain.">
        {copyFeedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{copyFeedback}</div> : null}
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">Format Glints / Job Portal</div>
                <div className="text-xs text-[var(--text-soft)]">Sudah disusun dalam format section yang umum dipakai portal lowongan.</div>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void copyText(generatedDrafts.glintsDraft, "draft Glints / Job Portal", "Deskripsi Glints / Job Portal telah dicopy")}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <textarea
              rows={18}
              readOnly
              value={generatedDrafts.glintsDraft}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-3 text-sm leading-6 text-[var(--text-main)] outline-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">Format caption ringkas</div>
                <div className="text-xs text-[var(--text-soft)]">Cocok untuk Instagram, WhatsApp, Facebook, atau broadcast cepat.</div>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void copyText(generatedDrafts.socialCaptionDraft, "caption ringkas", "Deskripsi caption ringkas telah dicopy")}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
            <textarea
              rows={18}
              readOnly
              value={generatedDrafts.socialCaptionDraft}
              className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-3 text-sm leading-6 text-[var(--text-main)] outline-none"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Publikasi">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel label="Tanggal tayang" />
            <Input type="date" value={form.tanggalTayang} onChange={(event) => updateField("tanggalTayang", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Tanggal tutup" />
            <Input type="date" value={form.tanggalTutup} onChange={(event) => updateField("tanggalTutup", event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Status lowongan" />
            <SelectField value={form.statusLowongan} onChange={(value) => updateField("statusLowongan", value)} options={statusOptions} />
          </div>
        </div>
      </SectionCard>

      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="text-sm text-[var(--text-muted)]">Saat disimpan, lowongan baru akan masuk ke daftar lowongan aktif HireUMKM.</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button className="gap-2" onClick={onSubmit}>
              <FilePlus2 className="h-4 w-4" />
              Simpan Lowongan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
