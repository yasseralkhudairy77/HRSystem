import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { HrPresensiRole, HrPresensiTabKey } from "@/types/hrPresensiModule";

const ACCESS_ISSUE_STORAGE_KEY = "hr-presensi:access-issues";
const HR_MATCHER_PATTERNS = [/^hr$/i, /human resources/i, /human capital/i, /people/i, /recruit/i];
const ACTIVE_EMPLOYEE_STATUSES = ["aktif", "active", "probation", "kontrak", "tetap", "freelance", "part time"];

type EmployeeAccessRecord = {
  id: number;
  employee_id: string;
  nama_lengkap: string;
  email_kantor: string | null;
  email_pribadi: string | null;
  atasan_employee_id: number | null;
  job_level: string | null;
  departemen: string;
  jabatan: string;
  status_karyawan: string;
  org_status: string | null;
  cabang: string;
  lokasi_kerja: string | null;
  shift: string | null;
};

export type HrPresensiAccessIssueCode = "signed_out" | "missing_email" | "employee_not_found";

export type HrPresensiAccessScope = {
  kind: "all" | "team" | "self";
  employeeId: number | null;
  allowedEmployeeIds: number[];
  directReportIds: number[];
  totalActiveEmployees: number;
};

export type HrPresensiResolvedAccess = {
  status: "loading" | "signed_out" | "unmapped" | "ready";
  canAccessModule: boolean;
  role: HrPresensiRole | null;
  sessionEmail: string | null;
  employee: EmployeeAccessRecord | null;
  directReports: EmployeeAccessRecord[];
  scope: HrPresensiAccessScope;
  issueCode: HrPresensiAccessIssueCode | null;
  issueMessage: string | null;
};

function createEmptyScope(totalActiveEmployees = 0): HrPresensiAccessScope {
  return {
    kind: "self",
    employeeId: null,
    allowedEmployeeIds: [],
    directReportIds: [],
    totalActiveEmployees,
  };
}

export const initialHrPresensiAccessState: HrPresensiResolvedAccess = {
  status: "loading",
  canAccessModule: false,
  role: null,
  sessionEmail: null,
  employee: null,
  directReports: [],
  scope: createEmptyScope(),
  issueCode: null,
  issueMessage: null,
};

