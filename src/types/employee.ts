import type {
  EmployeeChangeRecord,
  EmployeeDocumentRecord,
  EmployeeEducationRecord,
  EmployeeFamilyMember,
  EmployeeStatusOverview,
} from "@/types/employeeProfile";

export interface OnboardingEmployeeForm {
  startDate: string;
  employmentType: string;
  finalSalary: string;
  owner: string;
  offerNote: string;
}

export interface ManualEmployeeFormInput {
  namaLengkap: string;
  namaPanggilan: string;
  jabatan: string;
  departemen: string;
  statusKerja: string;
  tanggalMasuk: string;
  cabang: string;
  atasan: string;
  atasanEmployeeId: number | null;
  jobLevel: string;
  tipeKontrak: string;
  lokasiKerja: string;
  shift: string;
  noHp: string;
  emailPribadi: string;
  alamatDomisili: string;
  jenisKelamin: string;
  statusPernikahan: string;
  tanggalLahir: string;
  kewarganegaraan: string;
}

export interface EmployeeRecord {
  id: number;
  source_pelamar_id: number | null;
  employee_id: string;
  nik: string | null;
  atasan_employee_id?: number | null;
  job_level?: string | null;
  org_status?: string | null;
  nama_lengkap: string;
  nama_panggilan: string | null;
  jabatan: string;
  departemen: string;
  status_kerja: string;
  tanggal_masuk: string | null;
  cabang: string;
  status_karyawan: string;
  nama_usaha: string;
  atasan: string;
  tipe_kontrak: string;
  lokasi_kerja: string | null;
  shift: string | null;
  jenis_kelamin: string | null;
  agama: string | null;
  tempat_lahir: string | null;
  status_pernikahan: string | null;
  tanggal_lahir: string | null;
  kewarganegaraan: string | null;
  golongan_darah: string | null;
  no_ktp: string | null;
  no_kk: string | null;
  npwp: string | null;
  bpjs_kesehatan: string | null;
  bpjs_ketenagakerjaan: string | null;
  passport: string | null;
  no_hp: string | null;
  email_pribadi: string | null;
  email_kantor: string | null;
  alamat_ktp: string | null;
  alamat_domisili: string | null;
  kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  kontak_darurat: string | null;
  pendidikan: EmployeeEducationRecord[];
  keluarga: EmployeeFamilyMember[];
  dokumen: EmployeeDocumentRecord[];
  change_history: EmployeeChangeRecord[];
  status_overview: EmployeeStatusOverview;
  created_at: string;
  updated_at: string;
}

export type CreateEmployeePayload = Omit<EmployeeRecord, "id" | "created_at" | "updated_at">;
export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;
