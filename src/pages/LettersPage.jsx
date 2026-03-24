import { useMemo, useState } from "react";
import { Archive, FilePlus2, FileText, Megaphone, Search, Send, Users, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { documentAutoFeatures, documentDataFields, documentDirectory, documentModuleLinks, documentQuickTabs } from "@/data";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const emptyFilters = { jenisDokumen: "Semua jenis dokumen", usaha: "Semua cabang", namaKaryawan: "Semua karyawan", statusDokumen: "Semua status dokumen", periodeTanggal: "Semua periode" };
const monthCodes = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const statusOptions = ["Belum dibuat", "Sedang dibuat", "Siap dikirim", "Sudah dikirim", "Sudah diarsipkan"];
const templates = [
  { key: "memo-jadwal", category: "pengumuman", typeLabel: "Memo Internal", titlePattern: "Memo Internal Perubahan Jadwal Kerja", code: "MEMO", target: "Seluruh karyawan", summary: "Pemberitahuan resmi untuk perubahan jadwal kerja, briefing, atau pola shift operasional." },
  { key: "hari-raya", category: "pengumuman", typeLabel: "Pengumuman Hari Raya", titlePattern: "Pengumuman Operasional Hari Raya", code: "PNG", target: "Seluruh karyawan", summary: "Pengumuman jadwal kerja, libur, dan ketentuan operasional menjelang hari raya atau momen khusus." },
  { key: "operasional", category: "pengumuman", typeLabel: "Pengumuman Operasional", titlePattern: "Pengumuman Operasional Cabang", code: "OPS", target: "Tim operasional cabang", summary: "Informasi normatif terkait operasional harian, prosedur kerja, atau perubahan alur kerja internal." },
  { key: "keterangan", category: "surat", typeLabel: "Surat Keterangan Kerja", titlePattern: "Surat Keterangan Kerja", code: "SKK", target: "Karyawan terkait", summary: "Surat resmi untuk kebutuhan administrasi karyawan seperti bank, visa, atau lembaga pihak ketiga." },
  { key: "promosi", category: "surat", typeLabel: "Surat Promosi", titlePattern: "Surat Promosi Jabatan", code: "SPR", target: "Karyawan terkait", summary: "Surat pengangkatan/promosi yang menjelaskan perubahan jabatan, tanggung jawab, dan tanggal efektif." },
  { key: "mutasi", category: "surat", typeLabel: "Surat Mutasi", titlePattern: "Surat Mutasi Karyawan", code: "MTS", target: "Karyawan terkait", summary: "Surat perpindahan unit, cabang, atau lokasi kerja yang terdokumentasi resmi." },
];

function formatDate(value) {
  if (!value || value === "-") return "-";
  return dateFormatter.format(new Date(value));
}

function matchQuickTab(item, tabKey) {
  if (tabKey === "surat-karyawan") return item.kategoriDokumen === "surat";
  if (tabKey === "pengumuman") return item.kategoriDokumen === "pengumuman";
  if (tabKey === "belum-selesai") return item.statusDokumen === "Belum dibuat" || item.statusDokumen === "Sedang dibuat";
  if (tabKey === "sudah-dikirim") return item.statusDokumen === "Sudah dikirim";
  if (tabKey === "arsip") return item.statusDokumen === "Sudah diarsipkan";
  return true;
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", sky: "bg-sky-50 text-sky-700", emerald: "bg-emerald-50 text-emerald-700" };
  return <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div><div className="mt-2 text-sm text-slate-500">{note}</div></div><div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>;
}

function FilterSelect({ value, onChange, options }) {
  return <select value={value} onChange={onChange} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function getTemplate(key) {
  return templates.find((template) => template.key === key) || templates[0];
}

function inferTemplateKey(item) {
  const type = String(item.jenisDokumen || "").toLowerCase();
  if (type.includes("promosi")) return "promosi";
  if (type.includes("mutasi")) return "mutasi";
  if (type.includes("keterangan")) return "keterangan";
  if (type.includes("hari raya")) return "hari-raya";
  if (type.includes("memo")) return "memo-jadwal";
  if (type.includes("operasional")) return "operasional";
  return item.kategoriDokumen === "surat" ? "keterangan" : "operasional";
}

function extractSequence(value) {
  const match = String(value || "").match(/^(\d{3})\/HR\//i);
  return match ? Number(match[1]) : 0;
}

function nextSequence(rows) {
  return rows.reduce((highest, item) => Math.max(highest, extractSequence(item.nomorSurat)), 0) + 1;
}

function buildNumber(sequence, code, effectiveDate) {
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  return `${String(sequence).padStart(3, "0")}/HR/${code}/${monthCodes[date.getMonth()]}/${date.getFullYear()}`;
}

function buildFileName(title, effectiveDate) {
  const safeTitle = String(title || "dokumen").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  const stamp = effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${safeTitle || "dokumen"}_${stamp}.pdf`;
}

function buildBody(template, form) {
  const createdLabel = formatDate(form.tanggalDibuat || new Date().toISOString());
  const effectiveLabel = formatDate(form.tanggalBerlaku || form.tanggalDibuat || new Date().toISOString());
  if (form.kategoriDokumen === "surat") {
    return [
      `Nomor: ${form.nomorSurat || "-"}`,
      `Perihal: ${form.judulDokumen || template.titlePattern}`,
      "",
      "Kepada Yth.",
      form.namaKaryawan || "Karyawan terkait",
      form.jabatan || "Karyawan",
      form.namaCabang || "Unit kerja",
      "",
      "Dengan hormat,",
      "",
      form.isiRingkas || template.summary,
      "",
      `Surat ini berlaku efektif mulai ${effectiveLabel}.`,
      "",
      "Demikian surat ini disampaikan untuk dipahami dan dijalankan sebagaimana mestinya.",
      "",
      `${form.namaCabang || "Unit kerja"}, ${createdLabel}`,
      "",
      "Hormat kami,",
      form.penanggungJawab || "Tim HR",
      "Human Resources",
    ].join("\n");
  }
  return [
    "MEMO / PENGUMUMAN INTERNAL",
    `Nomor: ${form.nomorSurat || "-"}`,
    `Perihal: ${form.judulDokumen || template.titlePattern}`,
    "",
    `Ditujukan kepada: ${form.ditujukanUntuk || template.target}`,
    `Unit / cabang: ${form.namaCabang || "Seluruh cabang"}`,
    `Tanggal berlaku: ${effectiveLabel}`,
    "",
    form.isiRingkas || template.summary,
    "",
    "Mohon informasi ini diperhatikan dan dijalankan mulai tanggal tersebut.",
    "",
    `${form.namaUsaha || "Perusahaan"}, ${createdLabel}`,
    "",
    "Disusun oleh,",
    form.penanggungJawab || "Tim HR",
    "Human Resources",
  ].join("\n");
}

function enrichDocument(item) {
  const templateKey = inferTemplateKey(item);
  return { ...item, templateKey, isiDokumen: buildBody(getTemplate(templateKey), { ...item, templateKey }) };
}

function defaultForm(category, rows) {
  const template = templates.find((item) => item.category === category) || templates[0];
  const today = new Date().toISOString().slice(0, 10);
  const form = {
    id: null,
    templateKey: template.key,
    kategoriDokumen: category,
    jenisDokumen: template.typeLabel,
    nomorSurat: buildNumber(nextSequence(rows), template.code, today),
    judulDokumen: template.titlePattern,
    tanggalDibuat: today,
    tanggalBerlaku: today,
    isiRingkas: template.summary,
    statusDokumen: "Belum dibuat",
    filePdf: buildFileName(template.titlePattern, today),
    penanggungJawab: "Tim HR",
    catatanAdmin: "",
    namaUsaha: "HireUMKM Retail",
    namaCabang: category === "surat" ? "Head Office Bandung" : "Semua cabang",
    employeeId: "",
    namaKaryawan: "",
    jabatan: "",
    menempelKeDataKaryawan: category === "surat",
    ditujukanUntuk: template.target,
  };
  return { ...form, isiDokumen: buildBody(template, form) };
}

function createFormFromItem(item) {
  const templateKey = item.templateKey || inferTemplateKey(item);
  const next = { ...item, templateKey };
  return { ...next, isiDokumen: item.isiDokumen || buildBody(getTemplate(templateKey), next) };
}

export default function LettersPage() {
  const [rows, setRows] = useState(() => documentDirectory.map(enrichDocument));
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [form, setForm] = useState(defaultForm("surat", documentDirectory.map(enrichDocument)));

  const filterOptions = useMemo(() => ({
    jenisDokumen: ["Semua jenis dokumen", ...new Set(rows.map((item) => item.jenisDokumen))],
    usaha: ["Semua cabang", ...new Set(rows.map((item) => item.namaCabang))],
    namaKaryawan: ["Semua karyawan", ...new Set(rows.map((item) => item.namaKaryawan).filter(Boolean))],
    statusDokumen: ["Semua status dokumen", ...statusOptions],
    periodeTanggal: ["Semua periode", ...new Set(rows.map((item) => formatDate(item.tanggalDibuat)))],
  }), [rows]);

  const summaryCards = useMemo(() => [
    { label: "Total dokumen", value: rows.length, note: "Surat kerja dan pengumuman internal ada di satu tempat.", icon: FileText, tone: "slate" },
    { label: "Belum selesai", value: rows.filter((item) => item.statusDokumen === "Belum dibuat" || item.statusDokumen === "Sedang dibuat").length, note: "Masih ada draft yang perlu dirapikan atau dilengkapi.", icon: FilePlus2, tone: "amber" },
    { label: "Siap dikirim", value: rows.filter((item) => item.statusDokumen === "Siap dikirim").length, note: "Dokumen sudah siap dan tinggal dikirim ke pihak terkait.", icon: Send, tone: "sky" },
    { label: "Sudah dikirim", value: rows.filter((item) => item.statusDokumen === "Sudah dikirim").length, note: "Dokumen sudah dibagikan ke karyawan atau cabang terkait.", icon: Megaphone, tone: "emerald" },
    { label: "Sudah diarsipkan", value: rows.filter((item) => item.statusDokumen === "Sudah diarsipkan").length, note: "Dokumen final sudah rapi masuk arsip.", icon: Archive, tone: "emerald" },
    { label: "Menempel ke data karyawan", value: rows.filter((item) => item.menempelKeDataKaryawan).length, note: "Dokumen penting bisa langsung masuk ke profil karyawan.", icon: Users, tone: "sky" },
  ], [rows]);

  const quickTabCounts = useMemo(() => Object.fromEntries(documentQuickTabs.map((tab) => [tab.key, rows.filter((item) => matchQuickTab(item, tab.key)).length])), [rows]);

  const filteredDocuments = useMemo(() => rows.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!matchQuickTab(item, activeTab)) return false;
    if (filters.jenisDokumen !== "Semua jenis dokumen" && item.jenisDokumen !== filters.jenisDokumen) return false;
    if (filters.usaha !== "Semua cabang" && item.namaCabang !== filters.usaha) return false;
    if (filters.namaKaryawan !== "Semua karyawan" && item.namaKaryawan !== filters.namaKaryawan) return false;
    if (filters.statusDokumen !== "Semua status dokumen" && item.statusDokumen !== filters.statusDokumen) return false;
    if (filters.periodeTanggal !== "Semua periode" && formatDate(item.tanggalDibuat) !== filters.periodeTanggal) return false;
    return !term || [item.judulDokumen, item.jenisDokumen, item.nomorSurat, item.namaKaryawan, item.namaCabang, item.penanggungJawab, item.ditujukanUntuk].join(" ").toLowerCase().includes(term);
  }), [activeTab, filters, rows, search]);

  const registerRows = useMemo(() => rows.slice().sort((a, b) => String(b.tanggalDibuat || "").localeCompare(String(a.tanggalDibuat || ""))).slice(0, 6), [rows]);

  function refreshBody(nextForm) {
    const template = getTemplate(nextForm.templateKey);
    return { ...nextForm, isiDokumen: buildBody(template, nextForm), filePdf: buildFileName(nextForm.judulDokumen, nextForm.tanggalDibuat || nextForm.tanggalBerlaku) };
  }

  function updateForm(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "tanggalDibuat") next.nomorSurat = buildNumber(extractSequence(current.nomorSurat) || nextSequence(rows), getTemplate(next.templateKey).code, value);
      return refreshBody(next);
    });
  }

  function openCreate(category) {
    setEditorMode("create");
    setForm(defaultForm(category, rows));
    setShowEditor(true);
  }

  function openEdit(item) {
    setEditorMode("edit");
    setForm(createFormFromItem(item));
    setShowEditor(true);
  }

  function saveDocument() {
    if (!form.judulDokumen.trim() || !form.nomorSurat.trim() || !form.penanggungJawab.trim()) {
      setFeedback({ type: "error", message: "Judul dokumen, nomor surat, dan penanggung jawab wajib diisi sebelum disimpan." });
      return;
    }
    if (form.kategoriDokumen === "surat" && !form.namaKaryawan.trim()) {
      setFeedback({ type: "error", message: "Nama karyawan wajib diisi untuk dokumen kategori surat." });
      return;
    }
    const nextDocument = refreshBody({ ...form, id: form.id || `doc-${String(Date.now()).slice(-6)}` });
    setRows((current) => [nextDocument, ...current.filter((item) => item.id !== nextDocument.id)].sort((a, b) => String(b.tanggalDibuat || "").localeCompare(String(a.tanggalDibuat || ""))));
    setSelectedDocument(nextDocument);
    setShowEditor(false);
    setFeedback({ type: "success", message: `${nextDocument.nomorSurat} berhasil ${editorMode === "create" ? "dibuat" : "diperbarui"} dan masuk ke register HR.` });
  }

  function setDocumentStatus(id, status, message) {
    let updated = null;
    setRows((current) => current.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, statusDokumen: status };
      return updated;
    }));
    if (updated) {
      setSelectedDocument(updated);
      setFeedback({ type: "success", message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle title="Surat & Pengumuman" subtitle="Pusat surat menyurat normatif perusahaan untuk memo internal, pengumuman operasional, surat kerja, dan dokumen resmi HR yang terdokumentasi berdasarkan nomor surat." />
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl" onClick={() => openCreate("surat")}><FileText className="mr-2 h-4 w-4" />Buat Surat</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => openCreate("pengumuman")}><Megaphone className="mr-2 h-4 w-4" />Buat Pengumuman</Button>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari jenis dokumen, nomor surat, nama karyawan, cabang, atau penanggung jawab" className="rounded-xl border-slate-200 bg-white pl-9" /></div>
          <FilterSelect value={filters.jenisDokumen} onChange={(event) => setFilters((current) => ({ ...current, jenisDokumen: event.target.value }))} options={filterOptions.jenisDokumen} />
          <FilterSelect value={filters.usaha} onChange={(event) => setFilters((current) => ({ ...current, usaha: event.target.value }))} options={filterOptions.usaha} />
          <FilterSelect value={filters.namaKaryawan} onChange={(event) => setFilters((current) => ({ ...current, namaKaryawan: event.target.value }))} options={filterOptions.namaKaryawan} />
          <FilterSelect value={filters.statusDokumen} onChange={(event) => setFilters((current) => ({ ...current, statusDokumen: event.target.value }))} options={filterOptions.statusDokumen} />
          <FilterSelect value={filters.periodeTanggal} onChange={(event) => setFilters((current) => ({ ...current, periodeTanggal: event.target.value }))} options={filterOptions.periodeTanggal} />
        </div>
      </div>

      {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="space-y-4 p-4 lg:p-5">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-lg font-semibold text-slate-900">Daftar surat dan pengumuman</div><div className="text-sm text-slate-500">{filteredDocuments.length} data ditemukan. Fokus utamanya dokumen yang perlu diselesaikan, dikirim, atau disimpan ke arsip.</div></div><div className="text-sm text-slate-500">Dokumen personal bisa menempel ke data karyawan, pengumuman tersimpan per nomor surat dan cabang.</div></div>
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex flex-wrap gap-2 p-4">{documentQuickTabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${tab.key === activeTab ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{tab.label} ({quickTabCounts[tab.key] || 0})</button>)}</CardContent></Card>
          <div className="space-y-3">{filteredDocuments.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="space-y-3"><div className="flex flex-wrap items-start gap-3"><div><div className="text-lg font-semibold text-slate-900">{item.judulDokumen}</div><div className="text-sm text-slate-500">{item.jenisDokumen} � {item.namaKaryawan ? `${item.namaKaryawan} � ` : ""}{item.namaCabang}</div></div><StatusBadge value={item.statusDokumen} /></div><div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Nomor surat</div><div className="mt-1 font-medium text-slate-700">{item.nomorSurat}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal dibuat</div><div className="mt-1 font-medium text-slate-700">{formatDate(item.tanggalDibuat)}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Template</div><div className="mt-1 font-medium text-slate-700">{getTemplate(item.templateKey).typeLabel}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Penanggung jawab</div><div className="mt-1 font-medium text-slate-700">{item.penanggungJawab}</div></div></div></div><div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end"><Button variant="outline" className="rounded-xl" onClick={() => setSelectedDocument(item)}>Lihat detail</Button><Button variant="outline" className="rounded-xl" onClick={() => openEdit(item)}>Ubah</Button><Button variant="outline" className="rounded-xl" onClick={() => setDocumentStatus(item.id, "Siap dikirim", `${item.nomorSurat} ditandai siap dikirim.`)}>Siap kirim</Button><Button variant="outline" className="rounded-xl" onClick={() => setDocumentStatus(item.id, "Sudah dikirim", `${item.nomorSurat} ditandai sudah dikirim.`)}>Kirim</Button><Button variant="outline" className="rounded-xl" onClick={() => setDocumentStatus(item.id, "Sudah diarsipkan", `${item.nomorSurat} dipindahkan ke arsip.`)}>Arsipkan</Button></div></div></div>)}{filteredDocuments.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Belum ada data yang cocok dengan pencarian atau filter yang dipilih.</div> : null}</div>
        </CardContent></Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Register nomor surat</div><div className="mt-2 text-sm leading-6 text-slate-500">Nomor surat terbaru yang sudah tercatat, supaya HR mudah tracking dan tidak ada nomor yang lompat.</div><div className="mt-4 space-y-3">{registerRows.map((item) => <div key={`register-${item.id}`} className="rounded-xl border border-slate-200 p-3"><div className="font-medium text-slate-800">{item.nomorSurat}</div><div className="mt-1 text-sm text-slate-600">{item.judulDokumen}</div><div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{formatDate(item.tanggalDibuat)} � {item.statusDokumen}</div></div>)}</div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Template normatif HR</div><div className="mt-2 text-sm leading-6 text-slate-500">Template ini disiapkan untuk kebutuhan perusahaan sehari-hari dan bisa diedit sebelum disimpan.</div><div className="mt-4 space-y-3">{templates.map((template) => <div key={template.key} className="rounded-xl border border-slate-200 p-3"><div className="font-medium text-slate-800">{template.typeLabel}</div><div className="mt-1 text-sm leading-6 text-slate-500">{template.summary}</div><div className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">Kode surat: {template.code}</div></div>)}</div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Data yang terdokumentasi</div><div className="mt-2 text-sm leading-6 text-slate-500">Setiap surat menyimpan field inti agar HR bisa telusur dokumen berdasarkan nomor, pemilik, cabang, dan status pengerjaannya.</div><div className="mt-4 flex flex-wrap gap-2">{documentDataFields.filter((item) => item !== "id").map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{item}</span>)}</div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Fitur yang membantu kerja harian</div><div className="mt-2 text-sm leading-6 text-slate-500">Fitur ini disiapkan supaya owner dan admin tidak perlu bolak-balik bikin dokumen manual dari nol.</div><div className="mt-4 space-y-3">{documentAutoFeatures.map((item) => <div key={item} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">{item}</div>)}</div></CardContent></Card>
          <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Terhubung ke modul lain</div><div className="mt-2 text-sm leading-6 text-slate-500">Dokumen penting tidak berdiri sendiri. Setiap surat bisa dipakai lagi di alur administrasi lain saat dibutuhkan.</div><div className="mt-4 space-y-3">{documentModuleLinks.map((item) => <div key={item.title} className="rounded-xl border border-slate-200 p-3"><div className="font-medium text-slate-800">{item.title}</div><div className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</div></div>)}</div></CardContent></Card>
        </div>
      </div>

      {selectedDocument ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4"><div className="w-full max-w-5xl rounded-[24px] border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><div className="text-lg font-semibold text-slate-900">Detail dokumen</div><div className="mt-1 text-sm leading-6 text-slate-500">Dokumen ini tercatat dalam register HR dan bisa ditelusur berdasarkan nomor surat, status, serta siapa yang menyusunnya.</div></div><button type="button" onClick={() => setSelectedDocument(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"><X className="h-4 w-4" /></button></div><div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"><div className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.18em] text-slate-400">{selectedDocument.nomorSurat}</div><div className="mt-2 text-2xl font-semibold text-slate-900">{selectedDocument.judulDokumen}</div><div className="mt-2 text-sm text-slate-500">{selectedDocument.jenisDokumen} � {selectedDocument.kategoriDokumen === "surat" ? selectedDocument.namaKaryawan || "Karyawan terkait" : selectedDocument.ditujukanUntuk || "Seluruh karyawan"}</div></div><StatusBadge value={selectedDocument.statusDokumen} /></div></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal dibuat</div><div className="mt-2 text-sm font-medium text-slate-800">{formatDate(selectedDocument.tanggalDibuat)}</div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal berlaku</div><div className="mt-2 text-sm font-medium text-slate-800">{formatDate(selectedDocument.tanggalBerlaku)}</div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Cabang / unit</div><div className="mt-2 text-sm font-medium text-slate-800">{selectedDocument.namaCabang}</div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Penanggung jawab</div><div className="mt-2 text-sm font-medium text-slate-800">{selectedDocument.penanggungJawab}</div></div></div><div className="rounded-2xl border border-slate-200 p-4"><div className="text-sm font-semibold text-slate-900">Preview isi dokumen</div><pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{selectedDocument.isiDokumen}</pre></div></div>
<div className="space-y-4"><Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Ringkasan tracking</div><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-400">File final</div><div className="mt-1 font-medium text-slate-800">{selectedDocument.filePdf}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-400">Tujuan dokumen</div><div className="mt-1 font-medium text-slate-800">{selectedDocument.kategoriDokumen === "surat" ? selectedDocument.namaKaryawan || "-" : selectedDocument.ditujukanUntuk || "-"}</div></div><div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-400">Penyimpanan</div><div className="mt-1 font-medium text-slate-800">{selectedDocument.menempelKeDataKaryawan ? "Menempel ke data karyawan" : "Arsip umum perusahaan"}</div></div></div></CardContent></Card><Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Catatan admin</div><div className="mt-2 text-sm leading-6 text-slate-600">{selectedDocument.catatanAdmin || "Belum ada catatan tambahan untuk dokumen ini."}</div><div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" className="rounded-xl" onClick={() => openEdit(selectedDocument)}>Ubah dokumen</Button><Button variant="outline" className="rounded-xl" onClick={() => setDocumentStatus(selectedDocument.id, "Sudah dikirim", `${selectedDocument.nomorSurat} ditandai sudah dikirim.`)}>Tandai dikirim</Button><Button variant="outline" className="rounded-xl" onClick={() => setDocumentStatus(selectedDocument.id, "Sudah diarsipkan", `${selectedDocument.nomorSurat} dipindahkan ke arsip.`)}>Simpan ke arsip</Button></div></CardContent></Card></div></div></div></div> : null}

      {showEditor ? <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/35 p-4"><div className="mx-auto w-full max-w-6xl rounded-[24px] border border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><div className="text-lg font-semibold text-slate-900">{editorMode === "create" ? "Buat dokumen HR" : "Ubah dokumen HR"}</div><div className="mt-1 text-sm leading-6 text-slate-500">Pilih template normatif, sesuaikan isi, lalu simpan agar nomor surat dan histori dokumen tetap rapi di register HR.</div></div><button type="button" onClick={() => setShowEditor(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"><X className="h-4 w-4" /></button></div><div className="grid gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"><div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><div><div className="mb-2 text-sm font-medium text-slate-700">Kategori dokumen</div><FilterSelect value={form.kategoriDokumen} onChange={(event) => setForm(defaultForm(event.target.value, rows))} options={["surat", "pengumuman"]} /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Template</div><select value={form.templateKey} onChange={(event) => { const template = getTemplate(event.target.value); const sequence = extractSequence(form.nomorSurat) || nextSequence(rows); setForm(refreshBody({ ...form, templateKey: template.key, kategoriDokumen: template.category, jenisDokumen: template.typeLabel, judulDokumen: template.titlePattern, isiRingkas: template.summary, ditujukanUntuk: template.category === "pengumuman" ? template.target : form.ditujukanUntuk, nomorSurat: buildNumber(sequence, template.code, form.tanggalDibuat || form.tanggalBerlaku), menempelKeDataKaryawan: template.category === "surat" })); }} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300">{templates.filter((template) => template.category === form.kategoriDokumen).map((template) => <option key={template.key} value={template.key}>{template.typeLabel}</option>)}</select></div><div><div className="mb-2 text-sm font-medium text-slate-700">Nomor surat</div><Input value={form.nomorSurat} onChange={(event) => updateForm("nomorSurat", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Status dokumen</div><FilterSelect value={form.statusDokumen} onChange={(event) => updateForm("statusDokumen", event.target.value)} options={statusOptions} /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal dibuat</div><Input type="date" value={form.tanggalDibuat} onChange={(event) => updateForm("tanggalDibuat", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal berlaku</div><Input type="date" value={form.tanggalBerlaku} onChange={(event) => updateForm("tanggalBerlaku", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Judul dokumen</div><Input value={form.judulDokumen} onChange={(event) => updateForm("judulDokumen", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Penanggung jawab</div><Input value={form.penanggungJawab} onChange={(event) => updateForm("penanggungJawab", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Nama usaha</div><Input value={form.namaUsaha} onChange={(event) => updateForm("namaUsaha", event.target.value)} className="rounded-xl border-slate-200" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Cabang / unit</div><Input value={form.namaCabang} onChange={(event) => updateForm("namaCabang", event.target.value)} className="rounded-xl border-slate-200" /></div></div>
{form.kategoriDokumen === "surat" ? <div className="grid gap-4 md:grid-cols-2"><div><div className="mb-2 text-sm font-medium text-slate-700">ID karyawan</div><Input value={form.employeeId} onChange={(event) => updateForm("employeeId", event.target.value)} className="rounded-xl border-slate-200" placeholder="Contoh: HKM-2026-018" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Nama karyawan</div><Input value={form.namaKaryawan} onChange={(event) => updateForm("namaKaryawan", event.target.value)} className="rounded-xl border-slate-200" placeholder="Nama karyawan terkait" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Jabatan</div><Input value={form.jabatan} onChange={(event) => updateForm("jabatan", event.target.value)} className="rounded-xl border-slate-200" placeholder="Jabatan saat surat dibuat" /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Arsip ke data karyawan</div><select value={String(form.menempelKeDataKaryawan)} onChange={(event) => updateForm("menempelKeDataKaryawan", event.target.value === "true")} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300"><option value="true">Ya, tempel ke data karyawan</option><option value="false">Tidak, simpan di arsip umum</option></select></div></div> : <div><div className="mb-2 text-sm font-medium text-slate-700">Ditujukan untuk</div><Input value={form.ditujukanUntuk} onChange={(event) => updateForm("ditujukanUntuk", event.target.value)} className="rounded-xl border-slate-200" placeholder="Contoh: Seluruh karyawan cabang Bandung" /></div>}<div><div className="mb-2 text-sm font-medium text-slate-700">Isi ringkas / pokok memo</div><textarea value={form.isiRingkas} onChange={(event) => updateForm("isiRingkas", event.target.value)} rows={6} className="min-h-[148px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300" placeholder="Tulis isi pokok surat atau pengumuman. Preview resmi di sebelah kanan akan ikut diperbarui." /></div><div><div className="mb-2 text-sm font-medium text-slate-700">Catatan admin</div><textarea value={form.catatanAdmin} onChange={(event) => updateForm("catatanAdmin", event.target.value)} rows={4} className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300" placeholder="Catatan internal, misalnya status tanda tangan owner, media pengiriman, atau tindak lanjut." /></div></div><div className="space-y-4"><Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Preview template</div><div className="mt-2 text-sm leading-6 text-slate-500">{getTemplate(form.templateKey).summary}</div><pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{form.isiDokumen}</pre></CardContent></Card><Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="p-5"><div className="text-lg font-semibold text-slate-900">Checklist sebelum simpan</div><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="rounded-xl border border-slate-200 p-3">Nomor surat sudah unik dan sesuai format internal perusahaan.</div><div className="rounded-xl border border-slate-200 p-3">Judul, tanggal berlaku, dan penanggung jawab sudah benar.</div><div className="rounded-xl border border-slate-200 p-3">{form.kategoriDokumen === "surat" ? "Nama karyawan dan jabatan penerima sudah dilengkapi." : "Target pengumuman dan cakupan cabang sudah dilengkapi."}</div><div className="rounded-xl border border-slate-200 p-3">Catatan admin bisa dipakai untuk tracking proses kirim dan arsip.</div></div></CardContent></Card></div></div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4"><Button variant="outline" className="rounded-xl" onClick={() => setShowEditor(false)}>Tutup</Button><Button className="rounded-xl" onClick={saveDocument}>{editorMode === "create" ? "Simpan dokumen" : "Simpan perubahan"}</Button></div></div></div> : null}
    </div>
  );
}
