import { supabase } from "@/lib/supabase";

const TABLE_NAME = "hr_letters_documents";

function isMissingLettersTable(error: unknown) {
  const code = typeof error === "object" && error !== null ? error.code : "";
  const message = typeof error === "object" && error !== null ? String(error.message || "") : "";
  return code === "42P01" || message.toLowerCase().includes(TABLE_NAME);
}

function createMissingTableError() {
  return new Error("Tabel surat HR belum tersedia di database. Jalankan migration Supabase untuk `hr_letters_documents` terlebih dulu.");
}

export type HrLetterRecord = {
  id: number;
  template_key: string;
  category: string;
  type_label: string;
  document_number: string;
  title: string;
  created_date: string;
  effective_date: string;
  summary: string;
  document_status: string;
  file_pdf: string;
  responsible_person: string;
  admin_note: string;
  business_name: string;
  branch_name: string;
  employee_code: string;
  employee_name: string;
  job_title: string;
  attach_to_employee: boolean;
  target_audience: string;
  document_body: string;
  created_at: string;
  updated_at: string;
};

export type CreateHrLetterPayload = Omit<HrLetterRecord, "id" | "created_at" | "updated_at">;
export type UpdateHrLetterPayload = Partial<CreateHrLetterPayload>;

export async function getHrLetters(): Promise<HrLetterRecord[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_date", { ascending: false }).order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load surat HR:", error);
    if (isMissingLettersTable(error)) return [];
    throw error;
  }

  return (data ?? []) as HrLetterRecord[];
}

export async function createHrLetter(payload: CreateHrLetterPayload): Promise<HrLetterRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create surat HR:", error);
    if (isMissingLettersTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrLetterRecord;
}

export async function updateHrLetter(id: number, payload: UpdateHrLetterPayload): Promise<HrLetterRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update surat HR id=${id}:`, error);
    if (isMissingLettersTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrLetterRecord;
}
