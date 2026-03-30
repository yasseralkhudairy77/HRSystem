import { supabase } from "@/lib/supabase";
import type { HrPresensiResolvedAccess } from "@/services/hrPresensiAccessService";

export type HrPresensiOvertimeStatus =
  | "diajukan"
  | "menunggu_persetujuan_atasan"
  | "perlu_klarifikasi"
  | "disetujui"
  | "ditolak"
  | "siap_ke_payroll";

export type HrPresensiOvertimeRow = {
  id: string;
  employee_id: number;
  attendance_record_id: string | null;
  overtime_date: string;
  proposed_start_at: string;
  proposed_end_at: string;
  proposed_hours: number;
  approved_start_at: string | null;
  approved_end_at: string | null;
  approved_hours: number | null;
  reason: string;
  additional_note: string | null;
  status: HrPresensiOvertimeStatus;
  reviewer_employee_id: number | null;
  reviewer_role: "atasan" | "hr";
  reviewer_note: string | null;
  fallback_to_hr: boolean;
  fallback_reason: string | null;
  is_submitted_on_time: boolean;
  reference_number: string;
  submitted_at: string;
  decided_at: string | null;
  payroll_ready_at: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  reviewer_name: string | null;
};

export type HrPresensiOvertimeLogRow = {
  id: string;
  overtime_request_id: string;
  action_type:
    | "create_overtime"
    | "fallback_reviewer"
    | "request_clarification"
    | "reject_overtime"
    | "approve_overtime"
    | "apply_approved_hours";
  actor_employee_id: number | null;
  actor_role: string;
  note: string | null;
  before_payload: Record<string, unknown>;
  after_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  actor_name: string | null;
};

export type HrPresensiOvertimeSubmitPayload = {
  overtime_date: string;
  proposed_start_at: string;
  proposed_end_at: string;
  reason: string;
  additional_note: string;
};

export type HrPresensiOvertimeApprovePayload = {
  approved_start_at: string;
  approved_end_at: string;
  note: string;
};

type OvertimeRowBase = Omit<HrPresensiOvertimeRow, "employee_name" | "employee_code" | "reviewer_name">;

function isMissingOvertimeInfra(error: unknown) {
  const code = typeof error === "object" && error !== null ? String((error as { code?: string }).code || "") : "";
  const message = typeof error === "object" && error !== null ? String((error as { message?: string }).message || "") : "";

  return (
    code === "42P01" ||
    code === "42883" ||
    code === "42703" ||
    message.includes("hr_overtime_requests") ||
    message.includes("hr_overtime_request_logs") ||
    message.includes("hr_presensi_submit_overtime_request")
  );
}

function createOvertimeInfraError() {
  return new Error("Workflow Lembur Dasar belum tersedia di database. Jalankan migration Supabase fase 2.0 terlebih dulu.");
}

function assertOvertimeAccess(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || !access.employee || !access.role) {
    throw new Error("Session atau profil karyawan belum valid untuk membaca data lembur.");
  }
}

function assertOvertimeSubmitAccess(access: HrPresensiResolvedAccess) {
  assertOvertimeAccess(access);
  if (access.role !== "karyawan") {
    throw new Error("Pengajuan lembur di fase ini dibuka untuk mode Karyawan.");
  }
}

function assertOvertimeReviewAccess(access: HrPresensiResolvedAccess) {
  assertOvertimeAccess(access);
  if (access.role !== "atasan") {
    throw new Error("Review lembur dasar di fase ini hanya tersedia untuk Atasan.");
  }
}

function assertScopedOvertimeAccess(access: HrPresensiResolvedAccess, request: { employee_id: number }) {
  assertOvertimeAccess(access);

  if (access.scope.kind === "all") return;
  if (access.scope.kind === "team" && access.scope.allowedEmployeeIds.includes(request.employee_id)) return;
  if (access.scope.kind === "self" && access.scope.employeeId === request.employee_id) return;

  throw new Error("Data lembur ini berada di luar scope role Anda.");
}

