import { supabase } from "@/lib/supabase";
import { buildInterviewAiPackageItems, INTERVIEW_AI_TEMPLATE_KEY, INTERVIEW_AI_TEMPLATE_NAME } from "@/data/interviewAiQuestions";
import { loadInterviewAiQuestionBank } from "@/services/interviewAiQuestionBankService";
import type { InterviewAiPackage } from "@/types/interviewAi";

const PACKAGE_TABLE = "candidate_test_packages";
const PACKAGE_ITEM_TABLE = "candidate_test_package_items";

function packageSelectQuery() {
  return `
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
      status_tindak_lanjut,
      catatan_recruiter,
      penilaian_singkat
    ),
    candidate_test_package_items (*)
  `;
}

function sortPackageItems(items = []) {
  return [...items].sort((left, right) => left.test_order - right.test_order);
}

export function buildInterviewAiLink(origin: string, token: string) {
  return `${origin}/interview-ai/index.html?token=${encodeURIComponent(token)}`;
}

export function generateInterviewAiToken(candidateId: number) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `iai_${candidateId}_${crypto.randomUUID().replace(/-/g, "")}`;
  }

  return `iai_${candidateId}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getInterviewAiStatusLabel(packageRow?: InterviewAiPackage | null) {
  if (!packageRow) return "Belum dikirim";
  if (packageRow.status === "sent") return "Sudah dikirim";
  if (packageRow.status === "opened" || packageRow.status === "in_progress") return "Sedang dikerjakan";
  if (packageRow.status === "completed" || packageRow.status === "reviewed") return "Sudah selesai";
  return "Belum dikirim";
}

export function getInterviewAiProgress(packageRow?: InterviewAiPackage | null) {
  const items = sortPackageItems(packageRow?.candidate_test_package_items || []);
  const completed = items.filter((item) => item.status === "completed").length;
  return {
    total: items.length,
    completed,
    pending: items.filter((item) => item.status === "pending").length,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    incomplete: items.filter((item) => item.status === "incomplete").length,
  };
}

export async function getInterviewAiPackageMapByPelamarIds(pelamarIds: number[]): Promise<Record<number, InterviewAiPackage>> {
  if (!pelamarIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from(PACKAGE_TABLE)
    .select(packageSelectQuery())
    .eq("template_key", INTERVIEW_AI_TEMPLATE_KEY)
    .in("pelamar_id", pelamarIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal load map package Wawancara AI:", error);
    throw error;
  }

  const map: Record<number, InterviewAiPackage> = {};

  (data || []).forEach((item) => {
    if (!map[item.pelamar_id]) {
      map[item.pelamar_id] = {
        ...item,
        candidate_test_package_items: sortPackageItems(item.candidate_test_package_items || []),
      } as InterviewAiPackage;
    }
  });

  return map;
}

export async function createInterviewAiPackage(payload: {
  pelamarId: number;
  deadlineAt: string;
  createdBy?: string | null;
  catatanRecruiter?: string | null;
  linkToken: string;
  linkUrl: string;
}) {
  const { data: packageRow, error: packageError } = await supabase
    .from(PACKAGE_TABLE)
    .insert({
      pelamar_id: payload.pelamarId,
      template_key: INTERVIEW_AI_TEMPLATE_KEY,
      template_name: INTERVIEW_AI_TEMPLATE_NAME,
      status: "sent",
      link_token: payload.linkToken,
      link_url: payload.linkUrl,
      sent_at: new Date().toISOString(),
      deadline_at: payload.deadlineAt,
      created_by: payload.createdBy ?? null,
      catatan_recruiter: payload.catatanRecruiter ?? null,
      overall_summary: null,
      overall_recommendation: null,
      is_active: false,
    })
    .select("*")
    .single();

  if (packageError) {
    console.error("Supabase gagal buat package Wawancara AI:", packageError);
    throw packageError;
  }

  const questionBank = await loadInterviewAiQuestionBank();
  const itemPayload = buildInterviewAiPackageItems(questionBank).map((item) => ({
    package_id: packageRow.id,
    ...item,
  }));

  if (!itemPayload.length) {
    throw new Error("Bank pertanyaan Interview AI belum punya pertanyaan aktif. Buka Editor Interview AI lalu aktifkan minimal satu pertanyaan.");
  }

  const { error: itemError } = await supabase.from(PACKAGE_ITEM_TABLE).insert(itemPayload);

  if (itemError) {
    console.error("Supabase gagal buat item Wawancara AI:", itemError);
    throw itemError;
  }

  const { data: fullPackage, error: refetchError } = await supabase
    .from(PACKAGE_TABLE)
    .select(packageSelectQuery())
    .eq("id", packageRow.id)
    .single();

  if (refetchError) {
    console.error("Supabase gagal load ulang package Wawancara AI:", refetchError);
    throw refetchError;
  }

  return {
    ...fullPackage,
    candidate_test_package_items: sortPackageItems(fullPackage.candidate_test_package_items || []),
  } as InterviewAiPackage;
}

export async function updateInterviewAiPackageReview(
  packageId: number,
  payload: {
    overallSummary?: string | null;
    overallRecommendation?: string | null;
    catatanRecruiter?: string | null;
    status?: string | null;
  },
) {
  const updatePayload: Record<string, string | null> = {};

  if (payload.overallSummary !== undefined) updatePayload.overall_summary = payload.overallSummary;
  if (payload.overallRecommendation !== undefined) updatePayload.overall_recommendation = payload.overallRecommendation;
  if (payload.catatanRecruiter !== undefined) updatePayload.catatan_recruiter = payload.catatanRecruiter;
  if (payload.status) updatePayload.status = payload.status;
  if (payload.status === "reviewed") updatePayload.reviewed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from(PACKAGE_TABLE)
    .update(updatePayload)
    .eq("id", packageId)
    .select(packageSelectQuery())
    .single();

  if (error) {
    console.error("Supabase gagal update review Wawancara AI:", error);
    throw error;
  }

  return {
    ...data,
    candidate_test_package_items: sortPackageItems(data.candidate_test_package_items || []),
  } as InterviewAiPackage;
}
