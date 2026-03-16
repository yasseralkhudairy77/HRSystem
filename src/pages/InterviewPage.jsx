import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, MessageCircle, Search, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { interviewAssessmentItems, interviewRecords } from "@/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getActiveCandidateTestPackageMap, isCandidateTestPackageFeatureUnavailable } from "@/services/candidateTestPackageService";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createInterviewSchedule } from "@/services/recruitmentWorkflowService";

const scoreOptions = ["Kurang", "Cukup", "Baik", "Sangat baik"];
const decisionToneClasses = {
  Lanjut: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pertimbangkan: "border-sky-200 bg-sky-50 text-sky-700",
  "Simpan dulu": "border-slate-200 bg-slate-100 text-slate-700",
  "Tidak lanjut": "border-rose-200 bg-rose-50 text-rose-700",
};
const INTERVIEW_FORM_MARKER_START = "[[INTERVIEW_FORM]]";
const INTERVIEW_FORM_MARKER_END = "[[/INTERVIEW_FORM]]";

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toTimeInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(11, 16);
}

function getAgeLabel(dateString) {
  if (!dateString) return "";
  const birthDate = new Date(dateString);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? `${age} tahun` : "";
}

function detectInterviewMethod(location, notes) {
  const combinedText = `${location || ""} ${notes || ""}`.toLowerCase();
  if (combinedText.includes("telepon") || combinedText.includes("phone")) return "Telepon";
  if (combinedText.includes("meet") || combinedText.includes("zoom") || combinedText.includes("http")) return "Online";
  return "Tatap muka";
}

