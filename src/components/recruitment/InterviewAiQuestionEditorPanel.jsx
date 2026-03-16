import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileAudio, LoaderCircle, Plus, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildInterviewAiPiperExport,
  getInterviewAiQuestionBank,
  normalizeInterviewAiQuestionBank,
  resetInterviewAiQuestionBank,
  saveInterviewAiQuestionBank,
} from "@/services/interviewAiQuestionBankService";
import { generateInterviewAiPromptAudio, getPiperApiHealth } from "@/services/piperAudioService";

function TextAreaField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="min-h-[110px] w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--brand-700)]"
    />
  );
}

function sanitizeQuestionKey(rawValue, fallbackIndex) {
  const cleaned = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `q${fallbackIndex + 1}`;
}

function buildEmptyQuestion(index) {
  const key = `q${index + 1}`;

  return {
    key,
    title: `Pertanyaan ${index + 1}`,
    questionText: "",
    hint: "",
    promptAudioUrl: `/interview-ai/audio/questions/${key}.mp3`,
    isActive: true,
  };
}

export default function InterviewAiQuestionEditorPanel() {
  const [questionBank, setQuestionBank] = useState(() => normalizeInterviewAiQuestionBank(getInterviewAiQuestionBank()));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    loading: true,
    ok: false,
    configured: false,
    message: "Mengecek server audio...",
  });

  const selectedQuestion = questionBank[selectedIndex] || null;
  const activeCount = useMemo(() => questionBank.filter((question) => question.isActive !== false).length, [questionBank]);
  const piperExport = useMemo(() => buildInterviewAiPiperExport(questionBank), [questionBank]);

  useEffect(() => {
    void checkServerStatus();
  }, []);

  function updateQuestion(index, patch) {
    setQuestionBank((current) =>
      current.map((question, currentIndex) => (currentIndex === index ? { ...question, ...patch } : question)),
    );
  }

  function handleAddQuestion() {
    setQuestionBank((current) => {
      const nextQuestions = [...current, buildEmptyQuestion(current.length)];
      setSelectedIndex(nextQuestions.length - 1);
      return nextQuestions;
    });
    setFeedback({ type: "success", message: "Pertanyaan baru ditambahkan. Isi dulu lalu klik simpan." });
  }

  function handleSave() {
    const normalized = normalizeInterviewAiQuestionBank(
      questionBank.map((question, index) => ({
        ...question,
        key: sanitizeQuestionKey(question.key, index),
      })),
    );

    setQuestionBank(saveInterviewAiQuestionBank(normalized));
    setSelectedIndex((current) => Math.min(current, normalized.length - 1));
    setFeedback({ type: "success", message: "Pertanyaan Wawancara AI berhasil disimpan." });
  }

  function handleResetDefault() {
    const resetQuestions = resetInterviewAiQuestionBank();
    setQuestionBank(resetQuestions);
    setSelectedIndex(0);
    setFeedback({ type: "success", message: "Pertanyaan dikembalikan ke versi default." });
  }

  function handleApplyAudioTemplate() {
    setQuestionBank((current) =>
      current.map((question, index) => {
        const key = sanitizeQuestionKey(question.key, index);
        return {
          ...question,
          key,
          promptAudioUrl: `/interview-ai/audio/questions/${key}.mp3`,
        };
      }),
    );
    setFeedback({ type: "success", message: "Path audio standar Piper diterapkan ke semua pertanyaan." });
  }

  function handleExportPiperJson() {
    const content = JSON.stringify(piperExport, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "interview-ai-piper-questions.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "JSON pertanyaan untuk Piper berhasil diunduh." });
  }

  async function checkServerStatus() {
    setServerStatus({
      loading: true,
      ok: false,
      configured: false,
      message: "Mengecek server audio...",
    });

    try {
      const health = await getPiperApiHealth();
      setServerStatus({
        loading: false,
        ok: health.status === "ok",
        configured: health.configured,
        message:
          health.status === "ok" && health.configured
            ? "Server audio aktif dan siap dipakai."
            : "Server audio merespons, tapi konfigurasi Piper belum lengkap.",
      });
    } catch (error) {
      setServerStatus({
        loading: false,
        ok: false,
        configured: false,
        message: error instanceof Error ? `${error.message} Jalankan 'npm run piper:api' untuk menyalakan server audio.` : "Server audio belum aktif.",
      });
    }
  }

  async function handleGenerateAudio() {
    setIsGeneratingAudio(true);
    setFeedback(null);

    try {
      const result = await generateInterviewAiPromptAudio(questionBank);
      const generatedMap = Object.fromEntries(result.generated.map((item) => [item.id, item.url]));
      const nextQuestionBank = questionBank.map((question, index) => {
        const key = sanitizeQuestionKey(question.key, index);
        return {
          ...question,
          key,
          promptAudioUrl: generatedMap[key] || question.promptAudioUrl,
        };
      });

      const savedQuestionBank = saveInterviewAiQuestionBank(nextQuestionBank);
      setQuestionBank(savedQuestionBank);
      setFeedback({ type: "success", message: `Audio otomatis berhasil dibuat untuk ${result.generated.length} pertanyaan aktif.` });
    } catch (error) {
      console.error("Generate audio otomatis gagal:", error);
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? `${error.message} Jalankan 'npm run piper:api' di project ini saat server audio belum aktif.`
            : "Generate audio otomatis belum berhasil.",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-lg font-semibold text-[var(--text-main)]">Editor pertanyaan</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Area ini khusus untuk mengatur pertanyaan yang akan dipakai saat recruiter membuat sesi baru. Data kandidat tidak tercampur di sini.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleResetDefault}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset default
              </Button>
              <Button variant="outline" onClick={handleApplyAudioTemplate}>
                <FileAudio className="mr-2 h-4 w-4" />
                Path audio
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </div>
          </div>

          {feedback ? (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
              <div className="text-sm text-[var(--text-soft)]">Jumlah pertanyaan</div>
              <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{questionBank.length}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
              <div className="text-sm text-[var(--text-soft)]">Pertanyaan aktif</div>
              <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{activeCount}</div>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 text-sm ${
              serverStatus.ok && serverStatus.configured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">Status server audio</div>
                <div className="mt-1 leading-6">{serverStatus.message}</div>
              </div>
              <Button variant="outline" onClick={() => void checkServerStatus()} disabled={serverStatus.loading}>
                {serverStatus.loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cek status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-main)]">Daftar pertanyaan</div>
              <Button size="sm" onClick={handleAddQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </div>

            <div className="space-y-2">
              {questionBank.map((question, index) => (
                <button
                  key={`${question.key}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedIndex === index ? "border-[var(--brand-700)] bg-[var(--surface-0)]" : "border-[var(--border-soft)] bg-white hover:bg-[var(--surface-0)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Pertanyaan {index + 1}</div>
                      <div className="mt-1 truncate text-sm font-semibold text-[var(--text-main)]">{question.title || `Pertanyaan ${index + 1}`}</div>
                    </div>
                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        question.isActive !== false ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {question.isActive !== false ? "Aktif" : "Nonaktif"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {selectedQuestion ? (
            <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-lg font-semibold text-[var(--text-main)]">{selectedQuestion.title || "Detail pertanyaan"}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">Edit satu pertanyaan di sini, lalu klik simpan agar dipakai pada sesi berikutnya.</div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div>
                    <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Judul singkat</div>
                    <Input value={selectedQuestion.title} onChange={(event) => updateQuestion(selectedIndex, { title: event.target.value })} placeholder="Contoh: Pengalaman terakhir" />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-3 text-sm font-medium text-[var(--text-main)]">
                      <input
                        type="checkbox"
                        checked={selectedQuestion.isActive !== false}
                        onChange={(event) => updateQuestion(selectedIndex, { isActive: event.target.checked })}
                      />
                      Aktif
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Pertanyaan utama</div>
                  <TextAreaField
                    value={selectedQuestion.questionText}
                    onChange={(value) => updateQuestion(selectedIndex, { questionText: value })}
                    placeholder="Tulis pertanyaan yang akan dijawab kandidat."
                    rows={5}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Panduan jawaban / hint</div>
                  <TextAreaField
                    value={selectedQuestion.hint}
                    onChange={(value) => updateQuestion(selectedIndex, { hint: value })}
                    placeholder="Contoh: Minta kandidat fokus ke pengalaman kerja terakhir."
                    rows={3}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFields((current) => !current)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-800)]"
                >
                  {showAdvancedFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {showAdvancedFields ? "Sembunyikan pengaturan lanjutan" : "Tampilkan pengaturan lanjutan"}
                </button>

                {showAdvancedFields ? (
                  <div className="grid gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Key pertanyaan</div>
                      <Input value={selectedQuestion.key} onChange={(event) => updateQuestion(selectedIndex, { key: event.target.value })} placeholder="Contoh: q1" />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-medium text-[var(--text-main)]">Path audio</div>
                      <Input
                        value={selectedQuestion.promptAudioUrl}
                        onChange={(event) => updateQuestion(selectedIndex, { promptAudioUrl: event.target.value })}
                        placeholder="/interview-ai/audio/questions/q1.mp3"
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[28px] border border-[var(--border-soft)] bg-white">
            <CardContent className="space-y-4 p-6">
              <div>
                <div className="text-lg font-semibold text-[var(--text-main)]">Audio interviewer</div>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  Audio itu opsional. Kalau belum ingin pakai audio, editor ini tetap bisa dipakai normal. Jika nanti ingin generate audio, cukup unduh file pertanyaannya lalu jalankan Piper di sisi teknis.
                </p>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
                Alur paling mudah:
                <br />
                1. Edit pertanyaan dan klik <strong>Simpan</strong>.
                <br />
                2. Kalau butuh audio, klik <strong>Unduh file untuk audio</strong>.
                <br />
                3. Hasil MP3 nanti tinggal diletakkan ke folder audio oleh tim teknis.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleApplyAudioTemplate}>
                  <FileAudio className="mr-2 h-4 w-4" />
                  Pakai path audio standar
                </Button>
                <Button onClick={() => void handleGenerateAudio()} disabled={isGeneratingAudio}>
                  {isGeneratingAudio ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FileAudio className="mr-2 h-4 w-4" />}
                  {isGeneratingAudio ? "Generate audio..." : "Generate audio otomatis"}
                </Button>
                <Button onClick={handleExportPiperJson}>
                  <Download className="mr-2 h-4 w-4" />
                  Unduh file untuk audio
                </Button>
              </div>

              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                Tombol `Generate audio otomatis` akan memanggil server Piper dan langsung mengisi path audio ke pertanyaan aktif. File unduhan tetap tersedia sebagai cadangan kalau server audio belum dinyalakan.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
