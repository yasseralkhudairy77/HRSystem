import { supabase } from "@/lib/supabase";

const TABLES = {
  locations: "hr_attendance_locations",
  shifts: "hr_attendance_shifts",
  scheduleGroups: "hr_attendance_schedule_groups",
  methods: "hr_attendance_methods",
  shiftAssignments: "hr_shift_assignments",
  methodAssignments: "hr_attendance_method_assignments",
  changeLogs: "hr_setting_change_logs",
} as const;

export type HrLocationRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  address: string | null;
  timezone: string;
  attendance_radius_meters: number;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrShiftRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scheduled_checkin: string;
  scheduled_checkout: string;
  break_start: string | null;
  break_end: string | null;
  grace_minutes: number;
  cross_day: boolean;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrScheduleGroupRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_location_id: string | null;
  default_shift_id: string | null;
  work_pattern: unknown;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrAttendanceMethodRecord = {
  id: string;
  code: string;
  name: string;
  method_type: string;
  description: string | null;
  requires_location_validation: boolean;
  requires_biometric_verification: boolean;
  fallback_method_code: string | null;
  is_primary_method: boolean;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrShiftAssignmentRecord = {
  id: string;
  employee_id: number;
  schedule_group_id: string | null;
  shift_id: string | null;
  location_id: string | null;
  notes: string | null;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrAttendanceMethodAssignmentRecord = {
  id: string;
  employee_id: number;
  attendance_method_id: string;
  location_id: string | null;
  assignment_scope: string;
  notes: string | null;
  is_active: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type HrSettingChangeLogRecord = {
  id: string;
  module_code: string;
  domain_name: string;
  record_id: string | null;
  action_type: string;
  change_summary: string;
  before_payload: Record<string, unknown>;
  after_payload: Record<string, unknown>;
  effective_start_date: string | null;
  effective_end_date: string | null;
  changed_by_employee_id: number | null;
  created_at: string;
  updated_at: string;
};

type MutationAuditInput = {
  domainName: string;
  recordId: string;
  actionType: "create" | "update" | "archive";
  summary: string;
  beforePayload?: Record<string, unknown>;
  afterPayload?: Record<string, unknown>;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
};

function isMissingTable(error: unknown, tableName: string) {
  const code = typeof error === "object" && error !== null ? String((error as { code?: string }).code || "") : "";
  const message = typeof error === "object" && error !== null ? String((error as { message?: string }).message || "") : "";
  return code === "42P01" || message.toLowerCase().includes(tableName.toLowerCase());
}

function createMissingTableError(tableName: string, label: string) {
  return new Error(`Tabel ${label} belum tersedia di database. Jalankan migration Supabase untuk \`${tableName}\` terlebih dulu.`);
}

function validateEffectiveDates(startDate: string, endDate?: string | null) {
  if (!startDate) {
    throw new Error("Tanggal efektif mulai wajib diisi.");
  }

  if (endDate && endDate < startDate) {
    throw new Error("Tanggal efektif selesai tidak boleh lebih kecil dari tanggal efektif mulai.");
  }
}

async function insertSettingChangeLog(input: MutationAuditInput) {
  const payload = {
    module_code: "hr_presensi",
    domain_name: input.domainName,
    record_id: input.recordId,
    action_type: input.actionType,
    change_summary: input.summary,
    before_payload: input.beforePayload || {},
    after_payload: input.afterPayload || {},
    effective_start_date: input.effectiveStartDate || null,
    effective_end_date: input.effectiveEndDate || null,
  };

  const { error } = await supabase.from(TABLES.changeLogs).insert(payload);
  if (error) {
    console.error("Supabase gagal menulis log perubahan setting HR Presensi:", error);
    if (isMissingTable(error, TABLES.changeLogs)) throw createMissingTableError(TABLES.changeLogs, "riwayat perubahan setting HR Presensi");
    throw error;
  }
}

function normalizeWorkPattern(input: string) {
  if (!input.trim()) return [];

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error("Format pola kerja harus berupa JSON yang valid.");
  }
}

export async function getHrLocations() {
  const { data, error } = await supabase.from(TABLES.locations).select("*").order("is_active", { ascending: false }).order("name", { ascending: true });
  if (error) {
    console.error("Supabase gagal load lokasi kantor HR Presensi:", error);
    if (isMissingTable(error, TABLES.locations)) throw createMissingTableError(TABLES.locations, "lokasi kantor HR Presensi");
    throw error;
  }
  return (data ?? []) as HrLocationRecord[];
}

export async function createHrLocation(payload: Omit<HrLocationRecord, "id" | "created_at" | "updated_at">) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const { data, error } = await supabase.from(TABLES.locations).insert(payload).select("*").single();
  if (error) {
    console.error("Supabase gagal create lokasi kantor HR Presensi:", error);
    if (isMissingTable(error, TABLES.locations)) throw createMissingTableError(TABLES.locations, "lokasi kantor HR Presensi");
    throw error;
  }
  await insertSettingChangeLog({
    domainName: "locations",
    recordId: data.id,
    actionType: "create",
    summary: `Lokasi kantor ${data.name} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrLocationRecord;
}

export async function updateHrLocation(id: string, payload: Partial<Omit<HrLocationRecord, "id" | "created_at" | "updated_at">>) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.locations).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const { data, error } = await supabase.from(TABLES.locations).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "locations",
    recordId: id,
    actionType: "update",
    summary: `Lokasi kantor ${data.name} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrLocationRecord;
}

export async function archiveHrLocation(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.locations).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.locations).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "locations",
    recordId: id,
    actionType: "archive",
    summary: `Lokasi kantor ${data.name} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrLocationRecord;
}

export async function getHrShifts() {
  const { data, error } = await supabase.from(TABLES.shifts).select("*").order("is_active", { ascending: false }).order("name", { ascending: true });
  if (error) {
    if (isMissingTable(error, TABLES.shifts)) throw createMissingTableError(TABLES.shifts, "shift HR Presensi");
    throw error;
  }
  return (data ?? []) as HrShiftRecord[];
}

export async function createHrShift(payload: Omit<HrShiftRecord, "id" | "created_at" | "updated_at">) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const { data, error } = await supabase.from(TABLES.shifts).insert(payload).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shifts",
    recordId: data.id,
    actionType: "create",
    summary: `Shift ${data.name} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftRecord;
}

export async function updateHrShift(id: string, payload: Partial<Omit<HrShiftRecord, "id" | "created_at" | "updated_at">>) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.shifts).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const { data, error } = await supabase.from(TABLES.shifts).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shifts",
    recordId: id,
    actionType: "update",
    summary: `Shift ${data.name} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftRecord;
}

export async function archiveHrShift(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.shifts).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.shifts).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shifts",
    recordId: id,
    actionType: "archive",
    summary: `Shift ${data.name} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftRecord;
}

