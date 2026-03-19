import { supabase } from "@/lib/supabase";
import type { InterviewAiPackage } from "@/types/interviewAi";

function sortPackageItems(items = []) {
  return [...items].sort((left, right) => left.test_order - right.test_order);
}

function normalizeInterviewAiPackage(row: unknown) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const normalized = row as InterviewAiPackage;
  return {
    ...normalized,
    candidate_test_package_items: sortPackageItems(normalized.candidate_test_package_items || []),
  } as InterviewAiPackage;
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

  const { data, error } = await supabase.rpc("get_interview_ai_packages_by_pelamar_ids", {
    p_pelamar_ids: pelamarIds,
  });

  if (error) {
    console.error("Supabase gagal load map package Wawancara AI:", error);
    throw error;
  }

  const map: Record<number, InterviewAiPackage> = {};

  (Array.isArray(data) ? data : []).forEach((item) => {
    const normalized = normalizeInterviewAiPackage(item);
    if (normalized?.pelamar_id && !map[normalized.pelamar_id]) {
      map[normalized.pelamar_id] = normalized;
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
  const { data, error } = await supabase.rpc("create_interview_ai_package", {
    p_pelamar_id: payload.pelamarId,
    p_deadline_at: payload.deadlineAt,
    p_created_by: payload.createdBy ?? null,
    p_catatan_recruiter: payload.catatanRecruiter ?? null,
    p_link_token: payload.linkToken,
    p_link_url: payload.linkUrl,
  });

  if (error) {
    console.error("Supabase gagal buat package Wawancara AI:", error);
    throw error;
  }

  const normalized = normalizeInterviewAiPackage(data);
  if (!normalized) {
    throw new Error("Package Wawancara AI belum berhasil dibuat.");
  }

  return normalized;
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
  const { data, error } = await supabase.rpc("update_interview_ai_package_review", {
    p_package_id: packageId,
    p_overall_summary: payload.overallSummary ?? null,
    p_overall_recommendation: payload.overallRecommendation ?? null,
    p_catatan_recruiter: payload.catatanRecruiter ?? null,
    p_status: payload.status ?? null,
  });

  if (error) {
    console.error("Supabase gagal update review Wawancara AI:", error);
    throw error;
  }

  const normalized = normalizeInterviewAiPackage(data);
  if (!normalized) {
    throw new Error("Review Wawancara AI belum berhasil diperbarui.");
  }

  return normalized;
}
