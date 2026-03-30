import { supabase } from "@/lib/supabase";
import type { HrPresensiResolvedAccess } from "@/services/hrPresensiAccessService";

export type HrPresensiTimeOffDomain = "cuti_reguler" | "cuti_khusus" | "izin" | "sakit";
export type HrPresensiTimeOffStatus =
  | "diajukan"
  | "menunggu_persetujuan_atasan"
  | "perlu_klarifikasi"
  | "disetujui"
  | "ditolak"
  | "menunggu_dokumen_fisik"
  | "dokumen_fisik_diterima_hr"
  | "perlu_verifikasi_hr";

export type HrPresensiTimeOffRow = {
  id: string;
  employee_id: number;
  request_domain: HrPresensiTimeOffDomain;
  leave_policy_id: string | null;
  special_leave_type_id: string | null;
  permission_type_id: string | null;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_slot: "pagi" | "siang" | null;
  requested_days: number;
  approved_days: number | null;
  deducted_leave_days: number;
  reason: string;
  additional_note: string | null;
  attachment_required: boolean;
  attachment_note: string | null;
  has_digital_document: boolean;
  requires_physical_document: boolean;
  physical_document_received_at: string | null;
  status: HrPresensiTimeOffStatus;
  reviewer_employee_id: number | null;
  reviewer_role: "atasan" | "hr";
  reviewer_note: string | null;
  hr_reviewer_employee_id: number | null;
  hr_note: string | null;
  fallback_to_hr: boolean;
  fallback_reason: string | null;
  reference_number: string;
  submitted_at: string;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  reviewer_name: string | null;
  hr_reviewer_name: string | null;
  domain_label: string;
  type_label: string;
};

export type HrPresensiTimeOffLogRow = {
  id: string;
  time_off_request_id: string;
  action_type:
    | "create_request"
    | "fallback_reviewer"
    | "request_clarification"
    | "reject_request"
    | "approve_request"
    | "receive_physical_document"
    | "verify_sick_document"
    | "apply_status";
  actor_employee_id: number | null;
  actor_role: string;
  note: string | null;
  before_payload: Record<string, unknown>;
  after_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  actor_name: string | null;
};

export type HrPresensiLeaveBalanceContext = {
  leave_policy_id: string;
  policy_name: string;
  annual_quota_days: number;
  used_days: number;
  available_days: number;
};

export type HrPresensiSpecialLeaveOption = {
  id: string;
  code: string;
  name: string;
  requires_attachment: boolean;
};

export type HrPresensiPermissionOption = {
  id: string;
  code: string;
  name: string;
  category: string;
  requires_attachment: boolean;
};

export type HrPresensiTimeOffSubmitPayload = {
  request_domain: HrPresensiTimeOffDomain;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_slot: "pagi" | "siang" | "";
  special_leave_type_id: string;
  permission_type_id: string;
  reason: string;
  additional_note: string;
  attachment_note: string;
  has_digital_document: boolean;
};

type TimeOffBaseRow = Omit<
  HrPresensiTimeOffRow,
  "employee_name" | "employee_code" | "reviewer_name" | "hr_reviewer_name" | "domain_label" | "type_label"
>;

function isMissingTimeOffInfra(error: unknown) {
  const code = typeof error === "object" && error !== null ? String((error as { code?: string }).code || "") : "";
  const message = typeof error === "object" && error !== null ? String((error as { message?: string }).message || "") : "";
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "42703" ||
    message.includes("hr_time_off_requests") ||
    message.includes("hr_time_off_request_logs") ||
    message.includes("hr_presensi_submit_time_off_request")
  );
}

function createTimeOffInfraError() {
  return new Error("Workflow Cuti, Izin & Sakit belum tersedia di database. Jalankan migration Supabase fase 2.1 terlebih dulu.");
}

function assertTimeOffAccess(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || !access.employee || !access.role) {
    throw new Error("Session atau profil karyawan belum valid untuk membaca pengajuan ini.");
  }
}

function assertTimeOffSubmitAccess(access: HrPresensiResolvedAccess) {
  assertTimeOffAccess(access);
  if (access.role !== "karyawan") {
    throw new Error("Pengajuan Cuti, Izin & Sakit di fase ini dibuka untuk mode Karyawan.");
  }
}

function assertTimeOffReviewAccess(access: HrPresensiResolvedAccess) {
  assertTimeOffAccess(access);
  if (!["atasan", "hr"].includes(access.role)) {
    throw new Error("Review pengajuan ini di fase 2.1 hanya tersedia untuk Atasan atau HR fallback.");
  }
}

