import { supabase } from "@/lib/supabase";
import type { CreateLowonganPayload, LowonganPekerjaan, UpdateLowonganPayload } from "@/types/lowongan";

const TABLE_NAME = "lowongan_pekerjaan";

export async function createLowongan(data: CreateLowonganPayload): Promise<LowonganPekerjaan | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).insert(data).select("*").single();

  if (error) {
    console.error("Supabase gagal create lowongan_pekerjaan:", error);
    throw error;
  }

  return result;
}

export async function getLowonganList(): Promise<LowonganPekerjaan[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load list lowongan_pekerjaan:", error);
    throw error;
  }

  return data ?? [];
}

export async function updateLowongan(id: number, data: UpdateLowonganPayload): Promise<LowonganPekerjaan | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).update(data).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update lowongan_pekerjaan id=${id}:`, error);
    throw error;
  }

  return result;
}

export async function deleteLowongan(id: number): Promise<boolean> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error(`Supabase gagal delete lowongan_pekerjaan id=${id}:`, error);
    throw error;
  }

  return true;
}
