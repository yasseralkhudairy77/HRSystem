function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getProbationDueDate(review) {
  return review?.extension_end_date || review?.evaluation_date || review?.end_date || null;
}

export function getProbationDaysLeft(review) {
  const dueDate = getProbationDueDate(review);
  if (!dueDate) return null;

  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  if (!today || !due) return null;

  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export function deriveProbationDisplayStatus(review) {
  if (review?.decision === "Lulus") return "Selesai";
  if (review?.decision === "Perpanjang") return "Diperpanjang";
  if (review?.decision === "Tidak dilanjutkan") return "Tidak dilanjutkan";
  if (!review?.start_date) return "Belum dimulai";

  const daysLeft = getProbationDaysLeft(review);
  if (daysLeft !== null && daysLeft <= 7) return "Perlu dinilai";

  return review?.status_review || "Sedang berjalan";
}

export function getProbationReminder(review) {
  const status = deriveProbationDisplayStatus(review);
  const dueDate = getProbationDueDate(review);
  const daysLeft = getProbationDaysLeft(review);

  if (!dueDate || daysLeft === null) return null;
  if (["Selesai", "Diperpanjang", "Tidak dilanjutkan"].includes(status)) return null;
  if (daysLeft > 7) return null;

  if (daysLeft < 0) {
    return {
      level: "critical",
      daysLeft,
      dueDate,
      title: "Evaluasi probation sudah lewat jadwal",
      description: `Karyawan ini belum dinilai, padahal jadwal evaluasinya lewat ${Math.abs(daysLeft)} hari.`,
    };
  }

  if (daysLeft === 0) {
    return {
      level: "critical",
      daysLeft,
      dueDate,
      title: "Evaluasi probation jatuh tempo hari ini",
      description: "Karyawan ini perlu dinilai hari ini agar keputusan probation tidak tertunda.",
    };
  }

  return {
    level: "warning",
    daysLeft,
    dueDate,
    title: "Perlu dinilai",
    description: `Jadwal evaluasi probation tinggal ${daysLeft} hari lagi.`,
  };
}

export function buildProbationDecisionHistoryFallback(review) {
  if (!review?.decision && !review?.status_review) return [];

  return [
    {
      id: `fallback-${review.id || "review"}`,
      employee_id: review.employee_id,
      probation_review_id: review.id || null,
      decision: review.decision || null,
      status_review: deriveProbationDisplayStatus(review),
      decision_note: review.decision_note || review.evaluator_note || null,
      effective_date: review.decided_at || review.extension_end_date || review.evaluation_date || review.updated_at || null,
      created_by: review.evaluator_name || "HR / Atasan",
      created_role: review.evaluator_role || "Evaluator",
      created_at: review.decided_at || review.updated_at || review.created_at,
    },
  ];
}
