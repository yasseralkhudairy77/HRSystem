import { interviewAiQuestionBank } from "@/data/interviewAiQuestions";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "hireumkm.interview_ai.question_bank.v1";
const QUESTION_BANK_TABLE = "interview_ai_question_bank_configs";
const DEFAULT_CONFIG_KEY = "default";

function cloneQuestion(question: Record<string, unknown>, index: number) {
  const key = String(question.key || `q${index + 1}`).trim() || `q${index + 1}`;

  return {
    key,
    title: String(question.title || `Pertanyaan ${index + 1}`).trim() || `Pertanyaan ${index + 1}`,
    questionText: String(question.questionText || "").trim(),
    hint: String(question.hint || "").trim(),
    promptAudioUrl: String(question.promptAudioUrl || `/interview-ai/audio/questions/${key}.mp3`).trim() || `/interview-ai/audio/questions/${key}.mp3`,
    audioSourceText: String(question.audioSourceText || question.questionText || "").trim(),
    isActive: question.isActive !== false,
  };
}

function writeQuestionBankToLocal(questionBank: unknown) {
  const normalized = normalizeInterviewAiQuestionBank(questionBank);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function getDefaultInterviewAiQuestionBank() {
  return interviewAiQuestionBank.map((question, index) => cloneQuestion(question, index));
}

export function normalizeInterviewAiQuestionBank(questionBank: unknown) {
  if (!Array.isArray(questionBank)) {
    return getDefaultInterviewAiQuestionBank();
  }

  const normalized = questionBank
    .map((question, index) => cloneQuestion((question || {}) as Record<string, unknown>, index))
    .filter((question) => question.questionText);

  return normalized.length ? normalized : getDefaultInterviewAiQuestionBank();
}

export function getInterviewAiQuestionBank() {
  if (typeof window === "undefined") {
    return getDefaultInterviewAiQuestionBank();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultInterviewAiQuestionBank();
    }

    return normalizeInterviewAiQuestionBank(JSON.parse(raw));
  } catch (error) {
    console.warn("Question bank Wawancara AI gagal dibaca, sistem memakai default.", error);
    return getDefaultInterviewAiQuestionBank();
  }
}

export async function loadInterviewAiQuestionBank() {
  try {
    const { data, error } = await supabase
      .from(QUESTION_BANK_TABLE)
      .select("question_bank")
      .eq("config_key", DEFAULT_CONFIG_KEY)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.question_bank) {
      return writeQuestionBankToLocal(data.question_bank);
    }
  } catch (error) {
    console.warn("Question bank Wawancara AI belum berhasil dimuat dari Supabase, sistem memakai salinan lokal.", error);
  }

  return getInterviewAiQuestionBank();
}

export function saveInterviewAiQuestionBank(questionBank: unknown) {
  return writeQuestionBankToLocal(questionBank);
}

export async function saveInterviewAiQuestionBankToSupabase(questionBank: unknown, options?: { updatedBy?: string | null }) {
  const normalized = writeQuestionBankToLocal(questionBank);

  const payload = {
    config_key: DEFAULT_CONFIG_KEY,
    question_bank: normalized,
    updated_by: options?.updatedBy ?? null,
  };

  const { error } = await supabase.from(QUESTION_BANK_TABLE).upsert(payload, {
    onConflict: "config_key",
  });

  if (error) {
    console.error("Question bank Wawancara AI gagal disimpan ke Supabase:", error);
    throw new Error("Pertanyaan tersimpan di browser ini, tetapi belum berhasil disimpan ke server. Coba lagi sebentar.");
  }

  return normalized;
}

export async function resetInterviewAiQuestionBank() {
  const defaultQuestions = getDefaultInterviewAiQuestionBank();
  return saveInterviewAiQuestionBankToSupabase(defaultQuestions, { updatedBy: "Recruiter" });
}

export function buildInterviewAiPiperExport(questionBank: unknown) {
  return normalizeInterviewAiQuestionBank(questionBank)
    .filter((question) => question.isActive !== false)
    .map((question) => ({
      id: question.key,
      text: question.questionText,
    }));
}