function assertHrSickAdminAccess(access: HrPresensiResolvedAccess) {
  assertTimeOffAccess(access);
  if (access.role !== "hr") {
    throw new Error("Aksi administrasi sakit di fase ini hanya tersedia untuk HR.");
  }
}

function assertScopedTimeOffAccess(access: HrPresensiResolvedAccess, row: { employee_id: number }) {
  assertTimeOffAccess(access);

  if (access.scope.kind === "all") return;
  if (access.scope.kind === "team" && access.scope.allowedEmployeeIds.includes(row.employee_id)) return;
  if (access.scope.kind === "self" && access.scope.employeeId === row.employee_id) return;

  throw new Error("Data pengajuan ini berada di luar scope role Anda.");
}

function formatDomainLabel(value: HrPresensiTimeOffDomain) {
  return {
    cuti_reguler: "Cuti Reguler",
    cuti_khusus: "Cuti Khusus",
    izin: "Izin",
    sakit: "Sakit",
  }[value];
}

async function getMasterMaps(rows: TimeOffBaseRow[]) {
  const specialLeaveTypeIds = [...new Set(rows.map((item) => item.special_leave_type_id).filter(Boolean))];
  const permissionTypeIds = [...new Set(rows.map((item) => item.permission_type_id).filter(Boolean))];

  const [specialLeaveResult, permissionResult] = await Promise.all([
    specialLeaveTypeIds.length
      ? supabase.from("hr_special_leave_types").select("id, name").in("id", specialLeaveTypeIds)
      : Promise.resolve({ data: [], error: null }),
    permissionTypeIds.length
      ? supabase.from("hr_permission_types").select("id, name").in("id", permissionTypeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (specialLeaveResult.error) throw specialLeaveResult.error;
  if (permissionResult.error) throw permissionResult.error;

  return {
    specialLeaveMap: new Map((specialLeaveResult.data ?? []).map((item) => [item.id, item.name])),
    permissionTypeMap: new Map((permissionResult.data ?? []).map((item) => [item.id, item.name])),
  };
}

async function enrichTimeOffRows(rows: TimeOffBaseRow[]) {
  const employeeIds = [
    ...new Set(
      rows.flatMap((item) => [item.employee_id, item.reviewer_employee_id, item.hr_reviewer_employee_id]).filter(Boolean),
    ),
  ];

  const [employeeResult, masterMaps] = await Promise.all([
    employeeIds.length
      ? supabase.from("employees").select("id, employee_id, nama_lengkap").in("id", employeeIds)
      : Promise.resolve({ data: [], error: null }),
    getMasterMaps(rows),
  ]);

  if (employeeResult.error) throw employeeResult.error;

  const employeeMap = new Map((employeeResult.data ?? []).map((item) => [item.id, item]));

  return rows.map((item) => ({
    ...item,
    employee_name: employeeMap.get(item.employee_id)?.nama_lengkap || `Employee #${item.employee_id}`,
    employee_code: employeeMap.get(item.employee_id)?.employee_id || "-",
    reviewer_name: item.reviewer_employee_id ? employeeMap.get(item.reviewer_employee_id)?.nama_lengkap || null : null,
    hr_reviewer_name: item.hr_reviewer_employee_id ? employeeMap.get(item.hr_reviewer_employee_id)?.nama_lengkap || null : null,
    domain_label: formatDomainLabel(item.request_domain),
    type_label:
      item.request_domain === "cuti_reguler"
        ? "Cuti Reguler"
        : item.request_domain === "cuti_khusus"
          ? masterMaps.specialLeaveMap.get(item.special_leave_type_id || "") || "Cuti Khusus"
          : masterMaps.permissionTypeMap.get(item.permission_type_id || "") || formatDomainLabel(item.request_domain),
  })) as HrPresensiTimeOffRow[];
}

export async function getHrPresensiLeaveBalanceContext(access: HrPresensiResolvedAccess, referenceDate: string) {
  assertTimeOffAccess(access);

  const { data, error } = await supabase.rpc("hr_presensi_get_leave_balance_context", {
    p_employee_id: access.employee.id,
    p_reference_date: referenceDate,
    p_exclude_request_id: null,
  });

  if (error) {
    console.error("Supabase gagal membaca saldo cuti live:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as HrPresensiLeaveBalanceContext;
}

export async function getHrPresensiSpecialLeaveOptions() {
  const { data, error } = await supabase
    .from("hr_special_leave_types")
    .select("id, code, name, requires_attachment")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HrPresensiSpecialLeaveOption[];
}

export async function getHrPresensiPermissionOptions() {
  const { data, error } = await supabase
    .from("hr_permission_types")
    .select("id, code, name, category, requires_attachment")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HrPresensiPermissionOption[];
}

export async function getHrPresensiTimeOffRequests(access: HrPresensiResolvedAccess, filters?: { status?: string; domain?: string }) {
  assertTimeOffAccess(access);

  let query = supabase.from("hr_time_off_requests").select("*").order("submitted_at", { ascending: false }).limit(80);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.domain && filters.domain !== "all") {
    query = query.eq("request_domain", filters.domain);
  }

  if (access.scope.kind === "team") {
    if (!access.scope.allowedEmployeeIds.length) return [] as HrPresensiTimeOffRow[];
    query = query.in("employee_id", access.scope.allowedEmployeeIds);
  } else if (access.scope.kind === "self" && access.scope.employeeId) {
    query = query.eq("employee_id", access.scope.employeeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase gagal memuat pengajuan cuti/izin/sakit:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  return enrichTimeOffRows((data ?? []) as TimeOffBaseRow[]);
}

export async function getHrPresensiTimeOffLogs(access: HrPresensiResolvedAccess, requestId: string) {
  assertTimeOffAccess(access);

  const { data, error } = await supabase
    .from("hr_time_off_request_logs")
    .select("*")
    .eq("time_off_request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase gagal memuat audit trail pengajuan:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const rows = (data ?? []) as HrPresensiTimeOffLogRow[];
  const actorIds = [...new Set(rows.map((item) => item.actor_employee_id).filter(Boolean))];
  const { data: employeeRows, error: employeeError } = actorIds.length
    ? await supabase.from("employees").select("id, nama_lengkap").in("id", actorIds)
    : { data: [], error: null };

  if (employeeError) throw employeeError;

  const actorMap = new Map((employeeRows ?? []).map((item) => [item.id, item.nama_lengkap]));
  return rows.map((item) => ({ ...item, actor_name: item.actor_employee_id ? actorMap.get(item.actor_employee_id) || null : null }));
}

export async function submitHrPresensiTimeOffRequest(access: HrPresensiResolvedAccess, payload: HrPresensiTimeOffSubmitPayload) {
  assertTimeOffSubmitAccess(access);

  const { data, error } = await supabase.rpc("hr_presensi_submit_time_off_request", {
    p_employee_id: access.employee.id,
    p_request_domain: payload.request_domain,
    p_start_date: payload.start_date,
    p_end_date: payload.end_date,
    p_is_half_day: payload.is_half_day,
    p_half_day_slot: payload.half_day_slot || null,
    p_special_leave_type_id: payload.special_leave_type_id || null,
    p_permission_type_id: payload.permission_type_id || null,
    p_reason: payload.reason,
    p_additional_note: payload.additional_note || null,
    p_attachment_note: payload.attachment_note || null,
    p_has_digital_document: payload.has_digital_document,
  });

  if (error) {
    console.error("Supabase gagal submit pengajuan:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function requestClarificationHrPresensiTimeOff(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertTimeOffReviewAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_request_time_off_clarification", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal meminta klarifikasi pengajuan:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function rejectHrPresensiTimeOff(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertTimeOffReviewAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_reject_time_off_request", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal menolak pengajuan:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function approveHrPresensiTimeOff(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertTimeOffReviewAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_approve_time_off_request", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note || null,
  });

  if (error) {
    console.error("Supabase gagal menyetujui pengajuan:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function receiveSickPhysicalDocument(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertHrSickAdminAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_receive_sick_physical_document", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note || null,
  });

  if (error) {
    console.error("Supabase gagal mencatat dokumen fisik sakit:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function markSickNeedsVerification(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertHrSickAdminAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_mark_sick_needs_verification", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note,
  });

  if (error) {
    console.error("Supabase gagal menandai verifikasi sakit:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}

export async function finalizeSickAdministration(access: HrPresensiResolvedAccess, request: HrPresensiTimeOffRow, note: string) {
  assertHrSickAdminAccess(access);
  assertScopedTimeOffAccess(access, request);

  const { data, error } = await supabase.rpc("hr_presensi_finalize_sick_administration", {
    p_time_off_request_id: request.id,
    p_actor_employee_id: access.employee.id,
    p_note: note || null,
  });

  if (error) {
    console.error("Supabase gagal menyelesaikan administrasi sakit:", error);
    if (isMissingTimeOffInfra(error)) throw createTimeOffInfraError();
    throw error;
  }

  const [row] = await enrichTimeOffRows([data as TimeOffBaseRow]);
  return row;
}
