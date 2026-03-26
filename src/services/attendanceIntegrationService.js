import { buildShiftDateTimeRange, resolveEmployeeSchedule } from "@/services/attendanceEngineService";

function toDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutes(date, minutes) {
  const next = new Date(date.getTime());
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return next;
}

function startOfDayUtc(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function buildDateParts(datetime) {
  const parsed = toDate(datetime);
  if (!parsed) return { log_date: "", log_time: "" };
  return {
    log_date: parsed.toISOString().slice(0, 10),
    log_time: parsed.toISOString().slice(11, 16),
  };
}

function normalizeDirection(direction) {
  if (!direction) return null;
  const normalized = String(direction).toLowerCase();
  if (["in", "out", "break_in", "break_out", "unknown"].includes(normalized)) {
    return normalized;
  }
  if (["check_in", "checkin", "login", "scan_in", "masuk"].includes(normalized)) return "in";
  if (["check_out", "checkout", "exit", "scan_out", "pulang"].includes(normalized)) return "out";
  if (["break_start", "breakout", "break_out", "istirahat_keluar"].includes(normalized)) return "break_in";
  if (["break_end", "breakreturn", "break_return", "return_from_break", "istirahat_masuk"].includes(normalized)) return "break_out";
  if (normalized.includes("checkin") || normalized.includes("masuk")) return "in";
  if (normalized.includes("checkout") || normalized.includes("pulang")) return "out";
  if (normalized.includes("breakin")) return "break_in";
  if (normalized.includes("breakout")) return "break_out";
  return "unknown";
}

export function normalizeAttendanceAction(action) {
  if (!action) return "check_in";
  const normalized = String(action).toLowerCase();
  if (["check_in", "checkin", "masuk", "login"].includes(normalized)) return "check_in";
  if (["check_out", "checkout", "pulang", "exit"].includes(normalized)) return "check_out";
  if (["break_out", "break_start", "mulai_istirahat"].includes(normalized)) return "break_out";
  if (["break_return", "break_end", "return_from_break", "selesai_istirahat"].includes(normalized)) return "break_return";
  return "check_in";
}

function actionToDirection(action) {
  return {
    check_in: "in",
    break_out: "break_in",
    break_return: "break_out",
    check_out: "out",
  }[normalizeAttendanceAction(action)] || "in";
}

function defaultVerificationBySource(sourceType) {
  return {
    fingerprint: "finger_scan",
    mobile: "selfie_location",
    manual: "admin_override",
    face_recognition: "face_match",
  }[sourceType] || "generic_verification";
}

function isWithinWindow(left, right, windowMinutes) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);
  if (!leftDate || !rightDate) return false;
  return Math.abs(leftDate.getTime() - rightDate.getTime()) <= windowMinutes * 60000;
}

export function parseAttendanceImportFile(file) {
  const text = typeof file === "string" ? file : file?.content || "";
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return { headers: [], rows: [] };
  }

  const [headerLine, ...dataLines] = rows;
  const headers = headerLine.split(",").map((item) => item.trim());
  const parsedRows = dataLines.map((line, index) => {
    const values = line.split(",").map((item) => item.trim());
    return headers.reduce(
      (accumulator, header, valueIndex) => {
        accumulator[header] = values[valueIndex] ?? "";
        return accumulator;
      },
      { __row: index + 2 },
    );
  });

  return { headers, rows: parsedRows };
}

