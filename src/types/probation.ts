export type ProbationReviewStatus =
  | "Belum dimulai"
  | "Sedang berjalan"
  | "Perlu dinilai"
  | "Selesai"
  | "Diperpanjang"
  | "Tidak dilanjutkan";

export type ProbationDecision = "Lulus" | "Perpanjang" | "Tidak dilanjutkan" | null;

export interface ProbationReview {
  id: number;
  employee_id: number;
  review_code: string;
  status_review: ProbationReviewStatus;
  decision: ProbationDecision;
  start_date: string | null;
  end_date: string | null;
  evaluation_date: string | null;
  extension_end_date: string | null;
  evaluator_name: string | null;
  evaluator_role: string | null;
  attendance_score: string | null;
  attitude_score: string | null;
  task_understanding_score: string | null;
  work_quality_score: string | null;
  responsibility_score: string | null;
  teamwork_score: string | null;
  strengths_note: string | null;
  coaching_note: string | null;
  evaluator_note: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateProbationReviewPayload = Omit<ProbationReview, "id" | "created_at" | "updated_at">;
export type UpdateProbationReviewPayload = Partial<Omit<ProbationReview, "id" | "created_at" | "updated_at" | "employee_id" | "review_code">>;
