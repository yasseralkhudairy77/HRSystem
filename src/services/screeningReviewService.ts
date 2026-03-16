import { supabase } from "@/lib/supabase";

const SCREENING_REVIEW_TABLE = "review_seleksi_awal";

export interface ScreeningReview {
  id: number;
  pelamar_id: number;
  status_review: string;
  fit_level: string | null;
  ringkasan_review: string | null;
  catatan_recruiter: string | null;
  alasan_tidak_lanjut: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface CreateScreeningReviewPayload {
  pelamar_id: number;
  status_review: string;
  fit_level?: string | null;
  ringkasan_review?: string | null;
  catatan_recruiter?: string | null;
  alasan_tidak_lanjut?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

function isMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

  return (
    message.toLowerCase().includes(SCREENING_REVIEW_TABLE) ||
    message.toLowerCase().includes("could not find the table") ||
    message.toLowerCase().includes("relation") ||
    code === "42P01" ||
    code === "PGRST205"
  );
}

export async function getLatestScreeningReviews(): Promise<Record<number, ScreeningReview>> {
  const { data, error } = await supabase
    .from(SCREENING_REVIEW_TABLE)
    .select("*")
    .order("pelamar_id", { ascending: true })
    .order("reviewed_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("Tabel review seleksi awal belum tersedia. Fallback ke data pelamar.", error);
      return {};
    }

    console.warn("Review seleksi awal gagal dimuat. Fallback ke data pelamar.", error);
    return {};
  }

  return (data ?? []).reduce<Record<number, ScreeningReview>>((accumulator, item) => {
    if (!accumulator[item.pelamar_id]) {
      accumulator[item.pelamar_id] = item;
    }
    return accumulator;
  }, {});
}

export async function createScreeningReview(data: CreateScreeningReviewPayload): Promise<ScreeningReview | null> {
  const payload = {
    pelamar_id: data.pelamar_id,
    status_review: data.status_review,
    fit_level: data.fit_level ?? null,
    ringkasan_review: data.ringkasan_review ?? null,
    catatan_recruiter: data.catatan_recruiter ?? null,
    alasan_tidak_lanjut: data.alasan_tidak_lanjut ?? null,
    reviewed_by: data.reviewed_by ?? "Recruiter",
    reviewed_at: data.reviewed_at ?? new Date().toISOString(),
  };

  const { data: result, error } = await supabase.from(SCREENING_REVIEW_TABLE).insert(payload).select("*").single();

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("Review seleksi awal belum tersimpan karena tabel belum tersedia.", error);
      return null;
    }

    console.error("Database gagal simpan review seleksi awal:", error);
    throw error;
  }

  return result;
}
