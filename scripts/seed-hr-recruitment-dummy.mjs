import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const DUMMY_MARKER = "[dummy-workflow-hr-001]";
const DUMMY_EMAIL = "dummy.workflow.hr.001@hireumkm.test";

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

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureNoDuplicateCandidate(supabase) {
  const { data, error } = await supabase
    .from("pelamar")
    .select("id, lowongan_id, nama_lengkap, tahap_proses, status_tindak_lanjut")
    .eq("email", DUMMY_EMAIL)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function insertDummyWorkflow() {
  const supabase = getSupabaseClient();
  const existingCandidate = await ensureNoDuplicateCandidate(supabase);

  if (existingCandidate) {
    console.log(
      JSON.stringify({
        status: "exists",
        message: "Dummy workflow sudah ada, tidak membuat duplikat baru.",
        candidate: existingCandidate,
      }, null, 2),
    );
    return;
  }

  const today = getTodayDate();

  const kebutuhanPayload = {
    posisi: "Staff Administrasi HR",
    departemen: "HR Rekrutmen",
    cabang: "Jakarta Selatan",
    jumlah_kebutuhan: 1,
    jenis_kebutuhan: "Karyawan baru",
    status_kerja: "PKWT",
    tipe_kerja: "Full time",
    durasi_kontrak: 12,
    gaji_min: 4500000,
    gaji_max: 5500000,
    pendidikan_min: "S1 Psikologi / Manajemen SDM",
    pengalaman: "Minimal 1 tahun di administrasi HR atau recruitment.",
    skill: ["Administrasi", "Screening CV", "Google Workspace"],
    kriteria_tambahan: `${DUMMY_MARKER} Teliti, komunikatif, dan nyaman follow up kandidat via WhatsApp.`,
    tes_yang_diperlukan: ["DISC Ringkas", "Tes Administrasi"],
    alasan_kebutuhan: `${DUMMY_MARKER} Membantu proses hiring operasional yang sedang bertambah.`,
    pengaju: "Nisa Purnama",
    tanggal_pengajuan: today,
    status_persetujuan: "Sudah disetujui",
    approved_by: "Owner UMKM",
    tanggal_approval: today,
    lowongan_sudah_dibuat: false,
    lowongan_id: null,
  };

  const { data: kebutuhan, error: kebutuhanError } = await supabase
    .from("kebutuhan_karyawan")
    .insert(kebutuhanPayload)
    .select("id, posisi, status_persetujuan, lowongan_sudah_dibuat")
    .single();

  if (kebutuhanError) {
    throw kebutuhanError;
  }

  const lowonganPayload = {
    kebutuhan_id: kebutuhan.id,
    judul_lowongan: "Staff Administrasi HR",
    posisi: "Staff Administrasi HR",
    departemen: "HR Rekrutmen",
    cabang: "Jakarta Selatan",
    company_name: "HireUMKM Demo",
    jumlah_kebutuhan: 1,
    status_kerja: "PKWT",
    tipe_kerja: "Full time",
    durasi_kontrak: "12 bulan",
    gaji_min: 4500000,
    gaji_max: 5500000,
    pendidikan_min: "S1 Psikologi / Manajemen SDM",
    pengalaman: "Minimal 1 tahun di administrasi HR atau recruitment.",
    skill: ["Administrasi", "Screening CV", "Google Workspace"],
    skill_text: "Administrasi\nScreening CV\nGoogle Workspace",
    kriteria_tambahan: `${DUMMY_MARKER} Terbiasa merapikan data kandidat dan jadwal interview.`,
    tes_yang_diperlukan: ["DISC Ringkas", "Tes Administrasi"],
    deskripsi_pekerjaan: `${DUMMY_MARKER} Mengelola administrasi rekrutmen, follow up kandidat, dan menyiapkan jadwal interview HRD.`,
    ringkasan_iklan: "Posisi admin HR untuk membantu alur rekrutmen harian dan koordinasi kandidat.",
    tanggung_jawab: "Input data pelamar, screening awal, follow up kandidat, dan koordinasi jadwal interview.",
    tentang_perusahaan: "HireUMKM Demo adalah workspace HR untuk operasional UMKM dan agency recruitment.",
    lokasi_kerja: "Jakarta Selatan",
    benefit: "BPJS, insentif kehadiran, dan pelatihan kerja.",
    cara_melamar: "Isi form pelamar dan unggah CV terbaru.",
    status_lowongan: "Sedang dibuka",
    tanggal_tayang: today,
    tanggal_tutup: "2026-04-30",
    applicants_count: 1,
    source_type: "fromHiringNeed",
    person_in_charge: "Nisa Purnama",
    archived: false,
  };

  const { data: lowongan, error: lowonganError } = await supabase
    .from("lowongan_pekerjaan")
    .insert(lowonganPayload)
    .select("id, posisi, status_lowongan, applicants_count")
    .single();

  if (lowonganError) {
    throw lowonganError;
  }

  const { error: kebutuhanUpdateError } = await supabase
    .from("kebutuhan_karyawan")
    .update({
      lowongan_sudah_dibuat: true,
      lowongan_id: lowongan.id,
    })
    .eq("id", kebutuhan.id);

  if (kebutuhanUpdateError) {
    throw kebutuhanUpdateError;
  }

  const pelamarPayload = {
    lowongan_id: lowongan.id,
    posisi_dilamar: "Staff Administrasi HR",
    sumber_info_lowongan: "LinkedIn",
    nama_lengkap: "Rina Maharani Dummy",
    email: DUMMY_EMAIL,
    no_hp: "081234567890",
    tanggal_lahir: "1998-08-14",
    agama: "Islam",
    status_pernikahan: "Belum menikah",
    jenis_kelamin: "Perempuan",
    kewarganegaraan: "Indonesia",
    alamat_ktp: "Jl. Tebet Raya No. 10, Jakarta Selatan",
    alamat_domisili: "Jl. Pancoran Barat No. 18, Jakarta Selatan",
    institusi_pendidikan: "Universitas Negeri Jakarta",
    jenjang_pendidikan: "S1",
    jurusan: "Psikologi",
    tahun_lulus: "2021",
    ipk_nilai: "3.62",
    fresh_graduate: false,
    lama_pengalaman_tahun: "2 tahun",
    pengalaman_list: [
      {
        perusahaan: "PT Maju Bersama",
        jabatan: "HR Admin",
        durasi: "2022-2024",
      },
    ],
    pengalaman_utama_perusahaan: "PT Maju Bersama",
    pengalaman_utama_jabatan: "HR Admin",
    pengalaman_utama_tanggal_masuk: "2022-01-10",
    pengalaman_utama_tanggal_keluar: "2024-12-20",
    pengalaman_utama_masih_kerja: false,
    pengalaman_utama_deskripsi: "Mengelola administrasi kandidat, interview schedule, dan rekap psikotes.",
    pengalaman_utama_alasan_resign: "Mencari jenjang karier yang lebih luas di bidang recruitment.",
    ekspektasi_gaji: 5000000,
    masa_notice: "2 minggu",
    cv_file_name: "CV_Rina_Maharani_Dummy.pdf",
    status_tindak_lanjut: "Baru masuk",
    tahap_proses: "Seleksi awal",
    penilaian_singkat: `${DUMMY_MARKER} Kandidat dummy untuk uji alur HR recruitment.`,
    catatan_recruiter: "Cocok untuk mengetes flow dari data pelamar ke screening lalu ke tahap berikutnya.",
    last_contacted_at: null,
    alasan_tidak_lanjut: null,
    interview_datetime: null,
    interview_location: null,
    interview_interviewer: null,
    interview_notes: null,
    archived: false,
  };

  const { data: pelamar, error: pelamarError } = await supabase
    .from("pelamar")
    .insert(pelamarPayload)
    .select("id, nama_lengkap, tahap_proses, status_tindak_lanjut, lowongan_id")
    .single();

  if (pelamarError) {
    throw pelamarError;
  }

  console.log(
    JSON.stringify(
      {
        status: "created",
        message: "Dummy workflow HR recruitment berhasil dibuat.",
        kebutuhan,
        lowongan,
        pelamar,
      },
      null,
      2,
    ),
  );
}

insertDummyWorkflow().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: "error",
        message: error?.message || "Gagal membuat dummy workflow HR recruitment.",
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
