import { interviewAiQuestionBank } from "@/data/interviewAiQuestions";

const STORAGE_KEY = "hireumkm.interview_ai.question_bank.v1";

function cloneQuestion(question: Record<string, unknown>, index: number) {
  const key = String(question.key || `q${index + 1}`).trim() || `q${index + 1}`;

  return {
    key,
    title: String(question.title || `Pertanyaan ${index + 1}`).trim() || `Pertanyaan ${index + 1}`,
    questionText: String(question.questionText || "").trim(),
    hint: String(question.hint || "").trim(),
    promptAudioUrl: String(question.promptAudioUrl || `/interview-ai/audio/questions/${key}.mp3`).trim() || `/interview-ai/audio/questions/${key}.mp3`,
    isActive: question.isActive !== false,
  };
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

export function saveInterviewAiQuestionBank(questionBank: unknown) {
  const normalized = normalizeInterviewAiQuestionBank(questionBank);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function resetInterviewAiQuestionBank() {
  const defaultQuestions = getDefaultInterviewAiQuestionBank();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultQuestions));
  }

  return defaultQuestions;
}

export function buildInterviewAiPiperExport(questionBank: unknown) {
  return normalizeInterviewAiQuestionBank(questionBank)
    .filter((question) => question.isActive !== false)
    .map((question) => ({
      id: question.key,
      text: question.questionText,
    }));
}
