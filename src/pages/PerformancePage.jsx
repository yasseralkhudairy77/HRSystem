import { useEffect, useMemo, useState } from "react";
import { BookUser, ClipboardCheck, LoaderCircle, Search, ShieldAlert, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deriveProbationDisplayStatus, getProbationReminder } from "@/lib/probation";
import { createProbationDecisionHistory } from "@/services/probationDecisionHistoryService";
import { getEmployeeList, updateEmployee } from "@/services/employeeService";
import { ensureProbationReviewForEmployee, getProbationReviewList, updateProbationReview } from "@/services/probationReviewService";

const quickTabs = [
  { key: "semua", label: "Semua" },
  { key: "perlu-dinilai", label: "Perlu dinilai" },
  { key: "siap-diputuskan", label: "Siap diputuskan" },
  { key: "selesai", label: "Selesai" },
];

const scoreOptions = ["Kurang", "Cukup", "Baik", "Sangat baik"];
const PERFORMANCE_PROBATION_TARGET_KEY = "performance:probation-target";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function deriveStatus(review) {
  return deriveProbationDisplayStatus(review);
}

function deriveResult(review) {
  if (review.decision === "Lulus") return "Kerja bagus";
  if (review.decision === "Perpanjang") return "Perlu dibina";
  if (review.decision === "Tidak dilanjutkan") return "Perlu perhatian";
  return deriveStatus(review) === "Perlu dinilai" ? "Perlu dinilai" : "Sedang berjalan";
}

function buildForm(review) {
  return {
    evaluatorName: review?.evaluator_name || "",
    evaluatorRole: review?.evaluator_role || "Atasan langsung",
    evaluationDate: review?.evaluation_date || "",
    extensionEndDate: review?.extension_end_date || "",
    attendanceScore: review?.attendance_score || "Cukup",
    attitudeScore: review?.attitude_score || "Cukup",
    taskUnderstandingScore: review?.task_understanding_score || "Cukup",
    workQualityScore: review?.work_quality_score || "Cukup",
    responsibilityScore: review?.responsibility_score || "Cukup",
    teamworkScore: review?.teamwork_score || "Cukup",
    strengthsNote: review?.strengths_note || "",
    coachingNote: review?.coaching_note || "",
    evaluatorNote: review?.evaluator_note || "",
    decisionNote: review?.decision_note || "",
  };
}

