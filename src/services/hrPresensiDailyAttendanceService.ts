import { supabase } from "@/lib/supabase";
import type { HrPresensiResolvedAccess } from "@/services/hrPresensiAccessService";

export type HrPresensiDailyAttendanceStatus = "hadir" | "telat" | "belum_pulang";
export type HrPresensiLocationStatus = "dalam_area" | "di_luar_area" | "akurasi_lemah";

export type HrPresensiGeoPayload = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export type HrPresensiLocationValidation = {
  location_id: string;
  location_name: string;
  attendance_radius_meters: number;
  distance_meters: number;
  location_status: HrPresensiLocationStatus;
};

export type HrPresensiDailyAttendanceRow = {
  id: string;
  employee_id: number;
  attendance_date: string;
  shift_id: string | null;
  location_id: string | null;
  scheduled_checkin: string | null;
  scheduled_checkout: string | null;
  actual_checkin: string | null;
  actual_checkout: string | null;
  status_main: "hadir" | "terlambat";
  late_minutes: number;
  attendance_source: string;
  server_checkin_at: string | null;
  server_checkout_at: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkin_accuracy_meters: number | null;
  checkin_distance_meters: number | null;
  checkin_location_status: HrPresensiLocationStatus | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  checkout_accuracy_meters: number | null;
  checkout_distance_meters: number | null;
  checkout_location_status: HrPresensiLocationStatus | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  employee_title: string;
  shift_name: string | null;
  location_name: string | null;
  daily_status: HrPresensiDailyAttendanceStatus;
};

type AttendanceRecordRow = {
  id: string;
  employee_id: number;
  attendance_date: string;
  shift_id: string | null;
  location_id: string | null;
  scheduled_checkin: string | null;
  scheduled_checkout: string | null;
  actual_checkin: string | null;
  actual_checkout: string | null;
  status_main: "hadir" | "terlambat";
  late_minutes: number;
  attendance_source: string;
  server_checkin_at: string | null;
  server_checkout_at: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkin_accuracy_meters: number | null;
  checkin_distance_meters: number | null;
  checkin_location_status: HrPresensiLocationStatus | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  checkout_accuracy_meters: number | null;
  checkout_distance_meters: number | null;
  checkout_location_status: HrPresensiLocationStatus | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingAttendanceInfra(error: unknown) {
  const code = typeof error === "object" && error !== null ? String((error as { code?: string }).code || "") : "";
  const message = typeof error === "object" && error !== null ? String((error as { message?: string }).message || "") : "";
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "42703" ||
    message.includes("hr_attendance_daily_records") ||
    message.includes("hr_presensi_clock_") ||
    message.includes("hr_presensi_validate_location") ||
    message.includes("checkin_latitude") ||
    message.includes("latitude")
  );
}

function createAttendanceInfraError() {
  return new Error("Transaksi Absensi Harian dengan validasi lokasi belum tersedia di database. Jalankan migration Supabase fase 1.8.1 terlebih dulu.");
}

function assertAttendanceAccess(access: HrPresensiResolvedAccess) {
  if (access.status !== "ready" || !access.employee || !access.role) {
    throw new Error("Session atau profil karyawan belum valid untuk membaca Absensi Harian.");
  }
}

function assertEmployeeActionAccess(access: HrPresensiResolvedAccess) {
  assertAttendanceAccess(access);
  if (access.role !== "karyawan") {
    throw new Error("Check in dan check out live dasar di fase ini hanya dibuka untuk mode Karyawan.");
  }
}

function validateGeoPayload(payload: HrPresensiGeoPayload) {
  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    throw new Error("Latitude dan longitude transaksi tidak valid.");
  }

  if (!Number.isFinite(payload.accuracy) || payload.accuracy <= 0) {
    throw new Error("Akurasi GPS belum valid untuk transaksi absensi.");
  }
}

function deriveDailyStatus(record: AttendanceRecordRow): HrPresensiDailyAttendanceStatus {
  if (record.actual_checkin && !record.actual_checkout) return "belum_pulang";
  if (record.status_main === "terlambat" || record.late_minutes > 0) return "telat";
  return "hadir";
}

