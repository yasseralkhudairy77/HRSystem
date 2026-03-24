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
export type AttendanceRawLogSourceType = AttendanceSource;
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
export type AttendanceRequestType = "izin" | "sakit" | "cuti" | "lembur" | "tukar_shift" | "koreksi_absensi";
export type AttendanceRequestStatus = ApprovalStatus | "dibatalkan";
export type AttendanceRawDirection = "in" | "out" | "break_in" | "break_out" | "unknown";
export type AttendanceRawSyncStatus = "imported" | "synced" | "failed" | "duplicate";
export type AttendanceRawProcessStatus = "pending" | "mapped" | "processed" | "conflict" | "ignored";
export type AttendanceImportSource = "fingerprint_file" | "fingerprint_sync" | "mobile" | "manual" | "face_recognition";
export type AttendanceImportBatchStatus = "draft" | "previewed" | "processed" | "failed";
export type AttendanceSyncJobStatus = "queued" | "running" | "completed" | "failed";
export type AttendanceConflictType =
  | "employee_not_mapped"
  | "duplicate_scan"
  | "invalid_datetime"
  | "missing_pair"
  | "ambiguous_direction"
  | "out_of_shift_range"
  | "device_unknown"
  | "location_invalid";
export type AttendanceConflictResolutionStatus = "unresolved" | "resolved" | "ignored";
export type AttendancePayrollReadinessStatus = "ready" | "need_review" | "blocked";
export type AttendanceFinalAttendanceStatus = "draft" | "reviewed" | "final";
export type AttendancePayrollImpactType =
  | "late_penalty_candidate"
  | "alpha_deduction_candidate"
  | "unpaid_leave_candidate"
  | "overtime_payment_candidate"
  | "attendance_allowance_candidate"
  | "no_checkout_review"
  | "no_checkin_review"
  | "early_leave_review"
  | "holiday_work_candidate";
export type AttendancePayrollImpactCategory =
  | "discipline"
  | "absence"
  | "overtime"
  | "allowance"
  | "review";
export type AttendanceImpactUnit = "count" | "minute" | "day" | "hour";
export type AttendanceFinalizationStatus =
  | "draft"
  | "dalam_review"
  | "butuh_perbaikan"
  | "siap_payroll"
  | "locked"
  | "sudah_dikirim_ke_payroll";

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
  duplicate_scan_window_minutes?: number;
  max_checkin_distance_minutes?: number;
  max_checkout_distance_minutes?: number;
  allow_unmatched_logs?: boolean;
  auto_process_imported_logs?: boolean;
  require_employee_mapping_before_processing?: boolean;
  default_direction_mode?: "device" | "heuristic";
  mobile_location_validation_enabled?: boolean;
  mobile_selfie_validation_enabled?: boolean;
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
  port?: number | null;
  api_endpoint: string | null;
  branch_id: string | null;
  location_name: string;
  timezone?: string;
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
  source_mix?: AttendanceSource[];
  validation_status?: "valid" | "warning" | "conflict";
  raw_log_ids?: string[];
  had_conflict_before?: boolean;
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

