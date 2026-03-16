import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Database, LoaderCircle, MessageCircle, PhoneCall, Search, TriangleAlert, X } from "lucide-react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildPackageItems,
  buildPackageLink,
  formatPackageItemStatusLabel,
  formatPackageStatusLabel,
  resolveTestPackageTemplate,
} from "@/data";
import {
  createCandidateTestPackage,
  getActiveCandidateTestPackageMap,
  getCandidateTestPackageFeatureUnavailableMessage,
  isCandidateTestPackageFeatureUnavailable,
} from "@/services/candidateTestPackageService";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createInterviewSchedule, createStageHistory } from "@/services/recruitmentWorkflowService";

const quickTabs = ["Semua", "Baru masuk", "Perlu ditindaklanjuti", "Sedang diproses", "Masuk tahap akhir", "Disimpan", "Tidak lanjut"];
const stageOptions = ["Baru masuk", "Seleksi awal", "Tes kerja", "Wawancara AI", "Wawancara", "Tahap akhir", "Penawaran kerja", "Siap masuk", "Disimpan", "Tidak lanjut"];
const fitBadgeStyles = {
  Cocok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Potensial: "border-sky-200 bg-sky-50 text-sky-700",
  "Perlu dicek lagi": "border-amber-200 bg-amber-50 text-amber-700",
  "Belum sesuai": "border-rose-200 bg-rose-50 text-rose-700",
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

  const stampedNote = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

function summarizeExperienceDuration(text) {
  if (!text) return "-";

  if (/fresh graduate/i.test(text)) return "0 bln";

  const years = text.match(/(\d+)\s*tahun/i);
  const months = text.match(/(\d+)\s*bulan/i);

  if (!years && !months) return "Lihat detail";

  const yearLabel = years ? `${years[1]} thn` : "";
  const monthLabel = months ? `${months[1]} bln` : "";

  return [yearLabel, monthLabel].filter(Boolean).join(" ") || "Lihat detail";
}

function truncateText(text, maxLength = 84) {
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

function matchesQuickTab(candidate, activeTab) {
  if (activeTab === "Semua") return true;
  if (activeTab === "Perlu ditindaklanjuti") {
    return ["Baru masuk", "Belum dihubungi", "Belum dikirim"].includes(candidate.statusTindakLanjut);
  }

  if (activeTab === "Sedang diproses") {
    return ["Sedang diproses", "Belum dikirim", "Sudah dikirim", "Sedang dikerjakan"].includes(candidate.statusTindakLanjut);
  }

  return candidate.statusTindakLanjut === activeTab;
}

function getStageBadgeClass(stage) {
  const map = {
    "Baru masuk": "border-slate-200 bg-slate-50 text-slate-700",
    "Seleksi awal": "border-slate-200 bg-slate-50 text-slate-700",
    "Tes kerja": "border-sky-200 bg-sky-50 text-sky-700",
    Tes: "border-sky-200 bg-sky-50 text-sky-700",
    "Wawancara AI": "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    Wawancara: "border-indigo-200 bg-indigo-50 text-indigo-700",
    "Tahap akhir": "border-violet-200 bg-violet-50 text-violet-700",
    "Penawaran kerja": "border-violet-200 bg-violet-50 text-violet-700",
    "Siap masuk": "border-emerald-200 bg-emerald-50 text-emerald-700",
    Disimpan: "border-amber-200 bg-amber-50 text-amber-700",
    "Tidak lanjut": "border-rose-200 bg-rose-50 text-rose-700",
  };

  return map[stage] || "border-slate-200 bg-slate-50 text-slate-700";
}

function mapStageToStatus(stage) {
  if (stage === "Baru masuk") return "Baru masuk";
  if (["Seleksi awal", "Tes kerja", "Tes", "Wawancara AI", "Wawancara"].includes(stage)) return "Sedang diproses";
  if (["Tahap akhir", "Penawaran kerja", "Siap masuk"].includes(stage)) return "Masuk tahap akhir";
  if (stage === "Disimpan") return "Disimpan";
  if (stage === "Tidak lanjut") return "Tidak lanjut";

  return "Sedang diproses";
}

function getPackageStatusClass(status) {
  const map = {
    sent: "border-slate-200 bg-slate-50 text-slate-700",
    opened: "border-sky-200 bg-sky-50 text-sky-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    reviewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
    expired: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return map[status] || "border-slate-200 bg-slate-50 text-slate-700";
}

function buildDefaultDeadline(template) {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + (template.defaultDeadlineHours || 48));
  return deadline.toISOString().slice(0, 16);
}

function generatePackageToken(candidateId) {
  return `pkg-${candidateId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapPelamarRow(item, activePackage = null) {
  const pengalamanList = Array.isArray(item.pengalaman_list) ? item.pengalaman_list : [];
  const pengalamanKerja = pengalamanList.length
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

  const packageTemplate = resolveTestPackageTemplate(item.posisi_dilamar, { freshGraduate: item.fresh_graduate });
  const packageItems = (activePackage?.candidate_test_package_items || []).sort((left, right) => left.test_order - right.test_order);

  return {
    id: item.id,
    namaLengkap: item.nama_lengkap,
    usia: getAgeLabel(item.tanggal_lahir),
    noWhatsapp: item.no_hp,
    email: item.email,
    domisili: item.alamat_domisili,
    posisiDilamar: item.posisi_dilamar,
    lowonganId: item.lowongan_id ? String(item.lowongan_id) : "",
    namaLowongan: item.posisi_dilamar,
    namaUsaha: "HireUMKM Demo",
    namaCabang: "-",
    pendidikanTerakhir: [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-",
    pengalamanKerja,
    perkiraanGaji: item.ekspektasi_gaji ? `Rp${Number(item.ekspektasi_gaji).toLocaleString("id-ID")}` : "-",
    fileCv: item.cv_file_name,
    portofolio: "-",
    catatanRecruiter: item.catatan_recruiter || "Belum ada catatan recruiter.",
    hasilTes: "Belum ada hasil tes.",
    penilaianSingkat: item.penilaian_singkat || "Perlu dicek lagi",
    tahapProses: item.tahap_proses || "Seleksi awal",
    statusTindakLanjut: item.status_tindak_lanjut || (item.last_contacted_at ? "Sedang diproses" : "Baru masuk"),
    asalPelamar: item.sumber_info_lowongan || "-",
    tanggalMasuk: item.created_at,
    siapMulaiKerja: item.interview_datetime || item.created_at,
    siapShift: false,
    punyaKendaraan: false,
    lastContactedAt: item.last_contacted_at,
    alasanTidakLanjut: item.alasan_tidak_lanjut,
    interviewDatetime: item.interview_datetime,
    interviewLocation: item.interview_location,
    interviewInterviewer: item.interview_interviewer,
    interviewNotes: item.interview_notes,
    freshGraduate: Boolean(item.fresh_graduate),
    testPackageTemplateKey: packageTemplate.key,
    testPackageTemplateName: packageTemplate.name,
    testPackageTemplateDescription: packageTemplate.description,
    testPackageDefaultDeadline: buildDefaultDeadline(packageTemplate),
    testPackageDefaultTests: packageTemplate.tests,
    activeTestPackage: activePackage,
    activeTestPackageStatus: activePackage?.status || "draft",
    activeTestPackageStatusLabel: formatPackageStatusLabel(activePackage?.status || "draft"),
    activeTestPackageLink: activePackage?.link_url || "",
    activeTestPackageDeadline: activePackage?.deadline_at || null,
    activeTestPackageSentAt: activePackage?.sent_at || null,
    activeTestPackageItems: packageItems,
  };
}

function TextAreaField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-h-[96px] w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
    />
  );
}

function ActionModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[var(--border-soft)] bg-white px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div> : null}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">{children}</div>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const [candidateRows, setCandidateRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [modalState, setModalState] = useState({ type: "", candidate: null });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [stageForm, setStageForm] = useState({ tahapProses: "Seleksi awal", note: "" });
  const [interviewForm, setInterviewForm] = useState({ date: "", time: "", interviewer: "", location: "", notes: "" });
  const [testPackageForm, setTestPackageForm] = useState({ deadline: "", note: "" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedInterviewPreview, setSelectedInterviewPreview] = useState(null);
  const [isTestPackageFeatureReady, setIsTestPackageFeatureReady] = useState(true);

  useEffect(() => {
    void loadCandidates();
  }, []);

  async function loadCandidates() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const rows = await getPelamarList();
      let activePackageMap = {};
      let packageFeatureReady = true;

      try {
        activePackageMap = await getActiveCandidateTestPackageMap();
      } catch (error) {
        if (isCandidateTestPackageFeatureUnavailable(error)) {
          packageFeatureReady = false;
          console.warn("Fitur paket tes belum aktif di database. Data pelamar tetap dimuat tanpa info paket tes.", error);
        } else {
          throw error;
        }
      }

      setIsTestPackageFeatureReady(packageFeatureReady);
      setCandidateRows(rows.filter((item) => !item.archived).map((item) => mapPelamarRow(item, activePackageMap[item.id] || null)));
    } catch (error) {
      console.error("Load pelamar dari database gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data pelamar.");
    } finally {
      setIsLoading(false);
    }
  }

  const openApplicantForm = () => {
    window.open("/form-pelamar/", "_blank", "noopener,noreferrer");
  };

  const copyApplicantFormLink = async () => {
    const applicantFormUrl = `${window.location.origin}/form-pelamar/`;

    try {
      await navigator.clipboard.writeText(applicantFormUrl);
    } catch {
      window.prompt("Salin link form pelamar ini:", applicantFormUrl);
    }
  };

  const currentActionCandidate = modalState.candidate;

  function showFeedback(type, message) {
    setFeedback({ type, message });
  }

  function syncCandidateInState(nextRow) {
    let mappedCandidate = null;

    setCandidateRows((currentRows) =>
      currentRows.map((item) => {
        if (item.id !== nextRow.id) {
          return item;
        }

        mappedCandidate = mapPelamarRow(nextRow, item.activeTestPackage || null);
        return mappedCandidate;
      }),
    );
    setSelectedCandidate((currentCandidate) => (currentCandidate?.id === nextRow.id && mappedCandidate ? mappedCandidate : currentCandidate));

    return mappedCandidate;
  }

  function openModal(type, candidate) {
    setModalState({ type, candidate });

    if (type === "contact") {
      setContactNote(candidate?.catatanRecruiter && candidate.catatanRecruiter !== "Belum ada catatan recruiter." ? candidate.catatanRecruiter : "");
    }

    if (type === "stage") {
      setStageForm({ tahapProses: candidate?.tahapProses || "Seleksi awal", note: "" });
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

    if (type === "test-package") {
      setTestPackageForm({
        deadline: candidate?.activeTestPackageDeadline ? toDateInputValue(candidate.activeTestPackageDeadline).concat(`T${toTimeInputValue(candidate.activeTestPackageDeadline) || "23:59"}`) : candidate?.testPackageDefaultDeadline || "",
        note: "",
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
      console.error("Update kandidat gagal:", error);
      showFeedback("error", error instanceof Error ? error.message : "Perubahan belum berhasil disimpan.");
      return null;
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleSaveContactNote() {
    if (!currentActionCandidate) return;

    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        catatan_recruiter: contactNote.trim() || null,
      },
      `Catatan recruiter untuk ${currentActionCandidate.namaLengkap} sudah disimpan.`,
    );

    if (updatedRow) closeModal();
  }

  async function handleMarkContacted() {
    if (!currentActionCandidate) return;

    const mergedNote = appendRecruiterNote(
      currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter,
      contactNote,
    );

    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        last_contacted_at: new Date().toISOString(),
        catatan_recruiter: mergedNote,
        status_tindak_lanjut:
          ["Baru masuk", "Belum dihubungi"].includes(currentActionCandidate.statusTindakLanjut) ? "Sedang diproses" : currentActionCandidate.statusTindakLanjut,
      },
      `${currentActionCandidate.namaLengkap} ditandai sudah dihubungi.`,
    );

    if (updatedRow) closeModal();
  }

  async function handleMoveStage() {
    if (!currentActionCandidate) return;

    const targetStage = stageForm.tahapProses;
    const targetStatus = mapStageToStatus(targetStage);
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        tahap_proses: targetStage,
        status_tindak_lanjut: targetStatus,
        catatan_recruiter: appendRecruiterNote(
          currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter,
          stageForm.note ? `Pindah tahap ke "${targetStage}". ${stageForm.note}` : `Pindah tahap ke "${targetStage}".`,
        ),
      },
      `${currentActionCandidate.namaLengkap} dipindahkan ke tahap ${targetStage}.`,
    );

    if (!updatedRow) return;

    try {
      await createStageHistory({
        pelamar_id: currentActionCandidate.id,
        dari_tahap: currentActionCandidate.tahapProses,
        ke_tahap: targetStage,
        catatan: stageForm.note || null,
      });
    } catch (error) {
      console.warn("Riwayat tahap belum berhasil disimpan:", error);
      showFeedback("info", `Tahap ${currentActionCandidate.namaLengkap} sudah berubah, tetapi riwayat tahap belum tersimpan.`);
    }

    closeModal();
  }

  async function handleScheduleInterview() {
    if (!currentActionCandidate) return;
    if (!interviewForm.date || !interviewForm.time || !interviewForm.interviewer.trim() || !interviewForm.location.trim()) {
      showFeedback("error", "Tanggal, jam, pewawancara, dan lokasi/link wajib diisi.");
      return;
    }

    const interviewDatetime = new Date(`${interviewForm.date}T${interviewForm.time}:00`).toISOString();
    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        interview_datetime: interviewDatetime,
        interview_interviewer: interviewForm.interviewer.trim(),
        interview_location: interviewForm.location.trim(),
        interview_notes: interviewForm.notes.trim() || null,
        tahap_proses: "Wawancara",
        status_tindak_lanjut: "Sedang diproses",
        catatan_recruiter: appendRecruiterNote(
          currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter,
          `Wawancara dijadwalkan pada ${formatDateTime(interviewDatetime)} dengan ${interviewForm.interviewer.trim()}.`,
        ),
      },
      `Jadwal wawancara ${currentActionCandidate.namaLengkap} sudah tersimpan.`,
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
    } catch (error) {
      console.warn("Jadwal wawancara detail belum berhasil disimpan:", error);
      showFeedback("info", `Jadwal utama ${currentActionCandidate.namaLengkap} sudah tersimpan, tetapi log jadwal wawancara belum masuk.`);
    }

    closeModal();
  }

  async function handleSaveForLater(candidate) {
    const confirmed = window.confirm(`Simpan ${candidate.namaLengkap} untuk dipakai lagi nanti?`);

    if (!confirmed) return;

    await persistCandidateUpdate(
      candidate.id,
      {
        tahap_proses: "Disimpan",
        status_tindak_lanjut: "Disimpan",
      },
      `${candidate.namaLengkap} disimpan untuk nanti.`,
    );
  }

  async function handleRejectCandidate() {
    if (!currentActionCandidate) return;

    const recruiterReason = rejectionReason.trim();
    const rejectionMessage = [
      `Halo ${currentActionCandidate.namaLengkap},`,
      "",
      `Terima kasih sudah melamar posisi ${currentActionCandidate.posisiDilamar} dan telah memberikan waktu untuk mengikuti proses seleksi di HireUMKM.`,
      "",
      "Setelah kami meninjau CV dan profil Anda secara menyeluruh, saat ini kami memutuskan untuk belum melanjutkan proses ke tahap berikutnya karena kualifikasi yang kami butuhkan untuk posisi ini belum sepenuhnya sesuai dengan kebutuhan perusahaan saat ini.",
      "",
      recruiterReason ? `Catatan singkat dari tim kami: ${recruiterReason}.` : null,
      recruiterReason ? "" : null,
      "Keputusan ini tidak mengurangi nilai, pengalaman, maupun potensi yang Anda miliki. Kami menghargai minat Anda untuk bergabung dan mendoakan yang terbaik untuk perkembangan karier Anda ke depan.",
      "",
      "Terima kasih atas perhatian dan pengertiannya.",
      "",
      "Salam,",
      "Tim Rekrutmen HireUMKM",
    ]
      .filter(Boolean)
      .join("\n");

    const updatedRow = await persistCandidateUpdate(
      currentActionCandidate.id,
      {
        tahap_proses: "Tidak lanjut",
        status_tindak_lanjut: "Tidak lanjut",
        alasan_tidak_lanjut: recruiterReason || null,
        catatan_recruiter: appendRecruiterNote(
          currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter,
          recruiterReason ? `Tidak lanjut. Alasan: ${recruiterReason}. WhatsApp penolakan dibuka untuk kandidat.` : "Tidak lanjut. WhatsApp penolakan dibuka untuk kandidat.",
        ),
      },
      `${currentActionCandidate.namaLengkap} ditandai tidak lanjut.`,
    );

    if (!updatedRow) return;

    openWhatsApp(currentActionCandidate, rejectionMessage);
    closeModal();
  }

  function openWhatsApp(candidate, message) {
    const url = buildWhatsAppLink(candidate.noWhatsapp, message);

    if (!url) {
      showFeedback("error", `Nomor WhatsApp ${candidate.namaLengkap} belum valid.`);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleQuickWhatsApp(candidate) {
    openWhatsApp(
      candidate,
      `Halo ${candidate.namaLengkap}, kami dari tim rekrutmen HireUMKM untuk posisi ${candidate.posisiDilamar}. Kami ingin menghubungi Anda terkait proses lamaran. Apakah saat ini Anda berkenan melanjutkan komunikasi lewat WhatsApp ini?`,
    );
  }

  async function handleCreateTestPackage() {
    if (!currentActionCandidate) return;
    if (!isTestPackageFeatureReady) {
      showFeedback("error", getCandidateTestPackageFeatureUnavailableMessage());
      return;
    }

    if (!testPackageForm.deadline) {
      showFeedback("error", "Deadline paket tes wajib diisi.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      const token = generatePackageToken(currentActionCandidate.id);
      const linkUrl = buildPackageLink(token);
      const packageTemplate = resolveTestPackageTemplate(currentActionCandidate.posisiDilamar, {
        freshGraduate: currentActionCandidate.freshGraduate,
      });
      const createdPackage = await createCandidateTestPackage({
        pelamar_id: currentActionCandidate.id,
        template_key: packageTemplate.key,
        template_name: packageTemplate.name,
        deadline_at: new Date(testPackageForm.deadline).toISOString(),
        created_by: "Recruiter",
        catatan_recruiter: testPackageForm.note.trim() || null,
        link_token: token,
        link_url: linkUrl,
        items: buildPackageItems(packageTemplate.key),
      });

      const updatedRow = await updatePelamar(currentActionCandidate.id, {
        tahap_proses: "Tes kerja",
        status_tindak_lanjut: "Sedang diproses",
        catatan_recruiter: appendRecruiterNote(
          currentActionCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : currentActionCandidate.catatanRecruiter,
          `Paket tes "${packageTemplate.name}" dikirim dengan deadline ${formatDateTime(new Date(testPackageForm.deadline).toISOString())}.`,
        ),
      });

      let mappedCandidate = currentActionCandidate;

      if (updatedRow) {
        mappedCandidate = mapPelamarRow(updatedRow, createdPackage);
        setCandidateRows((currentRows) => currentRows.map((item) => (item.id === mappedCandidate.id ? mappedCandidate : item)));
        setSelectedCandidate((current) => (current?.id === mappedCandidate.id ? mappedCandidate : current));
      }

      showFeedback("success", `Paket tes ${mappedCandidate.namaLengkap} berhasil dibuat.`);

      openWhatsApp(
        mappedCandidate,
        `Halo ${mappedCandidate.namaLengkap}, terima kasih sudah melamar posisi ${mappedCandidate.posisiDilamar}. Anda kami undang untuk mengerjakan paket tes seleksi melalui link berikut:\n${linkUrl}\n\nMohon dikerjakan sebelum ${formatDateTime(
          new Date(testPackageForm.deadline).toISOString(),
        )}.`,
      );

      closeModal();
    } catch (error) {
      console.error("Buat paket tes gagal:", error);
      showFeedback(
        "error",
        isCandidateTestPackageFeatureUnavailable(error)
          ? getCandidateTestPackageFeatureUnavailableMessage()
          : error instanceof Error
            ? error.message
            : "Paket tes belum berhasil dibuat.",
      );
    } finally {
      setIsSubmittingAction(false);
    }
  }

  const filterOptions = useMemo(
    () => ({
      jobs: [...new Set(candidateRows.map((item) => item.namaLowongan))],
      positions: [...new Set(candidateRows.map((item) => item.posisiDilamar))],
      stages: [...new Set(candidateRows.map((item) => item.tahapProses))],
      statuses: [...new Set(candidateRows.map((item) => item.statusTindakLanjut))],
      companies: [...new Set(candidateRows.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
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
          candidate.namaLowongan,
          candidate.namaUsaha,
          candidate.namaCabang,
          candidate.domisili,
          candidate.noWhatsapp,
          candidate.asalPelamar,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesJob = !jobFilter || candidate.namaLowongan === jobFilter;
      const matchesPosition = !positionFilter || candidate.posisiDilamar === positionFilter;
      const matchesStage = !stageFilter || candidate.tahapProses === stageFilter;
      const matchesStatus = !statusFilter || candidate.statusTindakLanjut === statusFilter;
      const matchesCompany = !companyFilter || `${candidate.namaUsaha} - ${candidate.namaCabang}` === companyFilter;
      const matchesSource = !sourceFilter || candidate.asalPelamar === sourceFilter;
      const matchesTab = matchesQuickTab(candidate, activeTab);

      return matchesSearch && matchesJob && matchesPosition && matchesStage && matchesStatus && matchesCompany && matchesSource && matchesTab;
    });
  }, [activeTab, candidateRows, companyFilter, jobFilter, positionFilter, search, sourceFilter, stageFilter, statusFilter]);

  const summaryCards = useMemo(() => {
    const total = candidateRows.length;
    const baruMasuk = candidateRows.filter((item) => item.statusTindakLanjut === "Baru masuk").length;
    const belumDihubungi = candidateRows.filter((item) => item.statusTindakLanjut === "Belum dihubungi").length;
    const diproses = candidateRows.filter((item) => ["Sedang diproses", "Belum dikirim", "Sudah dikirim", "Sedang dikerjakan"].includes(item.statusTindakLanjut)).length;
    const tahapAkhir = candidateRows.filter((item) => item.statusTindakLanjut === "Masuk tahap akhir").length;
    const disimpan = candidateRows.filter((item) => item.statusTindakLanjut === "Disimpan").length;

    return [
      { label: "Total pelamar", value: String(total), note: "Semua pelamar yang sudah masuk ke sistem." },
      { label: "Baru masuk", value: String(baruMasuk), note: "Pelamar yang baru diterima dan belum banyak diproses." },
      { label: "Belum dihubungi", value: String(belumDihubungi), note: "Perlu segera dihubungi agar tidak terlalu lama menunggu." },
      { label: "Sedang diproses", value: String(diproses), note: "Masih berjalan di seleksi awal, tes, atau wawancara." },
      { label: "Masuk tahap akhir", value: String(tahapAkhir), note: "Sudah masuk tahap penawaran kerja atau siap masuk." },
      { label: "Disimpan untuk nanti", value: String(disimpan), note: "Layak dipakai lagi kalau kebutuhan serupa muncul." },
    ];
  }, [candidateRows]);

  const quickTabCounts = useMemo(
    () =>
      quickTabs.reduce((accumulator, tab) => {
        accumulator[tab] = candidateRows.filter((candidate) => matchesQuickTab(candidate, tab)).length;
        return accumulator;
      }, {}),
    [candidateRows],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Kandidat & Pipeline"
        subtitle="Workspace recruiter untuk melihat kandidat baru, memprioritaskan follow up, dan menggerakkan kandidat ke tahap berikutnya tanpa terasa ribet."
      />

      <Card className="overflow-hidden rounded-[28px] border-[rgba(16,35,63,0.08)] bg-[linear-gradient(135deg,#ffffff_0%,#f2f6fb_58%,#e8f0fa_100%)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Recruiter Workspace
              </div>
              <div className="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
                Tampilan kandidat yang lebih cepat discan dan lebih dekat ke ritme kerja recruiter.
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Fokus halaman ini adalah melihat siapa yang baru masuk, siapa yang butuh follow up, dan siapa yang sudah mendekati keputusan akhir. Detail penting ditarik ke depan, sementara aksi tetap ringkas.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:w-[420px]">
              <Button className="h-11 rounded-xl" onClick={openApplicantForm}>
                Buka form
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={copyApplicantFormLink}>
                Salin link
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => void loadCandidates()} disabled={isLoading}>
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Muat ulang
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {summaryCards.slice(0, 3).map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{item.label}</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">{item.value}</div>
                <div className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{item.note}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Data pelamar gagal dimuat</div>
              <div className="mt-1 text-sm leading-6">{errorMessage}</div>
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="rounded-lg p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-[28px]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text-main)]">Pipeline kandidat</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                Pilih tahap untuk fokus ke kandidat yang perlu ditindaklanjuti lebih dulu.
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:w-[720px] xl:grid-cols-4">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, posisi, cabang, email, atau WhatsApp..."
                  className="h-11 rounded-xl border-[var(--border-soft)] pl-10"
                />
              </div>
              <FilterSelect value={jobFilter} onChange={setJobFilter} options={filterOptions.jobs} placeholder="Semua lowongan" />
              <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {quickTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-[118px] rounded-2xl border px-4 py-3 text-left transition ${
                  activeTab === tab
                    ? "border-[var(--brand-700)] bg-[var(--brand-800)] text-white shadow-[0_12px_32px_rgba(16,44,82,0.22)]"
                    : "border-[var(--border-soft)] bg-white hover:border-[var(--border-strong)] hover:bg-[var(--surface-0)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-[15px] font-semibold leading-5 ${activeTab === tab ? "text-white" : "text-[var(--text-main)]"}`}>{tab}</div>
                  <div
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      activeTab === tab ? "bg-white/16 text-white" : "bg-[var(--surface-0)] text-[var(--text-muted)]"
                    }`}
                  >
                    {quickTabCounts[tab] || 0}
                  </div>
                </div>
                <div className={`mt-3 text-[13px] leading-6 ${activeTab === tab ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                  {tab === "Semua" ? "Lihat seluruh kandidat aktif." : `Fokus ke kandidat status ${tab.toLowerCase()}.`}
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect value={stageFilter} onChange={setStageFilter} options={filterOptions.stages} placeholder="Semua tahap proses" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={filterOptions.statuses} placeholder="Semua status tindak lanjut" />
            <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / UMKM" />
            <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={filterOptions.sources} placeholder="Semua asal pelamar" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 p-5 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat data pelamar dari database...
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-[28px] border-[rgba(16,35,63,0.08)]">
        <div className="overflow-x-auto">
          <div className="min-w-[1220px]">
            <div className="grid grid-cols-[150px_2.8fr_160px_2.4fr_1.9fr_150px_150px] border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4 text-[13px] font-semibold text-[var(--text-main)]">
              <div className="flex items-center whitespace-nowrap">Status</div>
              <div className="whitespace-nowrap">Nama & Domisili</div>
              <div className="whitespace-nowrap">WhatsApp</div>
              <div className="whitespace-nowrap">Pengalaman Kerja</div>
              <div className="whitespace-nowrap">Pendidikan</div>
              <div className="whitespace-nowrap">Tanggal Melamar</div>
              <div className="whitespace-nowrap">Terakhir Aktif</div>
            </div>

            {filteredCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidate(candidate)}
                className={`grid cursor-pointer grid-cols-[150px_2.8fr_160px_2.4fr_1.9fr_150px_150px] items-center border-b border-[var(--border-soft)] px-4 py-4 text-sm transition hover:bg-[var(--surface-0)] ${
                  selectedCandidate?.id === candidate.id ? "bg-sky-50/70" : index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <div className="flex items-center pr-4">
                  <div className="flex flex-col gap-2">
                    <StatusBadge value={candidate.statusTindakLanjut} />
                    <Badge variant="outline" className={`${getStageBadgeClass(candidate.tahapProses)} w-fit whitespace-nowrap`}>
                      {candidate.tahapProses}
                    </Badge>
                  </div>
                </div>

                <div className="flex min-w-0 items-start pr-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-main)]">{candidate.namaLengkap}</div>
                    {candidate.usia ? <div className="mt-1 text-[var(--text-muted)]">{candidate.usia}</div> : null}
                    <div className="mt-1 text-[var(--text-muted)]">{candidate.domisili || "-"}</div>
                  </div>
                </div>

                <div className="flex items-center pr-4 font-medium text-[var(--text-main)]">{candidate.noWhatsapp || "-"}</div>

                <div className="flex items-center pr-4">
                  <div>
                    <div className="leading-6 text-[var(--text-main)]">{truncateText(candidate.pengalamanKerja, 96)}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{candidate.penilaianSingkat}</div>
                  </div>
                </div>

                <div className="flex items-center pr-4">
                  <div className="leading-6 text-[var(--text-main)]">{truncateText(candidate.pendidikanTerakhir, 72)}</div>
                </div>

                <div className="flex items-center pr-4 font-medium text-[var(--text-main)]">{formatDate(candidate.tanggalMasuk)}</div>

                <div className="flex items-center pr-4">
                  <div>
                    <div className="font-medium text-[var(--text-main)]">{getRecencyLabel(candidate.lastContactedAt)}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{candidate.asalPelamar}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {!isLoading && filteredCandidates.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="text-base font-semibold text-[var(--text-main)]">Belum ada data pelamar</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Belum ada data pelamar yang sesuai dengan filter atau data memang belum masuk ke database.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Detail Pelamar</div>
                <div className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedCandidate.namaLengkap}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedCandidate.usia ? `${selectedCandidate.usia} / ` : ""}
                  {selectedCandidate.posisiDilamar} / {selectedCandidate.domisili || "-"}
                </div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <StatusBadge value={selectedCandidate.statusTindakLanjut} className="rounded-full px-3 py-1.5" />
                <Badge variant="outline" className={`rounded-full px-3 py-1.5 ${getStageBadgeClass(selectedCandidate.tahapProses)}`}>
                  {selectedCandidate.tahapProses}
                </Badge>
                <Badge className={`rounded-full border px-3 py-1.5 ${fitBadgeStyles[selectedCandidate.penilaianSingkat] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {selectedCandidate.penilaianSingkat}
                </Badge>
              </div>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Ringkasan</div>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[
                    ["Nomor WhatsApp", selectedCandidate.noWhatsapp],
                    ["Email", selectedCandidate.email || "-"],
                    ["Domisili", selectedCandidate.domisili],
                    ["Pendidikan terakhir", selectedCandidate.pendidikanTerakhir],
                    ["Posisi yang dilamar", selectedCandidate.posisiDilamar],
                    ["Lowongan asal", selectedCandidate.namaLowongan],
                    ["Perkiraan gaji", selectedCandidate.perkiraanGaji],
                    ["Asal pelamar", selectedCandidate.asalPelamar],
                    ["Tanggal masuk", formatDate(selectedCandidate.tanggalMasuk)],
                    ["Bisa mulai kerja", formatDate(selectedCandidate.siapMulaiKerja)],
                    ["Siap kerja shift", selectedCandidate.siapShift ? "Siap" : "Belum siap"],
                    ["Punya kendaraan", selectedCandidate.punyaKendaraan ? "Punya" : "Tidak punya"],
                    ["Kontak terakhir", formatDateTime(selectedCandidate.lastContactedAt)],
                    ["Alasan tidak lanjut", selectedCandidate.alasanTidakLanjut || "-"],
                    ["Jadwal wawancara", formatDateTime(selectedCandidate.interviewDatetime)],
                    ["Pewawancara", selectedCandidate.interviewInterviewer || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm text-[var(--text-soft)]">{label}</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Pengalaman</div>
                <div className="text-sm leading-7 text-[var(--text-main)]">{selectedCandidate.pengalamanKerja}</div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Dokumen & catatan</div>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[
                    ["File CV", selectedCandidate.fileCv || "-"],
                    ["Portofolio / link sosial", selectedCandidate.portofolio || "-"],
                    ["Hasil tes ringkas", selectedCandidate.hasilTes],
                    ["Catatan recruiter", selectedCandidate.catatanRecruiter],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm text-[var(--text-soft)]">{label}</div>
                      <div className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--text-main)]">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {selectedCandidate.interviewDatetime ? (
                <section className="space-y-4">
                  <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Interview</div>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">Jadwal wawancara</div>
                        <div className="mt-1 text-sm font-medium text-[var(--text-main)]">{formatDateTime(selectedCandidate.interviewDatetime)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-[var(--text-soft)]">Pewawancara</div>
                        <div className="mt-1 text-sm font-medium text-[var(--text-main)]">{selectedCandidate.interviewInterviewer || "-"}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedInterviewPreview(selectedCandidate)}>
                        Lihat detail interview
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Paket Tes</div>
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                  {!isTestPackageFeatureReady ? (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      {getCandidateTestPackageFeatureUnavailableMessage()}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${getPackageStatusClass(selectedCandidate.activeTestPackageStatus)}`}>
                      {selectedCandidate.activeTestPackageStatusLabel}
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1.5">
                      {selectedCandidate.testPackageTemplateName}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <div>
                      <div className="text-sm text-[var(--text-soft)]">Paket default</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{selectedCandidate.testPackageTemplateDescription}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-soft)]">Deadline aktif</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">
                        {selectedCandidate.activeTestPackageDeadline ? formatDateTime(selectedCandidate.activeTestPackageDeadline) : "Belum dikirim"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(selectedCandidate.activeTestPackageItems.length ? selectedCandidate.activeTestPackageItems : selectedCandidate.testPackageDefaultTests).map((item, index) => (
                      <div key={item.id || item.key || item.test_key || index} className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-3">
                        <div className="font-medium text-[var(--text-main)]">{item.test_name_snapshot || item.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {selectedCandidate.activeTestPackageItems.length ? formatPackageItemStatusLabel(item.status) : "Siap dimasukkan ke paket"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      className="rounded-xl border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                      onClick={() => openModal("test-package", selectedCandidate)}
                      disabled={!isTestPackageFeatureReady}
                    >
                      {selectedCandidate.activeTestPackage ? "Kirim ulang paket tes" : "Kirim paket tes"}
                    </Button>
                    {selectedCandidate.activeTestPackageLink ? (
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedCandidate.activeTestPackageLink);
                          } catch {
                            window.prompt("Salin link paket tes ini:", selectedCandidate.activeTestPackageLink);
                          }
                        }}
                      >
                        Salin link paket
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
                <Button variant="outline" className="rounded-xl" onClick={() => handleQuickWhatsApp(selectedCandidate)}>
                  Chat WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => openModal("reject", selectedCandidate)}
                >
                  Ditolak
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedInterviewPreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Detail Interview</div>
                <div className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedInterviewPreview.namaLengkap}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {selectedInterviewPreview.usia ? `${selectedInterviewPreview.usia} / ` : ""}
                  {selectedInterviewPreview.posisiDilamar} / {selectedInterviewPreview.domisili || "-"}
                </div>
              </div>
              <button onClick={() => setSelectedInterviewPreview(null)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <StatusBadge value={selectedInterviewPreview.statusTindakLanjut} className="rounded-full px-3 py-1.5" />
                <Badge variant="outline" className={`rounded-full px-3 py-1.5 ${getStageBadgeClass(selectedInterviewPreview.tahapProses)}`}>
                  {selectedInterviewPreview.tahapProses}
                </Badge>
              </div>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Ringkasan interview</div>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[
                    ["Jadwal wawancara", formatDateTime(selectedInterviewPreview.interviewDatetime)],
                    ["Pewawancara", selectedInterviewPreview.interviewInterviewer || "-"],
                    ["Lokasi / link wawancara", selectedInterviewPreview.interviewLocation || "-"],
                    ["Status kandidat", selectedInterviewPreview.statusTindakLanjut],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm text-[var(--text-soft)]">{label}</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Catatan</div>
                <div className="text-sm leading-7 text-[var(--text-main)]">{selectedInterviewPreview.interviewNotes || "Belum ada catatan interview."}</div>
              </section>

              <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
                <Button variant="outline" className="rounded-xl" onClick={() => openModal("interview", selectedInterviewPreview)}>
                  Ubah jadwal
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalState.type === "contact" && currentActionCandidate ? (
        <ActionModal
          title="Hubungi pelamar"
          subtitle={`${currentActionCandidate.namaLengkap} • ${currentActionCandidate.posisiDilamar}`}
          onClose={closeModal}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm">
              <div className="text-[var(--text-soft)]">Nama pelamar</div>
              <div className="mt-1 font-medium text-[var(--text-main)]">{currentActionCandidate.namaLengkap}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm">
              <div className="text-[var(--text-soft)]">Nomor WhatsApp</div>
              <div className="mt-1 font-medium text-[var(--text-main)]">{currentActionCandidate.noWhatsapp}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan kontak</div>
            <TextAreaField value={contactNote} onChange={setContactNote} placeholder="Contoh: Sudah ditelepon, minta dihubungi lagi sore ini." />
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

      {modalState.type === "stage" && currentActionCandidate ? (
        <ActionModal
          title="Pindah tahap"
          subtitle={`Atur tahap proses untuk ${currentActionCandidate.namaLengkap}`}
          onClose={closeModal}
        >
          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Tahap berikutnya</div>
            <FilterSelect
              value={stageForm.tahapProses}
              onChange={(value) => setStageForm((current) => ({ ...current, tahapProses: value }))}
              options={stageOptions}
              placeholder="Pilih tahap"
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan opsional</div>
            <TextAreaField
              value={stageForm.note}
              onChange={(value) => setStageForm((current) => ({ ...current, note: value }))}
              placeholder="Contoh: Lolos screening, lanjut ke tes kerja."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleMoveStage()} disabled={isSubmittingAction}>
              Simpan perubahan tahap
            </Button>
          </div>
        </ActionModal>
      ) : null}

      {modalState.type === "interview" && currentActionCandidate ? (
        <ActionModal
          title="Jadwalkan wawancara"
          subtitle={`Simpan jadwal wawancara untuk ${currentActionCandidate.namaLengkap}`}
          onClose={closeModal}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Tanggal wawancara</div>
              <Input type="date" value={interviewForm.date} onChange={(event) => setInterviewForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Jam wawancara</div>
              <Input type="time" value={interviewForm.time} onChange={(event) => setInterviewForm((current) => ({ ...current, time: event.target.value }))} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Pewawancara</div>
              <Input value={interviewForm.interviewer} onChange={(event) => setInterviewForm((current) => ({ ...current, interviewer: event.target.value }))} placeholder="Nama pewawancara" />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Lokasi / link meeting</div>
              <Input value={interviewForm.location} onChange={(event) => setInterviewForm((current) => ({ ...current, location: event.target.value }))} placeholder="Contoh: Kantor pusat / Google Meet" />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan</div>
            <TextAreaField
              value={interviewForm.notes}
              onChange={(value) => setInterviewForm((current) => ({ ...current, notes: value }))}
              placeholder="Catatan tambahan untuk recruiter atau pelamar."
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

      {modalState.type === "test-package" && currentActionCandidate ? (
        <ActionModal
          title="Kirim Paket Tes"
          subtitle={`${currentActionCandidate.namaLengkap} • ${currentActionCandidate.posisiDilamar}`}
          onClose={closeModal}
        >
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
            <div className="text-sm text-[var(--text-soft)]">Paket yang akan dikirim</div>
            <div className="mt-1 text-base font-semibold text-[var(--text-main)]">{currentActionCandidate.testPackageTemplateName}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{currentActionCandidate.testPackageTemplateDescription}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {currentActionCandidate.testPackageDefaultTests.map((item) => (
                <div key={item.key} className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-3">
                  <div className="font-medium text-[var(--text-main)]">{item.name}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Urutan {item.order}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Deadline paket tes</div>
            <Input
              type="datetime-local"
              value={testPackageForm.deadline}
              onChange={(event) => setTestPackageForm((current) => ({ ...current, deadline: event.target.value }))}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan recruiter</div>
            <TextAreaField
              value={testPackageForm.note}
              onChange={(value) => setTestPackageForm((current) => ({ ...current, note: value }))}
              placeholder="Contoh: Mohon kandidat mengerjakan paket tes dalam 2 hari."
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
              onClick={() => void handleCreateTestPackage()}
              disabled={isSubmittingAction || !isTestPackageFeatureReady}
            >
              Kirim paket tes
            </Button>
          </div>
        </ActionModal>
      ) : null}

      {modalState.type === "reject" && currentActionCandidate ? (
        <ActionModal
          title="Ditolak"
          subtitle={`Simpan catatan singkat untuk ${currentActionCandidate.namaLengkap}. Setelah disimpan, WhatsApp penolakan akan otomatis dibuka.`}
          onClose={closeModal}
        >
          <div>
            <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Alasan singkat</div>
            <TextAreaField
              value={rejectionReason}
              onChange={setRejectionReason}
              placeholder="Contoh: Pengalaman dan kualifikasi untuk posisi ini belum sepenuhnya sesuai kebutuhan saat ini."
            />
          </div>

          <div className="flex justify-end">
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => void handleRejectCandidate()} disabled={isSubmittingAction}>
              Tolak kandidat
            </Button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );
}

