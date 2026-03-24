import {
  attendanceSettings,
  employeeSchedules,
  fingerprintDevices,
  presenceEmployees,
  workShifts,
  departmentWorkShifts,
  resolvedAttendanceRecords,
} from "@/data/hrPresenceSeed";
import {
  buildConflictSummary,
  buildImportBatchSummary,
  buildRawLogSummary,
  importAttendanceLogs,
  processRawLogsToAttendanceRecords,
  reprocessAttendanceLogs,
  resolveAttendanceConflict,
  submitManualAttendance,
  submitMobileAttendance,
} from "@/services/attendanceIntegrationService";
import type {
  AttendanceConflict,
  AttendanceImportBatch,
  AttendanceRawLog,
  AttendanceSyncJob,
  EmployeeDeviceMapping,
} from "@/types/hrPresence";

const companyId = "cmp-hum-001";
const createdAt = "2026-03-24T08:00:00.000Z";

export const employeeDeviceMappings: EmployeeDeviceMapping[] = [
  {
    id: "map-001",
    company_id: companyId,
    employee_id: "emp-pres-001",
    source_type: "fingerprint",
    device_id: "fpd-002",
    external_employee_code: "260012",
    external_employee_name: "Yasser A. Khudairy",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "map-002",
    company_id: companyId,
    employee_id: "emp-pres-002",
    source_type: "fingerprint",
    device_id: "fpd-001",
    external_employee_code: "260013",
    external_employee_name: "Rani Permata",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "map-003",
    company_id: companyId,
    employee_id: "emp-pres-005",
    source_type: "fingerprint",
    device_id: "fpd-003",
    external_employee_code: "260016",
    external_employee_name: "Maya Salsabila",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "map-004",
    company_id: companyId,
    employee_id: "emp-pres-006",
    source_type: "fingerprint",
    device_id: "fpd-003",
    external_employee_code: "260017",
    external_employee_name: "Bima Saputra",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "map-005",
    company_id: companyId,
    employee_id: "emp-pres-001",
    source_type: "mobile",
    device_id: null,
    external_employee_code: "EMP-260012",
    external_employee_name: "Yasser Al Khudairy",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "map-006",
    company_id: companyId,
    employee_id: "emp-pres-004",
    source_type: "mobile",
    device_id: null,
    external_employee_code: "EMP-260015",
    external_employee_name: "Dewi Lestari",
    is_primary: true,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  },
];

