import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, MessageCircle, Search, Send, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getOfferingLetterMapByPelamarIds, updateOfferingLetter, upsertOfferingLetterByPelamarId } from "@/services/offeringService";
import { getPelamarList, updatePelamar } from "@/services/pelamarService";
import { createStageHistory } from "@/services/recruitmentWorkflowService";

const offeringStatusMeta = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  waiting_response: { label: "Menunggu jawaban", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  negotiation: { label: "Negosiasi", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  accepted: { label: "Diterima", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  rejected: { label: "Ditolak", tone: "border-rose-200 bg-rose-50 text-rose-700" },
  expired: { label: "Kadaluarsa", tone: "border-slate-300 bg-slate-100 text-slate-700" },
};

const employmentOptions = ["Probation", "Kontrak", "Tetap", "Freelance", "Part time"];

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
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rp${amount.toLocaleString("id-ID")}` : "-";
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

function buildDefaultForm(row) {
  return {
    positionTitle: row?.offering?.position_title || row?.posisi || "",
    branchName: row?.offering?.branch_name || row?.domisili || "",
    companyName: row?.offering?.company_name || "HireUMKM Demo",
    employmentType: row?.offering?.employment_type || "Probation",
    salaryAmount: row?.offering?.salary_amount ? String(row.offering.salary_amount) : "",
    startDate: row?.offering?.start_date || "",
    probationPeriod: row?.offering?.probation_period || "3 bulan",
    benefitsSummary: row?.offering?.benefits_summary || "Gaji pokok, BPJS setelah masa evaluasi, dan dukungan onboarding dari tim HR.",
    responseDeadline: row?.offering?.response_deadline || "",
    hrPicName: row?.offering?.hr_pic_name || row?.interviewer || "Tim HR HireUMKM",
    additionalNotes: row?.offering?.additional_notes || "",
  };
}

function getOfferingVersion(offering) {
  const version = Number(offering?.version);
  return Number.isFinite(version) && version > 0 ? version : 1;
}

function buildOfferingLetterCopy(row, form) {
  return [
    `Halo ${row.nama},`,
    "",
    `Terima kasih sudah mengikuti proses rekrutmen untuk posisi ${form.positionTitle}.`,
    "",
    `Dengan senang hati kami menyampaikan penawaran kerja untuk bergabung bersama ${form.companyName} dengan rincian singkat sebagai berikut:`,
    `- Posisi: ${form.positionTitle}`,
    `- Penempatan: ${form.branchName}`,
    `- Status kerja: ${form.employmentType}`,
    `- Gaji yang ditawarkan: ${formatCurrency(form.salaryAmount)}`,
    `- Rencana mulai kerja: ${formatDate(form.startDate)}`,
    `- Masa evaluasi awal: ${form.probationPeriod || "-"}`,
    `- Benefit utama: ${form.benefitsSummary || "-"}`,
    "",
    form.additionalNotes ? `Catatan tambahan dari tim kami: ${form.additionalNotes}` : null,
    form.responseDeadline ? `Mohon konfirmasi jawaban paling lambat ${formatDate(form.responseDeadline)}.` : "Mohon konfirmasi jawaban Anda setelah membaca penawaran ini.",
    "",
    `Jika ada hal yang ingin ditanyakan atau didiskusikan, silakan balas pesan ini ya.`,
    "",
    `Salam,`,
    form.hrPicName || "Tim HR HireUMKM",
  ]
    .filter(Boolean)
    .join("\n");
}

function mapRow(item, offeringMap) {
  const stage = item.tahap_proses || "";
  const offering = offeringMap[item.id] || null;
  if (!["Penawaran kerja", "Siap masuk", "Sudah masuk kerja"].includes(stage) && !offering) return null;

  const status = offering?.status || "draft";
  return {
    id: item.id,
    nama: item.nama_lengkap,
    posisi: item.posisi_dilamar,
    domisili: item.alamat_domisili || "-",
    whatsapp: item.no_hp || "",
    interviewer: item.user_interview_interviewer || item.interview_interviewer || "Recruiter",
    tahapProses: stage || "Penawaran kerja",
    statusTindakLanjut: item.status_tindak_lanjut || "Masuk tahap akhir",
    offering,
    offeringStatus: status,
    offeringLabel: offeringStatusMeta[status]?.label || "Draft",
    interviewSummary: item.user_interview_notes || item.interview_notes || item.catatan_recruiter || "Belum ada ringkasan akhir recruiter.",
  };
}

function OfferingStatusBadge({ status }) {
  const meta = offeringStatusMeta[status] || offeringStatusMeta.draft;
  return <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold ${meta.tone}`}>{meta.label}</div>;
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

export default function OfferingPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(buildDefaultForm(null));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    setForm(buildDefaultForm(selected));
  }, [selected]);

  async function loadRows() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const pelamarRows = await getPelamarList();
      const offeringMap = await getOfferingLetterMapByPelamarIds(pelamarRows.map((item) => item.id));
      const nextRows = pelamarRows
        .filter((item) => !item.archived)
        .map((item) => mapRow(item, offeringMap))
        .filter(Boolean)
        .sort((left, right) => {
          const leftStamp = left.offering?.updated_at || left.offering?.created_at || "";
          const rightStamp = right.offering?.updated_at || right.offering?.created_at || "";
          return rightStamp.localeCompare(leftStamp);
        });
      setRows(nextRows);
      setSelected((current) => (current ? nextRows.find((item) => item.id === current.id) || null : null));
    } catch (error) {
      console.error("Load offering gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data penawaran kerja.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  function syncRow(updatedPelamar, updatedOffering) {
    const mapped = mapRow(updatedPelamar, { [updatedPelamar.id]: updatedOffering });
    if (!mapped) {
      setRows((current) => current.filter((item) => item.id !== updatedPelamar.id));
      setSelected((current) => (current?.id === updatedPelamar.id ? null : current));
      return null;
    }

    setRows((current) => {
      const next = [...current.filter((item) => item.id !== updatedPelamar.id), mapped];
      return next.sort((left, right) => {
        const leftStamp = left.offering?.updated_at || left.offering?.created_at || "";
        const rightStamp = right.offering?.updated_at || right.offering?.created_at || "";
        return rightStamp.localeCompare(leftStamp);
      });
    });
    setSelected((current) => (current?.id === updatedPelamar.id ? mapped : current));
    return mapped;
  }

  async function persistOffering(nextStatus, note, options = {}) {
    if (!selected) return null;
    setSubmitting(true);
    try {
      const payload = {
        status: nextStatus,
        position_title: form.positionTitle,
        branch_name: form.branchName,
        company_name: form.companyName,
        employment_type: form.employmentType,
        salary_amount: form.salaryAmount ? Number(form.salaryAmount) : null,
        start_date: form.startDate || null,
        probation_period: form.probationPeriod || null,
        benefits_summary: form.benefitsSummary || null,
        response_deadline: form.responseDeadline || null,
        hr_pic_name: form.hrPicName || null,
        additional_notes: form.additionalNotes || null,
        letter_payload: {
          candidateName: selected.nama,
          body: buildOfferingLetterCopy(selected, form),
        },
        sent_at: nextStatus === "waiting_response" ? new Date().toISOString() : selected.offering?.sent_at || null,
        responded_at: ["accepted", "rejected"].includes(nextStatus) ? new Date().toISOString() : selected.offering?.responded_at || null,
      };

      const updatedOffering = selected.offering?.id
        ? await updateOfferingLetter(selected.offering.id, payload)
        : await upsertOfferingLetterByPelamarId(selected.id, {
            pelamar_id: selected.id,
            version: getOfferingVersion(selected.offering),
            ...payload,
          });
      const updatedPelamar = await updatePelamar(selected.id, {
        tahap_proses: options.nextStage || selected.tahapProses,
        status_tindak_lanjut: options.nextStageStatus || selected.statusTindakLanjut,
        catatan_recruiter: selected.offering?.additional_notes || selected.interviewSummary,
      });

      if (!updatedPelamar || !updatedOffering) throw new Error("Data penawaran belum berhasil diperbarui.");

      if (options.nextStage && options.nextStage !== selected.tahapProses) {
        try {
          await createStageHistory({
            pelamar_id: selected.id,
            dari_tahap: selected.tahapProses,
            ke_tahap: options.nextStage,
            catatan: note,
          });
        } catch (historyError) {
          console.warn("Riwayat tahap offering belum tersimpan:", historyError);
        }
      }

      const next = syncRow(updatedPelamar, updatedOffering);
      setFeedback({ type: "success", message: note });
      return next;
    } catch (error) {
      console.error("Persist offering gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Perubahan penawaran belum berhasil disimpan." });
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    await persistOffering("draft", `Draft penawaran untuk ${selected.nama} berhasil disimpan.`);
  }

  async function handleSendOffering() {
    const next = await persistOffering("waiting_response", `Penawaran kerja untuk ${selected.nama} sudah ditandai terkirim dan menunggu jawaban.`);
    if (!next) return;

    const url = buildWaLink(next.whatsapp, buildOfferingLetterCopy(next, form));
    if (!url) {
      setFeedback({ type: "info", message: `Draft ${next.nama} sudah ditandai terkirim, tetapi nomor WhatsApp kandidat belum valid.` });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleNegotiation() {
    await persistOffering("negotiation", `Status penawaran ${selected.nama} diubah ke negosiasi.`);
  }

  async function handleReject() {
    await persistOffering("rejected", `Penawaran kerja ${selected.nama} ditandai ditolak kandidat.`);
  }

  async function handleAccept() {
    await persistOffering("accepted", `Penawaran kerja ${selected.nama} ditandai diterima kandidat.`);
  }

  async function handleMoveToOnboarding() {
    await persistOffering("accepted", `${selected.nama} dipindahkan ke tahap Karyawan Baru.`, {
      nextStage: "Siap masuk",
      nextStageStatus: "Siap masuk",
    });
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesSearch =
        !term || [item.nama, item.posisi, item.domisili, item.interviewSummary, item.offeringLabel].join(" ").toLowerCase().includes(term);
      return (!statusFilter || item.offeringStatus === statusFilter) && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const summaryCards = useMemo(
    () => [
      { label: "Total penawaran", value: String(rows.length), note: "Kandidat yang sudah masuk tahap penawaran kerja." },
      { label: "Draft", value: String(rows.filter((item) => item.offeringStatus === "draft").length), note: "Masih perlu dicek sebelum dikirim." },
      { label: "Menunggu jawaban", value: String(rows.filter((item) => item.offeringStatus === "waiting_response").length), note: "Sudah dikirim dan menunggu respons kandidat." },
      { label: "Negosiasi", value: String(rows.filter((item) => item.offeringStatus === "negotiation").length), note: "Perlu revisi atau diskusi ulang dengan kandidat." },
      { label: "Diterima", value: String(rows.filter((item) => item.offeringStatus === "accepted").length), note: "Sudah siap dipindahkan ke Karyawan Baru." },
    ],
    [rows],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Offering"
        subtitle="Kelola penawaran kerja dengan bahasa yang sederhana, jelas, dan nyaman dibaca kandidat UMKM sebelum mereka resmi masuk kerja."
      />

      {feedback ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : feedback.type === "info" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback.message}
        </div>
      ) : null}

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-[24px] border border-[var(--border-soft)] bg-white">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text-main)]">Daftar penawaran kerja</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">Fokus di halaman ini hanya menyiapkan penawaran, mengirim ke kandidat, dan mencatat jawabannya.</div>
            </div>
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">{filteredRows.length} data tampil</div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama kandidat, posisi, domisili, atau isi ringkasan penawaran" className="h-11 rounded-xl border-[var(--border-soft)] bg-white pl-10" />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="flex h-11 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]">
              <option value="">Semua status offering</option>
              {Object.entries(offeringStatusMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4 text-sm text-[var(--text-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Memuat data offering...
            </div>
          ) : null}

          <div className="grid gap-3">
            {filteredRows.map((item) => (
              <div key={item.id} className="rounded-[18px] border border-[var(--border-soft)] bg-white p-4 transition hover:bg-[var(--surface-0)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-[var(--text-main)]">{item.nama}</div>
                      <StatusBadge value={item.tahapProses} />
                      <OfferingStatusBadge status={item.offeringStatus} />
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">{item.posisi} / {item.domisili}</div>
                    <div className="line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{item.interviewSummary}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelected(item)}>
                      Detail
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Penawaran Kerja</div>
                <div className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selected.nama}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{selected.posisi} / {selected.domisili}</div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-0)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 px-6 py-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={selected.tahapProses} className="rounded-full px-3 py-1.5" />
                  <OfferingStatusBadge status={selected.offeringStatus} />
                </div>

                <Card className="rounded-[20px] border border-[var(--border-soft)] bg-white">
                  <CardContent className="space-y-4 p-5">
                    <div className="text-base font-semibold text-[var(--text-main)]">Form penawaran kerja</div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Posisi</div>
                        <Input value={form.positionTitle} onChange={(event) => setForm((current) => ({ ...current, positionTitle: event.target.value }))} />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Lokasi / cabang</div>
                        <Input value={form.branchName} onChange={(event) => setForm((current) => ({ ...current, branchName: event.target.value }))} />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Nama usaha</div>
                        <Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Status kerja</div>
                        <select value={form.employmentType} onChange={(event) => setForm((current) => ({ ...current, employmentType: event.target.value }))} className="flex h-10 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]">
                          {employmentOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Gaji yang ditawarkan</div>
                        <Input value={form.salaryAmount} onChange={(event) => setForm((current) => ({ ...current, salaryAmount: event.target.value.replace(/[^\d]/g, "") }))} placeholder="Contoh: 3500000" />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Tanggal mulai kerja</div>
                        <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Masa evaluasi awal</div>
                        <Input value={form.probationPeriod} onChange={(event) => setForm((current) => ({ ...current, probationPeriod: event.target.value }))} placeholder="Contoh: 3 bulan" />
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Batas jawaban kandidat</div>
                        <Input type="date" value={form.responseDeadline} onChange={(event) => setForm((current) => ({ ...current, responseDeadline: event.target.value }))} />
                      </div>
                      <div className="md:col-span-2">
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Benefit utama</div>
                        <Input value={form.benefitsSummary} onChange={(event) => setForm((current) => ({ ...current, benefitsSummary: event.target.value }))} placeholder="Contoh: Gaji pokok, BPJS setelah masa evaluasi, makan siang, dan dukungan onboarding." />
                      </div>
                      <div className="md:col-span-2">
                        <div className="mb-2 text-sm font-medium text-[var(--text-main)]">PIC HR</div>
                        <Input value={form.hrPicName} onChange={(event) => setForm((current) => ({ ...current, hrPicName: event.target.value }))} placeholder="Nama recruiter / PIC" />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Catatan tambahan</div>
                      <textarea value={form.additionalNotes} onChange={(event) => setForm((current) => ({ ...current, additionalNotes: event.target.value }))} rows={4} placeholder="Tulis catatan tambahan yang perlu diketahui kandidat, misalnya dokumen yang perlu disiapkan atau penjelasan singkat soal hari pertama kerja." className="min-h-[112px] w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-5">
                <Card className="rounded-[20px] border border-[var(--border-soft)] bg-white">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-[var(--text-main)]">Preview surat penawaran kerja</div>
                      <OfferingStatusBadge status={selected.offeringStatus} />
                    </div>

                    <div className="rounded-[20px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 text-sm leading-7 text-[var(--text-main)]">
                      <div className="text-lg font-semibold text-[var(--text-main)]">Surat penawaran kerja</div>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">{form.companyName}</div>
                      <div className="mt-4 whitespace-pre-line">{buildOfferingLetterCopy(selected, form)}</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Terakhir dikirim</div>
                        <div className="mt-2 text-sm font-medium text-[var(--text-main)]">{formatDateTime(selected.offering?.sent_at)}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Terakhir dijawab</div>
                        <div className="mt-2 text-sm font-medium text-[var(--text-main)]">{formatDateTime(selected.offering?.responded_at)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button className="rounded-xl" onClick={() => void handleSaveDraft()} disabled={submitting}>
                    Simpan draft
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void handleSendOffering()} disabled={submitting}>
                    <Send className="mr-2 h-4 w-4" />
                    Kirim offering
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void handleNegotiation()} disabled={submitting}>
                    Tandai negosiasi
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void handleReject()} disabled={submitting}>
                    Tandai ditolak
                  </Button>
                  <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleAccept()} disabled={submitting}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Tandai diterima
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => void handleMoveToOnboarding()} disabled={submitting || selected.offeringStatus !== "accepted"}>
                    Pindahkan ke Karyawan Baru
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => {
                    const url = buildWaLink(selected.whatsapp, buildOfferingLetterCopy(selected, form));
                    if (!url) {
                      setFeedback({ type: "error", message: `Nomor WhatsApp ${selected.nama} belum valid.` });
                      return;
                    }
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat kandidat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
