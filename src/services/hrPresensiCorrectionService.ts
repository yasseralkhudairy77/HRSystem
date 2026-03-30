import { supabase } from "@/lib/supabase";
import type { HrPresensiResolvedAccess } from "@/services/hrPresensiAccessService";

export type HrPresensiCorrectionType =
  | "lupa_masuk"
  | "lupa_pulang"
  | "salah_jam"
  | "kendala_lokasi_gps"
  | "kendala_teknis_device"
  | "lainnya";

export type HrPresensiCorrectionStatus =
  | "diajukan"
  | "menunggu_persetujuan_atasan"
  | "perlu_klarifikasi"
  | "disetujui"
  | "ditolak"
  | "eskalasi_ke_hr";

export type HrPresensiCorrectionRow = {
  id: string;
  employee_id: number;
  attendance_record_id: string | null;
  attendance_date: string;
  correction_type: HrPresensiCorrectionType;
  requested_checkin: string | null;
  requested_checkout: string | null;
  request_reason: string;
  status: HrPresensiCorrectionStatus;
  reviewer_employee_id: number | null;
  reviewer_role: "atasan" | "hr";
  reviewer_note: string | null;
  fallback_to_hr: boolean;
  fallback_reason: string | null;
  is_submitted_on_time: boolean;
  protects_from_alpha: boolean;
  submitted_at: string;
  decided_at: string | null;
  escalated_at: string | null;
  applied_at: string | null;
  applied_attendance_record_id: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  reviewer_name: string | null;
};

export type HrPresensiCorrectionLogRow = {
  id: string;
  correction_id: string;
  action_type:
    | "create_correction"
    | "fallback_reviewer"
    | "request_clarification"
    | "reject_correction"
    | "escalate_to_hr"
    | "approve_correction"
    | "apply_correction";
  actor_employee_id: number | null;
  actor_role: string;
  note: string | null;
  before_payload: Record<string, unknown>;
  after_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  actor_name: string | null;
};

export type HrPresensiCorrectionSubmitPayload = {
  attendance_date: string;
  correction_type: HrPresensiCorrectionType;
  requested_checkin: string | null;
  requested_checkout: string | null;
  request_reason: string;
};

function isMissingCorrectionInfra(error: unknown) {
  const code = typeof error === "object" && error !== null ? String((error as { code?: string }).code || "") : "";
  const message = typeof error === "object" && error !== null ? String((error as { message?: string }).message || "") : "";

  return (
    code === "42P01" ||
    code === "42883" ||
    code === "42703" ||
    message.includes("hr_attendance_corrections") ||
    message.includes("hr_attendance_correction_logs") ||
    message.includes("hr_presensi_submit_correction") ||
    message.includes("hr_presensi_approve_correction")
  );
}

function createCorrectionInfraError() {
  return new Error("Workflow Koreksi Absensi belum tersedia di database. Jalankan migration Supabase fase 1.9 terlebih dulu.");
}

function assertCorrectionAccess(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || !access.employee || !access.role) {
    throw new Error("Session atau profil karyawan belum valid untuk membaca Koreksi Absensi.");
  }
}

function assertCorrectionSubmitAccess(access: HrPresensiResolvedAccess) {
  assertCorrectionAccess(access);
  if (access.role !== "karyawan") {
    throw new Error("Pengajuan Koreksi Absensi di fase ini dibuka untuk mode Karyawan.");
  }
}

function assertCorrectionReviewAccess(access: HrPresensiResolvedAccess) {
  assertCorrectionAccess(access);
  if (access.role === "karyawan") {
    throw new Error("Aksi review Koreksi Absensi hanya tersedia untuk Atasan atau HR.");
  }
}

function assertScopedCorrectionAccess(access: HrPresensiResolvedAccess, correction: { employee_id: number }) {
  assertCorrectionAccess(access);

  if (access.scope.kind === "all") return;
  if (access.scope.kind === "team" && access.scope.allowedEmployeeIds.includes(correction.employee_id)) return;
  if (access.scope.kind === "self" && access.scope.employeeId === correction.employee_id) return;

  throw new Error("Data Koreksi Absensi ini berada di luar scope role Anda.");
}

async function enrichCorrections(rows: Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">[]) {
  const employeeIds = [...new Set(rows.flatMap((item) => [item.employee_id, item.reviewer_employee_id]).filter(Boolean))];
  const { data, error } = employeeIds.length
    ? await supabase.from("employees").select("id, employee_id, nama_lengkap").in("id", employeeIds)
    : { data: [], error: null };

  if (error) throw error;

  const employeeMap = new Map((data ?? []).map((item) => [item.id, item]));

  return rows.map((item) => ({
    ...item,
    employee_name: employeeMap.get(item.employee_id)?.nama_lengkap || `Employee #${item.employee_id}`,
    employee_code: employeeMap.get(item.employee_id)?.employee_id || "-",
    reviewer_name: item.reviewer_employee_id ? employeeMap.get(item.reviewer_employee_id)?.nama_lengkap || null : null,
  })) as HrPresensiCorrectionRow[];
}

