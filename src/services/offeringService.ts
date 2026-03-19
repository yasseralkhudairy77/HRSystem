import { supabase } from "@/lib/supabase";
import type { CreateOfferingLetterPayload, OfferingLetter, UpdateOfferingLetterPayload } from "@/types/offering";

const TABLE_NAME = "offering_letters";

function isMissingOfferingTable(error: unknown) {
  const code = typeof error === "object" && error !== null ? error.code : "";
  const message = typeof error === "object" && error !== null ? String(error.message || "") : "";
  return code === "42P01" || message.toLowerCase().includes("offering_letters");
}

function createMissingTableError() {
  return new Error("Tabel offering belum tersedia di database. Jalankan migration Supabase untuk `offering_letters` terlebih dulu.");
}

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
    if (isMissingOfferingTable(error)) return {};
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
    if (isMissingOfferingTable(error)) throw createMissingTableError();
    throw error;
  }

  return data;
}

export async function updateOfferingLetter(id: number, payload: UpdateOfferingLetterPayload): Promise<OfferingLetter | null> {
  const { data, error } = await supabase.from(TABLE_NAME).update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error(`Supabase gagal update offering letter id=${id}:`, error);
    if (isMissingOfferingTable(error)) throw createMissingTableError();
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
