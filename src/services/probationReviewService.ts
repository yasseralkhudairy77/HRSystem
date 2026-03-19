import { supabase } from "@/lib/supabase";
import type { CreateProbationReviewPayload, ProbationReview, UpdateProbationReviewPayload } from "@/types/probation";

const TABLE_NAME = "probation_reviews";

function buildReviewCode(employeeId: number) {
  const stamp = String(Date.now()).slice(-6);
  return `PRB-${String(employeeId).padStart(4, "0")}-${stamp}`;
}

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function computeReviewStatus(startDate: string | null, endDate: string | null) {
  if (!startDate) return "Belum dimulai";

  const today = new Date();
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "Belum dimulai";
  if (start > today) return "Belum dimulai";

  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      const diffInDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays <= 7) return "Perlu dinilai";
    }
  }

  return "Sedang berjalan";
}

export function buildDefaultProbationReviewPayload(params: {
  employeeId: number;
  startDate: string | null;
  evaluatorName?: string | null;
  evaluatorRole?: string | null;
}): CreateProbationReviewPayload {
  const startDate = params.startDate || new Date().toISOString().slice(0, 10);
  const endDate = addMonths(startDate, 3);

  return {
    employee_id: params.employeeId,
    review_code: buildReviewCode(params.employeeId),
    status_review: computeReviewStatus(startDate, endDate),
    decision: null,
    start_date: startDate,
    end_date: endDate,
    evaluation_date: endDate,
    extension_end_date: null,
    evaluator_name: params.evaluatorName || null,
    evaluator_role: params.evaluatorRole || "Atasan langsung",
    attendance_score: null,
    attitude_score: null,
    task_understanding_score: null,
    work_quality_score: null,
    responsibility_score: null,
    teamwork_score: null,
    strengths_note: null,
    coaching_note: null,
    evaluator_note: null,
    decision_note: null,
    decided_at: null,
  };
}

export async function getProbationReviewList(): Promise<ProbationReview[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load probation reviews:", error);
    throw error;
  }

  return (data ?? []) as ProbationReview[];
}

export async function getProbationReviewByEmployeeId(employeeId: number): Promise<ProbationReview | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("employee_id", employeeId).maybeSingle();

  if (error) {
    console.error(`Supabase gagal load probation review employee id=${employeeId}:`, error);
    throw error;
  }

  return (data as ProbationReview | null) ?? null;
}

export async function createProbationReview(payload: CreateProbationReviewPayload): Promise<ProbationReview | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create probation review:", error);
    throw error;
  }

  return data as ProbationReview;
}

export async function updateProbationReview(id: number, payload: UpdateProbationReviewPayload): Promise<ProbationReview | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update probation review id=${id}:`, error);
    throw error;
  }

  return data as ProbationReview;
}

export async function ensureProbationReviewForEmployee(params: {
  employeeId: number;
  statusKerja: string;
  startDate: string | null;
  evaluatorName?: string | null;
  evaluatorRole?: string | null;
}): Promise<ProbationReview | null> {
  if (String(params.statusKerja || "").trim().toLowerCase() !== "probation") return null;

  const current = await getProbationReviewByEmployeeId(params.employeeId);
  if (current) return current;

  const payload = buildDefaultProbationReviewPayload({
    employeeId: params.employeeId,
    startDate: params.startDate,
    evaluatorName: params.evaluatorName,
    evaluatorRole: params.evaluatorRole,
  });

  return createProbationReview(payload);
}
