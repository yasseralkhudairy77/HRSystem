import { supabase } from "@/lib/supabase";
import type { CreatePelamarPayload, Pelamar, UpdatePelamarPayload } from "@/types/pelamar";

const TABLE_NAME = "pelamar";

export async function createPelamar(data: CreatePelamarPayload): Promise<Pelamar | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).insert(data).select("*").single();

  if (error) {
    console.error("Supabase gagal create pelamar:", error);
    throw error;
  }

  return result;
}

export async function getPelamarList(): Promise<Pelamar[]> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load list pelamar:", error);
    throw error;
  }

  return data ?? [];
}

export async function updatePelamar(id: number, data: UpdatePelamarPayload): Promise<Pelamar | null> {
  const { data: result, error } = await supabase.from(TABLE_NAME).update(data).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update pelamar id=${id}:`, error);
    throw error;
  }

  return result;
}

export async function deletePelamar(id: number): Promise<boolean> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    console.error(`Supabase gagal delete pelamar id=${id}:`, error);
    throw error;
  }

  return true;
}
