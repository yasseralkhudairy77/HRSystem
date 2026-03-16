export const INTERVIEW_AI_TEMPLATE_KEY = "interview_ai_screening";
export const INTERVIEW_AI_TEMPLATE_NAME = "Wawancara AI Screening";

export const interviewAiQuestionBank = [
  {
    key: "q1",
    title: "Perkenalan singkat",
    questionText: "Perkenalkan diri Anda secara singkat, termasuk pengalaman kerja atau kegiatan utama Anda saat ini.",
    hint: "Sampaikan nama, domisili, dan ringkasan pengalaman yang paling relevan.",
    promptAudioUrl: "/interview-ai/audio/questions/q1.mp3",
    isActive: true,
  },
  {
    key: "q2",
    title: "Pengalaman terakhir",
    questionText: "Ceritakan pengalaman kerja Anda di perusahaan atau tempat kerja terakhir.",
    hint: "Fokus pada jenis perusahaan, durasi kerja, dan ruang lingkup pekerjaan Anda.",
    promptAudioUrl: "/interview-ai/audio/questions/q2.mp3",
    isActive: true,
  },
  {
    key: "q3",
    title: "Tanggung jawab utama",
    questionText: "Apa posisi dan tanggung jawab utama Anda di sana?",
    hint: "Jelaskan tanggung jawab harian yang paling penting dan hasil kerja yang Anda pegang.",
    promptAudioUrl: "/interview-ai/audio/questions/q3.mp3",
    isActive: true,
  },
  {
    key: "q4",
    title: "Alasan perpindahan",
    questionText: "Apa alasan Anda keluar atau ingin keluar dari pekerjaan tersebut?",
    hint: "Jawab jujur, singkat, dan tetap profesional.",
    promptAudioUrl: "/interview-ai/audio/questions/q4.mp3",
    isActive: true,
  },
  {
    key: "q5",
    title: "Status bekerja",
    questionText: "Apakah saat ini Anda masih bekerja? Jika ya, jelaskan status kerja Anda saat ini.",
    hint: "Sebutkan juga jika ada masa notice atau komitmen pekerjaan yang sedang berjalan.",
    promptAudioUrl: "/interview-ai/audio/questions/q5.mp3",
    isActive: true,
  },
  {
    key: "q6",
    title: "Kesiapan mulai kerja",
    questionText: "Jika diterima, kapan Anda bisa mulai bekerja?",
    hint: "Berikan estimasi waktu yang realistis.",
    promptAudioUrl: "/interview-ai/audio/questions/q6.mp3",
    isActive: true,
  },
  {
    key: "q7",
    title: "Pencapaian kerja",
    questionText: "Apa pencapaian kerja yang paling Anda banggakan sejauh ini?",
    hint: "Pilih satu contoh yang paling kuat dan jelaskan dampaknya.",
    promptAudioUrl: "/interview-ai/audio/questions/q7.mp3",
    isActive: true,
  },
  {
    key: "q8",
    title: "Motivasi melamar",
    questionText: "Kenapa Anda tertarik melamar posisi ini?",
    hint: "Hubungkan minat Anda dengan posisi yang dilamar dan nilai yang bisa Anda bawa.",
    promptAudioUrl: "/interview-ai/audio/questions/q8.mp3",
    isActive: true,
  },
];

export function buildInterviewAiPackageItems(questionBank = interviewAiQuestionBank) {
  return questionBank
    .filter((question) => question?.isActive !== false)
    .map((question, index) => ({
    test_key: question.key,
    test_name_snapshot: question.title,
    test_order: index + 1,
    status: "pending",
    test_url: null,
    score_numeric: null,
    score_label: null,
    summary: null,
    result_json: {
      question_key: question.key,
      question_text: question.questionText,
      hint: question.hint,
      prompt_audio_url: question.promptAudioUrl,
      answer_text: "",
      answered_at: null,
    },
    }));
}
