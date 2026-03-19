import type { Pelamar } from "@/types/pelamar";
import type { CreateEmployeePayload, EmployeeRecord, ManualEmployeeFormInput, OnboardingEmployeeForm } from "@/types/employee";
import type {
  EmployeeChangeRecord,
  EmployeeDocumentRecord,
  EmployeeEducationRecord,
  EmployeeField,
  EmployeeProfile,
  EmployeeStatusOverview,
} from "@/types/employeeProfile";

const quickActions = [
  { id: "documents", label: "Lihat Dokumen" },
  { id: "history", label: "Riwayat Perubahan" },
  { id: "print", label: "Cetak Data" },
] as const;

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "" && value.trim() !== "-";
  return true;
}

function displayValue(value: unknown, fallback = "-") {
  return hasValue(value) ? String(value).trim() : fallback;
}

function firstName(name: string) {
  return displayValue(name).split(" ")[0] || "-";
}

function buildInitials(name: string) {
  const parts = displayValue(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "HR";
}

function formatDate(value: string | null | undefined) {
  if (!hasValue(value)) return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return displayValue(value);
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(value: string | null | undefined) {
  if (!hasValue(value)) return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return displayValue(value);
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function slugDigits(value: number) {
  return String(value).padStart(4, "0");
}

function codeFromText(value: string, fallback: string) {
  const letters = displayValue(value, fallback)
    .replace(/[^A-Za-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("");

  return letters || fallback;
}

function inferDepartment(position: string) {
  const lower = position.toLowerCase();
  if (/(finance|account|akuntansi)/.test(lower)) return "Finance & Accounting";
  if (/(hr|human capital|recruit|people)/.test(lower)) return "Human Resources";
  if (/(operasional|operation|store|outlet|kasir)/.test(lower)) return "Store Operations";
  if (/(sales|marketing|bizdev|business)/.test(lower)) return "Sales & Marketing";
  if (/(admin|administrasi)/.test(lower)) return "Administrasi";
  if (/(teknik|engineer|it|developer)/.test(lower)) return "Technology";
  return "Operasional";
}

function inferCity(address: string) {
  if (!hasValue(address)) return "";
  const chunks = String(address)
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks[chunks.length - 1] || "";
}

function inferBranchCode(city: string) {
  const lower = city.toLowerCase();
  if (lower.includes("jakarta")) return "JKT";
  if (lower.includes("bekasi")) return "BKS";
  if (lower.includes("bandung")) return "BDG";
  if (lower.includes("bogor")) return "BGR";
  if (lower.includes("depok")) return "DPK";
  if (lower.includes("tangerang")) return "TGR";
  return "HO";
}

function inferBranchLabel(address: string) {
  const city = inferCity(address);
  return city ? `Cabang ${city}` : "Head Office";
}

function mapContractType(employmentType: string) {
  if (employmentType === "Tetap") return "PKWTT";
  if (employmentType === "Kontrak") return "PKWT";
  if (employmentType === "Probation") return "Probation";
  if (employmentType === "Freelance") return "Freelance";
  if (employmentType === "Part time") return "Part time";
  return "Belum ditentukan";
}

function inferJobLevel(position: string) {
  const lower = position.toLowerCase();
  if (/(owner|founder|ceo|director|direktur)/.test(lower)) return "Director";
  if (/(head|kepala|general manager|gm)/.test(lower)) return "Head";
  if (/(manager|manajer)/.test(lower)) return "Manager";
  if (/(supervisor|koordinator|coordinator|team lead|lead)/.test(lower)) return "Supervisor";
  if (/(senior|sr\.)/.test(lower)) return "Senior Staff";
  return "Staff";
}

function buildGeneratedEmployeeIdentity(prefix: string, dateValue: string, name: string) {
  const date = hasValue(dateValue) ? new Date(String(dateValue)) : new Date();
  const safeYear = Number.isNaN(date.getTime()) ? String(new Date().getFullYear()).slice(-2) : String(date.getFullYear()).slice(-2);
  const stamp = String(Date.now()).slice(-4);
  const nameCode = codeFromText(name, prefix).slice(0, 3);

  return {
    employeeId: `EMP-${safeYear}${nameCode}${stamp}`,
    nik: `HRM-${nameCode}-${safeYear}${stamp}`,
  };
}

function buildChecklist(payload: Partial<CreateEmployeePayload>) {
  const checklist: string[] = [];

  if (!hasValue(payload.no_ktp)) checklist.push("Nomor KTP belum diisi dan masih perlu verifikasi HR.");
  if (!hasValue(payload.npwp)) checklist.push("NPWP belum tersedia atau masih menunggu pembaruan.");
  if (!hasValue(payload.kontak_darurat)) checklist.push("Kontak darurat belum dicatat di data karyawan.");
  if (!Array.isArray(payload.dokumen) || payload.dokumen.filter((item) => item.status === "Sudah lengkap").length < 2) {
    checklist.push("Dokumen awal karyawan masih perlu dilengkapi dari onboarding.");
  }
  if (!hasValue(payload.atasan) || payload.atasan === "Belum ditentukan") checklist.push("Atasan langsung belum ditentukan oleh HR.");

  return checklist.slice(0, 3);
}

function computeStatusOverview(payload: Partial<CreateEmployeePayload>): EmployeeStatusOverview {
  const completenessFields = [
    payload.nama_lengkap,
    payload.employee_id,
    payload.jabatan,
    payload.departemen,
    payload.status_kerja,
    payload.tanggal_masuk,
    payload.cabang,
    payload.atasan,
    payload.no_hp,
    payload.email_pribadi,
    payload.alamat_domisili,
    payload.jenis_kelamin,
    payload.tanggal_lahir,
    payload.status_pernikahan,
    payload.kewarganegaraan,
    payload.kontak_darurat,
  ];

  const completeCount = completenessFields.filter(hasValue).length;
  const dataLengkap = Math.max(35, Math.round((completeCount / completenessFields.length) * 100));
  const dokumenTerunggah = Array.isArray(payload.dokumen) ? payload.dokumen.filter((item) => item.status === "Sudah lengkap").length : 0;
  const dataPerluDiperbarui =
    (Array.isArray(payload.dokumen) ? payload.dokumen.filter((item) => item.status === "Perlu dicek" || item.status === "Belum lengkap").length : 0) +
    (hasValue(payload.kontak_darurat) ? 0 : 1);
  const menungguVerifikasiHr = [
    payload.no_ktp,
    payload.no_kk,
    payload.npwp,
    payload.bpjs_kesehatan,
    payload.bpjs_ketenagakerjaan,
    payload.status_pernikahan,
  ].filter(hasValue).length;

  return {
    dataLengkap,
    dokumenTerunggah,
    dataPerluDiperbarui,
    menungguVerifikasiHr,
    checklist: buildChecklist(payload),
  };
}

function buildEducationRecords(pelamar: Pelamar, existing?: EmployeeRecord | null): EmployeeEducationRecord[] {
  if (existing?.pendidikan?.length) return existing.pendidikan;

  if (!hasValue(pelamar.jenjang_pendidikan) && !hasValue(pelamar.institusi_pendidikan) && !hasValue(pelamar.jurusan)) {
    return [];
  }

  return [
    {
      id: `edu-${pelamar.id}-1`,
      jenjang: displayValue(pelamar.jenjang_pendidikan),
      institusi: displayValue(pelamar.institusi_pendidikan),
      jurusan: displayValue(pelamar.jurusan),
      tahunLulus: displayValue(pelamar.tahun_lulus),
    },
  ];
}

function buildDocuments(pelamar: Pelamar, existing?: EmployeeRecord | null): EmployeeDocumentRecord[] {
  const updatedAt = formatDate(pelamar.updated_at || pelamar.created_at);

  if (existing?.dokumen?.length) {
    return existing.dokumen.map((item) => ({ ...item, diperbarui: item.diperbarui || updatedAt }));
  }

  return [
    {
      id: `doc-${pelamar.id}-cv`,
      dokumen: "CV",
      nomor: displayValue(pelamar.cv_file_name),
      status: hasValue(pelamar.cv_file_name) ? "Sudah lengkap" : "Belum lengkap",
      diperbarui: updatedAt,
    },
    {
      id: `doc-${pelamar.id}-ktp`,
      dokumen: "KTP",
      nomor: "-",
      status: "Belum lengkap",
      diperbarui: updatedAt,
    },
    {
      id: `doc-${pelamar.id}-npwp`,
      dokumen: "NPWP",
      nomor: "-",
      status: "Belum lengkap",
      diperbarui: updatedAt,
    },
    {
      id: `doc-${pelamar.id}-bpjs`,
      dokumen: "BPJS",
      nomor: "-",
      status: "Perlu dicek",
      diperbarui: updatedAt,
    },
  ];
}

function ensureChangeHistory(existing: EmployeeRecord | null | undefined, pelamar: Pelamar, payload: Partial<CreateEmployeePayload>, owner: string) {
  const current = Array.isArray(existing?.change_history) ? [...existing.change_history] : [];
  const joinedDate = formatDateShort(payload.tanggal_masuk || pelamar.updated_at || pelamar.created_at);
  const requiredEntries: EmployeeChangeRecord[] = [
    {
      id: `chg-join-${pelamar.id}`,
      tanggal: joinedDate,
      field: "Status Karyawan",
      perubahan: "Kandidat -> Aktif",
      diperbaruiOleh: owner,
    },
    {
      id: `chg-position-${pelamar.id}`,
      tanggal: joinedDate,
      field: "Jabatan",
      perubahan: `Pelamar -> ${displayValue(payload.jabatan)}`,
      diperbaruiOleh: owner,
    },
    {
      id: `chg-start-${pelamar.id}`,
      tanggal: joinedDate,
      field: "Tanggal Masuk",
      perubahan: `Belum diatur -> ${formatDate(payload.tanggal_masuk)}`,
      diperbaruiOleh: owner,
    },
  ];

  requiredEntries.forEach((entry) => {
    if (!current.some((item) => item.id === entry.id)) current.unshift(entry);
  });

  return current;
}

export function buildEmployeePayloadFromPelamar(params: {
  pelamar: Pelamar;
  onboardingForm: OnboardingEmployeeForm;
  existing?: EmployeeRecord | null;
}): CreateEmployeePayload {
  const { pelamar, onboardingForm, existing } = params;
  const joinDate = onboardingForm.startDate || existing?.tanggal_masuk || new Date().toISOString().slice(0, 10);
  const city = existing?.kota || inferCity(pelamar.alamat_domisili);
  const branch = displayValue(existing?.cabang || inferBranchLabel(pelamar.alamat_domisili));
  const branchCode = inferBranchCode(branch);
  const owner = displayValue(onboardingForm.owner || existing?.atasan || "HRD");
  const joinYear = new Date(joinDate).getFullYear();
  const safeYear = Number.isFinite(joinYear) ? String(joinYear).slice(-2) : "00";
  const employeeId = existing?.employee_id || `EMP-${safeYear}${slugDigits(pelamar.id)}`;
  const nik = existing?.nik || `HRM-${branchCode}-${safeYear}${slugDigits(pelamar.id)}`;

  const payload: CreateEmployeePayload = {
    source_pelamar_id: pelamar.id,
    employee_id: employeeId,
    nik,
    atasan_employee_id: existing?.atasan_employee_id ?? null,
    job_level: existing?.job_level || inferJobLevel(pelamar.posisi_dilamar),
    org_status: existing?.org_status || "active",
    nama_lengkap: pelamar.nama_lengkap,
    nama_panggilan: existing?.nama_panggilan || firstName(pelamar.nama_lengkap),
    jabatan: displayValue(existing?.jabatan || pelamar.posisi_dilamar),
    departemen: displayValue(existing?.departemen || inferDepartment(pelamar.posisi_dilamar)),
    status_kerja: displayValue(onboardingForm.employmentType || existing?.status_kerja || "Probation"),
    tanggal_masuk: joinDate,
    cabang: branch,
    status_karyawan: "Aktif",
    nama_usaha: displayValue(existing?.nama_usaha || "Perusahaan Aktif"),
    atasan: displayValue(existing?.atasan || onboardingForm.owner || "Belum ditentukan"),
    tipe_kontrak: displayValue(existing?.tipe_kontrak || mapContractType(onboardingForm.employmentType)),
    lokasi_kerja: displayValue(existing?.lokasi_kerja || branch),
    shift: displayValue(existing?.shift || "Belum diatur"),
    jenis_kelamin: pelamar.jenis_kelamin || existing?.jenis_kelamin || null,
    agama: pelamar.agama || existing?.agama || null,
    tempat_lahir: existing?.tempat_lahir || null,
    status_pernikahan: pelamar.status_pernikahan || existing?.status_pernikahan || null,
    tanggal_lahir: pelamar.tanggal_lahir || existing?.tanggal_lahir || null,
    kewarganegaraan: pelamar.kewarganegaraan || existing?.kewarganegaraan || "Indonesia",
    golongan_darah: existing?.golongan_darah || null,
    no_ktp: existing?.no_ktp || null,
    no_kk: existing?.no_kk || null,
    npwp: existing?.npwp || null,
    bpjs_kesehatan: existing?.bpjs_kesehatan || null,
    bpjs_ketenagakerjaan: existing?.bpjs_ketenagakerjaan || null,
    passport: existing?.passport || null,
    no_hp: pelamar.no_hp || existing?.no_hp || null,
    email_pribadi: pelamar.email || existing?.email_pribadi || null,
    email_kantor: existing?.email_kantor || null,
    alamat_ktp: pelamar.alamat_ktp || existing?.alamat_ktp || null,
    alamat_domisili: pelamar.alamat_domisili || existing?.alamat_domisili || null,
    kota: city || existing?.kota || null,
    provinsi: existing?.provinsi || null,
    kode_pos: existing?.kode_pos || null,
    kontak_darurat: existing?.kontak_darurat || null,
    pendidikan: buildEducationRecords(pelamar, existing),
    keluarga: existing?.keluarga || [],
    dokumen: buildDocuments(pelamar, existing),
    change_history: [],
    status_overview: {
      dataLengkap: 0,
      dokumenTerunggah: 0,
      dataPerluDiperbarui: 0,
      menungguVerifikasiHr: 0,
      checklist: [],
    },
  };

  payload.change_history = ensureChangeHistory(existing, pelamar, payload, owner);
  payload.status_overview = computeStatusOverview(payload);

  return payload;
}

export function buildManualEmployeePayload(input: ManualEmployeeFormInput): CreateEmployeePayload {
  const identity = buildGeneratedEmployeeIdentity("MNL", input.tanggalMasuk, input.namaLengkap);

  const payload: CreateEmployeePayload = {
    source_pelamar_id: null,
    employee_id: identity.employeeId,
    nik: identity.nik,
    atasan_employee_id: input.atasanEmployeeId ?? null,
    job_level: input.jobLevel.trim() || inferJobLevel(input.jabatan),
    org_status: "active",
    nama_lengkap: input.namaLengkap.trim(),
    nama_panggilan: input.namaPanggilan.trim() || firstName(input.namaLengkap),
    jabatan: input.jabatan.trim(),
    departemen: input.departemen.trim() || inferDepartment(input.jabatan),
    status_kerja: input.statusKerja.trim() || "Tetap",
    tanggal_masuk: input.tanggalMasuk || new Date().toISOString().slice(0, 10),
    cabang: input.cabang.trim() || "Head Office",
    status_karyawan: "Aktif",
    nama_usaha: "Perusahaan Aktif",
    atasan: input.atasan.trim() || "Belum ditentukan",
    tipe_kontrak: input.tipeKontrak.trim() || mapContractType(input.statusKerja),
    lokasi_kerja: input.lokasiKerja.trim() || input.cabang.trim() || "Head Office",
    shift: input.shift.trim() || "Regular",
    jenis_kelamin: input.jenisKelamin.trim() || null,
    agama: null,
    tempat_lahir: null,
    status_pernikahan: input.statusPernikahan.trim() || null,
    tanggal_lahir: input.tanggalLahir || null,
    kewarganegaraan: input.kewarganegaraan.trim() || "Indonesia",
    golongan_darah: null,
    no_ktp: null,
    no_kk: null,
    npwp: null,
    bpjs_kesehatan: null,
    bpjs_ketenagakerjaan: null,
    passport: null,
    no_hp: input.noHp.trim() || null,
    email_pribadi: input.emailPribadi.trim() || null,
    email_kantor: null,
    alamat_ktp: null,
    alamat_domisili: input.alamatDomisili.trim() || null,
    kota: inferCity(input.alamatDomisili),
    provinsi: null,
    kode_pos: null,
    kontak_darurat: null,
    pendidikan: [],
    keluarga: [],
    dokumen: [
      {
        id: `doc-${identity.employeeId}-ktp`,
        dokumen: "KTP",
        nomor: "-",
        status: "Belum lengkap",
        diperbarui: formatDate(new Date().toISOString()),
      },
      {
        id: `doc-${identity.employeeId}-npwp`,
        dokumen: "NPWP",
        nomor: "-",
        status: "Belum lengkap",
        diperbarui: formatDate(new Date().toISOString()),
      },
    ],
    change_history: [
      {
        id: `chg-manual-${identity.employeeId}`,
        tanggal: formatDateShort(new Date().toISOString()),
        field: "Sumber Data",
        perubahan: "Ditambahkan manual oleh HR",
        diperbaruiOleh: "HRD",
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

  payload.status_overview = computeStatusOverview(payload);

  return payload;
}

function buildField(id: string, label: string, value: string | null | undefined, access: EmployeeField["access"], helperText?: string): EmployeeField {
  return {
    id,
    label,
    value: displayValue(value),
    access,
    helperText,
  };
}

export function mapEmployeeRecordToProfile(record: EmployeeRecord): EmployeeProfile {
  return {
    id: String(record.id),
    initials: buildInitials(record.nama_lengkap),
    namaLengkap: record.nama_lengkap,
    employeeId: displayValue(record.employee_id),
    jabatan: displayValue(record.jabatan),
    departemen: displayValue(record.departemen),
    statusKerja: displayValue(record.status_kerja),
    tanggalMasuk: formatDate(record.tanggal_masuk),
    cabang: displayValue(record.cabang),
    statusKaryawan: displayValue(record.status_karyawan),
    namaUsaha: displayValue(record.nama_usaha),
    atasan: displayValue(record.atasan),
    tipeKontrak: displayValue(record.tipe_kontrak),
    quickActions: [...quickActions],
    personalFields: [
      buildField("full-name", "Nama Lengkap", record.nama_lengkap, "hr-only", "Nama legal sesuai dokumen identitas."),
      buildField("nickname", "Nama Panggilan", record.nama_panggilan, "employee-edit", "Dipakai untuk kebutuhan komunikasi internal."),
      buildField("gender", "Jenis Kelamin", record.jenis_kelamin, "hr-only"),
      buildField("religion", "Agama", record.agama, "needs-verification", "Perubahan dicatat untuk kebutuhan administrasi dan cuti."),
      buildField("birth-place", "Tempat Lahir", record.tempat_lahir, "hr-only"),
      buildField("marital", "Status Pernikahan", record.status_pernikahan, "needs-verification", "Perlu verifikasi HR sebelum dipakai modul benefit."),
      buildField("birth-date", "Tanggal Lahir", formatDate(record.tanggal_lahir), "hr-only"),
      buildField("citizenship", "Kewarganegaraan", record.kewarganegaraan, "hr-only"),
      buildField("blood", "Golongan Darah", record.golongan_darah, "employee-edit", "Bisa diperbarui untuk kebutuhan data darurat."),
    ],
    identityFields: [
      buildField("ktp", "No KTP", record.no_ktp, "needs-verification"),
      buildField("kk", "No KK", record.no_kk, "needs-verification"),
      buildField("npwp", "NPWP", record.npwp, "needs-verification"),
      buildField("bpjs-health", "BPJS Kesehatan", record.bpjs_kesehatan, "needs-verification"),
      buildField("bpjs-work", "BPJS Ketenagakerjaan", record.bpjs_ketenagakerjaan, "needs-verification"),
      buildField("passport", "Passport", record.passport, "hr-only"),
    ],
    contactFields: [
      buildField("phone", "No HP", record.no_hp, "employee-edit"),
      buildField("personal-email", "Email pribadi", record.email_pribadi, "employee-edit"),
      buildField("office-email", "Email kantor", record.email_kantor, "hr-only"),
      buildField("ktp-address", "Alamat KTP", record.alamat_ktp, "needs-verification"),
      buildField("domicile", "Alamat domisili", record.alamat_domisili, "employee-edit"),
      buildField("city", "Kota", record.kota, "employee-edit"),
      buildField("province", "Provinsi", record.provinsi, "employee-edit"),
      buildField("postal", "Kode pos", record.kode_pos, "employee-edit"),
      buildField("emergency", "Kontak darurat", record.kontak_darurat, "employee-edit"),
    ],
    jobFields: [
      buildField("nik", "NIK", record.nik, "hr-only"),
      buildField("join-date", "Tanggal masuk", formatDate(record.tanggal_masuk), "hr-only"),
      buildField("employment", "Status kerja", record.status_kerja, "hr-only"),
      buildField("department", "Departemen", record.departemen, "hr-only"),
      buildField("position", "Jabatan", record.jabatan, "hr-only"),
      buildField("job-level", "Job Level", record.job_level, "hr-only", "Dipakai untuk membantu urutan visual di struktur organisasi."),
      buildField("supervisor", "Atasan Langsung", record.atasan, "hr-only", "Relasi utama untuk pembentukan struktur organisasi otomatis."),
      buildField("work-location", "Lokasi kerja", record.lokasi_kerja || record.cabang, "hr-only"),
      buildField("shift", "Shift", record.shift, "hr-only"),
      buildField("contract", "Tipe kontrak", record.tipe_kontrak, "hr-only"),
    ],
    familyMembers: Array.isArray(record.keluarga) ? record.keluarga : [],
    educationRecords: Array.isArray(record.pendidikan) ? record.pendidikan : [],
    documentRecords: Array.isArray(record.dokumen) ? record.dokumen : [],
    changeHistory: Array.isArray(record.change_history) && record.change_history.length
      ? record.change_history
      : [
          {
            id: `chg-default-${record.id}`,
            tanggal: formatDateShort(record.created_at),
            field: "Profil Karyawan",
            perubahan: "Record karyawan dibuat dari onboarding",
            diperbaruiOleh: "HRD",
          },
        ],
    statusOverview: record.status_overview || computeStatusOverview(record),
    orgMeta: {
      atasanEmployeeId: record.atasan_employee_id ? String(record.atasan_employee_id) : null,
      jobLevel: displayValue(record.job_level, inferJobLevel(record.jabatan)),
      orgStatus: displayValue(record.org_status, "active"),
    },
  };
}
