export type EmployeeRole = "hr" | "employee";

export type EmployeeTabKey =
  | "personal"
  | "identity"
  | "contact"
  | "family"
  | "education"
  | "job"
  | "documents"
  | "history";

export type FieldAccess = "hr-only" | "employee-edit" | "needs-verification";

export interface EmployeeField {
  id: string;
  label: string;
  value: string;
  access: FieldAccess;
  helperText?: string;
}

export interface EmployeeChangeRecord {
  id: string;
  tanggal: string;
  field: string;
  perubahan: string;
  diperbaruiOleh: string;
}

export interface EmployeeStatusOverview {
  dataLengkap: number;
  dokumenTerunggah: number;
  dataPerluDiperbarui: number;
  menungguVerifikasiHr: number;
  checklist: string[];
}

export interface EmployeeFamilyMember {
  id: string;
  nama: string;
  hubungan: string;
  tanggalLahir: string;
  status: string;
}

export interface EmployeeEducationRecord {
  id: string;
  jenjang: string;
  institusi: string;
  jurusan: string;
  tahunLulus: string;
}

export interface EmployeeDocumentRecord {
  id: string;
  dokumen: string;
  nomor: string;
  status: string;
  diperbarui: string;
}

export interface EmployeeSummaryAction {
  id: string;
  label: string;
}

export interface EmployeeProfile {
  id: string;
  initials: string;
  namaLengkap: string;
  employeeId: string;
  jabatan: string;
  departemen: string;
  statusKerja: string;
  tanggalMasuk: string;
  cabang: string;
  statusKaryawan: string;
  namaUsaha: string;
  atasan: string;
  tipeKontrak: string;
  quickActions: EmployeeSummaryAction[];
  personalFields: EmployeeField[];
  identityFields: EmployeeField[];
  contactFields: EmployeeField[];
  jobFields: EmployeeField[];
  familyMembers: EmployeeFamilyMember[];
  educationRecords: EmployeeEducationRecord[];
  documentRecords: EmployeeDocumentRecord[];
  changeHistory: EmployeeChangeRecord[];
  statusOverview: EmployeeStatusOverview;
  orgMeta?: {
    atasanEmployeeId: string | null;
    jobLevel: string;
    orgStatus: string;
  };
}
