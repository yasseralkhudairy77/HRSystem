import { useEffect, useMemo, useState } from "react";
import { Clipboard, ExternalLink, LoaderCircle, RefreshCw, Search, Sparkles, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import InterviewAiQuestionEditorPanel from "@/components/recruitment/InterviewAiQuestionEditorPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import {
  buildInterviewAiLink,
  createInterviewAiPackage,
  generateInterviewAiToken,
  getInterviewAiPackageMapByPelamarIds,
  getInterviewAiProgress,
  getInterviewAiStatusLabel,
  updateInterviewAiPackageReview,
} from "@/services/interviewAiService";
import { createStageHistory } from "@/services/recruitmentWorkflowService";

const stageBadgeClass = "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";

function normalizeWhatsAppNumber(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function buildWhatsAppLink(rawNumber, message) {
  const normalizedNumber = normalizeWhatsAppNumber(rawNumber);
  return normalizedNumber ? `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}` : "";
}

function buildInterviewAiWhatsAppMessage(candidate, linkUrl, deadlineIso) {
  const deadlineLabel = formatDateTime(deadlineIso);

  return [
    `Halo ${candidate.namaLengkap},`,
    ``,
    `Anda diundang untuk mengikuti Wawancara AI untuk posisi ${candidate.posisiDilamar}.`,
    `Deadline pengisian: ${deadlineLabel}.`,
    ``,
    `Link wawancara: ${linkUrl}`,
    ``,
    `Link ini hanya dapat dipakai satu kali. Mohon langsung buka dan selesaikan sesi wawancara tanpa menutup halaman.`,
  ].join("\n");
}

function shouldCreateFreshInterviewInvitation(candidate) {
  const interviewPackage = candidate?.interviewAiPackage;

  if (!interviewPackage?.id || !candidate?.interviewAiLink) {
    return true;
  }

  return ["opened", "in_progress", "completed", "reviewed"].includes(interviewPackage.status);
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

function appendRecruiterNote(previousNote, nextNote) {
  const note = String(nextNote || "").trim();
  if (!note) return previousNote || null;

  const stampedNote = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

function buildDefaultDeadlineValue() {
  const date = new Date(Date.now() + 1000 * 60 * 60 * 48);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function mapPelamarToInterviewAi(item, interviewPackage) {
  const progress = getInterviewAiProgress(interviewPackage);

  return {
    id: item.id,
    namaLengkap: item.nama_lengkap,
    usia: getAgeLabel(item.tanggal_lahir),
    posisiDilamar: item.posisi_dilamar,
    domisili: item.alamat_domisili || "-",
    noWhatsapp: item.no_hp || "-",
    email: item.email || "-",
    tahapProses: item.tahap_proses || "Wawancara AI",
    statusInterviewAi: interviewPackage ? getInterviewAiStatusLabel(interviewPackage) : "Belum dikirim",
    penilaianSingkat: item.penilaian_singkat || "Belum ada ringkasan recruiter.",
    catatanRecruiter: item.catatan_recruiter || "Belum ada catatan recruiter.",
    cvFile: item.cv_file_name || "-",
    pendidikanTerakhir: [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    interviewAiPackage: interviewPackage,
    interviewAiProgress: progress,
    interviewAiLink: interviewPackage?.link_url || "",
    interviewAiDeadline: interviewPackage?.deadline_at || null,
    interviewAiUpdatedAt: interviewPackage?.updated_at || interviewPackage?.reviewed_at || interviewPackage?.completed_at || item.updated_at,
    interviewAiItems: interviewPackage?.candidate_test_package_items || [],
    interviewAiSummary: interviewPackage?.overall_summary || "",
    interviewAiRecommendation: interviewPackage?.overall_recommendation || "",
    interviewAiPackageNote: interviewPackage?.catatan_recruiter || "",
  };
}

function SummaryCard({ label, value, note }) {
  return (
    <div className="rounded-[20px] border border-[var(--border-soft)] bg-white px-5 py-4">
      <div className="text-sm text-[var(--text-soft)]">{label}</div>
      <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{note}</div>
    </div>
  );
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
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-sm text-[var(--text-soft)]">{label}</div>
      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
    </div>
  );
}

function TextAreaField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-h-[120px] w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
    />
  );
}

function RecommendationBadge({ value }) {
  if (!value) return null;

  const tone =
    value === "Lanjut ke Wawancara HRD"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "Tidak lanjut"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${tone}`}>{value}</div>;
}

export default function InterviewAiPage() {
  const [candidateRows, setCandidateRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState("candidates");
  const [sessionDeadline, setSessionDeadline] = useState(buildDefaultDeadlineValue());
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewRecommendation, setReviewRecommendation] = useState("Perlu review lanjutan");

  useEffect(() => {
    void loadCandidates();
  }, []);

  useEffect(() => {
    if (!selectedCandidate) {
      setSessionDeadline(buildDefaultDeadlineValue());
      setReviewSummary("");
      setReviewNote("");
      setReviewRecommendation("Perlu review lanjutan");
      return;
    }

    setSessionDeadline(
      selectedCandidate.interviewAiDeadline
        ? (() => {
            const date = new Date(selectedCandidate.interviewAiDeadline);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })()
        : buildDefaultDeadlineValue(),
    );
    setReviewSummary(selectedCandidate.interviewAiSummary || selectedCandidate.penilaianSingkat || "");
    setReviewNote(
      selectedCandidate.interviewAiPackageNote ||
        (selectedCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : selectedCandidate.catatanRecruiter),
    );
    setReviewRecommendation(selectedCandidate.interviewAiRecommendation || "Perlu review lanjutan");
  }, [selectedCandidate]);

  async function loadCandidates() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const rows = await getPelamarList();
      const aiRows = rows.filter((item) => !item.archived).filter((item) => item.tahap_proses === "Wawancara AI");
      const packageMap = await getInterviewAiPackageMapByPelamarIds(aiRows.map((item) => item.id));
      const mappedRows = aiRows.map((item) => mapPelamarToInterviewAi(item, packageMap[item.id] || null));

      setCandidateRows(mappedRows);
      setSelectedCandidate((current) => (current ? mappedRows.find((item) => item.id === current.id) || null : null));
    } catch (error) {
      console.error("Load kandidat Wawancara AI gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Data Wawancara AI belum berhasil dimuat.");
    } finally {
      setIsLoading(false);
    }
  }

  function syncSelectedCandidate(updatedRow) {
    setCandidateRows((currentRows) => {
      if (updatedRow.tahapProses !== "Wawancara AI") {
        return currentRows.filter((item) => item.id !== updatedRow.id);
      }

      return currentRows.map((item) => (item.id === updatedRow.id ? updatedRow : item));
    });
    setSelectedCandidate(updatedRow.tahapProses === "Wawancara AI" ? updatedRow : null);
  }

  async function copyText(value, fallbackLabel) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ type: "success", message: `${fallbackLabel} berhasil disalin.` });
    } catch {
      window.prompt(`Salin ${fallbackLabel} ini:`, value);
    }
  }

  function sendInterviewAiInvitationViaWhatsApp(candidate, linkUrl, deadlineIso) {
    const whatsappMessage = buildInterviewAiWhatsAppMessage(candidate, linkUrl, deadlineIso);
    const whatsappUrl = buildWhatsAppLink(candidate.noWhatsapp, whatsappMessage);

    if (!whatsappUrl) {
      return false;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  async function handleCreateSession(candidate, options = {}) {
    const deadlineValue = options.deadlineValue || sessionDeadline;
    const recruiterNote = options.recruiterNote ?? reviewNote.trim();

    if (!deadlineValue) {
      setFeedback({ type: "error", message: "Deadline sesi wajib diisi." });
      return;
    }

    setIsBusy(true);
    setFeedback(null);

    try {
      const token = generateInterviewAiToken(candidate.id);
      const linkUrl = buildInterviewAiLink(window.location.origin, token);
      const deadlineIso = new Date(deadlineValue).toISOString();
      const deadlineLabel = formatDateTime(deadlineIso);
      const createdPackage = await createInterviewAiPackage({
        pelamarId: candidate.id,
        deadlineAt: deadlineIso,
        createdBy: "Recruiter",
        catatanRecruiter: recruiterNote || null,
        linkToken: token,
        linkUrl,
      });

      const updatedPelamar = await updatePelamar(candidate.id, {
        tahap_proses: "Wawancara AI",
        status_tindak_lanjut: "Sudah dikirim",
        catatan_recruiter: appendRecruiterNote(
          candidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : candidate.catatanRecruiter,
          `Undangan Wawancara AI dikirim dengan deadline ${deadlineLabel}.`,
        ),
      });

      const nextCandidate = mapPelamarToInterviewAi(updatedPelamar || candidate, createdPackage);
      syncSelectedCandidate(nextCandidate);

      if (sendInterviewAiInvitationViaWhatsApp(candidate, linkUrl, deadlineIso)) {
        setFeedback({ type: "success", message: `Undangan Wawancara AI untuk ${candidate.namaLengkap} berhasil disiapkan dan WhatsApp kandidat dibuka otomatis.` });
      } else {
        setFeedback({
          type: "error",
          message: `Undangan Wawancara AI untuk ${candidate.namaLengkap} sudah dibuat, tetapi nomor WhatsApp kandidat belum valid. Silakan periksa nomor lalu kirim manual.`,
        });
      }
    } catch (error) {
      console.error("Buat sesi Wawancara AI gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Sesi Wawancara AI belum berhasil dibuat." });
    } finally {
      setIsBusy(false);
    }
  }

  function handleSendExistingInvitation(candidate) {
    if (shouldCreateFreshInterviewInvitation(candidate)) {
      void handleCreateSession(candidate, { deadlineValue: candidate.interviewAiDeadline || buildDefaultDeadlineValue(), recruiterNote: candidate.interviewAiPackageNote || "" });
      return;
    }

    if (sendInterviewAiInvitationViaWhatsApp(candidate, candidate.interviewAiLink, candidate.interviewAiDeadline)) {
      setFeedback({ type: "success", message: `WhatsApp undangan untuk ${candidate.namaLengkap} berhasil dibuka.` });
      return;
    }

    setFeedback({
      type: "error",
      message: `Nomor WhatsApp ${candidate.namaLengkap} belum valid. Silakan periksa nomor kandidat terlebih dahulu.`,
    });
  }

  async function handleSaveReview(candidate) {
    if (!candidate?.interviewAiPackage?.id) {
      setFeedback({ type: "error", message: "Sesi Wawancara AI belum dibuat untuk kandidat ini." });
      return;
    }

    setIsBusy(true);
    setFeedback(null);

    try {
      const updatedPackage = await updateInterviewAiPackageReview(candidate.interviewAiPackage.id, {
        overallSummary: reviewSummary.trim() || null,
        overallRecommendation: reviewRecommendation,
        catatanRecruiter: reviewNote.trim() || null,
        status: candidate.interviewAiPackage.status === "completed" ? "reviewed" : candidate.interviewAiPackage.status,
      });

      const updatedPelamar = await updatePelamar(candidate.id, {
        penilaian_singkat: reviewSummary.trim() || null,
        catatan_recruiter: reviewNote.trim() || null,
        status_tindak_lanjut:
          candidate.interviewAiProgress.completed === candidate.interviewAiProgress.total && candidate.interviewAiProgress.total > 0
            ? "Sudah selesai"
            : candidate.statusInterviewAi,
      });

      const nextCandidate = mapPelamarToInterviewAi(updatedPelamar || candidate, updatedPackage);
      syncSelectedCandidate(nextCandidate);
      setFeedback({ type: "success", message: `Review recruiter untuk ${candidate.namaLengkap} berhasil disimpan.` });
    } catch (error) {
      console.error("Simpan review Wawancara AI gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Review recruiter belum berhasil disimpan." });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDecision(candidate, decision) {
    if (!candidate?.interviewAiPackage?.id) {
      setFeedback({ type: "error", message: "Sesi Wawancara AI belum dibuat untuk kandidat ini." });
      return;
    }

    setIsBusy(true);
    setFeedback(null);

    try {
      const updatedPackage = await updateInterviewAiPackageReview(candidate.interviewAiPackage.id, {
        overallSummary: reviewSummary.trim() || null,
        overallRecommendation: decision,
        catatanRecruiter: reviewNote.trim() || null,
        status: "reviewed",
      });

      let nextStage = "Wawancara AI";
      let nextStatus = "Sudah selesai";
      let rejectionReason = null;
      let stageHistoryTarget = null;
      let stageHistoryNote = null;

      if (decision === "Lanjut ke Wawancara HRD") {
        nextStage = "Wawancara";
        nextStatus = "Sedang diproses";
        stageHistoryTarget = "Wawancara";
        stageHistoryNote = "Lolos review Wawancara AI dan lanjut ke Wawancara HRD.";
      } else if (decision === "Tidak lanjut") {
        nextStage = "Tidak lanjut";
        nextStatus = "Tidak lanjut";
        rejectionReason = reviewSummary.trim() || "Hasil Wawancara AI belum sesuai kebutuhan posisi.";
        stageHistoryTarget = "Tidak lanjut";
        stageHistoryNote = "Hasil Wawancara AI direview dan kandidat dinyatakan tidak lanjut.";
      }

      const updatedPelamar = await updatePelamar(candidate.id, {
        tahap_proses: nextStage,
        status_tindak_lanjut: nextStatus,
        penilaian_singkat: reviewSummary.trim() || null,
        catatan_recruiter: reviewNote.trim() || null,
        alasan_tidak_lanjut: rejectionReason,
      });

      if (stageHistoryTarget) {
        createStageHistory({
          pelamar_id: candidate.id,
          dari_tahap: candidate.tahapProses,
          ke_tahap: stageHistoryTarget,
          catatan: stageHistoryNote,
        }).catch((error) => {
          console.warn("Riwayat tahap setelah Wawancara AI belum tersimpan:", error);
        });
      }

      const nextCandidate = mapPelamarToInterviewAi(updatedPelamar || candidate, updatedPackage);
      syncSelectedCandidate(nextCandidate);
      setFeedback({ type: "success", message: `Keputusan recruiter untuk ${candidate.namaLengkap} berhasil disimpan.` });
    } catch (error) {
      console.error("Keputusan recruiter Wawancara AI gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Keputusan recruiter belum berhasil disimpan." });
    } finally {
      setIsBusy(false);
    }
  }

  const filterOptions = useMemo(
    () => ({
      statuses: [...new Set(candidateRows.map((item) => item.statusInterviewAi))],
      positions: [...new Set(candidateRows.map((item) => item.posisiDilamar))],
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
          candidate.domisili,
          candidate.noWhatsapp,
          candidate.email,
          candidate.catatanRecruiter,
          candidate.interviewAiSummary,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus = !statusFilter || candidate.statusInterviewAi === statusFilter;
      const matchesPosition = !positionFilter || candidate.posisiDilamar === positionFilter;

      return matchesSearch && matchesStatus && matchesPosition;
    });
  }, [candidateRows, positionFilter, search, statusFilter]);

  const summaryItems = useMemo(
    () => [
      {
        label: "Total antrean",
        value: String(candidateRows.length),
        note: "Semua kandidat yang sudah lolos psikotest dan masuk tahap Wawancara AI.",
      },
      {
        label: "Link belum dibuat",
        value: String(candidateRows.filter((item) => !item.interviewAiPackage).length),
        note: "Kandidat yang sudah masuk tahap Wawancara AI tetapi recruiter belum membuat link sesi.",
      },
      {
        label: "Sedang berjalan",
        value: String(candidateRows.filter((item) => item.statusInterviewAi === "Sudah dikirim" || item.statusInterviewAi === "Sedang dikerjakan").length),
        note: "Kandidat yang sudah menerima link dan sedang mengerjakan sesi Wawancara AI.",
      },
      {
        label: "Siap direview",
        value: String(candidateRows.filter((item) => item.statusInterviewAi === "Sudah selesai").length),
        note: "Kandidat yang sudah menyelesaikan jawaban dan menunggu keputusan recruiter.",
      },
    ],
    [candidateRows],
  );

  const workspaceItems = [
    {
      key: "candidates",
      label: "Data kandidat",
      note: "Buat link, pantau jawaban, dan review kandidat.",
    },
    {
      key: "editor",
      label: "Editor pertanyaan",
      note: "Atur daftar pertanyaan dan kebutuhan audio tanpa tercampur dengan data kandidat.",
    },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Wawancara AI"
        subtitle="Recruiter membuat link sesi kandidat, memantau progres jawaban, lalu memutuskan tindak lanjut dari satu halaman."
      />

      <Card className="overflow-hidden rounded-[28px] border-[rgba(16,35,63,0.08)] bg-[linear-gradient(135deg,#ffffff_0%,#fff5fb_55%,#f5efff_100%)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                <Sparkles className="h-3.5 w-3.5" />
                Recruiter Workspace
              </div>
              <div className="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
                Recruiter kerja di webapp ini, kandidat jawab lewat link khusus.
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Pilih area kerja yang Anda butuhkan. Data kandidat dan editor pertanyaan sekarang dipisah supaya recruiter lebih mudah fokus.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="h-11 rounded-xl" onClick={() => void loadCandidates()} disabled={isLoading || isBusy || activeWorkspace !== "candidates"}>
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Muat ulang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
        <CardContent className="space-y-4 p-6">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Pilih area kerja</div>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">Buka satu area saja sesuai kebutuhan, jadi tampilan tidak campur dan lebih mudah dipahami.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {workspaceItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveWorkspace(item.key);
                  if (item.key !== "candidates") {
                    setSelectedCandidate(null);
                  }
                }}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  activeWorkspace === item.key ? "border-[var(--brand-700)] bg-[var(--surface-0)]" : "border-[var(--border-soft)] bg-white hover:bg-[var(--surface-0)]"
                }`}
              >
                <div className="text-base font-semibold text-[var(--text-main)]">{item.label}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.note}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{errorMessage}</div> : null}

      {activeWorkspace === "candidates" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryItems.map((item) => (
              <SummaryCard key={item.label} {...item} />
            ))}
          </div>

          <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr_1fr]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama kandidat, posisi, domisili, atau ringkasan jawaban..."
                    className="h-11 rounded-xl border-[var(--border-soft)] bg-white pl-10"
                  />
                </div>
                <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.statuses} placeholder="Semua status Wawancara AI" />
                <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
              </div>

              <div className="overflow-hidden rounded-[24px] border border-[var(--border-soft)]">
                <div className="overflow-x-auto">
                  <div className="min-w-[1080px]">
                    <div className="grid grid-cols-[2.1fr_1.1fr_1.1fr_1fr_220px] border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-4 text-[13px] font-semibold text-[var(--text-main)]">
                      <div>Kandidat</div>
                      <div>Posisi</div>
                      <div>Status sesi</div>
                      <div>Progress</div>
                      <div>Tindakan</div>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center gap-3 px-5 py-8 text-sm text-[var(--text-muted)]">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Memuat antrean Wawancara AI...
                      </div>
                    ) : null}

                    {!isLoading &&
                      filteredCandidates.map((candidate, index) => (
                        <div
                          key={candidate.id}
                          onClick={() => setSelectedCandidate(candidate)}
                          className={`grid cursor-pointer grid-cols-[2.1fr_1.1fr_1.1fr_1fr_220px] items-center border-b border-[var(--border-soft)] px-5 py-4 text-sm transition hover:bg-[var(--surface-0)] ${
                            index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          }`}
                        >
                          <div className="pr-4">
                            <div className="font-semibold text-[var(--text-main)]">{candidate.namaLengkap}</div>
                            <div className="mt-1 text-[var(--text-muted)]">
                              {candidate.usia ? `${candidate.usia} / ` : ""}
                              {candidate.domisili}
                            </div>
                            <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                              {candidate.interviewAiSummary || candidate.catatanRecruiter}
                            </div>
                          </div>
                          <div className="pr-4">
                            <div className="font-medium text-[var(--text-main)]">{candidate.posisiDilamar}</div>
                            <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${stageBadgeClass}`}>{candidate.tahapProses}</div>
                          </div>
                          <div className="pr-4">
                            <StatusBadge value={candidate.statusInterviewAi} className="rounded-full px-3 py-1.5" />
                            {candidate.interviewAiRecommendation ? (
                              <div className="mt-2">
                                <RecommendationBadge value={candidate.interviewAiRecommendation} />
                              </div>
                            ) : null}
                          </div>
                          <div className="pr-4 text-[var(--text-main)]">
                            {candidate.interviewAiPackage ? `${candidate.interviewAiProgress.completed}/${candidate.interviewAiProgress.total} jawaban` : "Link belum dibuat"}
                            <div className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(candidate.interviewAiUpdatedAt)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!candidate.interviewAiLink ? (
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCreateSession(candidate, { deadlineValue: buildDefaultDeadlineValue(), recruiterNote: "" });
                                }}
                                disabled={isBusy}
                              >
                                {isBusy ? "Memproses..." : "Kirim WA"}
                              </Button>
                            ) : null}
                            {candidate.interviewAiLink ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSendExistingInvitation(candidate);
                                }}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {shouldCreateFreshInterviewInvitation(candidate) ? "Link baru WA" : "WhatsApp"}
                              </Button>
                            ) : null}
                            {candidate.interviewAiLink ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copyText(candidate.interviewAiLink, "link kandidat");
                                }}
                              >
                                <Clipboard className="mr-2 h-4 w-4" />
                                Link
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCandidate(candidate);
                              }}
                            >
                              Detail
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {!isLoading && filteredCandidates.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-base font-semibold text-[var(--text-main)]">Belum ada kandidat di Wawancara AI</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Kandidat akan muncul di sini setelah lolos psikotest dan dipindahkan ke tahap Wawancara AI.</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <InterviewAiQuestionEditorPanel />
      )}

      {activeWorkspace === "candidates" && selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Detail Wawancara AI</div>
                <div className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedCandidate.namaLengkap}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{selectedCandidate.posisiDilamar}</div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <StatusBadge value={selectedCandidate.statusInterviewAi} className="rounded-full px-3 py-1.5" />
                <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${stageBadgeClass}`}>{selectedCandidate.tahapProses}</div>
                {selectedCandidate.interviewAiRecommendation ? <RecommendationBadge value={selectedCandidate.interviewAiRecommendation} /> : null}
              </div>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Usia" value={selectedCandidate.usia || "-"} />
                <DetailItem label="Domisili" value={selectedCandidate.domisili} />
                <DetailItem label="WhatsApp" value={selectedCandidate.noWhatsapp} />
                <DetailItem label="Email" value={selectedCandidate.email} />
                <DetailItem label="Pendidikan terakhir" value={selectedCandidate.pendidikanTerakhir} />
                <DetailItem label="File CV" value={selectedCandidate.cvFile} />
              </section>

              {!selectedCandidate.interviewAiPackage ? (
                <section className="space-y-4 rounded-[24px] border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-5">
                  <div className="text-lg font-semibold text-[var(--text-main)]">Kirim undangan Wawancara AI</div>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Setelah recruiter klik tombol kirim, sistem membuat link khusus kandidat lalu langsung membuka WhatsApp dengan pesan undangan siap kirim.
                  </p>
                  <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Deadline sesi</div>
                      <Input type="datetime-local" value={sessionDeadline} onChange={(event) => setSessionDeadline(event.target.value)} />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan recruiter sebelum kirim</div>
                      <TextAreaField value={reviewNote} onChange={setReviewNote} placeholder="Contoh: Kandidat diminta langsung membuka link dan menyelesaikan sesi tanpa menutup halaman." rows={4} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleCreateSession(selectedCandidate)} disabled={isBusy}>
                      {isBusy ? "Memproses..." : "Kirim undangan Wawancara AI"}
                    </Button>
                  </div>
                </section>
              ) : (
                <>
                  <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-[var(--text-main)]">Link kandidat</div>
                        <div className="mt-2 break-all text-sm leading-6 text-[var(--text-muted)]">{selectedCandidate.interviewAiLink}</div>
                        <div className="mt-2 text-sm text-[var(--text-muted)]">
                          Deadline: {formatDateTime(selectedCandidate.interviewAiDeadline)} / Progress: {selectedCandidate.interviewAiProgress.completed}/{selectedCandidate.interviewAiProgress.total} jawaban
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleSendExistingInvitation(selectedCandidate)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {shouldCreateFreshInterviewInvitation(selectedCandidate) ? "Buat link baru & kirim WA" : "Kirim ulang WhatsApp"}
                        </Button>
                        <Button variant="outline" onClick={() => void copyText(selectedCandidate.interviewAiLink, "link kandidat")}>
                          <Clipboard className="mr-2 h-4 w-4" />
                          Salin link
                        </Button>
                        <Button variant="outline" onClick={() => window.open(selectedCandidate.interviewAiLink, "_blank", "noopener,noreferrer")}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Buka link
                        </Button>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Jawaban kandidat</div>
                    <div className="grid gap-3">
                      {selectedCandidate.interviewAiItems.map((item) => {
                        const answerText = String(item.result_json?.answer_text || "").trim();
                        const questionText = item.result_json?.question_text || item.test_name_snapshot;
                        const promptAudioUrl = item.result_json?.prompt_audio_url || "";
                        const answerAudioUrl = item.result_json?.answer_audio_url || "";
                        const answerAudioDurationSeconds = Number(item.result_json?.answer_audio_duration_seconds || 0);

                        return (
                          <div key={item.id} className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Pertanyaan {item.test_order}</div>
                                <div className="mt-2 text-base font-semibold text-[var(--text-main)]">{item.test_name_snapshot}</div>
                              </div>
                              <StatusBadge value={item.status === "completed" ? "Sudah selesai" : item.status === "in_progress" ? "Sedang dikerjakan" : "Belum mulai"} className="rounded-full px-3 py-1.5" />
                            </div>
                            <div className="mt-3 text-sm leading-7 text-[var(--text-main)]">{questionText}</div>
                            {promptAudioUrl ? (
                              <audio controls preload="none" src={promptAudioUrl} className="mt-4 w-full">
                                Browser Anda tidak mendukung audio player.
                              </audio>
                            ) : null}
                            <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Jawaban kandidat</div>
                              {answerAudioUrl ? (
                                <div className="mt-3 space-y-3">
                                  <audio controls preload="none" src={answerAudioUrl} className="w-full">
                                    Browser Anda tidak mendukung audio player.
                                  </audio>
                                  <div className="text-sm leading-6 text-[var(--text-muted)]">
                                    Jawaban dikirim dalam bentuk audio
                                    {answerAudioDurationSeconds > 0 ? ` dengan durasi sekitar ${answerAudioDurationSeconds} detik.` : "."}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--text-main)]">
                                  {answerText || "Kandidat belum mengirim jawaban untuk pertanyaan ini."}
                                </div>
                              )}
                              <div className="mt-3 text-xs text-[var(--text-muted)]">
                                {item.result_json?.answered_at ? `Disimpan pada ${formatDateTime(item.result_json.answered_at)}` : "Belum ada timestamp jawaban."}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Review recruiter</div>
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Ringkasan recruiter</div>
                        <TextAreaField value={reviewSummary} onChange={setReviewSummary} placeholder="Tulis ringkasan singkat dari jawaban kandidat, kecocokan awal, dan poin penting yang perlu dibawa ke tahap berikutnya." rows={6} />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan internal recruiter</div>
                          <TextAreaField value={reviewNote} onChange={setReviewNote} placeholder="Catatan internal untuk recruiter, owner, atau user yang mereview kandidat ini." rows={6} />
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Rekomendasi saat ini</div>
                          <select
                            value={reviewRecommendation}
                            onChange={(event) => setReviewRecommendation(event.target.value)}
                            className="flex h-11 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]"
                          >
                            <option value="Perlu review lanjutan">Perlu review lanjutan</option>
                            <option value="Lanjut ke Wawancara HRD">Lanjut ke Wawancara HRD</option>
                            <option value="Tidak lanjut">Tidak lanjut</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void handleSaveReview(selectedCandidate)} disabled={isBusy}>
                        {isBusy ? "Memproses..." : "Simpan review"}
                      </Button>
                      <Button onClick={() => void handleDecision(selectedCandidate, "Lanjut ke Wawancara HRD")} disabled={isBusy || selectedCandidate.interviewAiProgress.completed < selectedCandidate.interviewAiProgress.total}>
                        {isBusy ? "Memproses..." : "Lanjut ke Wawancara HRD"}
                      </Button>
                      <Button variant="outline" onClick={() => void handleDecision(selectedCandidate, "Perlu review lanjutan")} disabled={isBusy}>
                        {isBusy ? "Memproses..." : "Simpan dulu"}
                      </Button>
                      <Button variant="outline" onClick={() => void handleDecision(selectedCandidate, "Tidak lanjut")} disabled={isBusy}>
                        {isBusy ? "Memproses..." : "Tidak lanjut"}
                      </Button>
                    </div>
                    {selectedCandidate.interviewAiProgress.completed < selectedCandidate.interviewAiProgress.total ? (
                      <div className="text-sm text-[var(--text-muted)]">Tombol lanjut ke Wawancara HRD aktif setelah seluruh pertanyaan kandidat sudah dijawab.</div>
                    ) : null}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
