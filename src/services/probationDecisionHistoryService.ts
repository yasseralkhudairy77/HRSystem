import { supabase } from "@/lib/supabase";
import type { CreateProbationDecisionHistoryPayload, ProbationDecisionHistoryEntry } from "@/types/probationHistory";

const TABLE_NAME = "probation_decision_history";

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return error.code === "42P01" || message.includes(TABLE_NAME);
}

export async function getProbationDecisionHistoryByEmployeeId(employeeId: number): Promise<ProbationDecisionHistoryEntry[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("employee_id", employeeId).order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error(`Supabase gagal load history probation employee id=${employeeId}:`, error);
    throw error;
  }

  return (data ?? []) as ProbationDecisionHistoryEntry[];
}

export async function createProbationDecisionHistory(payload: CreateProbationDecisionHistoryPayload): Promise<ProbationDecisionHistoryEntry | null> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      employee_id: payload.employee_id,
      probation_review_id: payload.probation_review_id ?? null,
      decision: payload.decision ?? null,
      status_review: payload.status_review ?? null,
      decision_note: payload.decision_note ?? null,
      effective_date: payload.effective_date ?? null,
      created_by: payload.created_by ?? null,
      created_role: payload.created_role ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.error("Supabase gagal create history probation:", error);
    throw error;
  }

  return data as ProbationDecisionHistoryEntry;
}
