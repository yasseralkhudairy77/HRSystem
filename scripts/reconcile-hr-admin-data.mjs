import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = value;
  }
  return env;
}

const rootDir = process.cwd();
const env = loadEnv(path.join(rootDir, ".env"));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const today = new Date().toISOString().slice(0, 10);
const displayDate = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const legacyEmployees = [
  {
    employee_id: "HKM-2025-022",
    nama_lengkap: "Rizki Ramadhan",
    jabatan: "Kurir Operasional",
    departemen: "Logistik",
    cabang: "Cabang Dayeuhkolot",
    nama_usaha: "HireUMKM Express",
    atasan: "Fajar Nugraha",
    status_kerja: "Kontrak",
    tipe_kontrak: "PKWT",
    tanggal_masuk: "2025-02-01",
  },
  {
    employee_id: "HKM-2022-018",
    nama_lengkap: "Lina Handayani",
    jabatan: "Staff Purchasing",
    departemen: "Procurement",
    cabang: "Head Office Bandung",
    nama_usaha: "HireUMKM Retail",
    atasan: "Wulan Sari",
    status_kerja: "Tetap",
    tipe_kontrak: "PKWTT",
    tanggal_masuk: "2022-01-10",
  },
];

function buildLegacyEmployeePayload(item) {
  return {
    source_pelamar_id: null,
    employee_id: item.employee_id,
    nik: null,
    atasan_employee_id: null,
    job_level: "Staff",
    org_status: "inactive",
    nama_lengkap: item.nama_lengkap,
    nama_panggilan: item.nama_lengkap.split(" ")[0],
    jabatan: item.jabatan,
    departemen: item.departemen,
    status_kerja: item.status_kerja,
    tanggal_masuk: item.tanggal_masuk,
    cabang: item.cabang,
    status_karyawan: "Nonaktif",
    nama_usaha: item.nama_usaha,
    atasan: item.atasan,
    tipe_kontrak: item.tipe_kontrak,
    lokasi_kerja: item.cabang,
    shift: "Regular",
    jenis_kelamin: null,
    agama: null,
    tempat_lahir: null,
    status_pernikahan: null,
    tanggal_lahir: null,
    kewarganegaraan: "Indonesia",
    golongan_darah: null,
    no_ktp: null,
    no_kk: null,
    npwp: null,
    bpjs_kesehatan: null,
    bpjs_ketenagakerjaan: null,
    passport: null,
    no_hp: null,
    email_pribadi: null,
    email_kantor: null,
    alamat_ktp: null,
    alamat_domisili: null,
    kota: null,
    provinsi: null,
    kode_pos: null,
    kontak_darurat: null,
    pendidikan: [],
    keluarga: [],
    dokumen: [],
    change_history: [
      {
        id: `chg-legacy-${item.employee_id.toLowerCase()}`,
        tanggal: displayDate,
        field: "Data legacy",
        perubahan: "Dibuat sebagai arsip untuk menghubungkan data offboarding lama ke master employee live.",
        diperbaruiOleh: "System reconciliation",
      },
    ],
    status_overview: {
      dataLengkap: 0,
      dokumenTerunggah: 0,
      dataPerluDiperbarui: 0,
      menungguVerifikasiHr: 0,
      checklist: [],
    },
  };
}

async function ensureEmployee(item) {
  const { data: existing, error: existingError } = await supabase.from("employees").select("id, employee_id").eq("employee_id", item.employee_id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase.from("employees").insert(buildLegacyEmployeePayload(item)).select("id").single();
  if (createError) throw createError;
  return created.id;
}

async function reconcileOffboarding() {
  for (const employee of legacyEmployees) {
    const employeeRowId = await ensureEmployee(employee);
    const { error } = await supabase
      .from("hr_offboarding_processes")
      .update({ source_employee_row_id: employeeRowId, employee_deactivated: true })
      .eq("employee_code", employee.employee_id);
    if (error) throw error;
  }
}

async function ensureDefaultTemplate() {
  const templateName = "Template standar kontrak";
  const { data: existing, error: existingError } = await supabase.from("hr_contract_templates").select("id").eq("template_name", templateName).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return false;

  const { error } = await supabase.from("hr_contract_templates").insert({
    template_name: templateName,
    description: "Template dasar untuk kontrak kerja umum perusahaan.",
    is_default: true,
    article_clauses: [
      { id: "penempatan", title: "Pasal 1 - Penempatan", body: "{{namaLengkap}} ditempatkan sebagai {{jabatan}} pada {{namaCabang}} di {{namaUsaha}}." },
      { id: "masa-kerja", title: "Pasal 2 - Masa Kerja", body: "Perjanjian ini berlaku sejak {{tanggalMulai}} sampai dengan {{tanggalBerakhir}} dengan jenis {{jenisKontrak}}." },
      { id: "kompensasi", title: "Pasal 3 - Kompensasi", body: "Gaji pokok yang disepakati adalah {{gajiPokok}} dengan tunjangan utama {{tunjanganUtama}}." },
      { id: "ketentuan", title: "Pasal 4 - Ketentuan Lanjutan", body: "Status tanda tangan saat ini {{statusTandaTangan}}, dan keputusan berikutnya diarahkan ke {{keputusanBerikutnya}}." },
    ],
  });
  if (error) throw error;
  return true;
}

async function main() {
  await reconcileOffboarding();
  const createdTemplate = await ensureDefaultTemplate();
  console.log(`Rekonsiliasi selesai. Template default ${createdTemplate ? "berhasil dibuat" : "sudah tersedia"}. Tanggal audit: ${today}`);
}

main().catch((error) => {
  console.error("Rekonsiliasi HR admin gagal:", error);
  process.exitCode = 1;
});
