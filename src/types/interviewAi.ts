import type { CandidateTestPackage, CandidateTestPackageItem } from "@/types/testPackage";

export interface InterviewAiPackageItem extends CandidateTestPackageItem {
  result_json: {
    question_key?: string;
    question_text?: string;
    hint?: string;
    prompt_audio_url?: string;
    answer_text?: string;
    answer_mode?: string;
    answer_audio_bucket?: string;
    answer_audio_path?: string;
    answer_audio_url?: string;
    answer_audio_duration_seconds?: number;
    answer_audio_mime_type?: string;
    answered_at?: string | null;
    [key: string]: unknown;
  } | null;
}

export interface InterviewAiPackage extends CandidateTestPackage {
  pelamar?: {
    id: number;
    nama_lengkap: string;
    posisi_dilamar: string;
    no_hp: string;
    email: string;
    alamat_domisili: string | null;
    tanggal_lahir: string | null;
    tahap_proses: string;
    status_tindak_lanjut: string;
    catatan_recruiter?: string | null;
    penilaian_singkat?: string | null;
  } | null;
  candidate_test_package_items?: InterviewAiPackageItem[];
}
