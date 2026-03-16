import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const DUMMY_EMAIL = "dummy.workflow.hr.001@hireumkm.test";
const DUMMY_PHONE = "083819928017";
const DUMMY_MARKER = "[dummy-psychotest-hr-001]";
const STAGE_NOTE = "Hasil psikotest dummy direview dan kandidat dummy dipindahkan ke tahap Wawancara AI untuk kebutuhan testing.";

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      accumulator[key] = value;
      return accumulator;
    }, {});
}

function getSupabaseClient() {
  const envPath = path.join(process.cwd(), ".env");
  const envFromFile = loadDotEnv(envPath);
  const supabaseUrl = process.env.VITE_SUPABASE_URL || envFromFile.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || envFromFile.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum tersedia.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function createPackageItems(baseUrl, startedAt, completedAt) {
  return [
    {
      test_key: "spm",
      test_name_snapshot: "SPM / Raven Progressive Matrices",
      test_order: 1,
      status: "completed",
      started_at: startedAt,
      completed_at: completedAt,
      score_numeric: 48,
      score_label: "Baik",
      summary: "Penalaran logis kandidat tergolong baik, cukup cepat memahami pola, dan stabil saat menyelesaikan soal abstrak.",
      test_url: `${baseUrl}/tes-spm/spm_app_modular/index.html`,
      result_json: {
        total_questions: 60,
        duration_seconds: 1860,
        score: {
          correct: 48,
          wrong: 12,
          unanswered: 0,
          accuracy_percent: 80,
        },
        interpretation: {
          headline: "Kemampuan analitis berada di atas rata-rata untuk kebutuhan administrasi dan koordinasi rekrutmen.",
          note: "Cocok untuk pekerjaan yang membutuhkan ketelitian memahami instruksi dan pola kerja.",
        },
      },
    },
    {
      test_key: "koran",
      test_name_snapshot: "Tes Koran / Kraepelin",
      test_order: 2,
      status: "completed",
      started_at: startedAt,
      completed_at: completedAt,
      score_numeric: 84,
      score_label: "Stabil",
      summary: "Kecepatan kerja cukup konsisten dengan akurasi baik. Kandidat cocok untuk ritme tugas administratif yang berulang.",
      test_url: `${baseUrl}/tes-koran/index.html`,
      result_json: {
        duration_seconds: 1020,
        score: {
          total_attempts: 420,
          correct: 386,
          wrong: 34,
          accuracy_percent: 92,
        },
        performance: {
          peak_total: 39,
          average_total: 35,
        },
        minute_stats: [
          { minute: 1, total: 32, correct: 30, wrong: 2 },
          { minute: 2, total: 34, correct: 31, wrong: 3 },
          { minute: 3, total: 35, correct: 33, wrong: 2 },
          { minute: 4, total: 36, correct: 33, wrong: 3 },
          { minute: 5, total: 37, correct: 35, wrong: 2 },
          { minute: 6, total: 39, correct: 36, wrong: 3 },
          { minute: 7, total: 36, correct: 33, wrong: 3 },
          { minute: 8, total: 35, correct: 32, wrong: 3 },
          { minute: 9, total: 34, correct: 31, wrong: 3 },
          { minute: 10, total: 34, correct: 32, wrong: 2 },
          { minute: 11, total: 34, correct: 31, wrong: 3 },
          { minute: 12, total: 34, correct: 31, wrong: 3 },
        ],
      },
    },
    {
      test_key: "disc",
      test_name_snapshot: "DISC Ringkas",
      test_order: 3,
      status: "completed",
      started_at: startedAt,
      completed_at: completedAt,
      score_numeric: 78,
      score_label: "Profil SC",
      summary: "Gaya kerja cenderung stabil, teliti, dan suportif. Kandidat tampak nyaman bekerja dengan prosedur dan follow up kandidat secara rapi.",
      test_url: `${baseUrl}/tes-disc/test.html?test=disc`,
      result_json: {
        profile_code: "SC",
        profile_name: "Steady Compliance",
        strengths: [
          "Teliti merapikan data",
          "Sabar follow up kandidat",
          "Nyaman bekerja dengan SOP",
        ],
        graph1: { D: 32, I: 45, S: 68, C: 72 },
        graph2: { D: 28, I: 38, S: 70, C: 76 },
        graph3: { D: 30, I: 41, S: 69, C: 74 },
      },
    },
  ];
}

async function findDummyCandidate(supabase) {
  const { data, error } = await supabase
    .from("pelamar")
    .select("id, nama_lengkap, email, no_hp, tahap_proses, status_tindak_lanjut, catatan_recruiter")
    .eq("email", DUMMY_EMAIL)
    .single();

  if (error) {
    throw new Error(`Kandidat dummy belum ditemukan. Jalankan seed recruitment dulu. Detail: ${error.message}`);
  }

  return data;
}

async function updateDummyCandidate(supabase, candidate) {
  const existingNotes = String(candidate.catatan_recruiter || "");
  const nextNotes = existingNotes.includes(STAGE_NOTE)
    ? existingNotes
    : existingNotes
      ? `${existingNotes}\n\n${STAGE_NOTE}`
      : STAGE_NOTE;

  const { data, error } = await supabase
    .from("pelamar")
    .update({
      no_hp: DUMMY_PHONE,
      tahap_proses: "Wawancara AI",
      status_tindak_lanjut: "Sedang diproses",
      penilaian_singkat: `${DUMMY_MARKER} Psikotest menunjukkan kandidat cukup stabil untuk lanjut ke interview AI.`,
      catatan_recruiter: nextNotes,
    })
    .eq("id", candidate.id)
    .select("id, nama_lengkap, no_hp, tahap_proses, status_tindak_lanjut")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertPsychotestPackage(supabase, candidateId) {
  const now = new Date();
  const sentAt = new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString();
  const openedAt = new Date(now.getTime() - 1000 * 60 * 60 * 28).toISOString();
  const startedAt = new Date(now.getTime() - 1000 * 60 * 60 * 27).toISOString();
  const completedAt = new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString();
  const reviewedAt = new Date(now.getTime() - 1000 * 60 * 60 * 20).toISOString();
  const deadlineAt = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
  const baseUrl = "https://hireumkm-demo.local";
  const linkToken = `dummy-rina-psychotest-${candidateId}`;
  const linkUrl = `${baseUrl}/tes-paket/index.html?token=${encodeURIComponent(linkToken)}`;

  const { data: existingPackages, error: packageFetchError } = await supabase
    .from("candidate_test_packages")
    .select("id, is_active")
    .eq("pelamar_id", candidateId)
    .order("created_at", { ascending: false });

  if (packageFetchError) {
    throw packageFetchError;
  }

  const activePackage = (existingPackages || []).find((entry) => entry.is_active) || null;

  if (existingPackages?.length) {
    const packageIds = existingPackages.map((entry) => entry.id);
    const { error: deleteItemsError } = await supabase
      .from("candidate_test_package_items")
      .delete()
      .in("package_id", packageIds);

    if (deleteItemsError) {
      throw deleteItemsError;
    }
  }

  let packageRow;

  if (activePackage) {
    const { data, error } = await supabase
      .from("candidate_test_packages")
      .update({
        template_key: "regular",
        template_name: "Paket Reguler",
        status: "reviewed",
        link_token: linkToken,
        link_url: linkUrl,
        sent_at: sentAt,
        opened_at: openedAt,
        completed_at: completedAt,
        reviewed_at: reviewedAt,
        deadline_at: deadlineAt,
        created_by: "Nisa Purnama",
        catatan_recruiter: `${DUMMY_MARKER} Paket tes dummy untuk testing hasil psikotest dan handoff ke interview AI.`,
        overall_summary: "Hasil psikotest menunjukkan kandidat memiliki penalaran baik, ritme kerja stabil, dan profil DISC yang cocok untuk koordinasi administrasi HR.",
        overall_recommendation: "Lanjut ke Wawancara AI",
        is_active: true,
      })
      .eq("id", activePackage.id)
      .select("id, pelamar_id, template_name, status, reviewed_at, is_active")
      .single();

    if (error) {
      throw error;
    }

    packageRow = data;
  } else {
    const { error: deactivateError } = await supabase
      .from("candidate_test_packages")
      .update({ is_active: false })
      .eq("pelamar_id", candidateId)
      .eq("is_active", true);

    if (deactivateError) {
      throw deactivateError;
    }

    const { data, error } = await supabase
      .from("candidate_test_packages")
      .insert({
        pelamar_id: candidateId,
        template_key: "regular",
        template_name: "Paket Reguler",
        status: "reviewed",
        link_token: linkToken,
        link_url: linkUrl,
        sent_at: sentAt,
        opened_at: openedAt,
        completed_at: completedAt,
        reviewed_at: reviewedAt,
        deadline_at: deadlineAt,
        created_by: "Nisa Purnama",
        catatan_recruiter: `${DUMMY_MARKER} Paket tes dummy untuk testing hasil psikotest dan handoff ke interview AI.`,
        overall_summary: "Hasil psikotest menunjukkan kandidat memiliki penalaran baik, ritme kerja stabil, dan profil DISC yang cocok untuk koordinasi administrasi HR.",
        overall_recommendation: "Lanjut ke Wawancara AI",
        is_active: true,
      })
      .select("id, pelamar_id, template_name, status, reviewed_at, is_active")
      .single();

    if (error) {
      throw error;
    }

    packageRow = data;
  }

  const items = createPackageItems(baseUrl, startedAt, completedAt).map((item) => ({
    package_id: packageRow.id,
    ...item,
  }));

  const { data: insertedItems, error: insertItemError } = await supabase
    .from("candidate_test_package_items")
    .insert(items)
    .select("id, test_key, status, score_numeric, score_label");

  if (insertItemError) {
    throw insertItemError;
  }

  return {
    packageRow,
    insertedItems,
  };
}

async function ensureStageHistory(supabase, candidateId) {
  const { data: existingHistory, error: historyFetchError } = await supabase
    .from("riwayat_tahap_pelamar")
    .select("id")
    .eq("pelamar_id", candidateId)
    .eq("ke_tahap", "Wawancara AI")
    .limit(1)
    .maybeSingle();

  if (historyFetchError) {
    throw historyFetchError;
  }

  if (existingHistory) {
    return existingHistory;
  }

  const { data, error } = await supabase
    .from("riwayat_tahap_pelamar")
    .insert({
      pelamar_id: candidateId,
      dari_tahap: "Tes kerja",
      ke_tahap: "Wawancara AI",
      catatan: "Lolos review psikotest dummy dan lanjut ke Wawancara AI.",
    })
    .select("id, ke_tahap")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function main() {
  const supabase = getSupabaseClient();
  const candidate = await findDummyCandidate(supabase);
  const updatedCandidate = await updateDummyCandidate(supabase, candidate);
  const packageResult = await upsertPsychotestPackage(supabase, candidate.id);
  const history = await ensureStageHistory(supabase, candidate.id);

  console.log(
    JSON.stringify(
      {
        status: "success",
        message: "Data dummy hasil psikotest berhasil disiapkan dan kandidat dummy sudah masuk ke Wawancara AI.",
        candidate: updatedCandidate,
        psychotestPackage: packageResult.packageRow,
        items: packageResult.insertedItems,
        stageHistory: history,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "error",
        message: error?.message || "Gagal menyiapkan data dummy hasil psikotest.",
        code: error?.code || null,
        details: error?.details || null,
        hint: error?.hint || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
