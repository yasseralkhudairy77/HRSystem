import { supabase } from "@/lib/supabase";

const TABLE_NAME = "hr_contracts";

function isMissingContractsTable(error: unknown) {
  const code = typeof error === "object" && error !== null ? error.code : "";
  const message = typeof error === "object" && error !== null ? String(error.message || "") : "";
  return code === "42P01" || message.toLowerCase().includes(TABLE_NAME);
}

function createMissingTableError() {
  return new Error("Tabel kontrak HR belum tersedia di database. Jalankan migration Supabase untuk `hr_contracts` terlebih dulu.");
}

export type HrContractRecord = {
  id: number;
  source_employee_row_id: number | null;
  employee_code: string;
  employee_name: string;
  job_title: string;
  division_name: string;
  business_name: string;
  branch_name: string;
  employment_status: string;
  contract_number: string;
  contract_type: string;
  start_date: string | null;
  end_date: string | null;
  contract_months: number;
  base_salary: string;
  main_allowance: string;
  contract_file: string;
  contract_status: string;
  signing_status: string;
  review_date: string | null;
  next_decision: string;
  owner_name: string;
  hr_note: string;
  reminder: string;
  needs_attention: boolean;
  linked_modules: string[];
  template_name: string;
  article_clauses: Array<{ id?: string; title?: string; body?: string }>;
  created_at: string;
  updated_at: string;
};

export type CreateHrContractPayload = Omit<HrContractRecord, "id" | "created_at" | "updated_at">;
export type UpdateHrContractPayload = Partial<CreateHrContractPayload>;

export async function getHrContracts(): Promise<HrContractRecord[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("end_date", { ascending: false }).order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load kontrak HR:", error);
    if (isMissingContractsTable(error)) throw createMissingTableError();
    throw error;
  }

  return (data ?? []) as HrContractRecord[];
}

export async function createHrContract(payload: CreateHrContractPayload): Promise<HrContractRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create kontrak HR:", error);
    if (isMissingContractsTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrContractRecord;
}

export async function updateHrContract(id: number, payload: UpdateHrContractPayload): Promise<HrContractRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update kontrak HR id=${id}:`, error);
    if (isMissingContractsTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrContractRecord;
}

export async function deleteHrContract(id: number): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error(`Supabase gagal hapus kontrak HR id=${id}:`, error);
    if (isMissingContractsTable(error)) throw createMissingTableError();
    throw error;
  }
}