async function enrichOvertimeRows(rows: OvertimeRowBase[]) {
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
  })) as HrPresensiOvertimeRow[];
}

export async function getHrPresensiOvertimeRequests(access: HrPresensiResolvedAccess, statusFilter = "all") {
  assertOvertimeAccess(access);

  let query = supabase.from("hr_overtime_requests").select("*").order("submitted_at", { ascending: false }).limit(80);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (access.scope.kind === "team") {
    if (!access.scope.allowedEmployeeIds.length) return [] as HrPresensiOvertimeRow[];
    query = query.in("employee_id", access.scope.allowedEmployeeIds);
  } else if (access.scope.kind === "self" && access.scope.employeeId) {
    query = query.eq("employee_id", access.scope.employeeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase gagal memuat data lembur HR Presensi:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  return enrichOvertimeRows((data ?? []) as OvertimeRowBase[]);
}

export async function getHrPresensiOvertimeLogs(access: HrPresensiResolvedAccess, requestId: string) {
  assertOvertimeAccess(access);

  const { data, error } = await supabase
    .from("hr_overtime_request_logs")
    .select("*")
    .eq("overtime_request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal memuat audit trail lembur:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  const rows = (data ?? []) as HrPresensiOvertimeLogRow[];
  const actorIds = [...new Set(rows.map((item) => item.actor_employee_id).filter(Boolean))];
  const { data: employeeRows, error: employeeError } = actorIds.length
    ? await supabase.from("employees").select("id, nama_lengkap").in("id", actorIds)
    : { data: [], error: null };

  if (employeeError) throw employeeError;

  const actorMap = new Map((employeeRows ?? []).map((item) => [item.id, item.nama_lengkap]));
  return rows.map((item) => ({ ...item, actor_name: item.actor_employee_id ? actorMap.get(item.actor_employee_id) || null : null }));
}

export async function submitHrPresensiOvertimeRequest(access: HrPresensiResolvedAccess, payload: HrPresensiOvertimeSubmitPayload) {
  assertOvertimeSubmitAccess(access);

  const { data, error } = await supabase.rpc("hr_presensi_submit_overtime_request", {
    p_employee_id: access.employee.id,
    p_overtime_date: payload.overtime_date,
    p_start_at: payload.proposed_start_at,
    p_end_at: payload.proposed_end_at,
    p_reason: payload.reason,
    p_additional_note: payload.additional_note || null,
  });

  if (error) {
    console.error("Supabase gagal submit lembur dasar:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  const [row] = await enrichOvertimeRows([data as OvertimeRowBase]);
  return row;
}

export async function requestClarificationHrPresensiOvertime(access: HrPresensiResolvedAccess, request: HrPresensiOvertimeRow, note: string) {
  assertOvertimeReviewAccess(access);
  assertScopedOvertimeAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_request_overtime_clarification", {
    p_overtime_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal meminta klarifikasi lembur:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  const [row] = await enrichOvertimeRows([data as OvertimeRowBase]);
  return row;
}

export async function rejectHrPresensiOvertime(access: HrPresensiResolvedAccess, request: HrPresensiOvertimeRow, note: string) {
  assertOvertimeReviewAccess(access);
  assertScopedOvertimeAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_reject_overtime_request", {
    p_overtime_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal menolak pengajuan lembur:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  const [row] = await enrichOvertimeRows([data as OvertimeRowBase]);
  return row;
}

export async function approveHrPresensiOvertime(access: HrPresensiResolvedAccess, request: HrPresensiOvertimeRow, payload: HrPresensiOvertimeApprovePayload) {
  assertOvertimeReviewAccess(access);
  assertScopedOvertimeAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_approve_overtime_request", {
    p_overtime_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_approved_start_at: payload.approved_start_at,
    p_approved_end_at: payload.approved_end_at,
    p_note: payload.note || null,
  });

  if (error) {
    console.error("Supabase gagal menyetujui lembur:", error);
    if (isMissingOvertimeInfra(error)) throw createOvertimeInfraError();
    throw error;
  }

  const [row] = await enrichOvertimeRows([data as OvertimeRowBase]);
  return row;
}
