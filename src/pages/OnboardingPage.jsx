import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, LoaderCircle, MessageCircle, Search, ShieldCheck, UserPlus, X } from "lucide-react";

import StatusBadge from "@/components/common/StatusBadge";
import { employeeDensity } from "@/components/employees/employeeDensity";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { syncEmployeeFromPelamar } from "@/services/employeeService";
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
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  return {
    startDate: "",
    employmentType: "Belum ditentukan",
    finalSalary: "",
    owner: "",
    offerNote: "",
    documentsReceived: false,
    firstDayBriefReady: false,
  };
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

function getReadinessChecklist(form) {
  const normalizedEmployment = String(form.employmentType || "").trim();
  const normalizedOwner = String(form.owner || "").trim();
  return [
    { key: "startDate", label: "Tanggal mulai sudah disepakati", done: Boolean(form.startDate) },
    { key: "employmentType", label: "Status kerja sudah ditetapkan", done: Boolean(normalizedEmployment && normalizedEmployment !== "Belum ditentukan") },
    { key: "owner", label: "PIC / atasan sudah ditentukan", done: Boolean(normalizedOwner) },
    { key: "documentsReceived", label: "Dokumen utama sudah diterima", done: Boolean(form.documentsReceived) },
    { key: "firstDayBriefReady", label: "Arahan hari pertama sudah siap", done: Boolean(form.firstDayBriefReady) },
  ];
}

