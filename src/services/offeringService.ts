import { supabase } from "@/lib/supabase";
import type { CreateOfferingLetterPayload, OfferingLetter, UpdateOfferingLetterPayload } from "@/types/offering";

const TABLE_NAME = "offering_letters";

export async function getOfferingLetterMapByPelamarIds(pelamarIds: number[]): Promise<Record<number, OfferingLetter>> {
  if (!pelamarIds.length) return {};

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .in("pelamar_id", pelamarIds)
    .in("status", ["draft", "waiting_response", "negotiation", "accepted", "rejected", "expired"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load offering letter:", error);
    throw error;
  }

  return (data || []).reduce((accumulator, item) => {
    if (!accumulator[item.pelamar_id]) {
      accumulator[item.pelamar_id] = item;
    }
    return accumulator;
  }, {});
}

export async function createOfferingLetter(payload: CreateOfferingLetterPayload): Promise<OfferingLetter | null> {
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("Supabase gagal create offering letter:", error);
    throw error;
  }

  return data;
}

export async function updateOfferingLetter(id: number, payload: UpdateOfferingLetterPayload): Promise<OfferingLetter | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update offering letter id=${id}:`, error);
    throw error;
  }

  return data;
}

export async function upsertOfferingLetterByPelamarId(pelamarId: number, payload: CreateOfferingLetterPayload): Promise<OfferingLetter | null> {
  const currentMap = await getOfferingLetterMapByPelamarIds([pelamarId]);
  const current = currentMap[pelamarId];

  if (current?.id) {
    return updateOfferingLetter(current.id, {
      ...payload,
      version: current.version || 1,
    });
  }

  return createOfferingLetter(payload);
}