export async function getHrScheduleGroups() {
  const { data, error } = await supabase.from(TABLES.scheduleGroups).select("*").order("is_active", { ascending: false }).order("name", { ascending: true });
  if (error) {
    if (isMissingTable(error, TABLES.scheduleGroups)) throw createMissingTableError(TABLES.scheduleGroups, "grup jadwal HR Presensi");
    throw error;
  }
  return (data ?? []) as HrScheduleGroupRecord[];
}

export async function createHrScheduleGroup(payload: Omit<HrScheduleGroupRecord, "id" | "created_at" | "updated_at" | "work_pattern"> & { work_pattern_text: string }) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const insertPayload = { ...payload, work_pattern: normalizeWorkPattern(payload.work_pattern_text) };
  delete (insertPayload as { work_pattern_text?: string }).work_pattern_text;
  const { data, error } = await supabase.from(TABLES.scheduleGroups).insert(insertPayload).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "schedule_groups",
    recordId: data.id,
    actionType: "create",
    summary: `Grup jadwal ${data.name} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrScheduleGroupRecord;
}

export async function updateHrScheduleGroup(id: string, payload: Partial<Omit<HrScheduleGroupRecord, "id" | "created_at" | "updated_at" | "work_pattern">> & { work_pattern_text?: string }) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.scheduleGroups).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const updatePayload = { ...payload } as Record<string, unknown>;
  if (typeof payload.work_pattern_text === "string") {
    updatePayload.work_pattern = normalizeWorkPattern(payload.work_pattern_text);
  }
  delete updatePayload.work_pattern_text;
  const { data, error } = await supabase.from(TABLES.scheduleGroups).update(updatePayload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "schedule_groups",
    recordId: id,
    actionType: "update",
    summary: `Grup jadwal ${data.name} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrScheduleGroupRecord;
}

export async function archiveHrScheduleGroup(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.scheduleGroups).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.scheduleGroups).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "schedule_groups",
    recordId: id,
    actionType: "archive",
    summary: `Grup jadwal ${data.name} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrScheduleGroupRecord;
}

export async function getHrShiftAssignments() {
  const { data, error } = await supabase.from(TABLES.shiftAssignments).select("*").order("is_active", { ascending: false }).order("effective_start_date", { ascending: false });
  if (error) {
    if (isMissingTable(error, TABLES.shiftAssignments)) throw createMissingTableError(TABLES.shiftAssignments, "assignment shift HR Presensi");
    throw error;
  }
  return (data ?? []) as HrShiftAssignmentRecord[];
}

export async function createHrShiftAssignment(payload: Omit<HrShiftAssignmentRecord, "id" | "created_at" | "updated_at">) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const { data, error } = await supabase.from(TABLES.shiftAssignments).insert(payload).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shift_assignments",
    recordId: data.id,
    actionType: "create",
    summary: `Assignment shift karyawan ${data.employee_id} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftAssignmentRecord;
}

