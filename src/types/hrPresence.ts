export type AttendanceReportFormat = "table" | "calendar" | "summary";
export type AttendancePenaltyCalculationType = "flat" | "per_minute";
export type AttendancePenaltyAppliesTo =
  | "terlambat"
  | "tidak_absen_masuk"
  | "tidak_absen_pulang"
  | "pulang_cepat";
export type HolidayType = "nasional" | "perusahaan" | "departemen";
export type WorkPatternType = "5_2" | "6_1" | "shift_rotation" | "flexible";
export type DeviceConnectionStatus = "online" | "offline" | "perlu_cek";
export type EmployeeScheduleSourceType = "manual" | "default_department" | "import" | "system";
export type AttendanceSource = "mobile" | "fingerprint" | "manual" | "face_recognition";
export type AttendanceStatus =
  | "hadir"
  | "terlambat"
  | "alpha"
  | "izin"
  | "sakit"
  | "cuti"
  | "lembur"
  | "pulang_cepat"
  | "tidak_absen_masuk"
  | "tidak_absen_pulang"
  | "hari_libur"
  | "off_schedule";
export type AttendanceExceptionType =
  | "izin"
  | "sakit"
  | "cuti"
  | "alpha"
  | "terlambat"
  | "pulang_cepat"
  | "tidak_absen_masuk"
  | "tidak_absen_pulang"
  | "anomali_perangkat";
export type ApprovalStatus = "draft" | "menunggu" | "disetujui" | "ditolak";

export interface PresenceCompany {
  id: string;
  name: string;
}

export interface PresenceBranch {
  id: string;
  company_id: string;
  branch_name: string;
  city: string;
  is_active: boolean;
}

export interface PresenceDepartment {
  id: string;
  company_id: string;
  department_name: string;
  branch_id?: string | null;
  is_active: boolean;
}

export interface PresenceEmployee {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  job_title: string;
  branch_id: string;
  department_id: string;
  employment_status: string;
  joined_at: string;
  is_active: boolean;
}

export interface AttendanceSettings {
  id: string;
  company_id: string;
  tolerance_late_minutes: number;
  early_checkin_limit_minutes: number;
  late_checkin_limit_minutes: number;
  checkout_limit_minutes: number;
  allow_mobile_attendance: boolean;
  allow_fingerprint_attendance: boolean;
  allow_face_recognition: boolean;
  require_selfie: boolean;
  require_location: boolean;
  attendance_radius_meter: number;
  auto_generate_alpha: boolean;
  default_report_format: AttendanceReportFormat;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendancePenalty {
  id: string;
  company_id: string;
  penalty_name: string;
  penalty_type: string;
  calculation_type: AttendancePenaltyCalculationType;
  amount: number;
  applies_to: AttendancePenaltyAppliesTo;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  company_id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: HolidayType;
  department_id: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkShift {
  id: string;
  company_id: string;
  shift_code: string;
  shift_name: string;
  checkin_time: string;
  checkout_time: string;
  has_break: boolean;
  break_start_time: string | null;
  break_end_time: string | null;
  total_work_minutes: number;
  cross_day: boolean;
  color_hex: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentWorkShift {
  id: string;
  company_id: string;
  department_id: string;
  default_shift_id: string;
  work_pattern_type: WorkPatternType;
  allow_multi_shift: boolean;
  effective_start_date: string;
  effective_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FingerprintDevice {
  id: string;
  company_id: string;
  device_name: string;
  device_code: string;
  ip_address: string;
  api_endpoint: string | null;
  branch_id: string | null;
  location_name: string;
  connection_status: DeviceConnectionStatus;
  last_sync_at: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  company_id: string;
  employee_id: string;
  work_date: string;
  shift_id: string;
  branch_id: string;
  department_id: string;
  assigned_by: string | null;
  source_type: EmployeeScheduleSourceType;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  company_id: string;
  employee_id: string;
  attendance_date: string;
  shift_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  scheduled_checkin: string | null;
  scheduled_checkout: string | null;
  actual_checkin: string | null;
  actual_checkout: string | null;
  break_checkin: string | null;
  break_checkout: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  attendance_source: AttendanceSource;
  selfie_url: string | null;
  latitude: number | null;
  longitude: number | null;
  device_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceException {
  id: string;
  company_id: string;
  employee_id: string;
  attendance_record_id: string | null;
  exception_type: AttendanceExceptionType;
  exception_date: string;
  description: string;
  approved_by: string | null;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface HrPresenceEntityRelation {
  from: string;
  to: string;
  relation: string;
  detail: string;
}

export interface MonthlyScheduleCell {
  date: string;
  shift_id: string | null;
  shift_name: string;
  color_hex: string | null;
  status: "scheduled" | "holiday" | "off";
  note: string | null;
}

export interface MonthlyScheduleMatrixRow {
  employee_id: string;
  employee_name: string;
  branch_id: string;
  department_id: string;
  cells: MonthlyScheduleCell[];
}

export interface AttendanceSummary {
  totalRecords: number;
  byStatus: Record<AttendanceStatus, number>;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalOvertimeMinutes: number;
  sources: Record<AttendanceSource, number>;
}

export interface AttendanceExceptionSummary {
  totalExceptions: number;
  byType: Record<string, number>;
  byStatus: Record<ApprovalStatus, number>;
}

export interface AttendanceFlags {
  is_late: boolean;
  is_early_leave: boolean;
  is_overtime: boolean;
  is_cross_day: boolean;
  is_holiday: boolean;
  is_holiday_attendance: boolean;
  has_break_record: boolean;
}

export interface AttendanceResolutionResult {
  id: string;
  employee_id: string;
  attendance_date: string;
  shift_id: string | null;
  branch_id: string | null;
  department_id: string | null;
  scheduled_checkin: string | null;
  scheduled_checkout: string | null;
  actual_checkin: string | null;
  actual_checkout: string | null;
  break_checkin?: string | null;
  break_checkout?: string | null;
  status_main: AttendanceStatus;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  is_late: boolean;
  is_early_leave: boolean;
  is_overtime: boolean;
  is_cross_day: boolean;
  is_holiday: boolean;
  is_holiday_attendance: boolean;
  has_break_record: boolean;
  note: string | null;
  reason: string;
  source: AttendanceSource | "system";
}

export interface AttendanceEngineTestCase {
  id: string;
  title: string;
  work_date: string;
  expected_status: AttendanceStatus;
  expected_late_minutes?: number;
  expected_early_leave_minutes?: number;
  expected_overtime_minutes?: number;
  description: string;
}

export interface AttendanceGeneratedSummary {
  total: number;
  byStatus: Record<AttendanceStatus, number>;
  lateCount: number;
  earlyLeaveCount: number;
  overtimeCount: number;
  holidayCount: number;
}
