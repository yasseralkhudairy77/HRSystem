import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, MessageCircle, PhoneCall, Search, TriangleAlert, X } from "lucide-react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createInterviewSchedule, createStageHistory } from "@/services/recruitmentWorkflowService";
import { createScreeningReview, getLatestScreeningReviews } from "@/services/screeningReviewService";

const quickTabs = ["Semua", "Baru masuk", "Perlu dicek", "Cocok lanjut", "Disimpan dulu", "Tidak lanjut"];

const decisionBadgeStyles = {
  "Lanjut ke tes": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Hubungi dulu": "border-amber-200 bg-amber-50 text-amber-700",
  "Simpan dulu": "border-slate-200 bg-slate-50 text-slate-700",
  "Tidak lanjut": "border-rose-200 bg-rose-50 text-rose-700",
  "Jadwalkan wawancara": "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const fitBadgeStyles = {
  Cocok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Potensial: "border-sky-200 bg-sky-50 text-sky-700",
  "Perlu dicek lagi": "border-amber-200 bg-amber-50 text-amber-700",
  "Belum sesuai": "border-rose-200 bg-rose-50 text-rose-700",
};

const screeningReviewDecisionMap = {
  baru_masuk: "Hubungi dulu",
  perlu_dicek: "Hubungi dulu",
  hubungi_dulu: "Hubungi dulu",
  lanjut_tes: "Lanjut ke tes",
  jadwalkan_wawancara: "Jadwalkan wawancara",
  simpan: "Simpan dulu",
  tidak_lanjut: "Tidak lanjut",
};

const screeningReviewFitMap = {
  cocok: "Cocok",
  potensial: "Potensial",
  perlu_dicek_lagi: "Perlu dicek lagi",
  belum_sesuai: "Belum sesuai",
};

function formatDate(dateString) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toTimeInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(11, 16);
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
  if (!normalizedNumber) return "";
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

function appendRecruiterNote(previousNote, nextNote) {
  const note = nextNote.trim();
  if (!note) return previousNote || null;
  const stamped = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stamped}` : stamped;
}

function truncateText(text, maxLength = 92) {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getRecencyLabel(dateString) {
  if (!dateString) return "-";

  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;

  return formatDate(dateString);
}

function getAgeLabel(dateString) {
  if (!dateString) return "";

  const birthDate = new Date(dateString);

  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} tahun` : "";
}

function deriveInitialFit(candidate) {
  if (candidate.penilaianSingkat && fitBadgeStyles[candidate.penilaianSingkat]) return candidate.penilaianSingkat;
  if (candidate.alasanTidakLanjut) return "Belum sesuai";
  if (candidate.lastContactedAt) return "Potensial";
  return "Perlu dicek lagi";
}

function deriveScreeningDecision(candidate) {
  if (candidate.statusTindakLanjut === "Tidak lanjut" || candidate.tahapProses === "Tidak lanjut") return "Tidak lanjut";
  if (candidate.statusTindakLanjut === "Disimpan" || candidate.tahapProses === "Disimpan") return "Simpan dulu";
  if (candidate.tahapProses === "Tes kerja") return "Lanjut ke tes";
  if (candidate.tahapProses === "Wawancara") return "Jadwalkan wawancara";
  return "Hubungi dulu";
}

function deriveScreeningStatus(candidate) {
  const decision = deriveScreeningDecision(candidate);
  if (decision === "Lanjut ke tes" || decision === "Jadwalkan wawancara") return "Cocok lanjut";
  if (decision === "Simpan dulu") return "Disimpan dulu";
  if (decision === "Tidak lanjut") return "Tidak lanjut";
  if (candidate.lastContactedAt) return "Perlu dicek";
  return "Baru masuk";
}

function deriveStatusTabFromDecision(decision, lastContactedAt) {
  if (decision === "Lanjut ke tes" || decision === "Jadwalkan wawancara") return "Cocok lanjut";
  if (decision === "Simpan dulu") return "Disimpan dulu";
  if (decision === "Tidak lanjut") return "Tidak lanjut";
  if (lastContactedAt) return "Perlu dicek";
  return "Baru masuk";
}

function mapFitLabelToCode(label) {
  if (label === "Cocok") return "cocok";
  if (label === "Potensial") return "potensial";
  if (label === "Belum sesuai") return "belum_sesuai";
  return "perlu_dicek_lagi";
}

function mapDecisionLabelToCode(label) {
  if (label === "Lanjut ke tes") return "lanjut_tes";
  if (label === "Jadwalkan wawancara") return "jadwalkan_wawancara";
  if (label === "Simpan dulu") return "simpan";
  if (label === "Tidak lanjut") return "tidak_lanjut";
  if (label === "Baru masuk") return "baru_masuk";
  return "hubungi_dulu";
}

