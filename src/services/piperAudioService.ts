import { buildInterviewAiPiperExport } from "@/services/interviewAiQuestionBankService";

function getPiperApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_PIPER_API_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8788`;
  }

  return "http://localhost:8788";
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
