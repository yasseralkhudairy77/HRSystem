export interface ProbationDecisionHistoryEntry {
  id: number;
  employee_id: number;
  probation_review_id: number | null;
  decision: string | null;
  status_review: string | null;
  decision_note: string | null;
  effective_date: string | null;
  created_by: string | null;
  created_role: string | null;
  created_at: string;
}

export interface CreateProbationDecisionHistoryPayload {
  employee_id: number;
  probation_review_id?: number | null;
  decision?: string | null;
  status_review?: string | null;
  decision_note?: string | null;
  effective_date?: string | null;
  created_by?: string | null;
  created_role?: string | null;
}
