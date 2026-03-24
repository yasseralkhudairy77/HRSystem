import { supabase } from "@/lib/supabase";

const TABLE_NAME = "hr_offboarding_processes";

function isMissingOffboardingTable(error: unknown) {
  const code = typeof error === "object" && error !== null ? error.code : "";
  const message = typeof error === "object" && error !== null ? String(error.message || "") : "";
  return code === "42P01" || message.toLowerCase().includes(TABLE_NAME);
}

function createMissingTableError() {
  return new Error("Tabel offboarding HR belum tersedia di database. Jalankan migration Supabase untuk `hr_offboarding_processes` terlebih dulu.");
}

export type OffboardingChecklistItem = {
  label: string;
  done: boolean;
  group: string;
};

export type OffboardingRecord = {
  id: number;
  source_employee_row_id: number | null;
  employee_code: string;
  employee_name: string;
  job_title: string;
  division_name: string;
  business_name: string;
  branch_name: string;
  exit_reason: string;
  exit_request_date: string | null;
  last_working_date: string | null;
  supervisor_approval: string;
  process_status: string;
  asset_status: string;
  access_status: string;
  final_document_status: string;
  certificate_ready: boolean;
  handover_report_ready: boolean;
  employee_deactivated: boolean;
  owner_name: string;
  hr_note: string;
  asset_note: string;
  access_note: string;
  final_letter_note: string;
  checklist: OffboardingChecklistItem[];
  linked_modules: string[];
  needs_attention: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateOffboardingPayload = Omit<OffboardingRecord, "id" | "created_at" | "updated_at">;
export type UpdateOffboardingPayload = Partial<CreateOffboardingPayload>;

export async function getOffboardingProcesses(): Promise<OffboardingRecord[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("last_working_date", { ascending: false }).order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load offboarding:", error);
    if (isMissingOffboardingTable(error)) return [];
    throw error;
  }

  return (data ?? []) as OffboardingRecord[];
}

export async function createOffboardingProcess(payload: CreateOffboardingPayload): Promise<OffboardingRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create offboarding:", error);
    if (isMissingOffboardingTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as OffboardingRecord;
}

export async function updateOffboardingProcess(id: number, payload: UpdateOffboardingPayload): Promise<OffboardingRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update offboarding id=${id}:`, error);
    if (isMissingOffboardingTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as OffboardingRecord;
}
