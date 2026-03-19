export type OfferingStatus = "draft" | "waiting_response" | "negotiation" | "accepted" | "rejected" | "expired";

export interface OfferingLetter {
  id?: number;
  pelamar_id: number;
  status: OfferingStatus;
  version?: number;
  position_title?: string | null;
  branch_name?: string | null;
  company_name?: string | null;
  employment_type?: string | null;
  salary_amount?: number | null;
  start_date?: string | null;
  probation_period?: string | null;
  benefits_summary?: string | null;
  response_deadline?: string | null;
  hr_pic_name?: string | null;
  additional_notes?: string | null;
  letter_payload?: Record<string, unknown> | null;
  sent_at?: string | null;
  responded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateOfferingLetterPayload = Omit<OfferingLetter, "id" | "created_at" | "updated_at">;
export type UpdateOfferingLetterPayload = Partial<Omit<OfferingLetter, "id" | "created_at" | "updated_at" | "pelamar_id">>;