function normalizeWhatsappNumber(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function buildWhatsAppLink(rawNumber, message) {
  const normalizedNumber = normalizeWhatsappNumber(rawNumber);
  return normalizedNumber ? `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}` : "";
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === "") return "-";
  const numericAmount = Number(amount);
  return Number.isFinite(numericAmount) ? `Rp${numericAmount.toLocaleString("id-ID")}` : "-";
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function coerceNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function appendRecruiterNote(previousNote, nextNote) {
  const note = String(nextNote || "").trim();
  if (!note) return previousNote || null;
  const stampedNote = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

function summarizeExperience(item) {
  const pengalamanList = Array.isArray(item?.pengalaman_list) ? item.pengalaman_list : [];
  if (pengalamanList.length) {
    return pengalamanList
      .slice(0, 2)
      .map((entry) => `${entry?.jabatan || "Posisi"} di ${entry?.perusahaan || "Perusahaan"}`)
      .join("; ");
  }
  if (item?.fresh_graduate) return "Fresh graduate.";
  return item?.pengalaman_utama_deskripsi || "Belum ada ringkasan pengalaman kerja.";
}

function createDefaultInterviewForm() {
  return {
    nilaiSikap: "Cukup",
    nilaiKomunikasi: "Cukup",
    nilaiJawaban: "Cukup",
    nilaiSemangatKerja: "Cukup",
    nilaiPengalaman: "Cukup",
    nilaiKesiapanKerja: "Cukup",
    nilaiKecocokanPosisi: "Cukup",
    nilaiKomitmen: "Cukup",
    nilaiKesesuaianGaji: "Cukup",
    kelebihan: "",
    keraguan: "",
    catatanUntukOwner: "",
    kesanUmum: "",
  };
}

function buildInterviewFormFromInterview(interview) {
  if (!interview) return createDefaultInterviewForm();
  return {
    nilaiSikap: interview.nilaiSikap || "Cukup",
    nilaiKomunikasi: interview.nilaiKomunikasi || "Cukup",
    nilaiJawaban: interview.nilaiJawaban || "Cukup",
    nilaiSemangatKerja: interview.nilaiSemangatKerja || "Cukup",
    nilaiPengalaman: interview.nilaiPengalaman || "Cukup",
    nilaiKesiapanKerja: interview.nilaiKesiapanKerja || "Cukup",
    nilaiKecocokanPosisi: interview.nilaiKecocokanPosisi || "Cukup",
    nilaiKomitmen: interview.nilaiKomitmen || "Cukup",
    nilaiKesesuaianGaji: interview.nilaiKesesuaianGaji || "Cukup",
    kelebihan: interview.kelebihan || "",
    keraguan: interview.keraguan || "",
    catatanUntukOwner: interview.catatanUntukOwner || "",
    kesanUmum: interview.kesanUmum || "",
  };
}

function parseInterviewNoteDocument(notes) {
  const rawNotes = typeof notes === "string" ? notes.trim() : "";
  if (!rawNotes) return { form: createDefaultInterviewForm(), scheduleContext: "" };
  const startIndex = rawNotes.indexOf(INTERVIEW_FORM_MARKER_START);
  const endIndex = rawNotes.indexOf(INTERVIEW_FORM_MARKER_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { form: createDefaultInterviewForm(), scheduleContext: rawNotes };
  }
  const jsonText = rawNotes.slice(startIndex + INTERVIEW_FORM_MARKER_START.length, endIndex).trim();
  try {
    const parsed = JSON.parse(jsonText);
    return {
      form: { ...createDefaultInterviewForm(), ...asObject(parsed.form) },
      scheduleContext: typeof parsed.scheduleContext === "string" ? parsed.scheduleContext : "",
    };
  } catch (error) {
    console.warn("Interview notes gagal diparse. Sistem memakai catatan polos sebagai konteks awal.", error);
    return { form: createDefaultInterviewForm(), scheduleContext: rawNotes };
  }
}

function buildReadableInterviewSummary(form, scheduleContext) {
  const scoreLines = [
    ["Sikap saat wawancara", form.nilaiSikap],
    ["Cara bicara dan komunikasi", form.nilaiKomunikasi],
    ["Kerapihan jawaban", form.nilaiJawaban],
    ["Semangat kerja", form.nilaiSemangatKerja],
    ["Pengalaman yang relevan", form.nilaiPengalaman],
    ["Kesiapan kerja", form.nilaiKesiapanKerja],
    ["Kecocokan dengan posisi", form.nilaiKecocokanPosisi],
    ["Komitmen kerja", form.nilaiKomitmen],
    ["Kesesuaian harapan gaji", form.nilaiKesesuaianGaji],
  ]
    .map(([label, value]) => `- ${label}: ${value}`)
    .join("\n");
  return [
    "Form wawancara recruiter",
    scheduleContext ? `\nKonteks awal wawancara:\n${scheduleContext}` : "",
    `\nPenilaian interviewer:\n${scoreLines}`,
    `\nKelebihan pelamar:\n${form.kelebihan || "-"}`,
    `\nHal yang masih meragukan:\n${form.keraguan || "-"}`,
    `\nCatatan untuk owner / user:\n${form.catatanUntukOwner || "-"}`,
    `\nKesan umum interviewer:\n${form.kesanUmum || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildInterviewNoteDocument(form, scheduleContext) {
  const payload = JSON.stringify({ form, scheduleContext: scheduleContext || "" });
  return `${INTERVIEW_FORM_MARKER_START}${payload}${INTERVIEW_FORM_MARKER_END}\n\n${buildReadableInterviewSummary(form, scheduleContext)}`;
}

function getSpmInterviewSummary(activePackage) {
  const spmItem = (activePackage?.candidate_test_package_items || []).find((item) => item.test_key === "spm");
  if (!spmItem) {
    return {
      headline: "Belum ada hasil IQ / SPM",
      meta: "Belum ada hasil kemampuan kognitif yang siap dibaca recruiter.",
    };
  }

  const resultJson = asObject(spmItem.result_json);
  const score = asObject(resultJson.score);
  const iqResult = asObject(resultJson.iq_result);
  const correct = coerceNumber(score.correct) ?? 0;
  const total = coerceNumber(score.total) ?? coerceNumber(resultJson.total_questions) ?? null;
  const percent = coerceNumber(score.percent);
  const iqScore = coerceNumber(iqResult.iq) ?? coerceNumber(spmItem.score_numeric);
  const classification =
    (typeof iqResult.classification === "string" && iqResult.classification.trim()) ||
    (typeof spmItem.score_label === "string" && spmItem.score_label.trim()) ||
    "Belum terklasifikasi";

  return {
    headline: iqScore ? `IQ ${iqScore} / ${classification}` : classification,
    meta: [`Benar ${correct}${total ? `/${total}` : ""}`, typeof percent === "number" ? `Akurasi ${percent}%` : null].filter(Boolean).join(" • "),
  };
}

function getInterviewDecision(item) {
  if (!item) return "Pertimbangkan";
  if (item.status_tindak_lanjut === "Tidak lanjut" || item.tahap_proses === "Tidak lanjut") return "Tidak lanjut";
  if (item.status_tindak_lanjut === "Disimpan" || item.tahap_proses === "Disimpan") return "Simpan dulu";
  if (item.status_tindak_lanjut === "Lanjut" || item.status_tindak_lanjut === "Masuk tahap akhir" || ["Tahap akhir", "Penawaran kerja", "Siap masuk"].includes(item.tahap_proses))
    return "Lanjut";
  if (item.status_tindak_lanjut === "Pertimbangkan") return "Pertimbangkan";
  return "Pertimbangkan";
}

function getInterviewStatus(item, hasValidInterviewDate, decision) {
  if (decision === "Tidak lanjut") return "Tidak lanjut";
  if (!hasValidInterviewDate) return "Perlu dijadwalkan";
  if (["Lanjut", "Pertimbangkan", "Simpan dulu"].includes(decision) && item.status_tindak_lanjut !== "Sedang diproses") return "Sudah diwawancara";
  return "Menunggu hasil";
}

function mapPelamarToInterview(item, activePackage = null) {
  if (!item || (!item.interview_datetime && item.tahap_proses !== "Wawancara")) return null;

  const interviewDate = item.interview_datetime ? new Date(item.interview_datetime) : null;
  const hasValidInterviewDate = interviewDate && !Number.isNaN(interviewDate.getTime());
  const scheduleIso = hasValidInterviewDate ? interviewDate.toISOString() : "";
  const parsedInterviewNotes = parseInterviewNoteDocument(item.interview_notes);
  const keputusanAkhir = getInterviewDecision(item);
  const statusHasil = getInterviewStatus(item, hasValidInterviewDate, keputusanAkhir);
  const education = [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-";
  const spmSummary = getSpmInterviewSummary(activePackage);

  return {
    id: `pelamar-${item.id}`,
    candidateId: item.id,
    namaPelamar: item.nama_lengkap,
    usia: getAgeLabel(item.tanggal_lahir),
    posisiDilamar: item.posisi_dilamar,
    namaUsaha: "HireUMKM Demo",
    namaCabang: "-",
    tanggalWawancara: hasValidInterviewDate ? interviewDate.toISOString().slice(0, 10) : "",
    jamWawancara: hasValidInterviewDate ? interviewDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
    interviewDatetime: scheduleIso,
    interviewer: item.interview_interviewer || "-",
    metodeWawancara: hasValidInterviewDate ? detectInterviewMethod(item.interview_location, item.interview_notes) : "Belum ditentukan",
    statusHasil,
    keputusanAkhir,
    tahapProses: item.tahap_proses || "Wawancara",
    statusTindakLanjut: item.status_tindak_lanjut || "Sedang diproses",
    nilaiSikap: parsedInterviewNotes.form.nilaiSikap,
    nilaiKomunikasi: parsedInterviewNotes.form.nilaiKomunikasi,
    nilaiJawaban: parsedInterviewNotes.form.nilaiJawaban,
    nilaiSemangatKerja: parsedInterviewNotes.form.nilaiSemangatKerja,
    nilaiPengalaman: parsedInterviewNotes.form.nilaiPengalaman,
    nilaiKesiapanKerja: parsedInterviewNotes.form.nilaiKesiapanKerja,
    nilaiKecocokanPosisi: parsedInterviewNotes.form.nilaiKecocokanPosisi,
    nilaiKomitmen: parsedInterviewNotes.form.nilaiKomitmen,
    nilaiKesesuaianGaji: parsedInterviewNotes.form.nilaiKesesuaianGaji,
    kelebihan: parsedInterviewNotes.form.kelebihan,
    keraguan: parsedInterviewNotes.form.keraguan,
    catatanUntukOwner: parsedInterviewNotes.form.catatanUntukOwner,
    kesanUmum: parsedInterviewNotes.form.kesanUmum,
    catatanSingkat:
      parsedInterviewNotes.scheduleContext ||
      item.catatan_recruiter ||
      (hasValidInterviewDate ? `Jadwal wawancara ${formatDateTime(scheduleIso)}.` : "Kandidat sudah masuk tahap wawancara dan menunggu penjadwalan."),
    catatanRecruiter: item.catatan_recruiter || "",
    interviewLocation: item.interview_location || "",
    scheduleContext: parsedInterviewNotes.scheduleContext,
    noWhatsapp: item.no_hp || "-",
    email: item.email || "-",
    domisili: item.alamat_domisili || "-",
    pendidikanTerakhir: education,
    asalPelamar: item.sumber_info_lowongan || "-",
    ekspektasiGaji: formatCurrency(item.ekspektasi_gaji),
    pengalamanSingkat: summarizeExperience(item),
    iqHeadline: spmSummary.headline,
    iqMeta: spmSummary.meta,
    cvFile: item.cv_file_name || "-",
  };
}

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-11 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
          {typeof option === "string" ? option : option.label}
        </option>
      ))}
    </select>
  );
}

function SummaryItem({ label, value, note }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-soft)] bg-white px-5 py-4">
      <div className="text-sm text-[var(--text-soft)]">{label}</div>
      <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{note}</div>
    </div>
  );
}

function InterviewRatingField({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-4">
      <div className="text-sm font-medium text-[var(--text-main)]">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {scoreOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              option === value
                ? "border-[var(--brand-900)] bg-[var(--brand-900)] text-white"
                : "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function DecisionBadge({ value, fullWidth = false }) {
  return (
    <Badge
      className={`justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
        fullWidth ? "w-full min-w-[160px]" : "min-w-[120px]"
      } ${decisionToneClasses[value] || "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-main)]"}`}
    >
      {value}
    </Badge>
  );
}

function TextAreaField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-h-[112px] w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
    />
  );
}

function ActionModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[var(--border-soft)] bg-white px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">{children}</div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const [interviewRows, setInterviewRows] = useState(interviewRecords);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [interviewerFilter, setInterviewerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewForm, setInterviewForm] = useState(createDefaultInterviewForm());
  const [activePackageMapByCandidate, setActivePackageMapByCandidate] = useState({});
  const [scheduleModalInterview, setScheduleModalInterview] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ date: "", time: "", interviewer: "", location: "", notes: "" });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  
  useEffect(() => {
    void loadInterviews();
  }, []);

  useEffect(() => {
    setInterviewForm(selectedInterview ? buildInterviewFormFromInterview(selectedInterview) : createDefaultInterviewForm());
  }, [selectedInterview]);

  async function loadInterviews() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [pelamarRows, activePackageMap] = await Promise.all([
        getPelamarList(),
        getActiveCandidateTestPackageMap().catch((error) => {
          if (isCandidateTestPackageFeatureUnavailable(error)) {
            console.warn("Fitur paket tes belum aktif untuk halaman wawancara. Ringkasan IQ tidak ditampilkan.", error);
            return {};
          }

          throw error;
        }),
      ]);

      setActivePackageMapByCandidate(activePackageMap);
      const mappedRows = pelamarRows
        .filter((item) => !item.archived)
        .filter((item) => item.interview_datetime || item.tahap_proses === "Wawancara")
        .map((item) => mapPelamarToInterview(item, activePackageMap[item.id] || null))
        .filter(Boolean)
        .sort((left, right) => {
          const leftStamp = left.interviewDatetime || "9999-12-31T23:59:59.000Z";
          const rightStamp = right.interviewDatetime || "9999-12-31T23:59:59.000Z";
          return leftStamp.localeCompare(rightStamp);
        });

      setInterviewRows(mappedRows);
    } catch (error) {
      console.error("Load wawancara gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data wawancara.");
      setInterviewRows(interviewRecords);
    } finally {
      setIsLoading(false);
    }
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
  }

  function syncInterviewInState(updatedRow) {
    const mappedInterview = mapPelamarToInterview(updatedRow, activePackageMapByCandidate[updatedRow.id] || null);

    if (!mappedInterview) {
      setInterviewRows((currentRows) => currentRows.filter((item) => item.candidateId !== updatedRow.id));
      setSelectedInterview((current) => (current?.candidateId === updatedRow.id ? null : current));
      return null;
    }

    setInterviewRows((currentRows) =>
      [...currentRows.filter((item) => item.candidateId !== updatedRow.id), mappedInterview].sort((left, right) => {
        const leftStamp = left.interviewDatetime || "9999-12-31T23:59:59.000Z";
        const rightStamp = right.interviewDatetime || "9999-12-31T23:59:59.000Z";
        return leftStamp.localeCompare(rightStamp);
      }),
    );
    setSelectedInterview((current) => (current?.candidateId === updatedRow.id ? mappedInterview : current));
    return mappedInterview;
  }

  function openInterviewDetail(interview) {
    setSelectedInterview(interview);
  }

  function openScheduleModal(interview) {
    setScheduleModalInterview(interview);
    setScheduleForm({
      date: toDateInputValue(interview?.interviewDatetime),
      time: toTimeInputValue(interview?.interviewDatetime),
      interviewer: interview?.interviewer && interview.interviewer !== "-" ? interview.interviewer : "",
      location: interview?.interviewLocation || "",
      notes: interview?.scheduleContext || "",
    });
  }

  function closeScheduleModal() {
    if (isSubmittingAction) return;
    setScheduleModalInterview(null);
  }

  function handleContactCandidate(interview) {
    const scheduleLine = interview.interviewDatetime
      ? `Jadwal wawancara Anda saat ini adalah ${formatDateTime(interview.interviewDatetime)} dengan interviewer ${interview.interviewer || "-"}.`
      : "Saat ini tim kami sedang menyiapkan jadwal wawancara Anda.";
    const message = `Halo ${interview.namaPelamar}, terima kasih sudah mengikuti proses rekrutmen posisi ${interview.posisiDilamar} di HireUMKM.\n\n${scheduleLine}\n\nJika ada perubahan atau konfirmasi kehadiran, silakan balas pesan ini.\n\nSalam,\nTim Rekrutmen HireUMKM`;
    const url = buildWhatsAppLink(interview.noWhatsapp, message);

    if (!url) {
      showFeedback("error", `Nomor WhatsApp ${interview.namaPelamar} belum valid.`);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveSchedule() {
    if (!scheduleModalInterview) return;
    if (!scheduleForm.date || !scheduleForm.time || !scheduleForm.interviewer.trim() || !scheduleForm.location.trim()) {
      showFeedback("error", "Tanggal, jam, interviewer, dan lokasi/link wajib diisi.");
      return;
    }

    const interviewDatetime = new Date(`${scheduleForm.date}T${scheduleForm.time}:00`).toISOString();
    const formState =
      selectedInterview?.candidateId === scheduleModalInterview.candidateId ? interviewForm : buildInterviewFormFromInterview(scheduleModalInterview);

    setIsSubmittingAction(true);

    try {
      const updatedRow = await updatePelamar(scheduleModalInterview.candidateId, {
        tahap_proses: "Wawancara",
        status_tindak_lanjut: "Sedang diproses",
        interview_datetime: interviewDatetime,
        interview_interviewer: scheduleForm.interviewer.trim(),
        interview_location: scheduleForm.location.trim(),
        interview_notes: buildInterviewNoteDocument(formState, scheduleForm.notes.trim()),
        catatan_recruiter: appendRecruiterNote(
          scheduleModalInterview.catatanRecruiter,
          `Jadwal wawancara diatur untuk ${formatDateTime(interviewDatetime)} dengan interviewer ${scheduleForm.interviewer.trim()}.`,
        ),
      });

      if (!updatedRow) throw new Error("Data kandidat tidak ditemukan setelah jadwal disimpan.");

      try {
        await createInterviewSchedule({
          pelamar_id: scheduleModalInterview.candidateId,
          interview_datetime: interviewDatetime,
          interviewer: scheduleForm.interviewer.trim(),
          location: scheduleForm.location.trim(),
          notes: scheduleForm.notes.trim() || null,
        });
      } catch (scheduleError) {
        console.warn("Log jadwal wawancara belum berhasil disimpan:", scheduleError);
        showFeedback("info", `Jadwal ${scheduleModalInterview.namaPelamar} tersimpan, tetapi log jadwal belum berhasil dicatat.`);
      }

      syncInterviewInState(updatedRow);
      showFeedback("success", `Jadwal wawancara ${scheduleModalInterview.namaPelamar} berhasil diperbarui.`);
      setScheduleModalInterview(null);
    } catch (error) {
      console.error("Simpan jadwal wawancara gagal:", error);
      showFeedback("error", error instanceof Error ? error.message : "Jadwal wawancara belum berhasil disimpan.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function persistInterviewDecision(interview, decision, options = {}) {
    if (!interview) return null;

    const previousStage = interview.tahapProses || "Wawancara";
    const payload = {
      interview_notes: options.interview_notes ?? buildInterviewNoteDocument(interviewForm, interview.scheduleContext),
      catatan_recruiter: appendRecruiterNote(interview.catatanRecruiter, options.note || `Hasil wawancara disimpan dengan keputusan "${decision}".`),
      alasan_tidak_lanjut: decision === "Tidak lanjut" ? "Belum sesuai dengan kebutuhan posisi pada tahap wawancara saat ini." : null,
    };
    let nextStage = previousStage;

    if (decision === "Lanjut") {
      payload.tahap_proses = options.advanceStage ? "Penawaran kerja" : "Wawancara";
      payload.status_tindak_lanjut = options.advanceStage ? "Masuk tahap akhir" : "Lanjut";
      nextStage = payload.tahap_proses;
    } else if (decision === "Simpan dulu") {
      payload.tahap_proses = "Disimpan";
      payload.status_tindak_lanjut = "Disimpan";
      nextStage = "Disimpan";
    } else if (decision === "Tidak lanjut") {
      payload.tahap_proses = "Tidak lanjut";
      payload.status_tindak_lanjut = "Tidak lanjut";
      nextStage = "Tidak lanjut";
    } else {
      payload.tahap_proses = "Wawancara";
      payload.status_tindak_lanjut = "Pertimbangkan";
      nextStage = "Wawancara";
    }

    setIsSubmittingAction(true);

    try {
      const updatedRow = await updatePelamar(interview.candidateId, payload);
      if (!updatedRow) throw new Error("Data kandidat tidak ditemukan setelah hasil wawancara disimpan.");

      if (nextStage !== previousStage) {
        try {
          await createStageHistory({
            pelamar_id: interview.candidateId,
            dari_tahap: previousStage,
            ke_tahap: nextStage,
            catatan: options.note || `Keputusan wawancara: ${decision}.`,
          });
        } catch (historyError) {
          console.warn("Riwayat tahap wawancara belum berhasil disimpan:", historyError);
          showFeedback("info", `Status ${interview.namaPelamar} sudah berubah, tetapi riwayat tahap belum berhasil dicatat.`);
        }
      }

      const mappedInterview = syncInterviewInState(updatedRow);
      showFeedback("success", options.successMessage || `Keputusan wawancara ${interview.namaPelamar} berhasil disimpan.`);
      return mappedInterview;
    } catch (error) {
      console.error("Simpan keputusan wawancara gagal:", error);
      showFeedback("error", error instanceof Error ? error.message : "Keputusan wawancara belum berhasil disimpan.");
      return null;
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleSaveInterviewResult() {
    if (!selectedInterview) return;
    await persistInterviewDecision(selectedInterview, selectedInterview.keputusanAkhir || "Pertimbangkan", {
      interview_notes: buildInterviewNoteDocument(interviewForm, selectedInterview.scheduleContext),
      note: "Form wawancara recruiter diperbarui.",
      successMessage: `Form wawancara ${selectedInterview.namaPelamar} berhasil disimpan.`,
    });
  }

  async function handleAdvanceCandidate() {
    if (!selectedInterview) return;
    const nextInterview = await persistInterviewDecision(selectedInterview, "Lanjut", {
      advanceStage: true,
      interview_notes: buildInterviewNoteDocument(interviewForm, selectedInterview.scheduleContext),
      note: "Kandidat dinyatakan lanjut dari tahap wawancara ke penawaran kerja.",
      successMessage: `${selectedInterview.namaPelamar} dilanjutkan ke penawaran kerja.`,
    });
    if (nextInterview) setSelectedInterview(nextInterview);
  }

  async function handleSaveForTalentPool() {
    if (!selectedInterview) return;
    const nextInterview = await persistInterviewDecision(selectedInterview, "Simpan dulu", {
      interview_notes: buildInterviewNoteDocument(interviewForm, selectedInterview.scheduleContext),
      note: "Kandidat disimpan sebagai cadangan setelah tahap wawancara.",
      successMessage: `${selectedInterview.namaPelamar} disimpan sebagai cadangan.`,
    });
    if (nextInterview) setSelectedInterview(nextInterview);
  }

  async function handleRejectCandidate() {
    if (!selectedInterview) return;
    const nextInterview = await persistInterviewDecision(selectedInterview, "Tidak lanjut", {
      interview_notes: buildInterviewNoteDocument(interviewForm, selectedInterview.scheduleContext),
      note: "Kandidat dinyatakan tidak lanjut dari tahap wawancara.",
      successMessage: `${selectedInterview.namaPelamar} ditandai tidak lanjut.`,
    });
    if (!nextInterview) return;

    const message = `Halo ${selectedInterview.namaPelamar}, terima kasih sudah meluangkan waktu untuk mengikuti tahap wawancara posisi ${selectedInterview.posisiDilamar} di HireUMKM.\n\nSetelah kami meninjau seluruh proses seleksi, saat ini kami memutuskan untuk belum melanjutkan proses rekrutmen ke tahap berikutnya karena kebutuhan posisi yang sedang kami prioritaskan belum sepenuhnya sesuai dengan profil yang kami cari saat ini.\n\nKami sangat menghargai waktu, kesiapan, dan ketertarikan Anda untuk bergabung bersama tim kami. Semoga Anda segera mendapatkan peluang kerja yang paling sesuai dengan rencana karier Anda.\n\nSalam hormat,\nTim Rekrutmen HireUMKM`;
    const url = buildWhatsAppLink(selectedInterview.noWhatsapp, message);

    if (!url) {
      showFeedback("info", `Status ${selectedInterview.namaPelamar} sudah diperbarui, tetapi nomor WhatsApp kandidat belum valid.`);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const filterOptions = useMemo(
    () => ({
      positions: [...new Set(interviewRows.map((item) => item.posisiDilamar))],
      companies: [...new Set(interviewRows.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      interviewers: [...new Set(interviewRows.map((item) => item.interviewer))],
      statuses: [...new Set(interviewRows.map((item) => item.statusHasil))],
      dates: [...new Set(interviewRows.map((item) => item.tanggalWawancara).filter(Boolean))],
    }),
    [interviewRows],
  );

  const filteredInterviews = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return interviewRows.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        [item.namaPelamar, item.posisiDilamar, item.domisili, item.interviewer, item.catatanSingkat]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      return (
        (!positionFilter || item.posisiDilamar === positionFilter) &&
        (!companyFilter || `${item.namaUsaha} - ${item.namaCabang}` === companyFilter) &&
        (!interviewerFilter || item.interviewer === interviewerFilter) &&
        (!statusFilter || item.statusHasil === statusFilter) &&
        (!dateFilter || item.tanggalWawancara === dateFilter) &&
        matchesSearch
      );
    });
  }, [companyFilter, dateFilter, interviewRows, interviewerFilter, positionFilter, search, statusFilter]);

  const summaryItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return [
      { label: "Jadwal hari ini", value: String(interviewRows.filter((item) => item.tanggalWawancara === today).length), note: "Wawancara yang sedang berjalan hari ini." },
      { label: "Sudah diwawancara", value: String(interviewRows.filter((item) => item.statusHasil === "Sudah diwawancara").length), note: "Form interview sudah terisi dan tersimpan." },
      { label: "Menunggu hasil", value: String(interviewRows.filter((item) => item.statusHasil === "Menunggu hasil").length), note: "Sudah ada jadwal, tetapi belum disimpulkan recruiter." },
      { label: "Perlu dijadwalkan", value: String(interviewRows.filter((item) => item.statusHasil === "Perlu dijadwalkan").length), note: "Sudah masuk tahap wawancara tetapi jadwal belum diatur." },
      { label: "Lanjut", value: String(interviewRows.filter((item) => item.keputusanAkhir === "Lanjut").length), note: "Siap diteruskan ke tahap berikutnya." },
    ];
  }, [interviewRows]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Wawancara HRD" subtitle="Pantau jadwal, isi formulir wawancara, dan ambil keputusan kandidat dari satu halaman yang rapi." />

      <section className="border-b border-[var(--border-soft)] pb-6">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Menu Wawancara HRD</div>
          <div className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
            Form wawancara recruiter dibuat lebih terstruktur agar ringkasan kandidat dan penilaian ada di satu tempat.
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            Recruiter bisa melihat data pelamar, sorotan IQ singkat, jadwal wawancara, lalu langsung mengisi formulir penilaian tanpa membuka halaman lain.
          </p>
        </div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="rounded-lg p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <section className="space-y-5">
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">Filter wawancara</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">Gunakan filter untuk menemukan jadwal atau formulir interview dengan lebih cepat.</div>
              </div>
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">{filteredInterviews.length} data tampil</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative md:col-span-2 xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama pelamar, posisi, domisili, atau interviewer..."
                  className="h-11 rounded-xl border-[var(--border-soft)] bg-white pl-10"
                />
              </div>
              <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
              <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / UMKM" />
              <FilterSelect value={interviewerFilter} onChange={setInterviewerFilter} options={filterOptions.interviewers} placeholder="Semua interviewer" />
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.statuses} placeholder="Semua status hasil" />
              <FilterSelect value={dateFilter} onChange={setDateFilter} options={filterOptions.dates.map((item) => ({ value: item, label: formatDate(item) }))} placeholder="Semua tanggal wawancara" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryItems.map((item) => (
            <SummaryItem key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white">
        {isLoading ? (
          <div className="flex items-center gap-3 border-b border-[var(--border-soft)] px-5 py-4 text-sm text-[var(--text-muted)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Memuat jadwal wawancara...
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[2.1fr_1.4fr_1.1fr_1.2fr_1.1fr_170px] border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-4 text-[13px] font-semibold text-[var(--text-main)]">
              <div>Pelamar</div>
              <div>Jadwal</div>
              <div>Interviewer</div>
              <div>Metode</div>
              <div>Status</div>
              <div>Tindakan</div>
            </div>

            {filteredInterviews.map((item, index) => (
              <div
                key={item.id}
                onClick={() => openInterviewDetail(item)}
                className={`grid cursor-pointer grid-cols-[2.1fr_1.4fr_1.1fr_1.2fr_1.1fr_170px] items-center border-b border-[var(--border-soft)] px-5 py-4 text-sm transition hover:bg-[var(--surface-0)] ${
                  selectedInterview?.id === item.id ? "bg-sky-50/70" : index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <div className="pr-4">
                  <div className="font-semibold text-[var(--text-main)]">{item.namaPelamar}</div>
                  <div className="mt-1 text-[var(--text-muted)]">
                    {item.usia ? `${item.usia} / ` : ""}
                    {item.posisiDilamar}
                  </div>
                  <div className="mt-1 text-[var(--text-soft)]">{item.domisili}</div>
                  <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.catatanSingkat}</div>
                </div>

                <div className="pr-4">
                  <div className="font-medium text-[var(--text-main)]">{item.tanggalWawancara ? formatDate(item.tanggalWawancara) : "Belum dijadwalkan"}</div>
                  <div className="mt-1 text-[var(--text-muted)]">{item.jamWawancara || "Atur jadwal di menu wawancara HRD"}</div>
                </div>

                <div className="pr-4 font-medium text-[var(--text-main)]">{item.interviewer}</div>
                <div className="pr-4 text-[var(--text-main)]">{item.metodeWawancara}</div>

                <div className="pr-4">
                  <div className="flex w-full flex-col gap-2">
                    <StatusBadge value={item.statusHasil} className="w-full min-w-[160px] justify-center rounded-full px-3 py-1.5" />
                    <DecisionBadge value={item.keputusanAkhir} fullWidth />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openInterviewDetail(item); }}>
                    Detail
                  </Button>
                  <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openInterviewDetail(item); }}>
                    Input
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredInterviews.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-base font-semibold text-[var(--text-main)]">Belum ada data wawancara</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Coba ubah filter atau kata pencarian untuk menampilkan jadwal yang sesuai.</p>
          </div>
        ) : null}
      </section>

      {selectedInterview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Form Wawancara</div>
                <div className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedInterview.namaPelamar}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedInterview.usia ? `${selectedInterview.usia} / ` : ""}
                  {selectedInterview.posisiDilamar} / {selectedInterview.domisili}
                </div>
              </div>
              <button onClick={() => setSelectedInterview(null)} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <StatusBadge value={selectedInterview.statusHasil} className="rounded-full px-3 py-1.5" />
                <Badge variant="outline" className="rounded-full px-3 py-1.5">{selectedInterview.metodeWawancara}</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1.5">{selectedInterview.interviewer}</Badge>
                <DecisionBadge value={selectedInterview.keputusanAkhir} />
              </div>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Snapshot kandidat</div>
                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
                  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {[
                      ["Posisi dilamar", selectedInterview.posisiDilamar],
                      ["Domisili", selectedInterview.domisili],
                      ["WhatsApp", selectedInterview.noWhatsapp || "-"],
                      ["Email", selectedInterview.email],
                      ["Pendidikan terakhir", selectedInterview.pendidikanTerakhir],
                      ["Asal pelamar", selectedInterview.asalPelamar],
                      ["Ekspektasi gaji", selectedInterview.ekspektasiGaji],
                      ["File CV", selectedInterview.cvFile],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-sm text-[var(--text-soft)]">{label}</div>
                        <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">IQ / SPM singkat</div>
                      <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--text-main)]">{selectedInterview.iqHeadline}</div>
                      <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{selectedInterview.iqMeta}</div>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Pengalaman singkat</div>
                      <div className="mt-2 text-sm leading-7 text-[var(--text-main)]">{selectedInterview.pengalamanSingkat}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Ringkasan wawancara</div>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Tanggal wawancara", selectedInterview.tanggalWawancara ? formatDate(selectedInterview.tanggalWawancara) : "Belum dijadwalkan"],
                    ["Jam wawancara", selectedInterview.jamWawancara || "-"],
                    ["Interviewer", selectedInterview.interviewer],
                    ["Metode", selectedInterview.metodeWawancara],
                    ["Status hasil", selectedInterview.statusHasil],
                    ["Keputusan saat ini", selectedInterview.keputusanAkhir],
                    ["Lokasi / link", selectedInterview.interviewLocation || "-"],
                    ["Usia kandidat", selectedInterview.usia || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm text-[var(--text-soft)]">{label}</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                    </div>
                  ))}
                </div>
                {selectedInterview.scheduleContext ? (
                  <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                    <div className="text-sm text-[var(--text-soft)]">Catatan konteks awal wawancara</div>
                    <div className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--text-main)]">{selectedInterview.scheduleContext}</div>
                  </div>
                ) : null}
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Form penilaian interviewer</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <InterviewRatingField label="Sikap saat wawancara" value={interviewForm.nilaiSikap} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiSikap: value }))} />
                  <InterviewRatingField label="Cara bicara dan komunikasi" value={interviewForm.nilaiKomunikasi} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiKomunikasi: value }))} />
                  <InterviewRatingField label="Kerapihan jawaban" value={interviewForm.nilaiJawaban} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiJawaban: value }))} />
                  <InterviewRatingField label="Semangat kerja" value={interviewForm.nilaiSemangatKerja} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiSemangatKerja: value }))} />
                  <InterviewRatingField label="Pengalaman yang relevan" value={interviewForm.nilaiPengalaman} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiPengalaman: value }))} />
                  <InterviewRatingField label="Kesiapan kerja" value={interviewForm.nilaiKesiapanKerja} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiKesiapanKerja: value }))} />
                  <InterviewRatingField label="Kecocokan dengan posisi" value={interviewForm.nilaiKecocokanPosisi} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiKecocokanPosisi: value }))} />
                  <InterviewRatingField label="Komitmen kerja" value={interviewForm.nilaiKomitmen} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiKomitmen: value }))} />
                  <InterviewRatingField label="Kesesuaian harapan gaji" value={interviewForm.nilaiKesesuaianGaji} onChange={(value) => setInterviewForm((current) => ({ ...current, nilaiKesesuaianGaji: value }))} />
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Catatan recruiter</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Kelebihan pelamar</div>
                    <TextAreaField value={interviewForm.kelebihan} onChange={(value) => setInterviewForm((current) => ({ ...current, kelebihan: value }))} placeholder="Tuliskan kekuatan utama kandidat yang terlihat saat wawancara." />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Hal yang masih meragukan</div>
                    <TextAreaField value={interviewForm.keraguan} onChange={(value) => setInterviewForm((current) => ({ ...current, keraguan: value }))} placeholder="Tuliskan concern recruiter atau hal yang masih perlu dicek lagi." />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan untuk owner / user</div>
                    <TextAreaField value={interviewForm.catatanUntukOwner} onChange={(value) => setInterviewForm((current) => ({ ...current, catatanUntukOwner: value }))} placeholder="Tuliskan poin penting untuk owner atau user sebelum keputusan akhir." />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Kesan umum interviewer</div>
                    <TextAreaField value={interviewForm.kesanUmum} onChange={(value) => setInterviewForm((current) => ({ ...current, kesanUmum: value }))} placeholder="Ringkas kesan keseluruhan recruiter setelah interview berlangsung." />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Panduan fokus interviewer</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {interviewAssessmentItems.map((item) => (
                    <div key={item} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-3 text-sm leading-6 text-[var(--text-muted)]">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
                <Button className="rounded-xl" onClick={() => void handleSaveInterviewResult()} disabled={isSubmittingAction}>Simpan hasil</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => handleContactCandidate(selectedInterview)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hubungi pelamar
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => openScheduleModal(selectedInterview)}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedInterview.interviewDatetime ? "Ubah jadwal" : "Atur jadwal"}
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => void handleSaveForTalentPool()} disabled={isSubmittingAction}>
                  Simpan cadangan
                </Button>
                <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAdvanceCandidate()} disabled={isSubmittingAction}>
                  Lanjut ke penawaran
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => void handleRejectCandidate()}
                  disabled={isSubmittingAction}
                >
                  Tidak lanjut
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleModalInterview ? (
        <ActionModal
          title={scheduleModalInterview.interviewDatetime ? "Ubah jadwal wawancara" : "Atur jadwal wawancara"}
          subtitle={`${scheduleModalInterview.namaPelamar} / ${scheduleModalInterview.posisiDilamar}`}
          onClose={closeScheduleModal}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Tanggal wawancara</div>
              <Input type="date" value={scheduleForm.date} onChange={(event) => setScheduleForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Jam wawancara</div>
              <Input type="time" value={scheduleForm.time} onChange={(event) => setScheduleForm((current) => ({ ...current, time: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Interviewer</div>
              <Input value={scheduleForm.interviewer} onChange={(event) => setScheduleForm((current) => ({ ...current, interviewer: event.target.value }))} placeholder="Nama interviewer" />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Lokasi / link meeting</div>
              <Input value={scheduleForm.location} onChange={(event) => setScheduleForm((current) => ({ ...current, location: event.target.value }))} placeholder="Contoh: Google Meet / Kantor pusat" />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan konteks awal wawancara</div>
            <TextAreaField value={scheduleForm.notes} onChange={(value) => setScheduleForm((current) => ({ ...current, notes: value }))} placeholder="Contoh: Mohon kandidat hadir 10 menit lebih awal dan membawa CV terbaru." />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSaveSchedule()} disabled={isSubmittingAction}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Simpan jadwal wawancara
            </Button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );
}
