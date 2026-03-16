import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, MessageCircle, RefreshCcw, X } from "lucide-react";

import MetricCard from "@/components/common/MetricCard";
import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getActiveCandidateTestPackageMap, isCandidateTestPackageFeatureUnavailable } from "@/services/candidateTestPackageService";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createStageHistory } from "@/services/recruitmentWorkflowService";
import { getLatestScreeningReviews } from "@/services/screeningReviewService";

const TALENT_POOL_MARKER_START = "[[TALENT_POOL]]";
const TALENT_POOL_MARKER_END = "[[/TALENT_POOL]]";
const quickTabs = ["Semua", "Siap dihubungi lagi", "Simpan untuk nanti", "Perlu dicek dulu", "Pernah diwawancara", "Jangan dihubungi lagi"];
const talentStatuses = ["Siap dihubungi lagi", "Simpan untuk nanti", "Perlu dicek dulu", "Jangan dihubungi lagi"];

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  const note = String(nextNote || "").trim();
  if (!note) return previousNote || "";
  const stampedNote = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

function defaultTalentMeta() {
  return {
    statusCadangan: "Simpan untuk nanti",
    posisiCocok: "",
    alasanDisimpan: "",
    bolehDihubungiLagiMulai: "",
    sumberMasukCadangan: "",
  };
}

function parseTalentPoolNoteDocument(note) {
  const rawNotes = typeof note === "string" ? note.trim() : "";
  if (!rawNotes) return { meta: defaultTalentMeta(), plainNotes: "" };
  const startIndex = rawNotes.indexOf(TALENT_POOL_MARKER_START);
  const endIndex = rawNotes.indexOf(TALENT_POOL_MARKER_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { meta: defaultTalentMeta(), plainNotes: rawNotes };
  }
  const jsonText = rawNotes.slice(startIndex + TALENT_POOL_MARKER_START.length, endIndex).trim();
  const before = rawNotes.slice(0, startIndex).trim();
  const after = rawNotes.slice(endIndex + TALENT_POOL_MARKER_END.length).trim();
  const plainNotes = [before, after].filter(Boolean).join("\n\n");

  try {
    const parsed = JSON.parse(jsonText);
    return { meta: { ...defaultTalentMeta(), ...(parsed?.meta || {}) }, plainNotes };
  } catch (error) {
    console.warn("Metadata talent pool gagal diparse. Sistem memakai catatan polos.", error);
    return { meta: defaultTalentMeta(), plainNotes: rawNotes };
  }
}

function buildTalentPoolNoteDocument(meta, plainNotes) {
  return `${TALENT_POOL_MARKER_START}${JSON.stringify({ meta })}${TALENT_POOL_MARKER_END}${plainNotes ? `\n\n${plainNotes}` : ""}`;
}

function getTestSummary(activePackage) {
  if (!activePackage) return "Belum ikut tes.";
  const completedItems = (activePackage.candidate_test_package_items || []).filter((item) => ["completed", "reviewed"].includes(item.status));
  if (!completedItems.length) return activePackage.overall_summary || `${activePackage.template_name} sudah pernah dikirim.`;
  const topItem = completedItems.find((item) => typeof item.score_label === "string" && item.score_label.trim()) || completedItems[0];
  if (topItem?.score_label) return `${topItem.test_name_snapshot}: ${topItem.score_label}`;
  if (typeof topItem?.score_numeric === "number") return `${topItem.test_name_snapshot}: skor ${topItem.score_numeric}`;
  return activePackage.overall_summary || `${activePackage.template_name} pernah dikerjakan.`;
}

function getInterviewSummary(item) {
  if (!item.interview_datetime && !item.interview_notes) return "Belum masuk wawancara.";
  if (!item.interview_notes) return `Sudah diwawancara pada ${formatDate(item.interview_datetime)}.`;
  const lines = String(item.interview_notes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("[[INTERVIEW_FORM]]") && !line.startsWith("[[/INTERVIEW_FORM]]") && line !== "Form wawancara recruiter");
  return lines.find((line) => line.length > 16) || `Sudah diwawancara pada ${formatDate(item.interview_datetime)}.`;
}