const fingerprintBatchImport = importAttendanceLogs({
  company_id: companyId,
  import_source: "fingerprint_file",
  file_name: "log-fingerprint-bogor-2026-03-24.csv",
  device_id: "fpd-002",
  imported_by: "emp-pres-001",
  settings: attendanceSettings[0],
  rows: [
    {
      source_type: "fingerprint",
      device_id: "fpd-002",
      device_name: "Fingerprint Outlet Bogor Utara",
      external_employee_code: "260012",
      employee_name_raw: "Yasser A. Khudairy",
      log_datetime: "2026-03-24T08:02:00.000Z",
      direction: "in",
      verification_type: "fingerprint",
      raw_payload: { pin: "260012", status: "checkin" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-002",
      device_name: "Fingerprint Outlet Bogor Utara",
      external_employee_code: "260012",
      employee_name_raw: "Yasser A. Khudairy",
      log_datetime: "2026-03-24T08:03:00.000Z",
      direction: "in",
      verification_type: "fingerprint",
      raw_payload: { pin: "260012", status: "checkin-duplicate" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-001",
      device_name: "Fingerprint Front Office Bandung",
      external_employee_code: "260013",
      employee_name_raw: "Rani Permata",
      log_datetime: "2026-03-24T16:18:00.000Z",
      direction: "out",
      verification_type: "fingerprint",
      raw_payload: { pin: "260013", status: "checkout" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-003",
      device_name: "Face ID Gudang Bandung",
      external_employee_code: "260017",
      employee_name_raw: "Bima Saputra",
      log_datetime: "2026-03-24T22:05:00.000Z",
      direction: "in",
      verification_type: "face_id",
      raw_payload: { pin: "260017", status: "night-checkin" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-003",
      device_name: "Face ID Gudang Bandung",
      external_employee_code: "260017",
      employee_name_raw: "Bima Saputra",
      log_datetime: "2026-03-25T06:11:00.000Z",
      direction: "out",
      verification_type: "face_id",
      raw_payload: { pin: "260017", status: "night-checkout" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-002",
      device_name: "Fingerprint Outlet Bogor Utara",
      external_employee_code: "999999",
      employee_name_raw: "Unknown Staff",
      log_datetime: "2026-03-24T09:10:00.000Z",
      direction: "in",
      verification_type: "fingerprint",
      raw_payload: { pin: "999999", status: "unknown-user" },
    },
    {
      source_type: "fingerprint",
      device_id: "fpd-404",
      device_name: "Mesin Tak Dikenal",
      external_employee_code: "260016",
      employee_name_raw: "Maya Salsabila",
      log_datetime: "invalid-datetime",
      direction: "in",
      verification_type: "fingerprint",
      raw_payload: { pin: "260016", status: "bad-time" },
    },
  ],
});

const mobileRawLogs = [
  submitMobileAttendance({
    company_id: companyId,
    employee_id: "emp-pres-001",
    employee_name: "Yasser Al Khudairy",
    external_employee_code: "EMP-260012",
    log_datetime: "2026-03-24T16:22:00.000Z",
    direction: "out",
    latitude: -6.903447,
    longitude: 107.573116,
    location_label: "Outlet Bogor Utara",
    selfie_url: "https://dummy.hireumkm.dev/selfie/mobile-yasser-20260324.jpg",
    validation_flags: ["within_radius", "selfie_present"],
  }),
  submitMobileAttendance({
    company_id: companyId,
    employee_id: "emp-pres-004",
    employee_name: "Dewi Lestari",
    external_employee_code: "EMP-260015",
    log_datetime: "2026-03-24T07:14:00.000Z",
    direction: "in",
    latitude: -6.9142,
    longitude: 107.6098,
    location_label: "Outlet Bogor Utara",
    selfie_url: "https://dummy.hireumkm.dev/selfie/mobile-dewi-20260324.jpg",
    validation_flags: ["outside_radius_warning"],
  }),
];

const manualRawLogs = [
  submitManualAttendance({
    company_id: companyId,
    employee_id: "emp-pres-002",
    employee_name: "Rani Permata",
    log_datetime: "2026-03-24T08:04:00.000Z",
    direction: "in",
    reason: "Mesin FO Bandung error pagi hari, HR input manual setelah verifikasi CCTV.",
    created_by: "emp-pres-001",
  }),
];

const allRawLogsInput = [...fingerprintBatchImport.rawLogs, ...mobileRawLogs, ...manualRawLogs];

const firstProcessing = processRawLogsToAttendanceRecords({
  rawLogs: allRawLogsInput,
  settings: attendanceSettings[0],
  mappings: employeeDeviceMappings,
  employees: presenceEmployees,
  employeeSchedules,
  departmentWorkShifts,
  workShifts,
  existingAttendanceRecords: resolvedAttendanceRecords,
});

const unresolvedConflicts = firstProcessing.conflicts;
const remappedUnknownUser: EmployeeDeviceMapping = {
  id: "map-007",
  company_id: companyId,
  employee_id: "emp-pres-007",
  source_type: "fingerprint",
  device_id: "fpd-002",
  external_employee_code: "999999",
  external_employee_name: "Unknown Staff",
  is_primary: false,
  is_active: true,
  created_at: createdAt,
  updated_at: createdAt,
};

export const employeeDeviceMappingsResolved = [...employeeDeviceMappings, remappedUnknownUser];

export const attendanceConflictResolutions = unresolvedConflicts.map((item) => {
  if (item.conflict_type === "employee_not_mapped") {
    return resolveAttendanceConflict(item.id, {
      action: "remap_employee",
      note: "Mapping baru dibuat untuk kode eksternal 999999 lalu proses ulang dijalankan.",
      resolved_by: "emp-pres-001",
    }, { conflicts: unresolvedConflicts });
  }

  if (item.conflict_type === "duplicate_scan") {
    return resolveAttendanceConflict(item.id, {
      action: "mark_duplicate",
      note: "Scan kedua dianggap duplikat dalam window 3 menit.",
      resolved_by: "emp-pres-001",
    }, { conflicts: unresolvedConflicts });
  }

  return resolveAttendanceConflict(item.id, {
    action: "ignore",
    note: "Log diabaikan sambil menunggu perbaikan perangkat atau file import.",
    resolved_by: "emp-pres-001",
  }, { conflicts: unresolvedConflicts });
}).filter(Boolean) as AttendanceConflict[];

const secondProcessing = reprocessAttendanceLogs({
  rawLogs: firstProcessing.processedLogs,
  conflicts: attendanceConflictResolutions,
  settings: attendanceSettings[0],
  mappings: employeeDeviceMappingsResolved,
  employees: presenceEmployees,
  employeeSchedules,
  departmentWorkShifts,
  workShifts,
  existingAttendanceRecords: resolvedAttendanceRecords,
});

export const attendanceImportBatches: AttendanceImportBatch[] = [
  {
    ...fingerprintBatchImport.batch,
    success_rows: secondProcessing.attendanceRecords.length,
    duplicate_rows: firstProcessing.conflicts.filter((item) => item.conflict_type === "duplicate_scan").length,
    conflict_rows: firstProcessing.conflicts.length,
    failed_rows: firstProcessing.conflicts.filter((item) => item.conflict_type === "invalid_datetime").length,
    import_finished_at: "2026-03-24T09:05:00.000Z",
    status: "processed",
    note: "Batch fingerprint dipreview, diproses, lalu sebagian conflict direview manual.",
  },
  {
    id: "batch-mobile-20260324",
    company_id: companyId,
    batch_code: "BATCH-MOBILE-20260324",
    import_source: "mobile",
    file_name: null,
    device_id: null,
    total_rows: mobileRawLogs.length,
    success_rows: 2,
    failed_rows: 0,
    duplicate_rows: 0,
    conflict_rows: 1,
    imported_by: "emp-pres-001",
    import_started_at: "2026-03-24T16:20:00.000Z",
    import_finished_at: "2026-03-24T16:23:00.000Z",
    status: "processed",
    note: "Check-out mobile Yasser dan check-in mobile Dewi berhasil diterima sebagai raw log.",
    created_at: createdAt,
    updated_at: createdAt,
  },
];

export const attendanceSyncJobs: AttendanceSyncJob[] = [
  {
    id: "sync-001",
    company_id: companyId,
    sync_type: "fingerprint_sync",
    device_id: "fpd-002",
    started_at: "2026-03-24T08:55:00.000Z",
    finished_at: "2026-03-24T09:04:00.000Z",
    status: "completed",
    total_fetched: 7,
    total_processed: secondProcessing.attendanceRecords.length,
    total_conflict: firstProcessing.conflicts.length,
    total_duplicate: firstProcessing.conflicts.filter((item) => item.conflict_type === "duplicate_scan").length,
    error_message: null,
    created_at: createdAt,
    updated_at: createdAt,
  },
  {
    id: "sync-002",
    company_id: companyId,
    sync_type: "mobile",
    device_id: null,
    started_at: "2026-03-24T16:20:00.000Z",
    finished_at: "2026-03-24T16:23:00.000Z",
    status: "completed",
    total_fetched: 2,
    total_processed: 2,
    total_conflict: 1,
    total_duplicate: 0,
    error_message: null,
    created_at: createdAt,
    updated_at: createdAt,
  },
];

export const attendanceRawLogs: AttendanceRawLog[] = firstProcessing.processedLogs;
export const attendanceProcessedRecords = secondProcessing.attendanceRecords;
export const attendanceConflicts = firstProcessing.conflicts;
export const resolvedAttendanceConflicts = attendanceConflictResolutions;

export const attendanceIntegrationUi = {
  batchSummaryCards: attendanceImportBatches.map((batch) => ({
    ...batch,
    summary: buildImportBatchSummary(batch),
  })),
  rawLogSummary: buildRawLogSummary(attendanceRawLogs),
  conflictSummary: buildConflictSummary(attendanceConflicts),
  preview: {
    totalRows: fingerprintBatchImport.rawLogs.length,
    validRows: fingerprintBatchImport.rawLogs.length - firstProcessing.conflicts.filter((item) => item.conflict_type === "invalid_datetime").length,
    duplicateRows: firstProcessing.conflicts.filter((item) => item.conflict_type === "duplicate_scan").length,
    unmappedRows: firstProcessing.conflicts.filter((item) => item.conflict_type === "employee_not_mapped").length,
    invalidRows: firstProcessing.conflicts.filter((item) => item.conflict_type === "invalid_datetime").length,
    conflictRows: firstProcessing.conflicts.length,
  },
};

export const attendanceIntegrationScenarios = [
  { id: "int-001", title: "Import file fingerprint valid dan employee termapping", result: "handled", note: "Row Yasser, Rani, dan Bima berhasil dipetakan ke employee internal." },
  { id: "int-002", title: "Employee belum termapping", result: "handled", note: "Kode 999999 memunculkan conflict employee_not_mapped." },
  { id: "int-003", title: "Duplicate scan dalam 2 menit", result: "handled", note: "Scan kedua Yasser ditandai duplicate_scan." },
  { id: "int-004", title: "Check-in dan check-out normal", result: "handled", note: "Check-in fingerprint dan check-out mobile Yasser membentuk source campuran." },
  { id: "int-005", title: "Shift malam lintas hari", result: "handled", note: "Bima diproses lintas hari dari 24 Maret malam ke 25 Maret pagi." },
  { id: "int-006", title: "Mobile check-in dengan lokasi dan selfie", result: "handled", note: "Dewi menghasilkan raw log mobile dengan validation_flags." },
  { id: "int-007", title: "Manual attendance oleh admin", result: "handled", note: "Rani menerima raw log manual dengan alasan audit trail." },
  { id: "int-008", title: "Conflict diperbaiki dengan mapping lalu reprocess", result: "handled", note: "Mapping baru untuk 999999 dibuat dan conflict direview." },
  { id: "int-009", title: "Direction ambigu dapat disiapkan untuk override manual", result: "ready", note: "Engine resolveLogDirection mendukung device mode dan heuristic mode." },
];