export function normalizeEmail(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function matchesHrPattern(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return HR_MATCHER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isEmployeeActive(record: EmployeeAccessRecord) {
  const statusKaryawan = String(record.status_karyawan || "").trim().toLowerCase();
  const orgStatus = String(record.org_status || "active").trim().toLowerCase();
  return orgStatus !== "inactive" && ACTIVE_EMPLOYEE_STATUSES.includes(statusKaryawan || "aktif");
}

function logAccessIssue(input: { code: HrPresensiAccessIssueCode; email: string | null; message: string }) {
  console.warn("[HR Presensi] Access issue:", input);

  if (typeof window === "undefined") return;

  const existing = JSON.parse(window.localStorage.getItem(ACCESS_ISSUE_STORAGE_KEY) || "[]");
  const next = [{ ...input, created_at: new Date().toISOString() }, ...existing].slice(0, 20);
  window.localStorage.setItem(ACCESS_ISSUE_STORAGE_KEY, JSON.stringify(next));
}

function deriveRole(employee: EmployeeAccessRecord, directReports: EmployeeAccessRecord[]): HrPresensiRole {
  if (matchesHrPattern(employee.departemen) || matchesHrPattern(employee.jabatan)) {
    return "hr";
  }

  if (directReports.length > 0) {
    return "atasan";
  }

  return "karyawan";
}

function buildScope(role: HrPresensiRole, employee: EmployeeAccessRecord, directReports: EmployeeAccessRecord[], totalActiveEmployees: number): HrPresensiAccessScope {
  if (role === "hr") {
    return {
      kind: "all",
      employeeId: employee.id,
      allowedEmployeeIds: [],
      directReportIds: directReports.map((item) => item.id),
      totalActiveEmployees,
    };
  }

  if (role === "atasan") {
    const directReportIds = directReports.map((item) => item.id);
    return {
      kind: "team",
      employeeId: employee.id,
      allowedEmployeeIds: directReportIds,
      directReportIds,
      totalActiveEmployees,
    };
  }

  return {
    kind: "self",
    employeeId: employee.id,
    allowedEmployeeIds: [employee.id],
    directReportIds: [],
    totalActiveEmployees,
  };
}

async function getEmployeeDirectory() {
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_id, nama_lengkap, email_kantor, email_pribadi, atasan_employee_id, job_level, departemen, jabatan, status_karyawan, org_status, cabang, lokasi_kerja, shift");

  if (error) {
    console.error("Supabase gagal memuat direktori employee untuk resolver HR Presensi:", error);
    throw error;
  }

  return ((data ?? []) as EmployeeAccessRecord[]).filter(isEmployeeActive);
}

function mapSessionToEmployee(email: string, employees: EmployeeAccessRecord[]) {
  const officeMatch = employees.find((item) => normalizeEmail(item.email_kantor) === email) || null;
  if (officeMatch) return officeMatch;
  return employees.find((item) => normalizeEmail(item.email_pribadi) === email) || null;
}

export async function resolveHrPresensiAccess(session: Session | null): Promise<HrPresensiResolvedAccess> {
  if (!session?.user) {
    return {
      ...initialHrPresensiAccessState,
      status: "signed_out",
      canAccessModule: false,
      scope: createEmptyScope(),
      issueCode: "signed_out",
      issueMessage: "Sesi login belum tersedia. Masuk terlebih dulu untuk membuka HR Presensi.",
    };
  }

  const sessionEmail = normalizeEmail(session.user.email);
  if (!sessionEmail) {
    const issueMessage = "Akun login belum memiliki email yang valid untuk dipetakan ke profil karyawan.";
    logAccessIssue({ code: "missing_email", email: null, message: issueMessage });
    return {
      ...initialHrPresensiAccessState,
      status: "unmapped",
      canAccessModule: false,
      sessionEmail: null,
      scope: createEmptyScope(),
      issueCode: "missing_email",
      issueMessage,
    };
  }

  const employees = await getEmployeeDirectory();
  const employee = mapSessionToEmployee(sessionEmail, employees);

  if (!employee) {
    const issueMessage = "Akun belum terhubung ke profil karyawan. Hubungkan email akun ke email kantor atau email pribadi pada data karyawan.";
    logAccessIssue({ code: "employee_not_found", email: sessionEmail, message: issueMessage });
    return {
      ...initialHrPresensiAccessState,
      status: "unmapped",
      canAccessModule: false,
      sessionEmail,
      scope: createEmptyScope(employees.length),
      issueCode: "employee_not_found",
      issueMessage,
    };
  }

  const directReports = employees.filter((item) => item.atasan_employee_id === employee.id);
  const role = deriveRole(employee, directReports);
  const scope = buildScope(role, employee, directReports, employees.length);

  return {
    status: "ready",
    canAccessModule: true,
    role,
    sessionEmail,
    employee,
    directReports,
    scope,
    issueCode: null,
    issueMessage: null,
  };
}

export function canAccessHrPresensiTab(access: HrPresensiResolvedAccess, tab: { roles: HrPresensiRole[] }) {
  return access.status === "ready" && access.role ? tab.roles.includes(access.role) : false;
}

export function getHrPresensiScopeLabel(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || !access.role) return "Belum tersedia";
  if (access.scope.kind === "all") return `Semua data (${access.scope.totalActiveEmployees} karyawan aktif)`;
  if (access.scope.kind === "team") return `Data tim (${access.scope.allowedEmployeeIds.length} bawahan aktif)`;
  return "Data pribadi";
}

export function assertHrPresensiSettingsAccess(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || access.role !== "hr") {
    throw new Error("Pengaturan HR Presensi hanya dapat diakses role HR. Guard query ini masih sementara sampai RLS backend diaktifkan.");
  }
}

export function isHrPresensiMenuKey(menuKey: string) {
  return menuKey.startsWith("hr-presensi-");
}