export function validateAttendanceRawLog(rawLog) {
  const errors = [];
  if (!rawLog.company_id) errors.push("company_id wajib ada");
  if (!rawLog.source_type) errors.push("source_type wajib ada");
  if (!rawLog.log_datetime || !toDate(rawLog.log_datetime)) errors.push("log_datetime tidak valid");
  if (!rawLog.log_date) errors.push("log_date wajib ada");
  if (!rawLog.log_time) errors.push("log_time wajib ada");
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function mapExternalEmployee(rawLog, mappings = [], employees = []) {
  const mapping = mappings.find(
    (item) =>
      item.is_active &&
      item.source_type === rawLog.source_type &&
      item.external_employee_code === rawLog.external_employee_code &&
      (item.device_id ? item.device_id === rawLog.device_id : true),
  );

  if (!mapping) {
    return {
      employee: null,
      mapping: null,
      error: "employee_not_mapped",
    };
  }

  return {
    employee: employees.find((item) => item.id === mapping.employee_id) || null,
    mapping,
    error: null,
  };
}

export function detectDuplicateLog(rawLog, existingLogs = [], settings = {}) {
  const duplicateWindow = settings.duplicate_scan_window_minutes || 3;
  const duplicate = existingLogs.find(
    (item) =>
      item.id !== rawLog.id &&
      item.employee_id === rawLog.employee_id &&
      item.source_type === rawLog.source_type &&
      item.direction === rawLog.direction &&
      isWithinWindow(item.log_datetime, rawLog.log_datetime, duplicateWindow),
  );

  return {
    isDuplicate: Boolean(duplicate),
    duplicateOf: duplicate || null,
  };
}

export function resolveLogDirection(rawLogs, schedule, settings = {}) {
  const directionMode = settings.default_direction_mode || "heuristic";
  const sortedLogs = [...rawLogs].sort((left, right) => left.log_datetime.localeCompare(right.log_datetime));

  if (directionMode === "device" && sortedLogs.every((item) => item.direction && item.direction !== "unknown")) {
    return sortedLogs.map((item) => ({ ...item, resolved_direction: item.direction }));
  }

  return sortedLogs.map((item, index) => {
    if (item.direction && item.direction !== "unknown") {
      return { ...item, resolved_direction: item.direction };
    }

    const fallbackDirection =
      schedule?.shift?.has_break && index === 1
        ? "break_in"
        : schedule?.shift?.has_break && index === 2
          ? "break_out"
          : index === 0
            ? "in"
            : "out";

    return {
      ...item,
      resolved_direction: fallbackDirection,
      direction_note: "Direction ditentukan heuristik awal.",
    };
  });
}

export function pairAttendanceLogs(rawLogs, schedule) {
  const resolvedLogs = resolveLogDirection(rawLogs, schedule, schedule?.settings || {});
  const first = (direction) => resolvedLogs.find((item) => item.resolved_direction === direction)?.log_datetime || null;
  return {
    actual_checkin: first("in"),
    actual_checkout: first("out"),
    break_checkin: first("break_in"),
    break_checkout: first("break_out"),
    resolvedLogs,
  };
}

export function createAttendanceConflict(rawLog, type, description, options = {}) {
  const timestamp = rawLog.updated_at || rawLog.created_at || new Date().toISOString();
  return {
    id: options.id || `conf-${rawLog.id}`,
    company_id: rawLog.company_id,
    raw_log_id: rawLog.id,
    employee_id: rawLog.employee_id || options.employee_id || null,
    attendance_date: rawLog.log_date || null,
    conflict_type: type,
    conflict_description: description,
    suggested_action: options.suggested_action || null,
    resolution_status: options.resolution_status || "unresolved",
    resolved_by: options.resolved_by || null,
    resolved_at: options.resolved_at || null,
    resolution_note: options.resolution_note || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createOrUpdateAttendanceRecordFromLogs({ groupedLogs, schedule, existingRecord = null }) {
  const pairing = pairAttendanceLogs(groupedLogs, schedule);
  const logDate = groupedLogs[0]?.log_date || schedule?.workDate || null;
  const sourceMix = Array.from(new Set(groupedLogs.map((item) => item.source_type)));
  const validationStatus =
    !pairing.actual_checkin || !pairing.actual_checkout ? "warning" : groupedLogs.some((item) => item.process_status === "conflict") ? "conflict" : "valid";

  return {
    id: existingRecord?.id || `att-int-${schedule?.employee?.id || "unknown"}-${logDate}`,
    company_id: groupedLogs[0]?.company_id || existingRecord?.company_id,
    employee_id: schedule?.employee?.id || groupedLogs[0]?.employee_id || existingRecord?.employee_id || null,
    attendance_date: logDate,
    shift_id: schedule?.shift?.id || existingRecord?.shift_id || null,
    branch_id: schedule?.resolvedSchedule?.branch_id || schedule?.employee?.branch_id || existingRecord?.branch_id || null,
    department_id: schedule?.resolvedSchedule?.department_id || schedule?.employee?.department_id || existingRecord?.department_id || null,
    scheduled_checkin: schedule?.range?.scheduled_checkin_datetime || existingRecord?.scheduled_checkin || null,
    scheduled_checkout: schedule?.range?.scheduled_checkout_datetime || existingRecord?.scheduled_checkout || null,
    actual_checkin: pairing.actual_checkin,
    actual_checkout: pairing.actual_checkout,
    break_checkin: pairing.break_checkin,
    break_checkout: pairing.break_checkout,
    status: existingRecord?.status || "hadir",
    late_minutes: existingRecord?.late_minutes || 0,
    early_leave_minutes: existingRecord?.early_leave_minutes || 0,
    overtime_minutes: existingRecord?.overtime_minutes || 0,
    attendance_source: sourceMix[0] || "manual",
    selfie_url: groupedLogs.find((item) => item.selfie_url)?.selfie_url || null,
    latitude: groupedLogs.find((item) => item.latitude)?.latitude ?? null,
    longitude: groupedLogs.find((item) => item.longitude)?.longitude ?? null,
    device_id: groupedLogs.find((item) => item.device_id)?.device_id || null,
    note: validationStatus === "warning" ? "Record terbentuk tetapi pasangan log belum lengkap." : "Record terbentuk dari normalisasi raw log.",
    source_mix: sourceMix,
    validation_status: validationStatus,
    raw_log_ids: groupedLogs.map((item) => item.id),
    had_conflict_before: groupedLogs.some((item) => item.process_status === "conflict"),
    created_at: existingRecord?.created_at || groupedLogs[0]?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function buildImportBatchSummary(batch) {
  return {
    total: batch.total_rows,
    success: batch.success_rows,
    failed: batch.failed_rows,
    duplicate: batch.duplicate_rows,
    conflict: batch.conflict_rows,
    successRate: batch.total_rows ? Math.round((batch.success_rows / batch.total_rows) * 100) : 0,
  };
}

export function buildRawLogSummary(logs = []) {
  return logs.reduce(
    (summary, log) => {
      summary.total += 1;
      summary.bySource[log.source_type] = (summary.bySource[log.source_type] || 0) + 1;
      summary.bySyncStatus[log.sync_status] = (summary.bySyncStatus[log.sync_status] || 0) + 1;
      summary.byProcessStatus[log.process_status] = (summary.byProcessStatus[log.process_status] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      bySource: {},
      bySyncStatus: {},
      byProcessStatus: {},
    },
  );
}

export function buildConflictSummary(conflicts = []) {
  return conflicts.reduce(
    (summary, conflict) => {
      summary.total += 1;
      summary.byType[conflict.conflict_type] = (summary.byType[conflict.conflict_type] || 0) + 1;
      summary.byStatus[conflict.resolution_status] = (summary.byStatus[conflict.resolution_status] || 0) + 1;
      return summary;
    },
    {
      total: 0,
      byType: {},
      byStatus: {},
    },
  );
}

export function importAttendanceLogs({
  company_id,
  import_source,
  file_name = null,
  device_id = null,
  imported_by = null,
  rows = [],
  settings = {},
}) {
  const timestamp = new Date().toISOString();
  const compactTimestamp = timestamp.slice(0, 19).replaceAll("-", "").replaceAll(":", "").replace("T", "");
  const batchId = `batch-${import_source}-${compactTimestamp}`;
  const rawLogs = rows.map((row, index) => {
    const logDatetime = row.log_datetime || `${row.log_date}T${row.log_time}:00.000Z`;
    const dateParts = buildDateParts(logDatetime);
    return {
      id: `raw-${batchId}-${String(index + 1).padStart(3, "0")}`,
      company_id,
      source_type: row.source_type,
      device_id: row.device_id || device_id || null,
      device_name: row.device_name || null,
      external_employee_code: row.external_employee_code || null,
      employee_id: row.employee_id || null,
      employee_name_raw: row.employee_name_raw || null,
      log_datetime: logDatetime,
      log_date: row.log_date || dateParts.log_date,
      log_time: row.log_time || dateParts.log_time,
      log_type: row.log_type || null,
      verification_type: row.verification_type || null,
      direction: normalizeDirection(row.direction),
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      selfie_url: row.selfie_url || null,
      location_label: row.location_label || null,
      mobile_device_id: row.mobile_device_id || null,
      app_version: row.app_version || null,
      validation_flags: row.validation_flags || null,
      raw_payload: row.raw_payload || row,
      import_batch_id: batchId,
      sync_status: "imported",
      process_status: "pending",
      process_note: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
  });

  const invalidCount = rawLogs.filter((log) => !validateAttendanceRawLog(log).isValid).length;
  const batch = {
    id: batchId,
    company_id,
    batch_code: batchId.toUpperCase(),
    import_source,
    file_name,
    device_id,
    total_rows: rawLogs.length,
    success_rows: 0,
    failed_rows: invalidCount,
    duplicate_rows: 0,
    conflict_rows: 0,
    imported_by,
    import_started_at: timestamp,
    import_finished_at: settings.auto_process_imported_logs ? timestamp : null,
    status: settings.auto_process_imported_logs ? "processed" : "previewed",
    note: settings.auto_process_imported_logs ? "Batch langsung diproses otomatis." : "Batch masuk tahap preview.",
    created_at: timestamp,
    updated_at: timestamp,
  };

  return { batch, rawLogs };
}

export function processRawLogsToAttendanceRecords({
  rawLogs = [],
  settings = {},
  mappings = [],
  employees = [],
  employeeSchedules = [],
  departmentWorkShifts = [],
  workShifts = [],
  existingAttendanceRecords = [],
}) {
  const processedLogs = [];
  const conflicts = [];
  const groupedForRecords = new Map();

  rawLogs
    .slice()
    .sort((left, right) => left.log_datetime.localeCompare(right.log_datetime))
    .forEach((log) => {
      const validation = validateAttendanceRawLog(log);
      if (!validation.isValid) {
        processedLogs.push({ ...log, process_status: "conflict", process_note: validation.errors.join(", ") });
        conflicts.push(createAttendanceConflict(log, "invalid_datetime", validation.errors.join(", "), { suggested_action: "Periksa format tanggal dan jam import." }));
        return;
      }

      const mappingResult = mapExternalEmployee(log, mappings, employees);
      if (!mappingResult.employee) {
        processedLogs.push({ ...log, process_status: "conflict", process_note: "Kode eksternal belum termapping ke karyawan internal." });
        conflicts.push(createAttendanceConflict(log, "employee_not_mapped", "Employee eksternal belum terhubung ke master karyawan.", { suggested_action: "Buat atau pilih mapping karyawan mesin lebih dulu." }));
        return;
      }

      const mappedLog = { ...log, employee_id: mappingResult.employee.id, process_status: "mapped", process_note: "Karyawan berhasil dikenali." };
      const duplicate = detectDuplicateLog(mappedLog, processedLogs, settings);
      if (duplicate.isDuplicate) {
        processedLogs.push({ ...mappedLog, sync_status: "duplicate", process_status: "ignored", process_note: `Duplikat dekat dengan ${duplicate.duplicateOf.id}.` });
        conflicts.push(createAttendanceConflict(mappedLog, "duplicate_scan", "Scan ganda terdeteksi dalam window duplicate.", { suggested_action: "Tandai duplicate atau abaikan log." }));
        return;
      }

      const resolvedSchedule = resolveEmployeeSchedule(mappingResult.employee.id, mappedLog.log_date, {
        employeeSchedules,
        employees,
        departmentWorkShifts,
      });
      const shift = resolvedSchedule.schedule ? workShifts.find((item) => item.id === resolvedSchedule.schedule.shift_id) || null : null;
      const range = buildShiftDateTimeRange(mappedLog.log_date, shift);

      if (!shift && settings.require_employee_mapping_before_processing) {
        processedLogs.push({ ...mappedLog, process_status: "conflict", process_note: "Jadwal aktif tidak ditemukan untuk log ini." });
        conflicts.push(createAttendanceConflict(mappedLog, "out_of_shift_range", "Tidak ada shift aktif untuk membantu membaca log ini.", { suggested_action: "Periksa jadwal kerja karyawan atau mapping departemen." }));
        return;
      }

      const key = `${mappingResult.employee.id}-${mappedLog.log_date}`;
      if (!groupedForRecords.has(key)) {
        groupedForRecords.set(key, {
          employee: mappingResult.employee,
          resolvedSchedule: resolvedSchedule.schedule,
          shift,
          settings,
          range,
          logs: [],
        });
      }

      groupedForRecords.get(key).logs.push(mappedLog);
      processedLogs.push({ ...mappedLog, process_status: "processed", process_note: "Log siap dipasangkan ke attendance record." });
    });

  const attendanceRecords = Array.from(groupedForRecords.entries()).map(([key, group]) => {
    const attendanceDate = group.logs[0]?.log_date || null;
    const existingRecord = existingAttendanceRecords.find(
      (item) => item.employee_id === group.employee.id && item.attendance_date === attendanceDate,
    );
    return createOrUpdateAttendanceRecordFromLogs({
      groupedLogs: group.logs,
      schedule: group,
      existingRecord,
    });
  });

  return {
    processedLogs,
    attendanceRecords,
    conflicts,
  };
}

export function resolveAttendanceConflict(conflictId, actionPayload, context = {}) {
  const conflict = context.conflicts?.find((item) => item.id === conflictId);
  if (!conflict) return null;
  return {
    ...conflict,
    resolution_status: actionPayload.action === "ignore" ? "ignored" : "resolved",
    resolution_note: actionPayload.note || actionPayload.action,
    resolved_by: actionPayload.resolved_by || "system",
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function reprocessAttendanceLogs({ rawLogs = [], conflicts = [], ...context }) {
  const unresolvedRawLogIds = new Set(conflicts.filter((item) => item.resolution_status === "unresolved").map((item) => item.raw_log_id));
  const candidateLogs = rawLogs.filter((item) => !unresolvedRawLogIds.has(item.id) || item.process_status !== "conflict");
  return processRawLogsToAttendanceRecords({
    rawLogs: candidateLogs.map((item) => ({ ...item, process_status: "pending", process_note: null })),
    ...context,
  });
}

export function submitMobileAttendance(payload) {
  const timestamp = payload.log_datetime || new Date().toISOString();
  const dateParts = buildDateParts(timestamp);
  return {
    id: payload.id || `raw-mobile-${payload.employee_id}-${dateParts.log_date}-${dateParts.log_time.replace(":", "")}`,
    company_id: payload.company_id,
    source_type: "mobile",
    device_id: null,
    device_name: "Mobile Attendance",
    external_employee_code: payload.external_employee_code || payload.employee_code || null,
    employee_id: payload.employee_id || null,
    employee_name_raw: payload.employee_name || null,
    log_datetime: timestamp,
    log_date: dateParts.log_date,
    log_time: dateParts.log_time,
    log_type: payload.log_type || "mobile_check",
    verification_type: payload.verification_type || "selfie_placeholder",
    direction: normalizeDirection(payload.direction) || "in",
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    selfie_url: payload.selfie_url || null,
    location_label: payload.location_label || null,
    mobile_device_id: payload.mobile_device_id || "android-demo-001",
    app_version: payload.app_version || "1.0.0-demo",
    validation_flags: payload.validation_flags || [],
    raw_payload: payload.raw_payload || payload,
    import_batch_id: null,
    sync_status: "synced",
    process_status: "pending",
    process_note: "Raw log mobile berhasil diterima.",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function submitManualAttendance(payload) {
  const timestamp = payload.log_datetime || new Date().toISOString();
  const dateParts = buildDateParts(timestamp);
  return {
    id: payload.id || `raw-manual-${payload.employee_id}-${dateParts.log_date}-${dateParts.log_time.replace(":", "")}`,
    company_id: payload.company_id,
    source_type: "manual",
    device_id: null,
    device_name: payload.device_name || "Input Manual HR",
    external_employee_code: payload.external_employee_code || payload.employee_id || null,
    employee_id: payload.employee_id || null,
    employee_name_raw: payload.employee_name || null,
    log_datetime: timestamp,
    log_date: dateParts.log_date,
    log_time: dateParts.log_time,
    log_type: payload.log_type || "manual_adjustment",
    verification_type: payload.verification_type || "admin_override",
    direction: normalizeDirection(payload.direction) || "in",
    latitude: null,
    longitude: null,
    selfie_url: null,
    raw_payload: {
      reason: payload.reason || "Koreksi manual oleh HR",
      created_by: payload.created_by || "hr-admin",
    },
    import_batch_id: null,
    sync_status: "synced",
    process_status: "pending",
    process_note: payload.reason || "Input manual HR.",
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function submitAttendanceEvent(payload) {
  const sourceType = payload.source_type || "manual";
  const action = normalizeAttendanceAction(payload.action || payload.direction);
  const basePayload = {
    ...payload,
    direction: actionToDirection(action),
    verification_type: payload.verification_type || defaultVerificationBySource(sourceType),
    log_type: payload.log_type || action,
  };

  if (sourceType === "mobile") {
    return submitMobileAttendance(basePayload);
  }

  if (sourceType === "manual") {
    return submitManualAttendance(basePayload);
  }

  const timestamp = payload.log_datetime || new Date().toISOString();
  const dateParts = buildDateParts(timestamp);

  return {
    id: payload.id || `raw-${sourceType}-${payload.employee_id || payload.external_employee_code || "unknown"}-${dateParts.log_date}-${dateParts.log_time.replace(":", "")}`,
    company_id: payload.company_id,
    source_type: sourceType,
    device_id: payload.device_id || null,
    device_name: payload.device_name || (sourceType === "fingerprint" ? "Fingerprint Device" : "Attendance Device"),
    external_employee_code: payload.external_employee_code || payload.employee_id || null,
    employee_id: payload.employee_id || null,
    employee_name_raw: payload.employee_name || null,
    log_datetime: timestamp,
    log_date: dateParts.log_date,
    log_time: dateParts.log_time,
    log_type: basePayload.log_type,
    verification_type: basePayload.verification_type,
    direction: basePayload.direction,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    selfie_url: payload.selfie_url || null,
    location_label: payload.location_label || null,
    mobile_device_id: payload.mobile_device_id || null,
    app_version: payload.app_version || null,
    validation_flags: payload.validation_flags || [],
    raw_payload: payload.raw_payload || payload,
    import_batch_id: payload.import_batch_id || null,
    sync_status: payload.sync_status || "synced",
    process_status: "pending",
    process_note: payload.process_note || `Event ${action} dari ${sourceType} berhasil diterima.`,
    created_at: timestamp,
    updated_at: timestamp,
  };
}