export interface AttendanceRequest {
  id: string;
  company_id: string;
  employee_id: string;
  request_type: AttendanceRequestType;
  title: string;
  description: string;
  request_date: string;
  start_date: string;
  end_date: string | null;
  attendance_record_id?: string | null;
  schedule_id?: string | null;
  related_employee_id?: string | null;
  attachment_url?: string | null;
  status: AttendanceRequestStatus;
  approved_by?: string | null;
  approval_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRawLog {
  id: string;
  company_id: string;
  source_type: AttendanceRawLogSourceType;
  device_id: string | null;
  device_name: string | null;
  external_employee_code: string | null;
  employee_id: string | null;
  employee_name_raw: string | null;
  log_datetime: string;
  log_date: string;
  log_time: string;
  log_type: string | null;
  verification_type: string | null;
  direction: AttendanceRawDirection | null;
  latitude: number | null;
  longitude: number | null;
  selfie_url: string | null;
  location_label?: string | null;
  mobile_device_id?: string | null;
  app_version?: string | null;
  validation_flags?: string[] | null;
  raw_payload: Record<string, unknown>;
  import_batch_id: string | null;
  sync_status: AttendanceRawSyncStatus;
  process_status: AttendanceRawProcessStatus;
  process_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceImportBatch {
  id: string;
  company_id: string;
  batch_code: string;
  import_source: AttendanceImportSource;
  file_name: string | null;
  device_id: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  conflict_rows: number;
  imported_by: string | null;
  import_started_at: string;
  import_finished_at: string | null;
  status: AttendanceImportBatchStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDeviceMapping {
  id: string;
  company_id: string;
  employee_id: string;
  source_type: AttendanceRawLogSourceType;
  device_id: string | null;
  external_employee_code: string;
  external_employee_name: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSyncJob {
  id: string;
  company_id: string;
  sync_type: AttendanceImportSource;
  device_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: AttendanceSyncJobStatus;
  total_fetched: number;
  total_processed: number;
  total_conflict: number;
  total_duplicate: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceConflict {
  id: string;
  company_id: string;
  raw_log_id: string;
  employee_id: string | null;
  attendance_date: string | null;
  conflict_type: AttendanceConflictType;
  conflict_description: string;
  suggested_action: string | null;
  resolution_status: AttendanceConflictResolutionStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceProcessedResult {
  raw_log_ids: string[];
  employee_id: string | null;
  attendance_date: string | null;
  shift_id: string | null;
  scheduled_checkin: string | null;
  scheduled_checkout: string | null;
  actual_checkin: string | null;
  actual_checkout: string | null;
  break_checkin: string | null;
  break_checkout: string | null;
  source_mix: AttendanceSource[];
  process_status: "created" | "updated" | "conflict" | "ignored";
  validation_status: "valid" | "warning" | "conflict";
  note: string | null;
}

export interface EmployeeAnnouncement {
  id: string;
  company_id: string;
  title: string;
  summary: string;
  published_at: string;
  audience: string;
  tone?: "info" | "warning" | "success";
}

export interface EmployeeFaceRegistration {
  id: string;
  employee_id: string;
  status: "belum_terdaftar" | "aktif" | "perlu_perbarui";
  registered_at: string | null;
  verification_note: string;
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

export interface AttendancePayrollSummary {
  id: string;
  company_id: string;
  payroll_period_id: string;
  employee_id: string;
  scheduled_work_days: number;
  present_days: number;
  alpha_days: number;
  izin_days: number;
  sakit_days: number;
  cuti_days: number;
  late_count: number;
  total_late_minutes: number;
  early_leave_count: number;
  total_early_leave_minutes: number;
  overtime_days: number;
  total_overtime_minutes: number;
  holiday_work_days: number;
  correction_count: number;
  unresolved_conflict_count: number;
  payroll_readiness_status: AttendancePayrollReadinessStatus;
  attendance_final_status: AttendanceFinalAttendanceStatus;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendancePayrollImpact {
  id: string;
  company_id: string;
  payroll_period_id: string;
  employee_id: string;
  attendance_date: string;
  attendance_record_id: string | null;
  impact_type: AttendancePayrollImpactType;
  impact_category: AttendancePayrollImpactCategory;
  impact_value: number;
  impact_unit: AttendanceImpactUnit;
  source_reference_type: "attendance_record" | "attendance_request" | "attendance_conflict" | "manual_review";
  source_reference_id: string | null;
  note: string | null;
  approval_status: ApprovalStatus | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceFinalizationPeriod {
  id: string;
  company_id: string;
  payroll_period_id: string;
  status: AttendanceFinalizationStatus;
  total_employees: number;
  total_ready: number;
  total_need_review: number;
  total_locked: number;
  finalized_by: string | null;
  finalized_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceMonitoringSnapshot {
  id: string;
  company_id: string;
  snapshot_date: string;
  branch_id: string | null;
  department_id: string | null;
  total_active_employees: number;
  total_present: number;
  total_late: number;
  total_alpha: number;
  total_izin: number;
  total_sakit: number;
  total_cuti: number;
  total_no_checkout: number;
  total_conflict: number;
  total_pending_approval: number;
  created_at: string;
  updated_at: string;
}