function mapPelamarToScreening(item, latestReview = null) {
  const pengalamanList = Array.isArray(item.pengalaman_list) ? item.pengalaman_list : [];
  const pengalamanSingkat = pengalamanList.length
    ? pengalamanList
        .map((entry) => {
          const perusahaan = entry?.perusahaan || "-";
          const jabatan = entry?.jabatan || "-";
          return `${jabatan} di ${perusahaan}`;
        })
        .join("; ")
    : item.fresh_graduate
      ? "Fresh graduate"
      : item.pengalaman_utama_deskripsi || "Belum ada ringkasan pengalaman.";

  const penilaianAwal =
    (latestReview?.fit_level && screeningReviewFitMap[latestReview.fit_level]) ||
    deriveInitialFit({
      penilaianSingkat: item.penilaian_singkat,
      alasanTidakLanjut: item.alasan_tidak_lanjut,
      lastContactedAt: item.last_contacted_at,
    });

  const keputusanSeleksiAwal =
    (latestReview?.status_review && screeningReviewDecisionMap[latestReview.status_review]) ||
    deriveScreeningDecision({
      statusTindakLanjut: item.status_tindak_lanjut,
      tahapProses: item.tahap_proses,
      lastContactedAt: item.last_contacted_at,
    });

  const catatanRecruiter = latestReview?.catatan_recruiter || item.catatan_recruiter || "Belum ada catatan recruiter.";
  const alasanTidakLanjut = latestReview?.alasan_tidak_lanjut || item.alasan_tidak_lanjut;

  return {
    id: item.id,
    namaLengkap: item.nama_lengkap,
    usia: getAgeLabel(item.tanggal_lahir),
    posisiDilamar: item.posisi_dilamar,
    namaUsaha: "HireUMKM Demo",
    namaCabang: "-",
    domisili: item.alamat_domisili,
    pengalamanSingkat,
    perkiraanGaji: item.ekspektasi_gaji ? `Rp${Number(item.ekspektasi_gaji).toLocaleString("id-ID")}` : "-",
    siapShift: false,
    tanggalMasuk: item.created_at,
    asalPelamar: item.sumber_info_lowongan || "-",
    namaLowongan: item.posisi_dilamar,
    catatanRecruiter,
    penilaianAwal,
    keputusanSeleksiAwal,
    statusSeleksiAwal: deriveStatusTabFromDecision(keputusanSeleksiAwal, item.last_contacted_at),
    noWhatsapp: item.no_hp,
    cvFile: item.cv_file_name,
    pendidikan: [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-",
    siapMasukKerja: item.interview_datetime || item.created_at,
    tahapProses: item.tahap_proses || "Seleksi awal",
    statusTindakLanjut: item.status_tindak_lanjut || "Baru masuk",
    lastContactedAt: item.last_contacted_at,
    alasanTidakLanjut,
    interviewDatetime: item.interview_datetime,
    interviewInterviewer: item.interview_interviewer,
    interviewLocation: item.interview_location,
    interviewNotes: item.interview_notes,
    penilaianSingkat: item.penilaian_singkat || "Perlu dicek lagi",
    screeningReviewId: latestReview?.id || null,
    screeningReviewedAt: latestReview?.reviewed_at || null,
    screeningSummary: latestReview?.ringkasan_review || null,
  };
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

function TextAreaField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
    />
  );
}

function ActionModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ScreeningPage() {
  const [candidateRows, setCandidateRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [modalState, setModalState] = useState({ type: "", candidate: null });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [screeningForm, setScreeningForm] = useState({ penilaian: "Perlu dicek lagi", note: "" });
  const [interviewForm, setInterviewForm] = useState({ date: "", time: "", interviewer: "", location: "", notes: "" });
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    void loadCandidates();
  }, []);

  async function loadCandidates() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [rows, reviewMap] = await Promise.all([getPelamarList(), getLatestScreeningReviews()]);
      const screeningRows = rows
        .filter((item) => !item.archived)
        .filter((item) => ["Baru masuk", "Seleksi awal", "Tes kerja", "Disimpan", "Tidak lanjut", "Wawancara"].includes(item.tahap_proses || "Seleksi awal"))
        .map((item) => mapPelamarToScreening(item, reviewMap[item.id] || null));

      setCandidateRows(screeningRows);
      setSelectedCandidate((current) => (current ? screeningRows.find((item) => item.id === current.id) || null : null));
      setModalState((current) =>
        current?.candidate ? { ...current, candidate: screeningRows.find((item) => item.id === current.candidate.id) || current.candidate } : current,
      );
    } catch (error) {
      console.error("Load pelamar screening gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data seleksi awal.");
    } finally {
      setIsLoading(false);
    }
  }

  const currentActionCandidate = modalState.candidate;

  const filterOptions = useMemo(
    () => ({
      positions: [...new Set(candidateRows.map((item) => item.posisiDilamar))],
      jobs: [...new Set(candidateRows.map((item) => item.namaLowongan))],
      companies: [...new Set(candidateRows.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      decisions: [...new Set(candidateRows.map((item) => item.keputusanSeleksiAwal))],
      sources: [...new Set(candidateRows.map((item) => item.asalPelamar))],
    }),
    [candidateRows],
  );

  const filteredCandidates = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return candidateRows.filter((candidate) => {
      const matchesSearch =
        !searchTerm ||
        [
          candidate.namaLengkap,
          candidate.posisiDilamar,
          candidate.namaUsaha,
          candidate.namaCabang,
          candidate.domisili,
          candidate.catatanRecruiter,
          candidate.noWhatsapp,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesPosition = !positionFilter || candidate.posisiDilamar === positionFilter;
      const matchesJob = !jobFilter || candidate.namaLowongan === jobFilter;
      const matchesCompany = !companyFilter || `${candidate.namaUsaha} - ${candidate.namaCabang}` === companyFilter;
      const matchesDecision = !decisionFilter || candidate.keputusanSeleksiAwal === decisionFilter;
      const matchesSource = !sourceFilter || candidate.asalPelamar === sourceFilter;
      const matchesTab = activeTab === "Semua" || candidate.statusSeleksiAwal === activeTab;

      return matchesSearch && matchesPosition && matchesJob && matchesCompany && matchesDecision && matchesSource && matchesTab;
    });
  }, [activeTab, candidateRows, companyFilter, decisionFilter, jobFilter, positionFilter, search, sourceFilter]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Total yang perlu dicek",
        value: String(candidateRows.filter((item) => !["Tidak lanjut", "Disimpan dulu"].includes(item.statusSeleksiAwal)).length),
        note: "Pelamar yang masih ada di tahap awal dan perlu dilihat satu per satu.",
      },
      {
        label: "Cocok lanjut",
        value: String(candidateRows.filter((item) => item.keputusanSeleksiAwal === "Lanjut ke tes" || item.keputusanSeleksiAwal === "Jadwalkan wawancara").length),
        note: "Bisa langsung dilanjutkan ke tes kerja atau wawancara.",
      },
      {
        label: "Perlu dihubungi",
        value: String(candidateRows.filter((item) => item.keputusanSeleksiAwal === "Hubungi dulu").length),
        note: "Perlu klarifikasi dulu sebelum diputuskan lanjut atau tidak.",
      },
      {
        label: "Disimpan dulu",
        value: String(candidateRows.filter((item) => item.keputusanSeleksiAwal === "Simpan dulu").length),
        note: "Layak dipakai nanti kalau kebutuhan serupa muncul lagi.",
      },
      {
        label: "Tidak lanjut",
        value: String(candidateRows.filter((item) => item.keputusanSeleksiAwal === "Tidak lanjut").length),
        note: "Belum sesuai dengan kebutuhan saat ini.",
      },
    ],
    [candidateRows],
  );

  function showFeedback(type, message) {
    setFeedback({ type, message });
  }

  function syncCandidateInState(updatedRow) {
    const mapped = mapPelamarToScreening(updatedRow);
    setCandidateRows((current) => current.map((item) => (item.id === mapped.id ? mapped : item)));
    setSelectedCandidate((current) => (current?.id === mapped.id ? mapped : current));
    return mapped;
  }

  async function persistScreeningReview(candidate, overrides = {}) {
    try {
      await createScreeningReview({
        pelamar_id: candidate.id,
        status_review: overrides.status_review || mapDecisionLabelToCode(candidate.keputusanSeleksiAwal),
        fit_level: overrides.fit_level || mapFitLabelToCode(screeningForm.penilaian || candidate.penilaianAwal),
        ringkasan_review: overrides.ringkasan_review ?? screeningForm.note ?? null,
        catatan_recruiter: overrides.catatan_recruiter ?? candidate.catatanRecruiter ?? null,
        alasan_tidak_lanjut: overrides.alasan_tidak_lanjut ?? candidate.alasanTidakLanjut ?? null,
        reviewed_by: "Recruiter",
      });
    } catch (error) {
      console.warn("Review seleksi awal belum tersimpan:", error);
      showFeedback("info", `Perubahan utama ${candidate.namaLengkap} sudah tersimpan, tetapi log review seleksi awal belum lengkap.`);
    }
  }

  function openModal(type, candidate) {
    setModalState({ type, candidate });

    if (type === "contact") {
      setContactNote(candidate?.catatanRecruiter && candidate.catatanRecruiter !== "Belum ada catatan recruiter." ? candidate.catatanRecruiter : "");
    }

    if (type === "screen") {
      setScreeningForm({ penilaian: candidate?.penilaianAwal || "Perlu dicek lagi", note: "" });
    }

    if (type === "interview") {
      setInterviewForm({
        date: toDateInputValue(candidate?.interviewDatetime),
        time: toTimeInputValue(candidate?.interviewDatetime),
        interviewer: candidate?.interviewInterviewer || "",
        location: candidate?.interviewLocation || "",
        notes: candidate?.interviewNotes || "",
      });
    }

    if (type === "reject") {
      setRejectionReason(candidate?.alasanTidakLanjut || "");
    }
  }

  function closeModal() {
    if (isSubmittingAction) return;
    setModalState({ type: "", candidate: null });
  }

  async function persistCandidateUpdate(candidateId, payload, successMessage) {
    setIsSubmittingAction(true);

    try {
      const updatedRow = await updatePelamar(candidateId, payload);

      if (!updatedRow) {
        throw new Error("Data kandidat tidak ditemukan setelah disimpan.");
      }

      syncCandidateInState(updatedRow);
      showFeedback("success", successMessage);
      return updatedRow;
    } catch (error) {
      console.error("Update screening gagal:", error);
      showFeedback("error", error instanceof Error ? error.message : "Perubahan belum berhasil disimpan.");
      return null;
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function openWhatsApp(candidate, message) {
    const url = buildWhatsAppLink(candidate.noWhatsapp, message);
    if (!url) {
      showFeedback("error", `Nomor WhatsApp ${candidate.namaLengkap} belum valid.`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveContactNote() {
    if (!currentActionCandidate) return;
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      { catatan_recruiter: contactNote.trim() || null },
      `Catatan screening untuk ${currentActionCandidate.namaLengkap} sudah disimpan.`,
    );
    if (updatedRow) {
      await persistScreeningReview(currentActionCandidate, {
        status_review: "hubungi_dulu",
        catatan_recruiter: contactNote.trim() || null,
        ringkasan_review: contactNote.trim() || null,
      });
      await loadCandidates();
      closeModal();
    }
  }

  async function handleMarkContacted() {
    if (!currentActionCandidate) return;

    const previousNote = currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter;
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        last_contacted_at: new Date().toISOString(),
        status_tindak_lanjut:
          ["Baru masuk", "Belum dihubungi"].includes(currentActionCandidate.statusTindakLanjut) ? "Sedang diproses" : currentActionCandidate.statusTindakLanjut,
        catatan_recruiter: appendRecruiterNote(previousNote, contactNote),
      },
      `${currentActionCandidate.namaLengkap} ditandai sudah dihubungi.`,
    );

    if (updatedRow) {
      const nextNote = appendRecruiterNote(previousNote, contactNote);
      await persistScreeningReview(currentActionCandidate, {
        status_review: "hubungi_dulu",
        catatan_recruiter: nextNote,
        ringkasan_review: contactNote.trim() || "Kandidat sudah dihubungi pada tahap seleksi awal.",
      });
      await loadCandidates();
      closeModal();
    }
  }

  async function handleAdvanceToTest(candidate, noteOverride = "") {
    const previousNote = candidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : candidate.catatanRecruiter;
    const updatedRow = await persistCandidateUpdate(
      candidate.id,
      {
        tahap_proses: "Tes kerja",
        status_tindak_lanjut: "Sedang diproses",
        penilaian_singkat: screeningForm.penilaian === "Belum sesuai" ? "Perlu dicek lagi" : screeningForm.penilaian,
        catatan_recruiter: appendRecruiterNote(previousNote, noteOverride || screeningForm.note || "Lolos seleksi awal dan lanjut ke tes kerja."),
      },
      `${candidate.namaLengkap} dilanjutkan ke tes kerja.`,
    );

    if (!updatedRow) return;

    try {
      await createStageHistory({
        pelamar_id: candidate.id,
        dari_tahap: candidate.tahapProses,
        ke_tahap: "Tes kerja",
        catatan: noteOverride || screeningForm.note || "Lolos seleksi awal.",
      });
    } catch (error) {
      console.warn("Riwayat tahap tes belum tersimpan:", error);
      showFeedback("info", `Tahap ${candidate.namaLengkap} sudah berubah ke tes kerja, tetapi riwayat tahap belum tersimpan.`);
    }

    await persistScreeningReview(candidate, {
      status_review: "lanjut_tes",
      fit_level: mapFitLabelToCode(screeningForm.penilaian === "Belum sesuai" ? "Perlu dicek lagi" : screeningForm.penilaian),
      ringkasan_review: noteOverride || screeningForm.note || "Lolos seleksi awal dan lanjut ke tes kerja.",
      catatan_recruiter: appendRecruiterNote(previousNote, noteOverride || screeningForm.note || "Lolos seleksi awal dan lanjut ke tes kerja."),
    });
    await loadCandidates();
    closeModal();
  }

  async function handleSaveForLater(candidate) {
    const previousNote = candidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : candidate.catatanRecruiter;
    const updatedRow = await persistCandidateUpdate(
      candidate.id,
      {
        tahap_proses: "Disimpan",
        status_tindak_lanjut: "Disimpan",
        catatan_recruiter: appendRecruiterNote(previousNote, "Disimpan dulu dari hasil seleksi awal."),
      },
      `${candidate.namaLengkap} disimpan dulu sebagai cadangan.`,
    );

    if (updatedRow) {
      await persistScreeningReview(candidate, {
        status_review: "simpan",
        fit_level: mapFitLabelToCode(candidate.penilaianAwal),
        ringkasan_review: "Disimpan dulu dari hasil seleksi awal.",
        catatan_recruiter: appendRecruiterNote(previousNote, "Disimpan dulu dari hasil seleksi awal."),
      });
      await loadCandidates();
      closeModal();
    }
  }

  async function handleRejectCandidate() {
    if (!currentActionCandidate) return;

    const previousNote = currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter;
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        tahap_proses: "Tidak lanjut",
        status_tindak_lanjut: "Tidak lanjut",
        alasan_tidak_lanjut: rejectionReason.trim() || null,
        penilaian_singkat: "Belum sesuai",
        catatan_recruiter: appendRecruiterNote(previousNote, rejectionReason ? `Tidak lanjut. Alasan: ${rejectionReason}` : "Tidak lanjut dari seleksi awal."),
      },
      `${currentActionCandidate.namaLengkap} ditandai tidak lanjut.`,
    );

    if (updatedRow) {
      await persistScreeningReview(currentActionCandidate, {
        status_review: "tidak_lanjut",
        fit_level: "belum_sesuai",
        ringkasan_review: rejectionReason.trim() || "Tidak lanjut dari seleksi awal.",
        catatan_recruiter: appendRecruiterNote(previousNote, rejectionReason ? `Tidak lanjut. Alasan: ${rejectionReason}` : "Tidak lanjut dari seleksi awal."),
        alasan_tidak_lanjut: rejectionReason.trim() || null,
      });
      await loadCandidates();
      closeModal();
    }
  }

  async function handleScheduleInterview() {
    if (!currentActionCandidate) return;
    if (!interviewForm.date || !interviewForm.time || !interviewForm.interviewer.trim() || !interviewForm.location.trim()) {
      showFeedback("error", "Tanggal, jam, pewawancara, dan lokasi/link wajib diisi.");
      return;
    }

    const interviewDatetime = new Date(`${interviewForm.date}T${interviewForm.time}:00`).toISOString();
    const previousNote = currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter;
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        tahap_proses: "Wawancara",
        status_tindak_lanjut: "Sedang diproses",
        interview_datetime: interviewDatetime,
        interview_interviewer: interviewForm.interviewer.trim(),
        interview_location: interviewForm.location.trim(),
        interview_notes: interviewForm.notes.trim() || null,
        penilaian_singkat: screeningForm.penilaian || currentActionCandidate.penilaianSingkat,
        catatan_recruiter: appendRecruiterNote(
          previousNote,
          `Lolos seleksi awal dan dijadwalkan wawancara pada ${formatDateTime(interviewDatetime)} dengan ${interviewForm.interviewer.trim()}.`,
        ),
      },
      `Wawancara ${currentActionCandidate.namaLengkap} berhasil dijadwalkan.`,
    );

    if (!updatedRow) return;

    try {
      await createInterviewSchedule({
        pelamar_id: currentActionCandidate.id,
        interview_datetime: interviewDatetime,
        interviewer: interviewForm.interviewer.trim(),
        location: interviewForm.location.trim(),
        notes: interviewForm.notes.trim() || null,
      });
      await createStageHistory({
        pelamar_id: currentActionCandidate.id,
        dari_tahap: currentActionCandidate.tahapProses,
        ke_tahap: "Wawancara",
        catatan: interviewForm.notes.trim() || "Lolos seleksi awal dan langsung wawancara.",
      });
    } catch (error) {
      console.warn("Log wawancara belum lengkap tersimpan:", error);
      showFeedback("info", `Data utama wawancara ${currentActionCandidate.namaLengkap} sudah tersimpan, tetapi log detail belum lengkap.`);
    }

    await persistScreeningReview(currentActionCandidate, {
      status_review: "jadwalkan_wawancara",
      fit_level: mapFitLabelToCode(screeningForm.penilaian || currentActionCandidate.penilaianAwal),
      ringkasan_review: interviewForm.notes.trim() || "Lolos seleksi awal dan langsung wawancara.",
      catatan_recruiter: appendRecruiterNote(
        previousNote,
        `Lolos seleksi awal dan dijadwalkan wawancara pada ${formatDateTime(interviewDatetime)} dengan ${interviewForm.interviewer.trim()}.`,
      ),
    });
    await loadCandidates();
    closeModal();
  }

  function handleQuickWhatsApp(candidate) {
    openWhatsApp(
      candidate,
      `Halo ${candidate.namaLengkap}, kami dari tim rekrutmen HireUMKM terkait lamaran posisi ${candidate.posisiDilamar}. Kami sedang melakukan seleksi awal dan ingin mengonfirmasi beberapa hal sebelum proses dilanjutkan. Apakah Anda berkenan dihubungi lewat WhatsApp ini?`,
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Seleksi Awal"
        subtitle="Workspace recruiter untuk menilai kandidat tahap awal sebelum dilanjutkan ke tes, wawancara, disimpan, atau ditutup."
      />

      <Card className="overflow-hidden rounded-[28px] border-[rgba(16,35,63,0.08)] bg-[linear-gradient(135deg,#ffffff_0%,#f2f6fb_58%,#e8f0fa_100%)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Screening Workspace
              </div>
              <div className="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
                Seleksi awal yang lebih cepat dipindai dan lebih konsisten dengan data pelamar.
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Fokusnya melihat kandidat yang masih perlu dicek, menentukan keputusan awal, dan menjalankan tindakan recruiter dari satu alur yang rapi.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="h-11 rounded-xl" onClick={() => void loadCandidates()} disabled={isLoading}>
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Muat ulang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Data seleksi awal gagal dimuat</div>
              <div className="mt-1 text-sm leading-6">{errorMessage}</div>
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="rounded-full p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-[28px]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text-main)]">Pipeline seleksi awal</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">Fokus ke kandidat yang perlu diputuskan lebih dulu.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[720px] xl:grid-cols-4">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, posisi, cabang, atau WhatsApp..."
                  className="h-11 rounded-xl border-[var(--border-soft)] pl-10"
                />
              </div>
              <FilterSelect value={jobFilter} onChange={setJobFilter} options={filterOptions.jobs} placeholder="Semua lowongan" />
              <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {quickTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-[108px] rounded-2xl border px-4 py-3 text-left transition ${
                  activeTab === tab
                    ? "border-[var(--brand-700)] bg-[var(--brand-800)] text-white shadow-[0_12px_32px_rgba(16,44,82,0.22)]"
                    : "border-[var(--border-soft)] bg-white hover:border-[var(--border-strong)] hover:bg-[var(--surface-0)]"
                }`}
              >
                <div className="text-[15px] font-semibold leading-5">{tab}</div>
                <div className={`mt-3 text-[13px] leading-6 ${activeTab === tab ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                  {tab === "Semua" ? "Lihat seluruh kandidat screening." : `Fokus ke kandidat status ${tab.toLowerCase()}.`}
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / UMKM" />
            <FilterSelect value={decisionFilter} onChange={setDecisionFilter} options={filterOptions.decisions} placeholder="Semua status keputusan" />
            <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={filterOptions.sources} placeholder="Semua asal pelamar" />
            <div className="hidden xl:block" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-3 p-5 text-slate-600">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data seleksi awal dari database...
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-[28px] border-[rgba(16,35,63,0.08)]">
        <div className="overflow-x-auto">
          <div className="min-w-[1320px]">
            <div className="grid grid-cols-[140px_2.2fr_150px_2.3fr_1.3fr_130px_140px_170px] border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4 text-[13px] font-semibold text-[var(--text-main)]">
              <div>Status</div>
              <div>Nama & Domisili</div>
              <div>WhatsApp</div>
              <div>Pengalaman Kerja</div>
              <div>Keputusan</div>
              <div>Tanggal Masuk</div>
              <div>Terakhir Aktif</div>
              <div>Tindakan</div>
            </div>

            {filteredCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className={`grid grid-cols-[140px_2.2fr_150px_2.3fr_1.3fr_130px_140px_170px] items-center border-b border-[var(--border-soft)] px-4 py-4 text-sm transition hover:bg-[var(--surface-0)] ${
                  selectedCandidate?.id === candidate.id ? "bg-sky-50/70" : index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <div className="pr-4">
                  <div className="flex flex-col gap-2">
                    <StatusBadge value={candidate.statusSeleksiAwal} />
                    <Badge className={`w-fit border ${fitBadgeStyles[candidate.penilaianAwal] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      {candidate.penilaianAwal}
                    </Badge>
                  </div>
                </div>

                <div className="pr-4">
                  <div className="font-semibold text-[var(--text-main)]">{candidate.namaLengkap}</div>
                  {candidate.usia ? <div className="mt-1 text-[var(--text-muted)]">{candidate.usia}</div> : null}
                  <div className="mt-1 text-[var(--text-muted)]">{candidate.domisili || "-"}</div>
                  <div className="mt-1 text-[var(--text-muted)]">{candidate.posisiDilamar}</div>
                </div>

                <div className="pr-4 font-medium text-[var(--text-main)]">{candidate.noWhatsapp || "-"}</div>

                <div className="pr-4">
                  <div className="leading-6 text-[var(--text-main)]">{truncateText(candidate.pengalamanSingkat, 96)}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{candidate.pendidikan}</div>
                </div>

                <div className="pr-4">
                  <Badge className={`border ${decisionBadgeStyles[candidate.keputusanSeleksiAwal] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    {candidate.keputusanSeleksiAwal}
                  </Badge>
                </div>

                <div className="pr-4 font-medium text-[var(--text-main)]">{formatDate(candidate.tanggalMasuk)}</div>

                <div className="pr-4">
                  <div className="font-medium text-[var(--text-main)]">{getRecencyLabel(candidate.lastContactedAt)}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{candidate.asalPelamar}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedCandidate(candidate)}>
                    Detail
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openModal("contact", candidate)}>
                    Chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {!isLoading && filteredCandidates.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="text-base font-semibold text-slate-900">Belum ada kandidat di seleksi awal</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Coba ubah filter, atau cek apakah data pelamar sudah masuk ke tahap seleksi awal.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Profile Summary</div>
                <div className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedCandidate.namaLengkap}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedCandidate.posisiDilamar} • {selectedCandidate.domisili || "-"}
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <Badge className={`border ${fitBadgeStyles[selectedCandidate.penilaianAwal] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  Penilaian awal: {selectedCandidate.penilaianAwal}
                </Badge>
                <Badge className={`border ${decisionBadgeStyles[selectedCandidate.keputusanSeleksiAwal] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  Keputusan: {selectedCandidate.keputusanSeleksiAwal}
                </Badge>
                <StatusBadge value={selectedCandidate.statusSeleksiAwal} />
              </div>

              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-8">
                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Profil kandidat</div>
                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {[
                        ["Nomor WhatsApp", selectedCandidate.noWhatsapp],
                        ["Domisili", selectedCandidate.domisili],
                        ["Posisi yang dilamar", selectedCandidate.posisiDilamar],
                        ["Lowongan asal", selectedCandidate.namaLowongan],
                        ["Usaha / cabang", `${selectedCandidate.namaUsaha} / ${selectedCandidate.namaCabang}`],
                        ["Pendidikan", selectedCandidate.pendidikan],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="text-sm text-[var(--text-soft)]">{label}</div>
                          <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Ringkasan pengalaman</div>
                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">Pengalaman kerja</div>
                        <div className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--text-main)]">{selectedCandidate.pengalamanSingkat || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">Perkiraan gaji</div>
                        <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{selectedCandidate.perkiraanGaji}</div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Dokumen & catatan</div>
                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">File CV</div>
                        <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{selectedCandidate.cvFile || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">Catatan recruiter</div>
                        <div className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--text-main)]">{selectedCandidate.catatanRecruiter}</div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-8">
                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Status & proses</div>
                    <div className="space-y-4">
                      {[
                        ["Tanggal masuk", formatDate(selectedCandidate.tanggalMasuk)],
                        ["Kontak terakhir", formatDateTime(selectedCandidate.lastContactedAt)],
                        ["Jadwal wawancara", formatDateTime(selectedCandidate.interviewDatetime)],
                        ["Pewawancara", selectedCandidate.interviewInterviewer || "-"],
                        ["Lokasi wawancara", selectedCandidate.interviewLocation || "-"],
                        ["Alasan tidak lanjut", selectedCandidate.alasanTidakLanjut || "-"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="text-sm text-[var(--text-soft)]">{label}</div>
                          <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Aksi</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => openModal("contact", selectedCandidate)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Hubungi pelamar
                      </Button>
                      <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => openModal("screen", selectedCandidate)}>
                        Lanjut ke tes
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => void handleSaveForLater(selectedCandidate)}>
                        Simpan dulu
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => openModal("interview", selectedCandidate)}>
                        Jadwalkan wawancara
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={() => openModal("reject", selectedCandidate)}>
                        Tidak lanjut
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalState.type === "contact" && currentActionCandidate ? (
        <ActionModal title="Hubungi pelamar" subtitle={`${currentActionCandidate.namaLengkap} • ${currentActionCandidate.posisiDilamar}`} onClose={closeModal}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="text-slate-500">Nama pelamar</div>
              <div className="mt-1 font-medium text-slate-900">{currentActionCandidate.namaLengkap}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="text-slate-500">Nomor WhatsApp</div>
              <div className="mt-1 font-medium text-slate-900">{currentActionCandidate.noWhatsapp}</div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-900">Catatan follow up</div>
            <TextAreaField value={contactNote} onChange={setContactNote} placeholder="Contoh: Sudah dihubungi, kandidat siap dikonfirmasi jam kerja." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleMarkContacted()} disabled={isSubmittingAction}>
              <PhoneCall className="mr-2 h-4 w-4" />
              Tandai sudah dihubungi
            </Button>
            <Button variant="outline" onClick={() => void handleSaveContactNote()} disabled={isSubmittingAction}>
              Simpan catatan
            </Button>
            <Button variant="outline" onClick={() => handleQuickWhatsApp(currentActionCandidate)} disabled={isSubmittingAction}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat WhatsApp
            </Button>
          </div>
        </ActionModal>
      ) : null}

      {modalState.type === "screen" && currentActionCandidate ? (
        <ActionModal title="Hasil seleksi awal" subtitle={`Simpan hasil screening untuk ${currentActionCandidate.namaLengkap}`} onClose={closeModal}>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-900">Penilaian awal</div>
            <FilterSelect
              value={screeningForm.penilaian}
              onChange={(value) => setScreeningForm((current) => ({ ...current, penilaian: value }))}
              options={["Cocok", "Potensial", "Perlu dicek lagi"]}
              placeholder="Pilih penilaian"
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-900">Catatan screening</div>
            <TextAreaField
              value={screeningForm.note}
              onChange={(value) => setScreeningForm((current) => ({ ...current, note: value }))}
              placeholder="Contoh: Domisili masuk, pengalaman cukup, siap lanjut ke tes kerja."
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => openModal("interview", currentActionCandidate)} disabled={isSubmittingAction}>
              Langsung wawancara
            </Button>
            <Button onClick={() => void handleAdvanceToTest(currentActionCandidate)} disabled={isSubmittingAction}>
              Simpan dan lanjut ke tes
            </Button>
          </div>
        </ActionModal>
      ) : null}

      {modalState.type === "interview" && currentActionCandidate ? (
        <ActionModal title="Jadwalkan wawancara" subtitle={`Atur wawancara untuk ${currentActionCandidate.namaLengkap}`} onClose={closeModal}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Tanggal wawancara</div>
              <Input type="date" value={interviewForm.date} onChange={(event) => setInterviewForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Jam wawancara</div>
              <Input type="time" value={interviewForm.time} onChange={(event) => setInterviewForm((current) => ({ ...current, time: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Pewawancara</div>
              <Input value={interviewForm.interviewer} onChange={(event) => setInterviewForm((current) => ({ ...current, interviewer: event.target.value }))} placeholder="Nama pewawancara" />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-slate-900">Lokasi / link meeting</div>
              <Input value={interviewForm.location} onChange={(event) => setInterviewForm((current) => ({ ...current, location: event.target.value }))} placeholder="Contoh: Kantor pusat / Google Meet" />
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-900">Catatan</div>
            <TextAreaField
              value={interviewForm.notes}
              onChange={(value) => setInterviewForm((current) => ({ ...current, notes: value }))}
              placeholder="Catatan tambahan untuk tim recruiter."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleScheduleInterview()} disabled={isSubmittingAction}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Simpan jadwal wawancara
            </Button>
          </div>
        </ActionModal>
      ) : null}

      {modalState.type === "reject" && currentActionCandidate ? (
        <ActionModal title="Tidak lanjut" subtitle={`Simpan alasan untuk ${currentActionCandidate.namaLengkap}`} onClose={closeModal}>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-900">Alasan singkat</div>
            <TextAreaField value={rejectionReason} onChange={setRejectionReason} placeholder="Contoh: Jarak terlalu jauh dan ekspektasi tidak cocok." />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void handleRejectCandidate()} disabled={isSubmittingAction}>
              Simpan status tidak lanjut
            </Button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );
}