export async function getHrPresensiCorrections(access: HrPresensiResolvedAccess) {
  assertCorrectionAccess(access);

  let query = supabase.from("hr_attendance_corrections").select("*").order("submitted_at", { ascending: false }).limit(80);

  if (access.scope.kind === "team") {
    if (!access.scope.allowedEmployeeIds.length) return [] as HrPresensiCorrectionRow[];
    query = query.in("employee_id", access.scope.allowedEmployeeIds);
  } else if (access.scope.kind === "self" && access.scope.employeeId) {
    query = query.eq("employee_id", access.scope.employeeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase gagal memuat Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  return enrichCorrections((data ?? []) as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">[]);
}

export async function getHrPresensiCorrectionLogs(access: HrPresensiResolvedAccess, correctionId: string) {
  assertCorrectionAccess(access);

  const { data, error } = await supabase
    .from("hr_attendance_correction_logs")
    .select("*")
    .eq("correction_id", correctionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal memuat log Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const rows = (data ?? []) as HrPresensiCorrectionLogRow[];
  const actorIds = [...new Set(rows.map((item) => item.actor_employee_id).filter(Boolean))];
  const { data: employeeRows, error: employeeError } = actorIds.length
    ? await supabase.from("employees").select("id, nama_lengkap").in("id", actorIds)
    : { data: [], error: null };

  if (employeeError) throw employeeError;

  const actorMap = new Map((employeeRows ?? []).map((item) => [item.id, item.nama_lengkap]));
  return rows.map((item) => ({ ...item, actor_name: item.actor_employee_id ? actorMap.get(item.actor_employee_id) || null : null }));
}

export async function submitHrPresensiCorrection(access: HrPresensiResolvedAccess, payload: HrPresensiCorrectionSubmitPayload) {
  assertCorrectionSubmitAccess(access);

  const { data, error } = await supabase.rpc("hr_presensi_submit_correction", {
    p_employee_id: access.employee.id,
    p_attendance_date: payload.attendance_date,
    p_correction_type: payload.correction_type,
    p_requested_checkin: payload.requested_checkin,
    p_requested_checkout: payload.requested_checkout,
    p_request_reason: payload.request_reason,
  });

  if (error) {
    console.error("Supabase gagal submit Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const [row] = await enrichCorrections([data as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">]);
  return row;
}

export async function requestClarificationHrPresensiCorrection(access: HrPresensiResolvedAccess, correction: HrPresensiCorrectionRow, note: string) {
  assertCorrectionReviewAccess(access);
  assertScopedCorrectionAccess(access, correction);

  const { data, error } = await supabase.rpc("hr_presensi_request_correction_clarification", {
    p_correction_id: correction.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal meminta klarifikasi Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const [row] = await enrichCorrections([data as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">]);
  return row;
}

export async function rejectHrPresensiCorrection(access: HrPresensiResolvedAccess, correction: HrPresensiCorrectionRow, note: string) {
  assertCorrectionReviewAccess(access);
  assertScopedCorrectionAccess(access, correction);

  const { data, error } = await supabase.rpc("hr_presensi_reject_correction", {
    p_correction_id: correction.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal menolak Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const [row] = await enrichCorrections([data as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">]);
  return row;
}

export async function escalateHrPresensiCorrection(access: HrPresensiResolvedAccess, correction: HrPresensiCorrectionRow, note: string) {
  assertCorrectionReviewAccess(access);
  assertScopedCorrectionAccess(access, correction);

  const { data, error } = await supabase.rpc("hr_presensi_escalate_correction_to_hr", {
    p_correction_id: correction.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal eskalasi Koreksi Absensi ke HR:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const [row] = await enrichCorrections([data as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">]);
  return row;
}

export async function approveHrPresensiCorrection(access: HrPresensiResolvedAccess, correction: HrPresensiCorrectionRow, note: string) {
  assertCorrectionReviewAccess(access);
  assertScopedCorrectionAccess(access, correction);

  const { data, error } = await supabase.rpc("hr_presensi_approve_correction", {
    p_correction_id: correction.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal menyetujui Koreksi Absensi:", error);
    if (isMissingCorrectionInfra(error)) throw createCorrectionInfraError();
    throw error;
  }

  const [row] = await enrichCorrections([data as Omit<HrPresensiCorrectionRow, "employee_name" | "employee_code" | "reviewer_name">]);
  return row;
}
