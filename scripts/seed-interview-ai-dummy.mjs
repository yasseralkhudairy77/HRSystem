import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  buildInterviewAiPackageItems,
  INTERVIEW_AI_TEMPLATE_KEY,
  INTERVIEW_AI_TEMPLATE_NAME,
} from "../src/data/interviewAiQuestions.js";

const DUMMY_EMAIL = "dummy.workflow.hr.001@hireumkm.test";
const DUMMY_PHONE = "083819928017";
const CREATED_BY = "Recruiter";
const BASE_URL = process.env.INTERVIEW_AI_BASE_URL || "http://localhost:4173";

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

function buildInterviewAiLink(token) {
  return `${BASE_URL}/interview-ai/index.html?token=${encodeURIComponent(token)}`;
}

function appendRecruiterNote(previousNote, nextNote) {
  const note = String(nextNote || "").trim();
  if (!note) return previousNote || null;

  const timestamp = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const stampedNote = `[${timestamp}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

async function findDummyCandidate(supabase) {
  const { data, error } = await supabase
    .from("pelamar")
    .select("id, nama_lengkap, email, no_hp, tahap_proses, status_tindak_lanjut, catatan_recruiter, penilaian_singkat")
    .eq("email", DUMMY_EMAIL)
    .single();

  if (error) {
    throw new Error(`Kandidat dummy belum ditemukan. Detail: ${error.message}`);
  }

  return data;
}

async function upsertInterviewAiPackage(supabase, candidateId) {
  const now = new Date();
  const sentAt = now.toISOString();
  const deadlineAt = new Date(now.getTime() + 1000 * 60 * 60 * 48).toISOString();
  const linkToken = `iai_dummy_rina_${candidateId}`;
  const linkUrl = buildInterviewAiLink(linkToken);

  const { data: existingPackages, error: fetchError } = await supabase
    .from("candidate_test_packages")
    .select("id, is_active")
    .eq("pelamar_id", candidateId)
    .eq("template_key", INTERVIEW_AI_TEMPLATE_KEY)
    .order("created_at", { ascending: false });

  if (fetchError) {
    throw fetchError;
  }

  if (existingPackages?.length) {
    const packageIds = existingPackages.map((entry) => entry.id);
    const { error: deleteItemsError } = await supabase.from("candidate_test_package_items").delete().in("package_id", packageIds);

    if (deleteItemsError) {
      throw deleteItemsError;
    }
  }

  const reusablePackage = (existingPackages || [])[0] || null;
  let packageRow;

  if (reusablePackage) {
    const { data, error } = await supabase
      .from("candidate_test_packages")
      .update({
        status: "sent",
        link_token: linkToken,
        link_url: linkUrl,
        sent_at: sentAt,
        opened_at: null,
        completed_at: null,
        reviewed_at: null,
        deadline_at: deadlineAt,
        created_by: CREATED_BY,
        catatan_recruiter: "Link Wawancara AI dummy siap dipakai untuk testing kandidat.",
        overall_summary: null,
        overall_recommendation: null,
        is_active: false,
      })
      .eq("id", reusablePackage.id)
      .select("id, pelamar_id, template_key, template_name, status, link_url, deadline_at, is_active")
      .single();

    if (error) {
      throw error;
    }

    packageRow = data;
  } else {
    const { data, error } = await supabase
      .from("candidate_test_packages")
      .insert({
        pelamar_id: candidateId,
        template_key: INTERVIEW_AI_TEMPLATE_KEY,
        template_name: INTERVIEW_AI_TEMPLATE_NAME,
        status: "sent",
        link_token: linkToken,
        link_url: linkUrl,
        sent_at: sentAt,
        deadline_at: deadlineAt,
        created_by: CREATED_BY,
        catatan_recruiter: "Link Wawancara AI dummy siap dipakai untuk testing kandidat.",
        overall_summary: null,
        overall_recommendation: null,
        is_active: false,
      })
      .select("id, pelamar_id, template_key, template_name, status, link_url, deadline_at, is_active")
      .single();

    if (error) {
      throw error;
    }

    packageRow = data;
  }

  const itemPayload = buildInterviewAiPackageItems().map((item) => ({
    package_id: packageRow.id,
    ...item,
  }));

  const { data: insertedItems, error: itemError } = await supabase
    .from("candidate_test_package_items")
    .insert(itemPayload)
    .select("id, test_key, test_name_snapshot, status, test_order");

  if (itemError) {
    throw itemError;
  }

  return {
    packageRow,
    insertedItems,
    linkUrl,
    deadlineAt,
  };
}

async function updateDummyCandidate(supabase, candidate, packageResult) {
  const nextNote = appendRecruiterNote(
    candidate.catatan_recruiter,
    `Link Wawancara AI dummy dibuat untuk testing. Deadline ${new Date(packageResult.deadlineAt).toLocaleString("id-ID")}.`,
  );

  const { data, error } = await supabase
    .from("pelamar")
    .update({
      no_hp: DUMMY_PHONE,
      tahap_proses: "Wawancara AI",
      status_tindak_lanjut: "Sudah dikirim",
      penilaian_singkat: candidate.penilaian_singkat || "Kandidat siap masuk ke sesi Wawancara AI dummy untuk kebutuhan testing.",
      catatan_recruiter: nextNote,
    })
    .eq("id", candidate.id)
    .select("id, nama_lengkap, no_hp, tahap_proses, status_tindak_lanjut, penilaian_singkat")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureStageHistory(supabase, candidateId) {
  const { data: existingHistory, error: fetchError } = await supabase
    .from("riwayat_tahap_pelamar")
    .select("id")
    .eq("pelamar_id", candidateId)
    .eq("ke_tahap", "Wawancara AI")
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
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
      catatan: "Kandidat dummy dipindahkan ke Wawancara AI untuk testing integrasi recruiter dan link kandidat.",
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
  const packageResult = await upsertInterviewAiPackage(supabase, candidate.id);
  const updatedCandidate = await updateDummyCandidate(supabase, candidate, packageResult);
  const history = await ensureStageHistory(supabase, candidate.id);

  console.log(
    JSON.stringify(
      {
        status: "success",
        message: "Data dummy Wawancara AI berhasil disiapkan.",
        candidate: updatedCandidate,
        interviewAiPackage: packageResult.packageRow,
        interviewAiItems: packageResult.insertedItems,
        candidateLink: packageResult.linkUrl,
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
        message: error?.message || "Gagal menyiapkan data dummy Wawancara AI.",
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
