import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, LoaderCircle, MessageCircle, Search, ShieldCheck, UserPlus, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createStageHistory } from "@/services/recruitmentWorkflowService";

const START = "[[ONBOARDING_FORM]]";
const END = "[[/ONBOARDING_FORM]]";
const tabs = [
  { key: "semua", label: "Semua" },
  { key: "belum", label: "Belum lengkap" },
  { key: "siapkan", label: "Sedang disiapkan" },
  { key: "siap", label: "Siap masuk" },
  { key: "masuk", label: "Sudah masuk" },
];
const employmentOptions = ["Belum ditentukan", "Probation", "Kontrak", "Tetap", "Freelance", "Part time"];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value) {
  if (!value && value !== 0) return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rp${amount.toLocaleString("id-ID")}` : "-";
}

function ageLabel(value) {
  if (!value) return "";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const diff = now.getMonth() - birth.getMonth();
  if (diff < 0 || (diff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age} tahun` : "";
}

function normalizeWa(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function buildWaLink(number, message) {
  const normalized = normalizeWa(number);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : "";
}

function appendNote(previous, next) {
  const note = String(next || "").trim();
  if (!note) return previous || "";
  const stamped = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previous ? `${previous}\n\n${stamped}` : stamped;
}

function defaultForm() {
  return { startDate: "", employmentType: "Belum ditentukan", finalSalary: "", owner: "", offerNote: "" };
}

function parseNote(notes) {
  const raw = typeof notes === "string" ? notes.trim() : "";
  if (!raw) return { form: defaultForm(), plain: "" };
  const start = raw.indexOf(START);
  const end = raw.indexOf(END);
  if (start === -1 || end === -1 || end <= start) return { form: defaultForm(), plain: raw };
  const json = raw.slice(start + START.length, end).trim();
  const plain = [raw.slice(0, start).trim(), raw.slice(end + END.length).trim()].filter(Boolean).join("\n\n");
  try {
    return { form: { ...defaultForm(), ...(JSON.parse(json)?.form || {}) }, plain };
  } catch {
    return { form: defaultForm(), plain: raw };
  }
}

function buildNote(form, plain) {
  return `${START}${JSON.stringify({ form })}${END}${plain ? `\n\n${plain}` : ""}`;
}

function summarizeExperience(item) {
  const list = Array.isArray(item?.pengalaman_list) ? item.pengalaman_list : [];
  if (list.length) return list.slice(0, 2).map((entry) => `${entry?.jabatan || "Posisi"} di ${entry?.perusahaan || "Perusahaan"}`).join("; ");
  if (item?.fresh_graduate) return "Fresh graduate.";
  return item?.pengalaman_utama_deskripsi || "Belum ada ringkasan pengalaman.";
}

function preparationStatus(stage, form) {
  if (stage === "Sudah masuk kerja") return "Sudah masuk kerja";
  if (stage === "Siap masuk") return "Siap masuk kerja";
  return form.startDate || form.owner || form.finalSalary || (form.employmentType && form.employmentType !== "Belum ditentukan") || form.offerNote
    ? "Sedang disiapkan"
    : "Belum lengkap";
}

function tabMatch(item, key) {
  if (key === "belum") return item.statusPersiapan === "Belum lengkap";
  if (key === "siapkan") return item.statusPersiapan === "Sedang disiapkan";
  if (key === "siap") return item.statusPersiapan === "Siap masuk kerja";
  if (key === "masuk") return item.statusPersiapan === "Sudah masuk kerja";
  return true;
}

function mapRow(item) {
  const stage = item.tahap_proses || "";
  const status = item.status_tindak_lanjut || "";
  if (!["Tahap akhir", "Penawaran kerja", "Siap masuk", "Sudah masuk kerja"].includes(stage) && status !== "Masuk tahap akhir") return null;
  const parsed = parseNote(item.catatan_recruiter);
  return {
    id: item.id,
    nama: item.nama_lengkap,
    usia: ageLabel(item.tanggal_lahir),
    posisi: item.posisi_dilamar,
    domisili: item.alamat_domisili || "-",
    whatsapp: item.no_hp || "-",
    email: item.email || "-",
    pendidikan: [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-",
    pengalaman: summarizeExperience(item),
    ekspektasiGaji: formatCurrency(item.ekspektasi_gaji),
    tahapProses: stage || "Penawaran kerja",
    statusTindakLanjut: status || "Masuk tahap akhir",
    statusPersiapan: preparationStatus(stage || "Penawaran kerja", parsed.form),
    interviewer: item.interview_interviewer || "Recruiter",
    interviewDatetime: item.interview_datetime || "",
    plainNotes: parsed.plain,
    form: parsed.form,
    cv: item.cv_file_name || "-",
  };
}

function Metric({ icon: Icon, label, value, note, tone }) {
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
          <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void loadRows(); }, []);
  useEffect(() => { setForm(selected ? { ...defaultForm(), ...selected.form } : defaultForm()); }, [selected]);

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const data = await getPelamarList();
      setRows(data.map(mapRow).filter(Boolean));
    } catch (loadError) {
      console.error("Load onboarding gagal:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat data karyawan baru.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function syncRow(updatedRow) {
    const mapped = mapRow(updatedRow);
    if (!mapped) {
      setRows((current) => current.filter((item) => item.id !== updatedRow.id));
      setSelected((current) => (current?.id === updatedRow.id ? null : current));
      return null;
    }
    setRows((current) => [...current.filter((item) => item.id !== updatedRow.id), mapped]);
    setSelected((current) => (current?.id === updatedRow.id ? mapped : current));
    return mapped;
  }

  async function persistStage(nextStage, nextStatus, note) {
    if (!selected) return null;
    setSubmitting(true);
    try {
      const plain = appendNote(selected.plainNotes, note);
      const updated = await updatePelamar(selected.id, {
        tahap_proses: nextStage,
        status_tindak_lanjut: nextStatus,
        catatan_recruiter: buildNote(form, plain),
      });
      if (!updated) throw new Error("Data kandidat tidak ditemukan setelah disimpan.");
      if (nextStage !== selected.tahapProses) {
        try {
          await createStageHistory({ pelamar_id: selected.id, dari_tahap: selected.tahapProses, ke_tahap: nextStage, catatan: note || null });
        } catch (historyError) {
          console.warn("Riwayat tahap onboarding belum tersimpan:", historyError);
          setFeedback({ type: "info", message: `Status ${selected.nama} sudah berubah, tetapi riwayat tahap belum berhasil dicatat.` });
        }
      }
      return syncRow(updated);
    } catch (persistError) {
      console.error("Simpan onboarding gagal:", persistError);
      setFeedback({ type: "error", message: persistError instanceof Error ? persistError.message : "Perubahan onboarding belum berhasil disimpan." });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function saveOffer() {
    const next = await persistStage(selected?.tahapProses === "Sudah masuk kerja" ? "Sudah masuk kerja" : "Penawaran kerja", "Masuk tahap akhir", "Detail penawaran kerja diperbarui.");
    if (next) setFeedback({ type: "success", message: `Detail penawaran ${selected.nama} berhasil disimpan.` });
  }

  async function markReady() {
    if (!form.startDate || !String(form.owner || "").trim()) {
      setFeedback({ type: "error", message: "Tanggal mulai kerja dan penanggung jawab wajib diisi sebelum kandidat ditandai siap masuk." });
      return;
    }
    const next = await persistStage("Siap masuk", "Siap masuk", `Kandidat siap masuk kerja pada ${formatDate(form.startDate)}.`);
    if (next) setFeedback({ type: "success", message: `${selected.nama} ditandai siap masuk kerja.` });
  }

  async function markJoined() {
    const next = await persistStage("Sudah masuk kerja", "Sudah masuk kerja", `Kandidat ditandai sudah masuk kerja${form.startDate ? ` pada ${formatDate(form.startDate)}` : ""}.`);
    if (next) setFeedback({ type: "success", message: `${selected.nama} ditandai sudah masuk kerja.` });
  }

  function contactCandidate() {
    if (!selected) return;
    const message = [
      `Halo ${selected.nama},`,
      "",
      `Terima kasih sudah mengikuti proses rekrutmen posisi ${selected.posisi} di HireUMKM.`,
      "",
      form.startDate ? `Rencana tanggal mulai kerja Anda adalah ${formatDate(form.startDate)}.` : "Tim kami sedang menyiapkan detail penawaran kerja Anda.",
      form.employmentType && form.employmentType !== "Belum ditentukan" ? `Status kerja yang sedang kami siapkan: ${form.employmentType}.` : "",
      form.offerNote ? `Catatan dari recruiter: ${form.offerNote}` : "",
      "",
      "Jika ada hal yang ingin dikonfirmasi, silakan balas pesan ini.",
      "",
      "Salam,",
      "Tim Rekrutmen HireUMKM",
    ].filter(Boolean).join("\n");
    const url = buildWaLink(selected.whatsapp, message);
    if (!url) {
      setFeedback({ type: "error", message: `Nomor WhatsApp ${selected.nama} belum valid.` });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item) => tabMatch(item, activeTab) && (!term || [item.nama, item.posisi, item.domisili, item.whatsapp, item.statusPersiapan, item.tahapProses].join(" ").toLowerCase().includes(term)));
  }, [activeTab, rows, search]);

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.key, rows.filter((item) => tabMatch(item, tab.key)).length])), [rows]);
  const summary = useMemo(() => ([
    { label: "Total kandidat akhir", value: rows.length, note: "Kandidat dari penawaran kerja sampai hari pertama masuk.", icon: UserPlus, tone: "slate" },
    { label: "Belum lengkap", value: rows.filter((item) => item.statusPersiapan === "Belum lengkap").length, note: "Masih perlu dilengkapi oleh recruiter.", icon: CalendarDays, tone: "amber" },
    { label: "Sedang disiapkan", value: rows.filter((item) => item.statusPersiapan === "Sedang disiapkan").length, note: "Penawaran kerja sedang dirapikan.", icon: BriefcaseBusiness, tone: "sky" },
    { label: "Siap masuk kerja", value: rows.filter((item) => item.statusPersiapan === "Siap masuk kerja").length, note: "Tinggal dijalankan pada hari pertama kerja.", icon: ShieldCheck, tone: "emerald" },
    { label: "Sudah masuk kerja", value: rows.filter((item) => item.statusPersiapan === "Sudah masuk kerja").length, note: "Sudah dinyatakan mulai bekerja.", icon: CheckCircle2, tone: "emerald" },
  ]), [rows]);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <SectionTitle title="Karyawan Baru" subtitle="Kelola penawaran kerja, kesiapan masuk, dan status hari pertama kerja kandidat yang sudah lolos sampai tahap akhir." />
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, posisi, domisili, nomor WhatsApp, atau status kandidat" className="rounded-xl border-slate-200 bg-white pl-9" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Alur aktif: <span className="font-medium text-slate-800">Wawancara -&gt; Penawaran kerja -&gt; Siap masuk -&gt; Sudah masuk kerja</span>
          </div>
        </div>
      </div>

      {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : feedback.type === "info" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{summary.map((item) => <Metric key={item.label} {...item} />)}</div>

      <Card className="rounded-2xl border-slate-200 shadow-sm"><CardContent className="flex flex-wrap gap-2 p-4">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${tab.key === activeTab ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{tab.label} ({counts[tab.key] || 0})</button>)}</CardContent></Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 lg:p-5">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">Daftar kandidat tahap akhir</div>
              <div className="text-sm text-slate-500">{filtered.length} data ditemukan. Recruiter bisa menyimpan detail penawaran lalu memindahkan kandidat ke tahap siap masuk.</div>
            </div>
          </div>

          {loading ? <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />Memuat data karyawan baru...</div> : null}

          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{item.nama}</div>
                        <div className="text-sm text-slate-500">{item.usia ? `${item.usia} • ` : ""}{item.posisi}</div>
                      </div>
                      <StatusBadge value={item.tahapProses} />
                      <StatusBadge value={item.statusPersiapan} />
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Mulai kerja</div><div className="mt-1 font-medium text-slate-700">{item.form.startDate ? formatDate(item.form.startDate) : "Belum diatur"}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status kerja</div><div className="mt-1 font-medium text-slate-700">{item.form.employmentType || "Belum ditentukan"}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gaji final</div><div className="mt-1 font-medium text-slate-700">{item.form.finalSalary ? formatCurrency(item.form.finalSalary) : "Belum diisi"}</div></div>
                      <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">PIC recruiter</div><div className="mt-1 font-medium text-slate-700">{item.form.owner || item.interviewer}</div></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:max-w-[280px] xl:justify-end">
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelected(item)}>Detail</Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelected(item)}>{["Penawaran kerja", "Tahap akhir"].includes(item.tahapProses) ? "Lengkapi penawaran" : "Kelola"}</Button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Belum ada kandidat tahap akhir yang cocok dengan pencarian atau filter yang dipilih.</div> : null}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div><div className="text-xl font-semibold text-slate-900">{selected.nama}</div><div className="mt-1 text-sm text-slate-500">{selected.posisi} • {selected.domisili}</div></div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2"><StatusBadge value={selected.tahapProses} /><StatusBadge value={selected.statusPersiapan} /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Snapshot kandidat</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>WhatsApp: {selected.whatsapp}</div>
                    <div>Email: {selected.email}</div>
                    <div>Pendidikan: {selected.pendidikan}</div>
                    <div>Ekspektasi gaji: {selected.ekspektasiGaji}</div>
                    <div>CV: {selected.cv}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-700">Ringkasan tahap akhir</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Interviewer: {selected.interviewer}</div>
                    <div>Jadwal wawancara: {selected.interviewDatetime ? formatDateTime(selected.interviewDatetime) : "-"}</div>
                    <div>Tahap saat ini: {selected.tahapProses}</div>
                    <div>Status persiapan: {selected.statusPersiapan}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Pengalaman singkat</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selected.pengalaman}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Form penawaran & kesiapan masuk</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div><div className="mb-2 text-sm font-medium text-slate-700">Tanggal mulai kerja</div><Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></div>
                  <div><div className="mb-2 text-sm font-medium text-slate-700">Status kerja</div><select value={form.employmentType} onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">{employmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
                  <div><div className="mb-2 text-sm font-medium text-slate-700">Gaji final yang ditawarkan</div><Input value={form.finalSalary} onChange={(event) => setForm((current) => ({ ...current, finalSalary: event.target.value.replace(/[^\d]/g, "") }))} placeholder="Contoh: 3500000" /></div>
                  <div><div className="mb-2 text-sm font-medium text-slate-700">Penanggung jawab</div><Input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Nama recruiter / PIC" /></div>
                </div>
                <div className="mt-4"><div className="mb-2 text-sm font-medium text-slate-700">Catatan penawaran / onboarding</div><textarea value={form.offerNote} onChange={(event) => setForm((current) => ({ ...current, offerNote: event.target.value }))} rows={5} placeholder="Tulis poin penting untuk kandidat, misalnya detail offer, dokumen yang harus dibawa, atau catatan hari pertama kerja." className="min-h-[132px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400" /></div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <Button className="rounded-xl" onClick={() => void saveOffer()} disabled={submitting}>Simpan penawaran</Button>
                <Button variant="outline" className="rounded-xl" onClick={contactCandidate}><MessageCircle className="mr-2 h-4 w-4" />Hubungi kandidat</Button>
                <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => void markReady()} disabled={submitting || ["Siap masuk", "Sudah masuk kerja"].includes(selected.tahapProses)}>Tandai siap masuk</Button>
                <Button className="rounded-xl bg-slate-900 hover:bg-slate-800" onClick={() => void markJoined()} disabled={submitting || selected.tahapProses === "Sudah masuk kerja"}>Tandai sudah masuk kerja</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
