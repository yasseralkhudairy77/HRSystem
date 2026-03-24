import { supabase } from "@/lib/supabase";

const TABLE_NAME = "hr_contract_templates";

function isMissingTemplatesTable(error: unknown) {
  const code = typeof error === "object" && error !== null ? error.code : "";
  const message = typeof error === "object" && error !== null ? String(error.message || "") : "";
  return code === "42P01" || message.toLowerCase().includes(TABLE_NAME);
}

function createMissingTableError() {
  return new Error("Tabel template kontrak HR belum tersedia di database. Jalankan migration Supabase untuk `hr_contract_templates` terlebih dulu.");
}

export type HrContractTemplateRecord = {
  id: number;
  template_name: string;
  description: string;
  article_clauses: Array<{ id?: string; title?: string; body?: string }>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateHrContractTemplatePayload = Omit<HrContractTemplateRecord, "id" | "created_at" | "updated_at">;
export type UpdateHrContractTemplatePayload = Partial<CreateHrContractTemplatePayload>;

export async function getHrContractTemplates(): Promise<HrContractTemplateRecord[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("is_default", { ascending: false }).order("template_name", { ascending: true });

  if (error) {
    console.error("Supabase gagal load template kontrak HR:", error);
    if (isMissingTemplatesTable(error)) throw createMissingTableError();
    throw error;
  }

  return (data ?? []) as HrContractTemplateRecord[];
}

export async function createHrContractTemplate(payload: CreateHrContractTemplatePayload): Promise<HrContractTemplateRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create template kontrak HR:", error);
    if (isMissingTemplatesTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrContractTemplateRecord;
}

export async function updateHrContractTemplate(id: number, payload: UpdateHrContractTemplatePayload): Promise<HrContractTemplateRecord | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update template kontrak HR id=${id}:`, error);
    if (isMissingTemplatesTable(error)) throw createMissingTableError();
    throw error;
  }

  return data as HrContractTemplateRecord;
}