function SummaryCard({ icon: Icon, label, value, note, tone }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
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
          <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RatingField({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-4">
      <div className="text-sm font-medium text-[var(--text-main)]">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {scoreOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${option === value ? "border-[var(--brand-900)] bg-[var(--brand-900)] text-white" : "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)]"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReminderBanner({ reminder }) {
  if (!reminder) return null;

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm leading-5 ${reminder.level === "critical" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <div className="font-semibold">{reminder.title}</div>
      <div>{reminder.description}</div>
    </div>
  );
}

export default function PerformancePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [feedback, setFeedback] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(buildForm(null));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadRows();
  }, []);

  useEffect(() => {
    setForm(buildForm(selected?.review || null));
  }, [selected]);

  async function loadRows() {
    setLoading(true);
    setErrorMessage("");

    try {
      const employees = await getEmployeeList();
      await Promise.all(
        employees
          .filter((item) => String(item.status_kerja || "").trim().toLowerCase() === "probation")
          .map((item) =>
            ensureProbationReviewForEmployee({
              employeeId: item.id,
              statusKerja: item.status_kerja,
              startDate: item.tanggal_masuk,
              evaluatorName: item.atasan,
              evaluatorRole: "Atasan langsung",
            }),
          ),
      );

      const reviews = await getProbationReviewList();
      const employeeMap = Object.fromEntries(employees.map((item) => [item.id, item]));
      const mapped = reviews
        .map((review) => {
          const employee = employeeMap[review.employee_id];
          if (!employee) return null;

          return {
            id: review.id,
            review,
            employee,
            namaLengkap: employee.nama_lengkap,
            employeeId: employee.employee_id,
            jabatan: employee.jabatan,
            cabang: employee.cabang,
            evaluator: review.evaluator_name || employee.atasan || "Atasan langsung",
            periode: `${formatDate(review.start_date)} - ${formatDate(review.extension_end_date || review.end_date)}`,
            statusReview: deriveStatus(review),
            hasilReview: deriveResult(review),
            keputusan: review.decision || "Belum diputuskan",
            reminder: getProbationReminder(review),
          };
        })
        .filter(Boolean);

      setRows(mapped);

      const targetRaw = window.sessionStorage.getItem(PERFORMANCE_PROBATION_TARGET_KEY);
      if (targetRaw) {
        try {
          const target = JSON.parse(targetRaw);
          const matched = mapped.find((item) => item.employee.id === target.employeeId);
          if (matched) setSelected(matched);
        } catch (error) {
          console.warn("Target probation navigation tidak valid:", error);
        } finally {
          window.sessionStorage.removeItem(PERFORMANCE_PROBATION_TARGET_KEY);
        }
      }
    } catch (error) {
      console.error("Load probation page gagal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Gagal memuat evaluasi probation.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function syncRow(updatedReview, updatedEmployee) {
    setRows((current) =>
      current.map((item) => {
        if (item.id !== updatedReview.id) return item;

        const employee = updatedEmployee || item.employee;
        return {
          ...item,
          review: updatedReview,
          employee,
          namaLengkap: employee.nama_lengkap,
          jabatan: employee.jabatan,
          cabang: employee.cabang,
          evaluator: updatedReview.evaluator_name || employee.atasan || "Atasan langsung",
          periode: `${formatDate(updatedReview.start_date)} - ${formatDate(updatedReview.extension_end_date || updatedReview.end_date)}`,
          statusReview: deriveStatus(updatedReview),
          hasilReview: deriveResult(updatedReview),
          keputusan: updatedReview.decision || "Belum diputuskan",
          reminder: getProbationReminder(updatedReview),
        };
      }),
    );

    setSelected((current) =>
      current && current.id === updatedReview.id
        ? {
            ...current,
            review: updatedReview,
            employee: updatedEmployee || current.employee,
            statusReview: deriveStatus(updatedReview),
            hasilReview: deriveResult(updatedReview),
            keputusan: updatedReview.decision || "Belum diputuskan",
            reminder: getProbationReminder(updatedReview),
          }
        : current,
    );
  }

  async function persistReview(payload, successMessage, employeePayload = null, historyPayload = null) {
    if (!selected) return;
    setSubmitting(true);

    try {
      const [updatedReview, updatedEmployee] = await Promise.all([
        updateProbationReview(selected.id, payload),
        employeePayload ? updateEmployee(selected.employee.id, employeePayload) : Promise.resolve(null),
      ]);

      if (!updatedReview) throw new Error("Evaluasi probation belum berhasil disimpan.");

      if (
        historyPayload &&
        (selected.review.decision !== payload.decision ||
          selected.review.status_review !== payload.status_review ||
          selected.review.decision_note !== payload.decision_note ||
          selected.review.extension_end_date !== payload.extension_end_date)
      ) {
        try {
          await createProbationDecisionHistory({
            employee_id: selected.employee.id,
            probation_review_id: updatedReview.id,
            decision: historyPayload.decision ?? payload.decision ?? null,
            status_review: historyPayload.status_review ?? payload.status_review ?? null,
            decision_note: historyPayload.decision_note ?? payload.decision_note ?? null,
            effective_date: historyPayload.effective_date ?? payload.decided_at ?? payload.extension_end_date ?? payload.evaluation_date ?? null,
            created_by: historyPayload.created_by ?? form.evaluatorName ?? updatedReview.evaluator_name ?? null,
            created_role: historyPayload.created_role ?? form.evaluatorRole ?? updatedReview.evaluator_role ?? null,
          });
        } catch (historyError) {
          console.warn("Riwayat keputusan probation belum tersimpan:", historyError);
        }
      }

      syncRow(updatedReview, updatedEmployee);
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      console.error("Persist probation gagal:", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Perubahan evaluasi probation belum berhasil disimpan." });
    } finally {
      setSubmitting(false);
    }
  }

  function basePayload() {
    return {
      evaluator_name: form.evaluatorName || null,
      evaluator_role: form.evaluatorRole || null,
      evaluation_date: form.evaluationDate || null,
      extension_end_date: form.extensionEndDate || null,
      attendance_score: form.attendanceScore,
      attitude_score: form.attitudeScore,
      task_understanding_score: form.taskUnderstandingScore,
      work_quality_score: form.workQualityScore,
      responsibility_score: form.responsibilityScore,
      teamwork_score: form.teamworkScore,
      strengths_note: form.strengthsNote || null,
      coaching_note: form.coachingNote || null,
      evaluator_note: form.evaluatorNote || null,
      decision_note: form.decisionNote || null,
    };
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesSearch =
        !term || [item.namaLengkap, item.jabatan, item.cabang, item.evaluator, item.keputusan, item.statusReview].join(" ").toLowerCase().includes(term);
      const matchesTab =
        activeTab === "semua" ||
        (activeTab === "perlu-dinilai" && item.statusReview === "Perlu dinilai") ||
        (activeTab === "siap-diputuskan" && ["Perlu dinilai", "Diperpanjang"].includes(item.statusReview)) ||
        (activeTab === "selesai" && ["Selesai", "Tidak dilanjutkan"].includes(item.statusReview));

      return matchesSearch && matchesTab;
    });
  }, [activeTab, rows, search]);

  const summaryCards = useMemo(
    () => [
      { label: "Total evaluasi", value: rows.length, note: "Semua record probation tahap 1 yang tersambung ke data karyawan.", icon: ClipboardCheck, tone: "slate" },
      { label: "Sedang probation", value: rows.filter((item) => item.employee.status_kerja === "Probation").length, note: "Karyawan yang masih aktif di masa percobaan.", icon: BookUser, tone: "sky" },
      { label: "Perlu dinilai", value: rows.filter((item) => item.statusReview === "Perlu dinilai").length, note: "Sudah mendekati atau masuk waktu evaluasi.", icon: ShieldAlert, tone: "amber" },
      { label: "Selesai", value: rows.filter((item) => item.statusReview === "Selesai").length, note: "Sudah lulus dan siap lanjut ke status kerja berikutnya.", icon: ClipboardCheck, tone: "emerald" },
      { label: "Tidak dilanjutkan", value: rows.filter((item) => item.statusReview === "Tidak dilanjutkan").length, note: "Keputusan probation berakhir tanpa dilanjutkan bekerja.", icon: ShieldAlert, tone: "rose" },
    ],
    [rows],
  );

  const dueNowCount = rows.filter((item) => item.reminder?.level === "critical").length;
  const dueSoonCount = rows.filter((item) => item.reminder?.level === "warning").length;

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Penilaian & Probation"
            subtitle="Tahap 1 modul ini fokus ke Evaluasi Probation. Flow-nya tersambung dari Data Karyawan saat status kerja masih probation, lalu berakhir di keputusan lulus, perpanjang, atau tidak dilanjutkan."
          />
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
            Flow aktif: <span className="font-medium text-slate-900">Data Karyawan -&gt; Evaluasi Probation -&gt; Keputusan status kerja</span>
          </div>
        </div>

        {dueNowCount || dueSoonCount ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${dueNowCount ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {dueNowCount ? `${dueNowCount} karyawan probation sudah jatuh tempo atau lewat jadwal evaluasi.` : `${dueSoonCount} karyawan probation mendekati jadwal evaluasi dalam 7 hari ke depan.`}
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, jabatan, cabang, evaluator, atau keputusan probation" className="rounded-xl border-slate-200 bg-white pl-9" />
        </div>
      </div>

      {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{feedback.message}</div> : null}
      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{summaryCards.map((item) => <SummaryCard key={item.label} {...item} />)}</div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {quickTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${tab.key === activeTab ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {tab.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 lg:p-5">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">Daftar evaluasi probation</div>
              <div className="text-sm text-slate-500">{filteredRows.length} data ditemukan.</div>
            </div>
            <div className="text-sm text-slate-500">Klik detail untuk isi penilaian.</div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Memuat evaluasi probation...
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredRows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{item.namaLengkap}</div>
                        <div className="text-sm text-slate-500">{item.jabatan} • {item.cabang}</div>
                      </div>
                      <StatusBadge value={item.statusReview} />
                      <StatusBadge value={item.hasilReview} />
                    </div>

                    <ReminderBanner reminder={item.reminder} />

                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Periode</div>
                        <div className="mt-1 font-medium text-slate-700">{item.periode}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tanggal masuk</div>
                        <div className="mt-1 font-medium text-slate-700">{formatDate(item.employee.tanggal_masuk)}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Evaluator</div>
                        <div className="mt-1 font-medium text-slate-700">{item.evaluator}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Keputusan</div>
                        <div className="mt-1 font-medium text-slate-700">{item.keputusan}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-[220px] xl:justify-end">
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelected(item)}>
                      Detail
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {!loading && filteredRows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Belum ada evaluasi probation yang cocok dengan pencarian atau tab yang dipilih.</div> : null}
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">{selected.namaLengkap}</div>
                <div className="mt-1 text-sm text-slate-500">{selected.jabatan} • {selected.periode}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selected.statusReview} />
                <StatusBadge value={selected.hasilReview} />
                <StatusBadge value={selected.keputusan} />
              </div>

              <ReminderBanner reminder={selected.reminder} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <div className="font-medium text-slate-800">Ringkasan probation</div>
                  <div className="mt-3">ID Karyawan: {selected.employeeId}</div>
                  <div>Tanggal masuk: {formatDate(selected.employee.tanggal_masuk)}</div>
                  <div>Akhir probation: {formatDate(selected.review.extension_end_date || selected.review.end_date)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <div className="font-medium text-slate-800">Evaluator</div>
                  <div className="mt-3">Nama: {selected.evaluator}</div>
                  <div>Jabatan evaluator: {selected.review.evaluator_role || "Atasan langsung"}</div>
                  <div>Tanggal evaluasi: {formatDate(selected.review.evaluation_date)}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Nama evaluator</div>
                  <Input value={form.evaluatorName} onChange={(event) => setForm((current) => ({ ...current, evaluatorName: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Jabatan evaluator</div>
                  <Input value={form.evaluatorRole} onChange={(event) => setForm((current) => ({ ...current, evaluatorRole: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Tanggal evaluasi</div>
                  <Input type="date" value={form.evaluationDate} onChange={(event) => setForm((current) => ({ ...current, evaluationDate: event.target.value }))} />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Akhir perpanjangan</div>
                  <Input type="date" value={form.extensionEndDate} onChange={(event) => setForm((current) => ({ ...current, extensionEndDate: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <RatingField label="Kehadiran & ketepatan waktu" value={form.attendanceScore} onChange={(value) => setForm((current) => ({ ...current, attendanceScore: value }))} />
                <RatingField label="Sikap kerja" value={form.attitudeScore} onChange={(value) => setForm((current) => ({ ...current, attitudeScore: value }))} />
                <RatingField label="Pemahaman tugas" value={form.taskUnderstandingScore} onChange={(value) => setForm((current) => ({ ...current, taskUnderstandingScore: value }))} />
                <RatingField label="Kualitas kerja" value={form.workQualityScore} onChange={(value) => setForm((current) => ({ ...current, workQualityScore: value }))} />
                <RatingField label="Tanggung jawab" value={form.responsibilityScore} onChange={(value) => setForm((current) => ({ ...current, responsibilityScore: value }))} />
                <RatingField label="Kerja sama tim" value={form.teamworkScore} onChange={(value) => setForm((current) => ({ ...current, teamworkScore: value }))} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Kekuatan utama</div>
                  <textarea value={form.strengthsNote} onChange={(event) => setForm((current) => ({ ...current, strengthsNote: event.target.value }))} rows={4} className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-900">Area pembinaan</div>
                  <textarea value={form.coachingNote} onChange={(event) => setForm((current) => ({ ...current, coachingNote: event.target.value }))} rows={4} className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-900">Catatan evaluator</div>
                <textarea value={form.evaluatorNote} onChange={(event) => setForm((current) => ({ ...current, evaluatorNote: event.target.value }))} rows={4} className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-900">Catatan keputusan</div>
                <textarea value={form.decisionNote} onChange={(event) => setForm((current) => ({ ...current, decisionNote: event.target.value }))} rows={4} className="min-h-[112px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <Button className="rounded-xl" onClick={() => void persistReview({ ...basePayload(), status_review: selected.review.status_review }, `Evaluasi probation ${selected.namaLengkap} berhasil disimpan.`)} disabled={submitting}>
                  {submitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan
                </Button>
                <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800" onClick={() => void persistReview({ ...basePayload(), decision: "Lulus", status_review: "Selesai", decided_at: new Date().toISOString() }, `${selected.namaLengkap} dinyatakan lulus probation dan status kerja diperbarui ke Kontrak.`, { status_kerja: "Kontrak", tipe_kontrak: "PKWT" }, { decision: "Lulus", status_review: "Selesai" })} disabled={submitting}>
                  Lulus probation
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-violet-200 text-violet-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
                  onClick={() => {
                    if (!form.extensionEndDate) {
                      setFeedback({ type: "error", message: "Tanggal akhir perpanjangan wajib diisi sebelum probation diperpanjang." });
                      return;
                    }

                    void persistReview(
                      { ...basePayload(), decision: "Perpanjang", status_review: "Diperpanjang", extension_end_date: form.extensionEndDate, evaluation_date: form.extensionEndDate, decided_at: new Date().toISOString() },
                      `${selected.namaLengkap} diperpanjang masa probation-nya sampai ${formatDate(form.extensionEndDate)}.`,
                      null,
                      { decision: "Perpanjang", status_review: "Diperpanjang", effective_date: form.extensionEndDate || null },
                    );
                  }}
                  disabled={submitting}
                >
                  Perpanjang probation
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => {
                    if (!form.decisionNote.trim()) {
                      setFeedback({ type: "error", message: "Catatan keputusan wajib diisi jika probation tidak dilanjutkan." });
                      return;
                    }

                    void persistReview(
                      { ...basePayload(), decision: "Tidak dilanjutkan", status_review: "Tidak dilanjutkan", decided_at: new Date().toISOString() },
                      `${selected.namaLengkap} ditandai tidak dilanjutkan setelah masa probation.`,
                      { status_karyawan: "Nonaktif", org_status: "inactive" },
                      { decision: "Tidak dilanjutkan", status_review: "Tidak dilanjutkan" },
                    );
                  }}
                  disabled={submitting}
                >
                  Tidak dilanjutkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
