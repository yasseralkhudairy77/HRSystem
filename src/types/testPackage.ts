export interface CandidateTestPackageItem {
  id: number;
  package_id: number;
  test_key: string;
  test_name_snapshot: string;
  test_order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  score_numeric: number | null;
  score_label: string | null;
  summary: string | null;
  result_json: Record<string, unknown> | null;
  test_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateTestPackage {
  id: number;
  pelamar_id: number;
  template_key: string;
  template_name: string;
  status: string;
  link_token: string;
  link_url: string | null;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  deadline_at: string | null;
  created_by: string | null;
  catatan_recruiter: string | null;
  overall_summary: string | null;
  overall_recommendation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  candidate_test_package_items?: CandidateTestPackageItem[];
}

export interface CreateCandidateTestPackagePayload {
  pelamar_id: number;
  template_key: string;
  template_name: string;
  deadline_at: string;
  created_by?: string | null;
  catatan_recruiter?: string | null;
  link_token: string;
  link_url: string;
  items: Array<{
    test_key: string;
    test_name_snapshot: string;
    test_order: number;
    status: string;
    test_url?: string | null;
    score_numeric?: number | null;
    score_label?: string | null;
    summary?: string | null;
    result_json?: Record<string, unknown>;
  }>;
}
