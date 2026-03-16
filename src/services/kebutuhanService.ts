import { supabase } from "@/lib/supabase";
import type {
  CreateKebutuhanPayload,
  KebutuhanKaryawan,
  UpdateKebutuhanPayload,
} from "@/types/kebutuhan";

const TABLE_NAME = "kebutuhan_karyawan";

export async function createKebutuhan(data: CreateKebutuhanPayload): Promise<KebutuhanKaryawan | null> {
  try {
    const { data: result, error } = await supabase
      .from(TABLE_NAME)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("Supabase gagal create kebutuhan_karyawan:", error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("createKebutuhan error:", error);
    throw error;
  }
}

export async function getKebutuhanList(): Promise<KebutuhanKaryawan[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase gagal load list kebutuhan_karyawan:", error);
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.error("getKebutuhanList error:", error);
    throw error;
  }
}

export async function getKebutuhanById(id: number): Promise<KebutuhanKaryawan | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Supabase gagal load kebutuhan_karyawan id=${id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("getKebutuhanById error:", error);
    throw error;
  }
}

export async function updateKebutuhan(
  id: number,
  data: UpdateKebutuhanPayload,
): Promise<KebutuhanKaryawan | null> {
  try {
    const { data: result, error } = await supabase
      .from(TABLE_NAME)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Supabase gagal update kebutuhan_karyawan id=${id}:`, error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("updateKebutuhan error:", error);
    throw error;
  }
}

export async function deleteKebutuhan(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      console.error(`Supabase gagal delete kebutuhan_karyawan id=${id}:`, error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("deleteKebutuhan error:", error);
    throw error;
  }
}