async function getScopedAttendanceRows(access: HrPresensiResolvedAccess) {
  assertAttendanceAccess(access);

  let query = supabase.from("hr_attendance_daily_records").select("*").order("attendance_date", { ascending: false }).order("actual_checkin", { ascending: false }).limit(60);

  if (access.scope.kind === "team") {
    if (!access.scope.allowedEmployeeIds.length) {
      return [] as AttendanceRecordRow[];
    }
    query = query.in("employee_id", access.scope.allowedEmployeeIds);
  } else if (access.scope.kind === "self" && access.scope.employeeId) {
    query = query.eq("employee_id", access.scope.employeeId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase gagal memuat Absensi Harian HR Presensi:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }

  return (data ?? []) as AttendanceRecordRow[];
}

async function enrichAttendanceRows(records: AttendanceRecordRow[]) {
  const employeeIds = [...new Set(records.map((item) => item.employee_id))];
  const shiftIds = [...new Set(records.map((item) => item.shift_id).filter(Boolean))];
  const locationIds = [...new Set(records.map((item) => item.location_id).filter(Boolean))];

  const [employeeResult, shiftResult, locationResult] = await Promise.all([
    employeeIds.length ? supabase.from("employees").select("id, employee_id, nama_lengkap, jabatan").in("id", employeeIds) : Promise.resolve({ data: [], error: null }),
    shiftIds.length ? supabase.from("hr_attendance_shifts").select("id, name").in("id", shiftIds) : Promise.resolve({ data: [], error: null }),
    locationIds.length ? supabase.from("hr_attendance_locations").select("id, name").in("id", locationIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (employeeResult.error) throw employeeResult.error;
  if (shiftResult.error) throw shiftResult.error;
  if (locationResult.error) throw locationResult.error;

  const employeeMap = new Map((employeeResult.data ?? []).map((item) => [item.id, item]));
  const shiftMap = new Map((shiftResult.data ?? []).map((item) => [item.id, item.name]));
  const locationMap = new Map((locationResult.data ?? []).map((item) => [item.id, item.name]));

  return records.map((record) => {
    const employee = employeeMap.get(record.employee_id);
    return {
      ...record,
      employee_name: employee?.nama_lengkap || `Employee #${record.employee_id}`,
      employee_code: employee?.employee_id || "-",
      employee_title: employee?.jabatan || "-",
      shift_name: record.shift_id ? shiftMap.get(record.shift_id) || null : null,
      location_name: record.location_id ? locationMap.get(record.location_id) || null : null,
      daily_status: deriveDailyStatus(record),
    } satisfies HrPresensiDailyAttendanceRow;
  });
}

export async function getHrPresensiServerNow() {
  const { data, error } = await supabase.rpc("hr_presensi_server_now");
  if (error) {
    console.error("Supabase gagal membaca jam server HR Presensi:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }
  return String(data);
}

export async function getHrPresensiDailyAttendance(access: HrPresensiResolvedAccess) {
  const rows = await getScopedAttendanceRows(access);
  return enrichAttendanceRows(rows);
}

export async function getHrPresensiTodayAttendance(access: HrPresensiResolvedAccess) {
  assertAttendanceAccess(access);
  if (!access.scope.employeeId) return null;

  const serverNow = await getHrPresensiServerNow();
  const workDate = new Date(serverNow).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  const { data, error } = await supabase
    .from("hr_attendance_daily_records")
    .select("*")
    .eq("employee_id", access.scope.employeeId)
    .eq("attendance_date", workDate)
    .maybeSingle();

  if (error) {
    console.error("Supabase gagal memuat absensi hari ini:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }

  if (!data) {
    return { serverNow, row: null as HrPresensiDailyAttendanceRow | null };
  }

  const [row] = await enrichAttendanceRows([data as AttendanceRecordRow]);
  return { serverNow, row };
}

export async function validateHrPresensiLocation(access: HrPresensiResolvedAccess, payload: HrPresensiGeoPayload) {
  assertEmployeeActionAccess(access);
  validateGeoPayload(payload);

  const serverNow = await getHrPresensiServerNow();
  const workDate = new Date(serverNow).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  const { data, error } = await supabase.rpc("hr_presensi_validate_location", {
    p_employee_id: access.employee.id,
    p_work_date: workDate,
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_accuracy: payload.accuracy,
  });

  if (error) {
    console.error("Supabase gagal memvalidasi lokasi absensi HR Presensi:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as HrPresensiLocationValidation;
}

export async function clockInHrPresensi(access: HrPresensiResolvedAccess, payload: HrPresensiGeoPayload) {
  assertEmployeeActionAccess(access);
  validateGeoPayload(payload);

  const { data, error } = await supabase.rpc("hr_presensi_clock_in", {
    p_employee_id: access.employee.id,
    p_source: "manual",
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_accuracy: payload.accuracy,
  });

  if (error) {
    console.error("Supabase gagal melakukan check in HR Presensi:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }

  return data as AttendanceRecordRow;
}

export async function clockOutHrPresensi(access: HrPresensiResolvedAccess, payload: HrPresensiGeoPayload) {
  assertEmployeeActionAccess(access);
  validateGeoPayload(payload);

  const { data, error } = await supabase.rpc("hr_presensi_clock_out", {
    p_employee_id: access.employee.id,
    p_source: "manual",
    p_latitude: payload.latitude,
    p_longitude: payload.longitude,
    p_accuracy: payload.accuracy,
  });

  if (error) {
    console.error("Supabase gagal melakukan check out HR Presensi:", error);
    if (isMissingAttendanceInfra(error)) throw createAttendanceInfraError();
    throw error;
  }

  return data as AttendanceRecordRow;
}