function inferSource(item, activePackage) {
  if (item.interview_datetime || item.interview_notes) return "Wawancara";
  if (activePackage) return "Tes kerja";
  return "Seleksi awal";
}

function matchesTab(candidate, tab) {
  if (tab === "Semua") return true;
  if (tab === "Pernah diwawancara") return candidate.hasilWawancaraSingkat !== "Belum masuk wawancara.";
  return candidate.statusCadangan === tab;
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

function mapCandidateToTalentRow(item, screeningReview, activePackage) {
  if (!item || item.archived || item.tahap_proses !== "Disimpan") return null;
  const parsedTalent = parseTalentPoolNoteDocument(item.catatan_recruiter);
  const lastProcessed = item.updated_at || item.last_contacted_at || item.created_at;
  const education = [item.jenjang_pendidikan, item.jurusan].filter(Boolean).join(" / ") || "-";
  const meta = {
    ...parsedTalent.meta,
    posisiCocok: parsedTalent.meta.posisiCocok || item.posisi_dilamar || "-",
    alasanDisimpan:
      parsedTalent.meta.alasanDisimpan ||
      screeningReview?.ringkasan_review ||
      "Disimpan dari proses rekrutmen sebelumnya dan masih berpotensi dipakai lagi untuk kebutuhan yang serupa.",
    sumberMasukCadangan: parsedTalent.meta.sumberMasukCadangan || inferSource(item, activePackage),
  };

  return {
    id: item.id,
    tahapProses: item.tahap_proses || "Disimpan",
    namaLengkap: item.nama_lengkap,
    usia: getAgeLabel(item.tanggal_lahir),
    noWhatsapp: item.no_hp || "-",
    email: item.email || "-",
    domisili: item.alamat_domisili || "-",
    posisiCocok: meta.posisiCocok,
    posisiDilamarTerakhir: item.posisi_dilamar || "-",
    namaUsaha: "HireUMKM Demo",
    namaCabang: "-",
    pendidikan: education,
    pengalamanKerja: item.fresh_graduate ? "Fresh graduate." : item.pengalaman_utama_deskripsi || "Belum ada ringkasan pengalaman.",
    hasilTesSingkat: getTestSummary(activePackage),
    hasilWawancaraSingkat: getInterviewSummary(item),
    terakhirDiproses: lastProcessed,
    bolehDihubungiLagiMulai: meta.bolehDihubungiLagiMulai || "",
    statusCadangan: meta.statusCadangan || "Simpan untuk nanti",
    alasanDisimpan: meta.alasanDisimpan,
    sumberMasukCadangan: meta.sumberMasukCadangan,
    siapDihubungiLagi: (meta.statusCadangan || "Simpan untuk nanti") === "Siap dihubungi lagi",
    catatanRecruiter: parsedTalent.plainNotes || "Belum ada catatan recruiter.",
    talentMeta: meta,
  };
}

export default function TalentPoolPage() {
  const [candidateRows, setCandidateRows] = useState([]);
  const [screeningReviewMap, setScreeningReviewMap] = useState({});
  const [activePackageMap, setActivePackageMap] = useState({});
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [domicileFilter, setDomicileFilter] = useState("");
  const [readyFilter, setReadyFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [lastProcessedFilter, setLastProcessedFilter] = useState("");
  const [activeTab, setActiveTab] = useState("Semua");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [talentForm, setTalentForm] = useState(defaultTalentMeta());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    void loadTalentPool();
  }, []);

  useEffect(() => {
    setTalentForm(selectedCandidate ? { ...defaultTalentMeta(), ...selectedCandidate.talentMeta } : defaultTalentMeta());
  }, [selectedCandidate]);

  async function loadTalentPool() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [pelamarRows, screeningReviews, activePackageMap] = await Promise.all([
        getPelamarList(),
        getLatestScreeningReviews(),
        getActiveCandidateTestPackageMap().catch((error) => {
          if (isCandidateTestPackageFeatureUnavailable(error)) {
            console.warn("Fitur paket tes belum aktif untuk talent pool. Ringkasan hasil tes tidak ditampilkan.", error);
            return {};
          }
          throw error;
        }),
      ]);

      setScreeningReviewMap(screeningReviews);
      setActivePackageMap(activePackageMap);

      const mappedRows = pelamarRows
        .map((item) => mapCandidateToTalentRow(item, screeningReviews[item.id], activePackageMap[item.id] || null))
        .filter(Boolean)
        .sort((left, right) => String(right.terakhirDiproses || "").localeCompare(String(left.terakhirDiproses || "")));

      setCandidateRows(mappedRows);
    } catch (error) {
      console.error("Load talent pool gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat cadangan kandidat.");
      setCandidateRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
  }

  function syncCandidateInState(updatedRow) {
    if (!updatedRow || updatedRow.archived || updatedRow.tahap_proses !== "Disimpan") {
      setCandidateRows((currentRows) => currentRows.filter((item) => item.id !== updatedRow?.id));
      setSelectedCandidate((current) => (current?.id === updatedRow?.id ? null : current));
      return null;
    }

    const mappedCandidate = mapCandidateToTalentRow(updatedRow, screeningReviewMap[updatedRow.id], activePackageMap[updatedRow.id] || null);
    if (!mappedCandidate) return null;

    setCandidateRows((currentRows) =>
      [...currentRows.filter((item) => item.id !== mappedCandidate.id), mappedCandidate].sort((left, right) =>
        String(right.terakhirDiproses || "").localeCompare(String(left.terakhirDiproses || "")),
      ),
    );
    setSelectedCandidate((current) => (current?.id === mappedCandidate.id ? mappedCandidate : current));
    return mappedCandidate;
  }

  async function persistTalentState(candidate, nextMeta, nextStage = "Disimpan", nextStatus = "Disimpan", note = "") {
    if (!candidate) return null;

    setIsSubmitting(true);

    try {
      const nextPlainNotes = appendRecruiterNote(
        candidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : candidate.catatanRecruiter,
        note,
      );

      const updatedRow = await updatePelamar(candidate.id, {
        tahap_proses: nextStage,
        status_tindak_lanjut: nextStatus,
        catatan_recruiter: buildTalentPoolNoteDocument(nextMeta, nextPlainNotes),
      });

      if (!updatedRow) throw new Error("Data pelamar tidak ditemukan setelah cadangan diperbarui.");

      if (nextStage !== candidate.tahapProses) {
        try {
          await createStageHistory({
            pelamar_id: candidate.id,
            dari_tahap: candidate.tahapProses || "Disimpan",
            ke_tahap: nextStage,
            catatan: note || null,
          });
        } catch (historyError) {
          console.warn("Riwayat tahap talent pool belum berhasil disimpan:", historyError);
          showFeedback("info", `Status ${candidate.namaLengkap} sudah berubah, tetapi riwayat tahap belum berhasil dicatat.`);
        }
      }

      return syncCandidateInState(updatedRow);
    } catch (error) {
      console.error("Update talent pool gagal:", error);
      showFeedback("error", error instanceof Error ? error.message : "Cadangan pelamar belum berhasil diperbarui.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  function openWhatsApp(candidate, customMessage) {
    const url = buildWhatsAppLink(candidate.noWhatsapp, customMessage);
    if (!url) {
      showFeedback("error", `Nomor WhatsApp ${candidate.namaLengkap} belum valid.`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSaveTalentMeta() {
    if (!selectedCandidate) return;
    const nextCandidate = await persistTalentState(selectedCandidate, talentForm, "Disimpan", "Disimpan", "Metadata cadangan kandidat diperbarui.");
    if (nextCandidate) showFeedback("success", `Detail cadangan ${selectedCandidate.namaLengkap} berhasil disimpan.`);
  }

  async function handleContactAgain(candidate = selectedCandidate) {
    if (!candidate) return;

    const nextMeta = { ...candidate.talentMeta, ...talentForm, statusCadangan: "Siap dihubungi lagi" };
    await persistTalentState(candidate, nextMeta, "Disimpan", "Disimpan", "Kandidat dihubungi kembali dari cadangan kandidat.");

    const message = [
      `Halo ${candidate.namaLengkap},`,
      "",
      `Kami dari tim rekrutmen HireUMKM. Saat ini ada kebutuhan posisi yang masih relevan dengan profil Anda, yaitu ${nextMeta.posisiCocok || candidate.posisiDilamarTerakhir}.`,
      "",
      "Jika Anda masih terbuka untuk proses rekrutmen lanjutan, silakan balas pesan ini agar tim kami bisa mengatur langkah berikutnya.",
      "",
      "Salam,",
      "Tim Rekrutmen HireUMKM",
    ].join("\n");

    openWhatsApp(candidate, message);
  }

  async function handleReturnToProcess(candidate = selectedCandidate) {
    if (!candidate) return;

    const nextMeta = { ...candidate.talentMeta, ...talentForm, statusCadangan: "Siap dihubungi lagi" };
    const nextCandidate = await persistTalentState(
      candidate,
      nextMeta,
      "Seleksi awal",
      "Sedang diproses",
      `Kandidat diaktifkan kembali dari cadangan untuk diproses ke seleksi awal posisi ${nextMeta.posisiCocok || candidate.posisiDilamarTerakhir}.`,
    );

    if (nextCandidate !== null) {
      showFeedback("success", `${candidate.namaLengkap} diaktifkan kembali ke proses rekrutmen.`);
      setSelectedCandidate(null);
    }
  }

  async function handleKeepInTalentPool(candidate = selectedCandidate) {
    if (!candidate) return;
    const nextMeta = { ...candidate.talentMeta, ...talentForm, statusCadangan: "Simpan untuk nanti" };
    const nextCandidate = await persistTalentState(candidate, nextMeta, "Disimpan", "Disimpan", "Kandidat tetap disimpan di cadangan kandidat.");
    if (nextCandidate) showFeedback("success", `${candidate.namaLengkap} tetap disimpan di cadangan.`);
  }

  async function handleMarkDoNotContact(candidate = selectedCandidate) {
    if (!candidate) return;
    const nextMeta = { ...candidate.talentMeta, ...talentForm, statusCadangan: "Jangan dihubungi lagi" };
    const nextCandidate = await persistTalentState(candidate, nextMeta, "Disimpan", "Disimpan", "Kandidat ditandai jangan dihubungi lagi dari talent pool.");
    if (nextCandidate) showFeedback("success", `${candidate.namaLengkap} ditandai jangan dihubungi lagi.`);
  }

  const filterOptions = useMemo(
    () => ({
      positions: [...new Set(candidateRows.map((item) => item.posisiCocok).filter(Boolean))],
      domiciles: [...new Set(candidateRows.map((item) => item.domisili).filter(Boolean))],
      readyStatus: talentStatuses,
      histories: ["Pernah ikut tes", "Pernah diwawancara"],
      companies: [...new Set(candidateRows.map((item) => `${item.namaUsaha} - ${item.namaCabang}`))],
      lastProcessed: [...new Set(candidateRows.map((item) => formatDate(item.terakhirDiproses)).filter((item) => item !== "-"))],
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
          candidate.posisiCocok,
          candidate.posisiDilamarTerakhir,
          candidate.namaUsaha,
          candidate.namaCabang,
          candidate.domisili,
          candidate.alasanDisimpan,
          candidate.noWhatsapp,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      const matchesPosition = !positionFilter || candidate.posisiCocok === positionFilter;
      const matchesDomicile = !domicileFilter || candidate.domisili === domicileFilter;
      const matchesReady = !readyFilter || candidate.statusCadangan === readyFilter;
      const matchesHistory =
        !historyFilter ||
        (historyFilter === "Pernah ikut tes" && candidate.hasilTesSingkat !== "Belum ikut tes.") ||
        (historyFilter === "Pernah diwawancara" && candidate.hasilWawancaraSingkat !== "Belum masuk wawancara.");
      const matchesCompany = !companyFilter || `${candidate.namaUsaha} - ${candidate.namaCabang}` === companyFilter;
      const matchesLastProcessed = !lastProcessedFilter || formatDate(candidate.terakhirDiproses) === lastProcessedFilter;
      const matchesQuickTab = matchesTab(candidate, activeTab);

      return matchesSearch && matchesPosition && matchesDomicile && matchesReady && matchesHistory && matchesCompany && matchesLastProcessed && matchesQuickTab;
    });
  }, [activeTab, candidateRows, companyFilter, domicileFilter, historyFilter, lastProcessedFilter, positionFilter, readyFilter, search]);

  const summaryCards = useMemo(
    () => [
      { label: "Total cadangan kandidat", value: String(candidateRows.length), note: "Kandidat asli yang disimpan untuk kebutuhan baru atau kebutuhan susulan." },
      { label: "Siap dihubungi lagi", value: String(candidateRows.filter((item) => item.statusCadangan === "Siap dihubungi lagi").length), note: "Bisa langsung dihubungi saat ada lowongan yang cocok." },
      { label: "Perlu dicek dulu", value: String(candidateRows.filter((item) => item.statusCadangan === "Perlu dicek dulu").length), note: "Masih layak, tetapi perlu review recruiter sebelum dipakai lagi." },
      { label: "Pernah diwawancara", value: String(candidateRows.filter((item) => item.hasilWawancaraSingkat !== "Belum masuk wawancara.").length), note: "Sudah pernah sampai tahap wawancara sehingga konteks kandidat lebih lengkap." },
      { label: "Cocok untuk posisi tertentu", value: String(new Set(candidateRows.map((item) => item.posisiCocok)).size), note: "Bisa dipakai lagi untuk berbagai posisi yang sering dibuka." },
      { label: "Jangan dihubungi lagi", value: String(candidateRows.filter((item) => item.statusCadangan === "Jangan dihubungi lagi").length), note: "Tidak perlu dipakai lagi untuk kebutuhan berikutnya." },
    ],
    [candidateRows],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Cadangan Kandidat"
        subtitle="Database kandidat nyata yang belum dipakai sekarang, tetapi masih bisa dipanggil lagi saat ada kebutuhan baru."
      />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "info"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">Filter cadangan kandidat</div>
              <div className="mt-1 text-sm text-slate-500">Fokuskan recruiter ke kandidat cadangan yang paling mungkin dipakai lagi.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => void loadTalentPool()} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Muat ulang
              </Button>
              <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => selectedCandidate && void handleReturnToProcess(selectedCandidate)} disabled={!selectedCandidate || isSubmitting}>
                Aktifkan lagi
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, posisi, domisili, usaha, atau WhatsApp..."
              className="rounded-2xl border-slate-200"
            />
            <FilterSelect value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
            <FilterSelect value={domicileFilter} onChange={setDomicileFilter} options={filterOptions.domiciles} placeholder="Semua domisili" />
            <FilterSelect value={readyFilter} onChange={setReadyFilter} options={filterOptions.readyStatus} placeholder="Semua status siap dihubungi" />
            <FilterSelect value={historyFilter} onChange={setHistoryFilter} options={filterOptions.histories} placeholder="Tes / wawancara" />
            <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={filterOptions.companies} placeholder="Semua cabang / UMKM" />
            <FilterSelect value={lastProcessedFilter} onChange={setLastProcessedFilter} options={filterOptions.lastProcessed} placeholder="Terakhir diproses" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Memuat data cadangan kandidat...
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredCandidates.map((candidate) => (
          <Card key={candidate.id} className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{candidate.namaLengkap}</div>
                  <div className="text-sm text-slate-500">
                    {candidate.posisiCocok} / {candidate.namaUsaha} / {candidate.namaCabang}
                  </div>
                </div>
                <StatusBadge value={candidate.statusCadangan} />
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-500">Domisili</div>
                  <div className="mt-1 font-medium text-slate-900">{candidate.domisili}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-500">Terakhir diproses</div>
                  <div className="mt-1 font-medium text-slate-900">{formatDate(candidate.terakhirDiproses)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-500">Hasil tes singkat</div>
                  <div className="mt-1 font-medium text-slate-900">{candidate.hasilTesSingkat}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-slate-500">Hasil wawancara singkat</div>
                  <div className="mt-1 font-medium text-slate-900">{candidate.hasilWawancaraSingkat}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-900">Pengalaman singkat</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{candidate.pengalamanKerja}</p>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-900">Alasan disimpan</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{candidate.alasanDisimpan}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full">
                  Posisi terakhir: {candidate.posisiDilamarTerakhir}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  Sumber: {candidate.sumberMasukCadangan}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {candidate.siapDihubungiLagi ? "Siap dihubungi lagi" : "Perlu dicek dulu"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedCandidate(candidate)}>
                  Lihat detail
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleContactAgain(candidate)}>
                  Hubungi lagi
                </Button>
                <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleReturnToProcess(candidate)}>
                  Aktifkan lagi
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleKeepInTalentPool(candidate)}>
                  Simpan tetap di cadangan
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleMarkDoNotContact(candidate)}>
                  Jangan dihubungi lagi
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && filteredCandidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          Belum ada cadangan kandidat yang cocok dengan pencarian atau filter yang dipilih.
        </div>
      ) : null}

      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Detail cadangan kandidat</div>
                <div className="text-sm text-slate-500">{selectedCandidate.namaLengkap}</div>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={talentForm.statusCadangan || selectedCandidate.statusCadangan} />
                <Badge variant="outline" className="rounded-full">
                  Sumber: {talentForm.sumberMasukCadangan || selectedCandidate.sumberMasukCadangan}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  Boleh dihubungi lagi: {talentForm.bolehDihubungiLagiMulai ? formatDate(talentForm.bolehDihubungiLagiMulai) : "-"}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Nama lengkap", selectedCandidate.namaLengkap],
                  ["Usia", selectedCandidate.usia || "-"],
                  ["No WhatsApp", selectedCandidate.noWhatsapp],
                  ["Domisili", selectedCandidate.domisili],
                  ["Posisi terakhir", selectedCandidate.posisiDilamarTerakhir],
                  ["Pendidikan", selectedCandidate.pendidikan],
                  ["Hasil tes singkat", selectedCandidate.hasilTesSingkat],
                  ["Hasil wawancara singkat", selectedCandidate.hasilWawancaraSingkat],
                  ["Terakhir diproses", formatDate(selectedCandidate.terakhirDiproses)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <div className="text-slate-500">{label}</div>
                    <div className="mt-1 font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="text-base font-semibold text-slate-900">Form cadangan recruiter</div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">Status cadangan</div>
                    <select
                      value={talentForm.statusCadangan}
                      onChange={(event) => setTalentForm((current) => ({ ...current, statusCadangan: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    >
                      {talentStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">Posisi yang cocok dipakai lagi</div>
                    <Input
                      value={talentForm.posisiCocok}
                      onChange={(event) => setTalentForm((current) => ({ ...current, posisiCocok: event.target.value }))}
                      placeholder="Contoh: Admin outlet / Admin marketplace"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">Boleh dihubungi lagi mulai</div>
                    <Input
                      type="date"
                      value={talentForm.bolehDihubungiLagiMulai}
                      onChange={(event) => setTalentForm((current) => ({ ...current, bolehDihubungiLagiMulai: event.target.value }))}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">Alasan disimpan</div>
                    <textarea
                      value={talentForm.alasanDisimpan}
                      onChange={(event) => setTalentForm((current) => ({ ...current, alasanDisimpan: event.target.value }))}
                      rows={5}
                      placeholder="Tulis alasan kenapa kandidat ini masih layak disimpan di cadangan."
                      className="min-h-[132px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="text-base font-semibold text-slate-900">Catatan recruiter</div>
                  <textarea
                    value={selectedCandidate.catatanRecruiter === "Belum ada catatan recruiter." ? "" : selectedCandidate.catatanRecruiter}
                    readOnly
                    rows={12}
                    className="min-h-[260px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                  <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                    Kandidat ini berasal dari tahap <span className="font-medium text-slate-800">{selectedCandidate.sumberMasukCadangan}</span> dan terakhir diproses pada{" "}
                    <span className="font-medium text-slate-800">{formatDate(selectedCandidate.terakhirDiproses)}</span>.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="rounded-2xl" onClick={() => void handleSaveTalentMeta()} disabled={isSubmitting}>
                  Simpan detail cadangan
                </Button>
                <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleContactAgain()} disabled={isSubmitting}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hubungi lagi
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleReturnToProcess()} disabled={isSubmitting}>
                  Aktifkan lagi ke proses
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleKeepInTalentPool()} disabled={isSubmitting}>
                  Simpan ke cadangan
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => void handleMarkDoNotContact()} disabled={isSubmitting}>
                  Jangan dihubungi lagi
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