function readinessProgress(form) {
  const items = getReadinessChecklist(form);
  const completed = items.filter((item) => item.done).length;
  return { items, completed, total: items.length, isComplete: completed === items.length };
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
  if (!["Siap masuk", "Sudah masuk kerja"].includes(stage)) return null;

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
    tahapProses: stage || "Siap masuk",
    statusTindakLanjut: item.status_tindak_lanjut || "Siap masuk",
    statusPersiapan: preparationStatus(stage || "Siap masuk", parsed.form),
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
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] text-[var(--text-muted)]">{label}</div>
            <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
            <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{note}</div>
          </div>
          <div className={`rounded-[10px] p-2.5 ${tones[tone] || tones.slate}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoPanel({ title, rows }) {
  return (
    <div className={`${employeeDensity.inset} p-4`}>
      <div className="text-sm font-medium text-[var(--text-main)]">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span className="font-medium text-[var(--text-main)]">{label}:</span> {value}
          </div>
        ))}
      </div>
    </div>
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

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    setForm(selected ? { ...defaultForm(), ...selected.form } : defaultForm());
  }, [selected]);

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

      return { raw: updated, mapped: syncRow(updated) };
    } catch (persistError) {
      console.error("Simpan onboarding gagal:", persistError);
      setFeedback({ type: "error", message: persistError instanceof Error ? persistError.message : "Perubahan onboarding belum berhasil disimpan." });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function saveOffer() {
    const next = await persistStage(selected?.tahapProses === "Sudah masuk kerja" ? "Sudah masuk kerja" : "Siap masuk", "Siap masuk", "Detail persiapan masuk kerja diperbarui.");
    if (next?.mapped) setFeedback({ type: "success", message: `Detail persiapan ${selected.nama} berhasil disimpan.` });
  }

  async function markReady() {
    const progress = readinessProgress(form);
    if (!progress.isComplete) {
      const remaining = progress.items.filter((item) => !item.done).map((item) => item.label);
      setFeedback({
        type: "error",
        message: `Lengkapi checklist utama dulu sebelum kandidat ditandai siap masuk: ${remaining.join(", ")}.`,
      });
      return;
    }
    const next = await persistStage("Siap masuk", "Siap masuk", `Kandidat siap masuk kerja pada ${formatDate(form.startDate)}.`);
    if (next?.mapped) setFeedback({ type: "success", message: `${selected.nama} ditandai siap masuk kerja.` });
  }

  async function markJoined() {
    const next = await persistStage("Sudah masuk kerja", "Sudah masuk kerja", `Kandidat ditandai sudah masuk kerja${form.startDate ? ` pada ${formatDate(form.startDate)}` : ""}.`);
    if (!next?.raw || !next?.mapped) return;

    try {
      await syncEmployeeFromPelamar(next.raw, form);
      setFeedback({ type: "success", message: `${selected.nama} ditandai sudah masuk kerja dan otomatis masuk ke Data Karyawan.` });
    } catch (syncError) {
      console.error("Sinkronisasi employee gagal:", syncError);
      setFeedback({
        type: "info",
        message: `${selected.nama} sudah ditandai masuk kerja, tetapi sinkronisasi ke Data Karyawan belum berhasil. Cek tabel employees atau migrasi database.`,
      });
    }
  }

  function contactCandidate() {
    if (!selected) return;

    const message = [
      `Halo ${selected.nama},`,
      "",
      `Terima kasih sudah mengikuti proses rekrutmen posisi ${selected.posisi} di HireUMKM.`,
      "",
      form.startDate ? `Rencana tanggal mulai kerja Anda adalah ${formatDate(form.startDate)}.` : "Tim kami sedang menyiapkan detail persiapan masuk kerja Anda.",
      form.employmentType && form.employmentType !== "Belum ditentukan" ? `Status kerja yang sedang kami siapkan: ${form.employmentType}.` : "",
      form.offerNote ? `Catatan dari recruiter: ${form.offerNote}` : "",
      "",
      "Jika ada hal yang ingin dikonfirmasi, silakan balas pesan ini.",
      "",
      "Salam,",
      "Tim Rekrutmen HireUMKM",
    ]
      .filter(Boolean)
      .join("\n");

    const url = buildWaLink(selected.whatsapp, message);
    if (!url) {
      setFeedback({ type: "error", message: `Nomor WhatsApp ${selected.nama} belum valid.` });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (item) =>
        tabMatch(item, activeTab) &&
        (!term || [item.nama, item.posisi, item.domisili, item.whatsapp, item.statusPersiapan, item.tahapProses].join(" ").toLowerCase().includes(term)),
    );
  }, [activeTab, rows, search]);

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.key, rows.filter((item) => tabMatch(item, tab.key)).length])), [rows]);
  const selectedReadiness = useMemo(() => readinessProgress(form), [form]);

  const summary = useMemo(
    () => [
      { label: "Total kandidat akhir", value: rows.length, note: "Kandidat yang offering-nya sudah diterima sampai hari pertama masuk.", icon: UserPlus, tone: "slate" },
      { label: "Belum lengkap", value: rows.filter((item) => item.statusPersiapan === "Belum lengkap").length, note: "Masih perlu dilengkapi oleh recruiter.", icon: BriefcaseBusiness, tone: "amber" },
      { label: "Sedang disiapkan", value: rows.filter((item) => item.statusPersiapan === "Sedang disiapkan").length, note: "Detail hari pertama dan kebutuhan masuk kerja sedang dirapikan.", icon: BriefcaseBusiness, tone: "sky" },
      { label: "Siap masuk kerja", value: rows.filter((item) => item.statusPersiapan === "Siap masuk kerja").length, note: "Tinggal dijalankan pada hari pertama kerja.", icon: ShieldCheck, tone: "emerald" },
      { label: "Sudah masuk kerja", value: rows.filter((item) => item.statusPersiapan === "Sudah masuk kerja").length, note: "Sudah dinyatakan mulai bekerja.", icon: CheckCircle2, tone: "emerald" },
    ],
    [rows],
  );

  return (
    <div className="space-y-4">
      <Card className={employeeDensity.card}>
        <CardContent className="space-y-4 p-5">
          <div className="max-w-3xl">
            <div className={employeeDensity.overline}>HR Administrasi</div>
            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">Karyawan Baru</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Kelola kesiapan masuk kerja dan status hari pertama untuk kandidat yang penawaran kerjanya sudah diterima.</p>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_320px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, posisi, domisili, nomor WhatsApp, atau status kandidat"
                className="rounded-[10px] border-[var(--border-soft)] bg-white pl-9"
              />
            </div>

            <div className={`${employeeDensity.inset} bg-white px-4 py-3 text-[13px] text-[var(--text-muted)]`}>
              Alur aktif: <span className="font-medium text-[var(--text-main)]">Offering diterima -&gt; Siap masuk -&gt; Sudah masuk kerja</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <div className={`rounded-[12px] border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : feedback.type === "info" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      ) : null}

      {error ? <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Metric key={item.label} {...item} />
        ))}
      </div>

      <Card className={employeeDensity.cardFlat}>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[10px] border px-4 py-2 text-[13px] font-semibold leading-5 transition ${
                  active
                    ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white"
                    : "border-[var(--border-soft)] bg-white text-[var(--text-muted)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]"
                }`}
              >
                {tab.label} ({counts[tab.key] || 0})
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className={employeeDensity.cardFlat}>
        <CardContent className="space-y-4 p-5">
          <div className="border-b border-[rgba(214,222,234,0.82)] pb-4">
            <div className={employeeDensity.sectionTitle}>Daftar kandidat karyawan baru</div>
            <div className={employeeDensity.sectionDescription}>{filtered.length} data ditemukan. Recruiter bisa merapikan detail persiapan masuk lalu menandai kandidat sudah mulai bekerja.</div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4 text-sm text-[var(--text-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Memuat data karyawan baru...
            </div>
          ) : null}

          <div className="space-y-3">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-[14px] border border-[rgba(191,204,220,0.78)] p-4 transition hover:bg-[var(--surface-0)]/75">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <div className="text-lg font-semibold text-[var(--text-main)]">{item.nama}</div>
                        <div className="text-sm text-[var(--text-muted)]">{item.usia ? `${item.usia} - ` : ""}{item.posisi}</div>
                      </div>
                      <StatusBadge value={item.tahapProses} />
                      <StatusBadge value={item.statusPersiapan} />
                    </div>

                    <div className="grid gap-2.5 text-sm text-[var(--text-muted)] md:grid-cols-2 xl:grid-cols-4">
                      <div className={`${employeeDensity.inset} p-3`}>
                        <div className={employeeDensity.fieldLabel}>Mulai kerja</div>
                        <div className="mt-1.5 font-medium text-[var(--text-main)]">{item.form.startDate ? formatDate(item.form.startDate) : "Belum diatur"}</div>
                      </div>
                      <div className={`${employeeDensity.inset} p-3`}>
                        <div className={employeeDensity.fieldLabel}>Status kerja</div>
                        <div className="mt-1.5 font-medium text-[var(--text-main)]">{item.form.employmentType || "Belum ditentukan"}</div>
                      </div>
                      <div className={`${employeeDensity.inset} p-3`}>
                        <div className={employeeDensity.fieldLabel}>Gaji final</div>
                        <div className="mt-1.5 font-medium text-[var(--text-main)]">{item.form.finalSalary ? formatCurrency(item.form.finalSalary) : "Belum diisi"}</div>
                      </div>
                      <div className={`${employeeDensity.inset} p-3`}>
                        <div className={employeeDensity.fieldLabel}>PIC recruiter</div>
                        <div className="mt-1.5 font-medium text-[var(--text-main)]">{item.form.owner || item.interviewer}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                      <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">
                        Checklist {readinessProgress(item.form).completed}/{readinessProgress(item.form).total}
                      </span>
                      <span>{readinessProgress(item.form).isComplete ? "Semua syarat siap masuk sudah lengkap." : "Masih ada checklist utama yang perlu dibereskan."}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-[280px] xl:justify-end">
                    <Button variant="outline" className="rounded-[10px]" onClick={() => setSelected(item)}>
                      Detail
                    </Button>
                    <Button variant="outline" className="rounded-[10px]" onClick={() => setSelected(item)}>
                      Kelola
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] p-8 text-center text-sm text-[var(--text-muted)]">
                Belum ada kandidat karyawan baru yang cocok dengan pencarian atau filter yang dipilih.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-[rgba(214,222,234,0.82)] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[rgba(214,222,234,0.82)] bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-[var(--text-main)]">{selected.nama}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{selected.posisi} - {selected.domisili}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-[10px] border border-[var(--border-soft)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selected.tahapProses} />
                <StatusBadge value={selected.statusPersiapan} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoPanel
                  title="Snapshot kandidat"
                  rows={[
                    ["WhatsApp", selected.whatsapp],
                    ["Email", selected.email],
                    ["Pendidikan", selected.pendidikan],
                    ["Ekspektasi gaji", selected.ekspektasiGaji],
                    ["CV", selected.cv],
                  ]}
                />
                <InfoPanel
                  title="Ringkasan tahap akhir"
                  rows={[
                    ["Interviewer", selected.interviewer],
                    ["Jadwal wawancara", selected.interviewDatetime ? formatDateTime(selected.interviewDatetime) : "-"],
                    ["Tahap saat ini", selected.tahapProses],
                    ["Status persiapan", selected.statusPersiapan],
                  ]}
                />
              </div>

              <Card className={employeeDensity.cardFlat}>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-[var(--text-main)]">Pengalaman singkat</div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{selected.pengalaman}</div>
                </CardContent>
              </Card>

              <Card className={employeeDensity.cardFlat}>
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-[var(--text-main)]">Form kesiapan masuk kerja</div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Tanggal mulai kerja</div>
                      <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="rounded-[10px] border-[var(--border-soft)]" />
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Status kerja</div>
                      <select
                        value={form.employmentType}
                        onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))}
                        className="h-10 w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)]"
                      >
                        {employmentOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Gaji final yang ditawarkan</div>
                      <Input
                        value={form.finalSalary}
                        onChange={(event) => setForm((current) => ({ ...current, finalSalary: event.target.value.replace(/[^\d]/g, "") }))}
                        placeholder="Contoh: 3500000"
                        className="rounded-[10px] border-[var(--border-soft)]"
                      />
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Penanggung jawab</div>
                      <Input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Nama recruiter / PIC" className="rounded-[10px] border-[var(--border-soft)]" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan onboarding</div>
                    <textarea
                      value={form.offerNote}
                      onChange={(event) => setForm((current) => ({ ...current, offerNote: event.target.value }))}
                      rows={5}
                      placeholder="Tulis poin penting untuk kandidat, misalnya dokumen yang harus dibawa, arahan hari pertama, atau catatan onboarding."
                      className="min-h-[132px] w-full rounded-[10px] border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={employeeDensity.cardFlat}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-main)]">Checklist siap masuk</div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">Status `Siap masuk` hanya aktif kalau semua checklist utama ini sudah lengkap.</div>
                    </div>
                    <div className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${selectedReadiness.isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {selectedReadiness.completed}/{selectedReadiness.total} checklist lengkap
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedReadiness.items.map((item) => {
                      const isManual = ["documentsReceived", "firstDayBriefReady"].includes(item.key);
                      return (
                        <label key={item.key} className={`flex items-start gap-3 rounded-[12px] border px-4 py-3 text-sm ${item.done ? "border-emerald-200 bg-emerald-50/60" : "border-[var(--border-soft)] bg-white"}`}>
                          {isManual ? (
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={(event) => setForm((current) => ({ ...current, [item.key]: event.target.checked }))}
                              className="mt-0.5 h-4 w-4 rounded border-[var(--border-soft)] text-[var(--brand-800)] focus:ring-[var(--brand-700)]"
                            />
                          ) : (
                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400"}`}>
                              {item.done ? "✓" : ""}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[var(--text-main)]">{item.label}</div>
                            <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">
                              {isManual
                                ? item.key === "documentsReceived"
                                  ? "Centang jika dokumen utama kandidat sudah diterima tim HR."
                                  : "Centang jika arahan hari pertama seperti jam hadir, lokasi, dan PIC sudah siap dibagikan."
                                : "Terisi otomatis dari form di atas."}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2 border-t border-[rgba(214,222,234,0.82)] pt-4">
                <Button className="rounded-[10px]" onClick={() => void saveOffer()} disabled={submitting}>
                  Simpan persiapan
                </Button>
                <Button variant="outline" className="rounded-[10px]" onClick={contactCandidate}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hubungi kandidat
                </Button>
                <Button
                  variant="outline"
                  className="rounded-[10px] border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => void markReady()}
                  disabled={submitting || ["Siap masuk", "Sudah masuk kerja"].includes(selected.tahapProses) || !selectedReadiness.isComplete}
                >
                  Tandai siap masuk
                </Button>
                <Button className="rounded-[10px] bg-slate-900 hover:bg-slate-800" onClick={() => void markJoined()} disabled={submitting || selected.tahapProses === "Sudah masuk kerja"}>
                  Tandai sudah masuk kerja
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
