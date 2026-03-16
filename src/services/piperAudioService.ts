import { buildInterviewAiPiperExport } from "@/services/interviewAiQuestionBankService";

const DEFAULT_PIPER_API_URL = "https://yasseralkhudairy77-hrsystem-piper-api.hf.space";

function getPiperApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_PIPER_API_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return DEFAULT_PIPER_API_URL;
}

export async function generateInterviewAiPromptAudio(questionBank: unknown) {
  const questions = buildInterviewAiPiperExport(questionBank);
  const apiBaseUrl = getPiperApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/generate-interview-ai-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questions }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Piper API belum bisa generate audio.");
  }

  return payload as {
    status: string;
    generated: Array<{
      id: string;
      fileName: string;
      url: string;
    }>;
    stdout?: string;
  };
}

export async function getPiperApiHealth() {
  const apiBaseUrl = getPiperApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/health`, {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Piper API belum merespons.");
  }

  return payload as {
    status: string;
    configured: boolean;
    port: number;
    paths: {
      scriptPath: string;
      modelPath: string;
      configPath: string;
      outputDir: string;
    };
  };
}
