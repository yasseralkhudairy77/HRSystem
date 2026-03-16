import { supabase } from "@/lib/supabase";
import type { CandidateTestPackage, CreateCandidateTestPackagePayload } from "@/types/testPackage";

const PACKAGE_TABLE = "candidate_test_packages";
const PACKAGE_ITEM_TABLE = "candidate_test_package_items";
const INTERVIEW_AI_TEMPLATE_KEY = "interview_ai_screening";
const PACKAGE_SCHEMA_ERROR_CODES = new Set(["42P01", "PGRST200", "PGRST205"]);

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") return "";

  const candidate = error as { message?: string; details?: string; hint?: string };
  return [candidate.message, candidate.details, candidate.hint].filter(Boolean).join(" ").toLowerCase();
}

export function isCandidateTestPackageFeatureUnavailable(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code || "") : "";
  const errorText = getErrorText(error);

  return (
    PACKAGE_SCHEMA_ERROR_CODES.has(code) ||
    errorText.includes(PACKAGE_TABLE) ||
    errorText.includes(PACKAGE_ITEM_TABLE) ||
    errorText.includes("could not find the table") ||
    errorText.includes("relationship") ||
    errorText.includes("relation")
  );
}

export function getCandidateTestPackageFeatureUnavailableMessage() {
  return "Fitur paket tes belum aktif di database. Jalankan migrasi Supabase terbaru terlebih dahulu.";
}

function packageSelectQuery() {
  return `
    *,
    candidate_test_package_items (*)
  `;
}

export async function getActiveCandidateTestPackageMap() {
  const { data, error } = await supabase
    .from(PACKAGE_TABLE)
    .select(packageSelectQuery())
    .eq("is_active", true)
    .neq("template_key", INTERVIEW_AI_TEMPLATE_KEY)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load package tes kandidat aktif:", error);
    throw error;
  }

  const map = {};

  (data ?? []).forEach((item) => {
    if (!map[item.pelamar_id]) {
      map[item.pelamar_id] = item;
    }
  });

  return map as Record<number, CandidateTestPackage>;
}

export async function getCandidateTestPackageList(): Promise<CandidateTestPackage[]> {
  const { data, error } = await supabase
    .from(PACKAGE_TABLE)
    .select(
      `
        *,
        pelamar:pelamar_id (
          id,
          nama_lengkap,
          posisi_dilamar,
          no_hp,
          email,
          alamat_domisili,
          tanggal_lahir,
          tahap_proses,
          status_tindak_lanjut
        ),
        candidate_test_package_items (*)
      `,
    )
    .neq("template_key", INTERVIEW_AI_TEMPLATE_KEY)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load list hasil psikotest:", error);
    throw error;
  }

  return data ?? [];
}

export async function createCandidateTestPackage(payload: CreateCandidateTestPackagePayload): Promise<CandidateTestPackage | null> {
  const { error: deactivateError } = await supabase
    .from(PACKAGE_TABLE)
    .update({ is_active: false })
    .eq("pelamar_id", payload.pelamar_id)
    .eq("is_active", true);

  if (deactivateError) {
    console.error("Supabase gagal nonaktifkan package lama:", deactivateError);
    throw deactivateError;
  }

  const { data: packageRow, error: packageError } = await supabase
    .from(PACKAGE_TABLE)
    .insert({
      pelamar_id: payload.pelamar_id,
      template_key: payload.template_key,
      template_name: payload.template_name,
      status: "sent",
      link_token: payload.link_token,
      link_url: payload.link_url,
      sent_at: new Date().toISOString(),
      deadline_at: payload.deadline_at,
      created_by: payload.created_by ?? null,
      catatan_recruiter: payload.catatan_recruiter ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  if (packageError) {
    console.error("Supabase gagal buat package tes kandidat:", packageError);
    throw packageError;
  }

  const itemPayload = payload.items.map((item) => ({
    package_id: packageRow.id,
    test_key: item.test_key,
    test_name_snapshot: item.test_name_snapshot,
    test_order: item.test_order,
    status: item.status,
    test_url: item.test_url ?? null,
    score_numeric: item.score_numeric ?? null,
    score_label: item.score_label ?? null,
    summary: item.summary ?? null,
    result_json: item.result_json ?? {},
  }));

  const { error: itemError } = await supabase.from(PACKAGE_ITEM_TABLE).insert(itemPayload);

  if (itemError) {
    console.error("Supabase gagal buat item package tes kandidat:", itemError);
    throw itemError;
  }

  const { data: fullPackage, error: refetchError } = await supabase
    .from(PACKAGE_TABLE)
    .select(packageSelectQuery())
    .eq("id", packageRow.id)
    .single();

  if (refetchError) {
    console.error("Supabase gagal load ulang package tes kandidat:", refetchError);
    throw refetchError;
  }

  return fullPackage;
}

export async function getPublicCandidateTestPackageByToken(token: string) {
  const { data, error } = await supabase
    .from(PACKAGE_TABLE)
    .select(
      `
        *,
        pelamar:pelamar_id (
          id,
          nama_lengkap,
          posisi_dilamar
        ),
        candidate_test_package_items (*)
      `,
    )
    .eq("link_token", token)
    .single();

  if (error) {
    console.error("Supabase gagal load package tes via token:", error);
    throw error;
  }

  return data;
}

export async function markCandidateTestPackageOpened(packageId: number) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(PACKAGE_TABLE)
    .update({
      status: "opened",
      opened_at: now,
    })
    .eq("id", packageId);

  if (error) {
    console.error("Supabase gagal update status opened package tes:", error);
    throw error;
  }
}

export async function updateCandidateTestPackageItemStatus(itemId: number, status: string) {
  const now = new Date().toISOString();
  const payload: Record<string, string> = {
    status,
  };

  if (status === "in_progress") {
    payload.started_at = now;
  }

  if (status === "completed") {
    payload.completed_at = now;
  }

  const { error } = await supabase.from(PACKAGE_ITEM_TABLE).update(payload).eq("id", itemId);

  if (error) {
    console.error("Supabase gagal update status item package tes:", error);
    throw error;
  }
}

export async function syncCandidateTestPackageStatus(packageId: number) {
  const { data: items, error: itemError } = await supabase
    .from(PACKAGE_ITEM_TABLE)
    .select("status")
    .eq("package_id", packageId);

  if (itemError) {
    console.error("Supabase gagal baca item package tes untuk sync status:", itemError);
    throw itemError;
  }

  const statuses = (items ?? []).map((item) => item.status);
  let nextStatus = "sent";
  const now = new Date().toISOString();
  const updatePayload: Record<string, string> = {};

  if (statuses.every((status) => status === "completed")) {
    nextStatus = "completed";
    updatePayload.completed_at = now;
  } else if (statuses.some((status) => status === "completed" || status === "in_progress")) {
    nextStatus = "in_progress";
  } else if (statuses.some((status) => status === "pending")) {
    nextStatus = "opened";
  }

  updatePayload.status = nextStatus;

  const { error } = await supabase.from(PACKAGE_TABLE).update(updatePayload).eq("id", packageId);

  if (error) {
    console.error("Supabase gagal sync status package tes:", error);
    throw error;
  }
}

export async function markCandidateTestPackageReviewed(packageId: number) {
  const { error } = await supabase
    .from(PACKAGE_TABLE)
    .update({
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", packageId);

  if (error) {
    console.error("Supabase gagal tandai package tes direview:", error);
    throw error;
  }
}
