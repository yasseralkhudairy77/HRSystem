import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function getConfig() {
  const bundledPiperRoot = path.resolve(projectRoot, "server", "piper");
  const siblingPiperRoot = path.resolve(projectRoot, "..", "INTERVIEW AI", "tools", "piper");
  const bundledReady =
    fs.existsSync(path.join(bundledPiperRoot, "generate_prompt_audio.py")) &&
    fs.existsSync(path.join(bundledPiperRoot, "models", "id_ID-news_tts-medium.onnx")) &&
    fs.existsSync(path.join(bundledPiperRoot, "models", "id_ID-news_tts-medium.onnx.json"));
  const defaultPiperRoot = bundledReady ? bundledPiperRoot : siblingPiperRoot;

  return {
    port: Number(process.env.PORT || process.env.PIPER_API_PORT || 8788),
    pythonCmd: process.env.PIPER_PYTHON_CMD || "python",
    piperCmd: process.env.PIPER_CMD || "piper",
    ffmpegCmd: process.env.PIPER_FFMPEG_CMD || "ffmpeg",
    scriptPath: process.env.PIPER_SCRIPT_PATH || path.join(defaultPiperRoot, "generate_prompt_audio.py"),
    modelPath: process.env.PIPER_MODEL_PATH || path.join(defaultPiperRoot, "models", "id_ID-news_tts-medium.onnx"),
    configPath: process.env.PIPER_CONFIG_PATH || path.join(defaultPiperRoot, "models", "id_ID-news_tts-medium.onnx.json"),
    outputDir: process.env.PIPER_OUTPUT_DIR || path.join(projectRoot, "public", "interview-ai", "audio", "questions"),
    publicBasePath: process.env.PIPER_PUBLIC_BASE_PATH || "/interview-ai/audio/questions",
    sentenceSilence: process.env.PIPER_SENTENCE_SILENCE || "0.2",
    lengthScale: process.env.PIPER_LENGTH_SCALE || "1.1",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    supabaseAudioBucket: process.env.SUPABASE_AUDIO_BUCKET || "interview-ai-audio",
    supabaseAudioFolder: process.env.SUPABASE_AUDIO_FOLDER || "questions",
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function sanitizeQuestionId(rawValue, fallbackIndex) {
  const cleaned = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `q${fallbackIndex + 1}`;
}

function normalizeQuestions(value) {
  if (!Array.isArray(value)) {
    throw new Error("Payload questions harus berupa array.");
  }

  const normalized = value
    .map((item, index) => ({
      id: sanitizeQuestionId(item?.id, index),
      text: String(item?.text || "").trim(),
    }))
    .filter((item) => item.text);

  if (!normalized.length) {
    throw new Error("Minimal satu pertanyaan aktif wajib dikirim ke Piper.");
  }

  return normalized;
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Command gagal dengan exit code ${code}`));
    });
  });
}

async function generatePromptAudio(questions) {
  const config = getConfig();
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "piper-api-"));
  const questionFile = path.join(tempDir, "questions.json");
  const piperWrapperFile = path.join(tempDir, "piper-wrapper.cmd");

  await fs.promises.mkdir(config.outputDir, { recursive: true });
  await fs.promises.writeFile(questionFile, JSON.stringify(questions, null, 2), "utf8");
  await fs.promises.writeFile(piperWrapperFile, `@echo off\r\n"${config.pythonCmd}" -m piper %*\r\n`, "utf8");

  const args = [
    config.scriptPath,
    "--questions",
    questionFile,
    "--model",
    config.modelPath,
    "--config",
    config.configPath,
    "--output-dir",
    config.outputDir,
    "--format",
    "mp3",
    "--overwrite",
    "--piper-cmd",
    piperWrapperFile,
    "--ffmpeg-cmd",
    config.ffmpegCmd,
    "--length-scale",
    config.lengthScale,
    "--sentence-silence",
    config.sentenceSilence,
  ];

  try {
    const result = await runCommand(config.pythonCmd, args);
    const uploaded = await uploadGeneratedAudioIfConfigured(questions, config);

    return {
      result,
      generated: questions.map((question) => {
        const fileName = `${question.id}.mp3`;
        const uploadedUrl = uploaded[question.id] || null;

        return {
          id: question.id,
          fileName,
          url: uploadedUrl || `${config.publicBasePath}/${fileName}`,
        };
      }),
    };
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function uploadGeneratedAudioIfConfigured(questions, config) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey || !config.supabaseAudioBucket) {
    return {};
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  try {
    const { error: createBucketError } = await supabase.storage.createBucket(config.supabaseAudioBucket, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });

    if (createBucketError && !String(createBucketError.message || "").toLowerCase().includes("already")) {
      console.warn("Bucket audio belum berhasil disiapkan:", createBucketError);
    }
  } catch (error) {
    console.warn("Create bucket audio dilewati:", error);
  }

  const uploaded = {};

  for (const question of questions) {
    const fileName = `${question.id}.mp3`;
    const localPath = path.join(config.outputDir, fileName);
    const fileBuffer = await fs.promises.readFile(localPath);
    const storagePath = `${config.supabaseAudioFolder}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(config.supabaseAudioBucket).upload(storagePath, fileBuffer, {
      upsert: true,
      contentType: "audio/mpeg",
    });

    if (uploadError) {
      throw new Error(`Upload audio ke Supabase gagal untuk ${fileName}: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(config.supabaseAudioBucket).getPublicUrl(storagePath);
    uploaded[question.id] = data.publicUrl;
  }

  return uploaded;
}

function getHealthPayload() {
  const config = getConfig();

  return {
    status: "ok",
    configured: fs.existsSync(config.scriptPath) && fs.existsSync(config.modelPath) && fs.existsSync(config.configPath),
    port: config.port,
    storage: {
      mode: config.supabaseUrl && config.supabaseServiceRoleKey ? "supabase" : "local",
      bucket: config.supabaseAudioBucket || null,
    },
    paths: {
      scriptPath: config.scriptPath,
      modelPath: config.modelPath,
      configPath: config.configPath,
      outputDir: config.outputDir,
    },
  };
}

async function requestHandler(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, getHealthPayload());
    return;
  }

  if (request.method === "POST" && request.url === "/generate-interview-ai-audio") {
    try {
      const payload = await readJsonBody(request);
      const questions = normalizeQuestions(payload.questions);
      const generated = await generatePromptAudio(questions);

      sendJson(response, 200, {
        status: "success",
        generated: generated.generated,
        stdout: generated.result.stdout,
      });
    } catch (error) {
      sendJson(response, 500, {
        status: "error",
        message: error instanceof Error ? error.message : "Generate audio gagal.",
      });
    }
    return;
  }

  sendJson(response, 404, {
    status: "error",
    message: "Route tidak ditemukan.",
  });
}

export function startPiperApiServer() {
  const config = getConfig();
  const server = http.createServer((request, response) => {
    void requestHandler(request, response);
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Piper API aktif di http://localhost:${config.port}`);
  });

  return server;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  startPiperApiServer();
}