export async function updateHrShiftAssignment(id: string, payload: Partial<Omit<HrShiftAssignmentRecord, "id" | "created_at" | "updated_at">>) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.shiftAssignments).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const { data, error } = await supabase.from(TABLES.shiftAssignments).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shift_assignments",
    recordId: id,
    actionType: "update",
    summary: `Assignment shift karyawan ${data.employee_id} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftAssignmentRecord;
}

export async function archiveHrShiftAssignment(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.shiftAssignments).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.shiftAssignments).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "shift_assignments",
    recordId: id,
    actionType: "archive",
    summary: `Assignment shift karyawan ${data.employee_id} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrShiftAssignmentRecord;
}

export async function getHrAttendanceMethods() {
  const { data, error } = await supabase.from(TABLES.methods).select("*").order("is_active", { ascending: false }).order("name", { ascending: true });
  if (error) {
    if (isMissingTable(error, TABLES.methods)) throw createMissingTableError(TABLES.methods, "metode absensi HR Presensi");
    throw error;
  }
  return (data ?? []) as HrAttendanceMethodRecord[];
}

export async function createHrAttendanceMethod(payload: Omit<HrAttendanceMethodRecord, "id" | "created_at" | "updated_at">) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const { data, error } = await supabase.from(TABLES.methods).insert(payload).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_methods",
    recordId: data.id,
    actionType: "create",
    summary: `Metode absensi ${data.name} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodRecord;
}

export async function updateHrAttendanceMethod(id: string, payload: Partial<Omit<HrAttendanceMethodRecord, "id" | "created_at" | "updated_at">>) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.methods).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const { data, error } = await supabase.from(TABLES.methods).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_methods",
    recordId: id,
    actionType: "update",
    summary: `Metode absensi ${data.name} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodRecord;
}

export async function archiveHrAttendanceMethod(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.methods).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.methods).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_methods",
    recordId: id,
    actionType: "archive",
    summary: `Metode absensi ${data.name} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodRecord;
}

export async function getHrAttendanceMethodAssignments() {
  const { data, error } = await supabase.from(TABLES.methodAssignments).select("*").order("is_active", { ascending: false }).order("effective_start_date", { ascending: false });
  if (error) {
    if (isMissingTable(error, TABLES.methodAssignments)) throw createMissingTableError(TABLES.methodAssignments, "assignment metode absensi HR Presensi");
    throw error;
  }
  return (data ?? []) as HrAttendanceMethodAssignmentRecord[];
}

export async function createHrAttendanceMethodAssignment(payload: Omit<HrAttendanceMethodAssignmentRecord, "id" | "created_at" | "updated_at">) {
  validateEffectiveDates(payload.effective_start_date, payload.effective_end_date);
  const { data, error } = await supabase.from(TABLES.methodAssignments).insert(payload).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_method_assignments",
    recordId: data.id,
    actionType: "create",
    summary: `Assignment metode absensi untuk karyawan ${data.employee_id} dibuat.`,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodAssignmentRecord;
}

export async function updateHrAttendanceMethodAssignment(id: string, payload: Partial<Omit<HrAttendanceMethodAssignmentRecord, "id" | "created_at" | "updated_at">>) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.methodAssignments).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(payload.effective_start_date || beforeData.effective_start_date, payload.effective_end_date ?? beforeData.effective_end_date);
  const { data, error } = await supabase.from(TABLES.methodAssignments).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_method_assignments",
    recordId: id,
    actionType: "update",
    summary: `Assignment metode absensi untuk karyawan ${data.employee_id} diperbarui.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodAssignmentRecord;
}

export async function archiveHrAttendanceMethodAssignment(id: string, effectiveEndDate: string) {
  const { data: beforeData, error: beforeError } = await supabase.from(TABLES.methodAssignments).select("*").eq("id", id).single();
  if (beforeError) throw beforeError;
  validateEffectiveDates(beforeData.effective_start_date, effectiveEndDate);
  const { data, error } = await supabase.from(TABLES.methodAssignments).update({ is_active: false, effective_end_date: effectiveEndDate }).eq("id", id).select("*").single();
  if (error) throw error;
  await insertSettingChangeLog({
    domainName: "attendance_method_assignments",
    recordId: id,
    actionType: "archive",
    summary: `Assignment metode absensi untuk karyawan ${data.employee_id} dinonaktifkan.`,
    beforePayload: beforeData,
    afterPayload: data,
    effectiveStartDate: data.effective_start_date,
    effectiveEndDate: data.effective_end_date,
  });
  return data as HrAttendanceMethodAssignmentRecord;
}

export async function getHrPresensiChangeLogs(domainNames: string[]) {
  const { data, error } = await supabase.from(TABLES.changeLogs).select("*").in("domain_name", domainNames).order("created_at", { ascending: false }).limit(40);
  if (error) {
    if (isMissingTable(error, TABLES.changeLogs)) throw createMissingTableError(TABLES.changeLogs, "riwayat perubahan setting HR Presensi");
    throw error;
  }
  return (data ?? []) as HrSettingChangeLogRecord[];
}
