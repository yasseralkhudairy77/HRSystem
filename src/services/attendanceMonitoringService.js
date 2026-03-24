import { attendanceConflicts, attendanceProcessedRecords } from "@/data/hrPresenceIntegrationSeed";
import { attendanceRequests } from "@/data/hrPresenceEmployeeSeed";

function startOfDay(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function endOfDay(dateString) {
  return new Date(`${dateString}T23:59:59`);
}

function inDateRange(dateValue, from, to) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  const fromDate = from ? startOfDay(from) : null;
  const toDate = to ? endOfDay(to) : null;

  if (fromDate && date < fromDate) {
    return false;
  }

  if (toDate && date > toDate) {
    return false;
  }

  return true;
}

function makeLookup(items, key) {
  return new Map(items.map((item) => [item[key], item]));
}

function getApprovalStatusForEmployeeDate(employeeId, attendanceDate) {
  return attendanceRequests.find((item) => item.employee_id === employeeId && item.start_date <= attendanceDate && (!item.end_date || item.end_date >= attendanceDate));
}

function buildMonitoringContext({
  attendanceRecords,
  employees,
  branches,
  departments,
  workShifts,
  payrollPeriods = [],
  managerScopes = [],
}) {
  return {
    attendanceRecords,
    employees,
    branches,
    departments,
    workShifts,
    payrollPeriods,
    managerScopes,
    employeeMap: makeLookup(employees, "id"),
    branchMap: makeLookup(branches, "id"),
    departmentMap: makeLookup(departments, "id"),
    shiftMap: makeLookup(workShifts, "id"),
  };
}

function applyRecordFilters(records, context, filters = {}) {
  const {
    date,
    dateFrom,
    dateTo,
    branchId,
    departmentId,
    employeeId,
    status,
    shiftId,
  } = filters;

  return records.filter((record) => {
    const employee = context.employeeMap.get(record.employee_id);
    const attendanceDate = record.attendance_date;

    if (date && attendanceDate !== date) {
      return false;
    }

    if ((dateFrom || dateTo) && !inDateRange(attendanceDate, dateFrom, dateTo)) {
      return false;
    }

    if (branchId && record.branch_id !== branchId) {
      return false;
    }

    if (departmentId && record.department_id !== departmentId) {
      return false;
    }

    if (employeeId && record.employee_id !== employeeId) {
      return false;
    }

    if (status && record.status_main !== status) {
      return false;
    }

    if (shiftId && record.shift_id !== shiftId) {
      return false;
    }

    if (!employee?.is_active && !filters.includeInactive) {
      return false;
    }

    return true;
  });
}

function summarizeStatuses(records) {
  const summary = {
    total: records.length,
    hadir: 0,
    terlambat: 0,
    alpha: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    belum_check_out: 0,
    lembur: 0,
    conflict: 0,
    off_schedule: 0,
    hari_libur: 0,
  };

  records.forEach((record) => {
    summary[record.status_main] = (summary[record.status_main] || 0) + 1;
    if (!record.actual_checkout && record.actual_checkin) {
      summary.belum_check_out += 1;
    }
    if (record.overtime_minutes > 0 || record.is_overtime) {
      summary.lembur += 1;
    }
    if (record.validation_status === "conflict") {
      summary.conflict += 1;
    }
  });

  return summary;
}

export function buildAttendanceTrend({ records, days = 7 }) {
  const sorted = [...records].sort((left, right) => left.attendance_date.localeCompare(right.attendance_date));
  const dateGroups = new Map();

  sorted.forEach((record) => {
    if (!dateGroups.has(record.attendance_date)) {
      dateGroups.set(record.attendance_date, { date: record.attendance_date, hadir: 0, terlambat: 0, alpha: 0, lembur: 0 });
    }
    const bucket = dateGroups.get(record.attendance_date);
    if (record.status_main === "hadir") {
      bucket.hadir += 1;
    }
    if (record.status_main === "terlambat") {
      bucket.terlambat += 1;
    }
    if (record.status_main === "alpha") {
      bucket.alpha += 1;
    }
    if (record.overtime_minutes > 0 || record.status_main === "lembur") {
      bucket.lembur += 1;
    }
  });

  return [...dateGroups.values()].slice(-days);
}

export function buildDepartmentAttendanceRanking({ records, departments, employees }) {
  const employeeMap = makeLookup(employees, "id");
  const departmentMap = makeLookup(departments, "id");
  const rows = new Map();

  records.forEach((record) => {
    const employee = employeeMap.get(record.employee_id);
    const departmentId = employee?.department_id || record.department_id;
    if (!departmentId) {
      return;
    }
    if (!rows.has(departmentId)) {
      rows.set(departmentId, {
        department_id: departmentId,
        department_name: departmentMap.get(departmentId)?.department_name || departmentId,
        total_records: 0,
        present_rate: 0,
        late_cases: 0,
        alpha_cases: 0,
        overtime_cases: 0,
      });
    }
    const bucket = rows.get(departmentId);
    bucket.total_records += 1;
    if (["hadir", "terlambat", "lembur"].includes(record.status_main)) {
      bucket.present_rate += 1;
    }
    if (record.status_main === "terlambat") {
      bucket.late_cases += 1;
    }
    if (record.status_main === "alpha") {
      bucket.alpha_cases += 1;
    }
    if (record.overtime_minutes > 0 || record.status_main === "lembur") {
      bucket.overtime_cases += 1;
    }
  });

  return [...rows.values()]
    .map((item) => ({
      ...item,
      present_rate: item.total_records ? Math.round((item.present_rate / item.total_records) * 100) : 0,
    }))
    .sort((left, right) => right.present_rate - left.present_rate);
}

export function buildEmployeeDisciplineRanking({ records, employees }) {
  const employeeMap = makeLookup(employees, "id");
  const rows = new Map();

  records.forEach((record) => {
    if (!rows.has(record.employee_id)) {
      rows.set(record.employee_id, {
        employee_id: record.employee_id,
        employee_name: employeeMap.get(record.employee_id)?.employee_name || record.employee_id,
        department_id: employeeMap.get(record.employee_id)?.department_id || null,
        total_records: 0,
        on_time_count: 0,
        late_count: 0,
        alpha_count: 0,
        total_late_minutes: 0,
      });
    }
    const bucket = rows.get(record.employee_id);
    bucket.total_records += 1;
    if (record.status_main === "hadir") {
      bucket.on_time_count += 1;
    }
    if (record.status_main === "terlambat") {
      bucket.late_count += 1;
      bucket.total_late_minutes += record.late_minutes;
    }
    if (record.status_main === "alpha") {
      bucket.alpha_count += 1;
    }
  });

  return [...rows.values()]
    .map((item) => ({
      ...item,
      discipline_score: Math.max(0, 100 - item.late_count * 8 - item.alpha_count * 20 - Math.round(item.total_late_minutes / 10)),
    }))
    .sort((left, right) => right.discipline_score - left.discipline_score);
}

function buildPayrollReadinessStatus({ unresolvedConflictCount, pendingApprovals, lateCount, alphaDays }) {
  if (unresolvedConflictCount > 0 || pendingApprovals > 0) {
    return "need_review";
  }
  if (alphaDays > 0 || lateCount > 3) {
    return "ready";
  }
  return "ready";
}

export function buildAttendancePayrollImpact(payrollPeriodId, { records, employees, requests = attendanceRequests, conflicts = attendanceConflicts, filters = {} }) {
  const relevant = applyRecordFilters(records, buildMonitoringContext({ attendanceRecords: records, employees, branches: [], departments: [], workShifts: [] }), filters);
  const periodRecords = relevant.filter((record) => record.payroll_period_id ? record.payroll_period_id === payrollPeriodId : true);
  const impacts = [];

  periodRecords.forEach((record) => {
    if (record.status_main === "alpha") {
      impacts.push({
        id: `impact-alpha-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "alpha_deduction_candidate",
        impact_category: "absence",
        impact_value: 1,
        impact_unit: "day",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Alpha pada hari kerja terjadwal.",
        approval_status: null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.late_minutes > 0) {
      impacts.push({
        id: `impact-late-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "late_penalty_candidate",
        impact_category: "discipline",
        impact_value: record.late_minutes,
        impact_unit: "minute",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Keterlambatan melewati toleransi.",
        approval_status: null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.early_leave_minutes > 0) {
      impacts.push({
        id: `impact-early-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "early_leave_review",
        impact_category: "review",
        impact_value: record.early_leave_minutes,
        impact_unit: "minute",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Pulang cepat perlu review payroll.",
        approval_status: null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.overtime_minutes > 0) {
      impacts.push({
        id: `impact-ot-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "overtime_payment_candidate",
        impact_category: "overtime",
        impact_value: record.overtime_minutes,
        impact_unit: "minute",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Lembur tercatat dan siap diverifikasi payroll.",
        approval_status: record.overtime_minutes > 0 ? "disetujui" : null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.status_main === "tidak_absen_pulang") {
      impacts.push({
        id: `impact-no-out-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "no_checkout_review",
        impact_category: "review",
        impact_value: 1,
        impact_unit: "count",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Perlu review HR sebelum final payroll.",
        approval_status: null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.status_main === "tidak_absen_masuk") {
      impacts.push({
        id: `impact-no-in-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "no_checkin_review",
        impact_category: "review",
        impact_value: 1,
        impact_unit: "count",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Perlu review HR sebelum final payroll.",
        approval_status: null,
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
    if (record.is_holiday_attendance) {
      impacts.push({
        id: `impact-holiday-${record.id}`,
        company_id: record.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: record.employee_id,
        attendance_date: record.attendance_date,
        attendance_record_id: record.id,
        impact_type: "holiday_work_candidate",
        impact_category: "overtime",
        impact_value: 1,
        impact_unit: "day",
        source_reference_type: "attendance_record",
        source_reference_id: record.id,
        note: "Hadir pada hari libur dan berpotensi kompensasi.",
        approval_status: "disetujui",
        created_at: record.updated_at,
        updated_at: record.updated_at,
      });
    }
  });

  conflicts
    .filter((item) => item.resolution_status === "unresolved")
    .forEach((item) => {
      if (!item.employee_id || !item.attendance_date) {
        return;
      }
      impacts.push({
        id: `impact-conflict-${item.id}`,
        company_id: item.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: item.employee_id,
        attendance_date: item.attendance_date,
        attendance_record_id: null,
        impact_type: "no_checkout_review",
        impact_category: "review",
        impact_value: 1,
        impact_unit: "count",
        source_reference_type: "attendance_conflict",
        source_reference_id: item.id,
        note: item.conflict_description,
        approval_status: null,
        created_at: item.updated_at,
        updated_at: item.updated_at,
      });
    });

  requests
    .filter((item) => item.status === "menunggu")
    .forEach((item) => {
      impacts.push({
        id: `impact-request-${item.id}`,
        company_id: item.company_id,
        payroll_period_id: payrollPeriodId,
        employee_id: item.employee_id,
        attendance_date: item.start_date,
        attendance_record_id: item.attendance_record_id || null,
        impact_type: item.request_type === "lembur" ? "overtime_payment_candidate" : "unpaid_leave_candidate",
        impact_category: item.request_type === "lembur" ? "overtime" : "review",
        impact_value: 1,
        impact_unit: "count",
        source_reference_type: "attendance_request",
        source_reference_id: item.id,
        note: `Pengajuan ${item.request_type} masih menunggu approval.`,
        approval_status: item.status,
        created_at: item.updated_at,
        updated_at: item.updated_at,
      });
    });

  return impacts;
}

export function generateEmployeeAttendancePayrollSummary(employeeId, payrollPeriodId, { records, impacts, conflicts = [], requests = [] }) {
  const employeeRecords = records.filter((item) => item.employee_id === employeeId);
  const employeeImpacts = impacts.filter((item) => item.employee_id === employeeId && item.payroll_period_id === payrollPeriodId);
  const employeeConflicts = conflicts.filter((item) => item.employee_id === employeeId && item.resolution_status === "unresolved");
  const employeeRequests = requests.filter((item) => item.employee_id === employeeId && item.status === "menunggu");

  const countStatus = (status) => employeeRecords.filter((item) => item.status_main === status).length;
  const lateRecords = employeeRecords.filter((item) => item.late_minutes > 0);
  const earlyLeaveRecords = employeeRecords.filter((item) => item.early_leave_minutes > 0);
  const overtimeRecords = employeeRecords.filter((item) => item.overtime_minutes > 0);

  return {
    id: `aps-${payrollPeriodId}-${employeeId}`,
    company_id: employeeRecords[0]?.company_id || "cmp-hum-001",
    payroll_period_id: payrollPeriodId,
    employee_id: employeeId,
    scheduled_work_days: employeeRecords.filter((item) => !["off_schedule", "hari_libur"].includes(item.status_main)).length,
    present_days: employeeRecords.filter((item) => ["hadir", "terlambat", "lembur", "pulang_cepat"].includes(item.status_main)).length,
    alpha_days: countStatus("alpha"),
    izin_days: countStatus("izin"),
    sakit_days: countStatus("sakit"),
    cuti_days: countStatus("cuti"),
    late_count: lateRecords.length,
    total_late_minutes: lateRecords.reduce((sum, item) => sum + item.late_minutes, 0),
    early_leave_count: earlyLeaveRecords.length,
    total_early_leave_minutes: earlyLeaveRecords.reduce((sum, item) => sum + item.early_leave_minutes, 0),
    overtime_days: overtimeRecords.length,
    total_overtime_minutes: overtimeRecords.reduce((sum, item) => sum + item.overtime_minutes, 0),
    holiday_work_days: employeeRecords.filter((item) => item.is_holiday_attendance).length,
    correction_count: employeeRequests.filter((item) => item.request_type === "koreksi_absensi").length,
    unresolved_conflict_count: employeeConflicts.length,
    payroll_readiness_status: buildPayrollReadinessStatus({
      unresolvedConflictCount: employeeConflicts.length,
      pendingApprovals: employeeRequests.length,
      lateCount: lateRecords.length,
      alphaDays: countStatus("alpha"),
    }),
    attendance_final_status: employeeConflicts.length || employeeRequests.length ? "reviewed" : "final",
    locked_at: null,
    locked_by: null,
    created_at: employeeRecords[0]?.created_at || new Date().toISOString(),
    updated_at: employeeRecords.at(-1)?.updated_at || new Date().toISOString(),
    impacts: employeeImpacts,
    daily_records: employeeRecords,
  };
}

export function generateAttendancePayrollSummary(payrollPeriodId, { records, employees, conflicts = attendanceConflicts, requests = attendanceRequests, filters = {} }) {
  const filteredRecords = applyRecordFilters(records, buildMonitoringContext({ attendanceRecords: records, employees, branches: [], departments: [], workShifts: [] }), filters);
  const impacts = buildAttendancePayrollImpact(payrollPeriodId, { records: filteredRecords, employees, conflicts, requests, filters });
  return employees
    .filter((employee) => employee.is_active)
    .map((employee) =>
      generateEmployeeAttendancePayrollSummary(employee.id, payrollPeriodId, {
        records: filteredRecords,
        impacts,
        conflicts,
        requests,
      }),
    )
    .filter((item) => item.scheduled_work_days > 0);
}

export function getDailyAttendanceMonitoring(filters, context) {
  const records = applyRecordFilters(context.attendanceRecords, context, filters);
  return {
    summary: summarizeStatuses(records),
    rows: records,
  };
}

export function getAbsenceMonitoring(filters, context) {
  const rows = applyRecordFilters(context.attendanceRecords, context, filters).filter((item) =>
    ["alpha", "izin", "sakit", "cuti", "tidak_absen_masuk", "tidak_absen_pulang", "pulang_cepat", "off_schedule"].includes(item.status_main),
  );
  return {
    summary: summarizeStatuses(rows),
    rows,
  };
}

export function getLateMonitoring(filters, context) {
  const rows = applyRecordFilters(context.attendanceRecords, context, filters).filter((item) => item.late_minutes > 0);
  const employeeRanking = buildEmployeeDisciplineRanking({ records: rows, employees: context.employees })
    .sort((left, right) => right.late_count - left.late_count)
    .slice(0, 8);
  const departmentRanking = buildDepartmentAttendanceRanking({ records: rows, departments: context.departments, employees: context.employees })
    .sort((left, right) => right.late_cases - left.late_cases)
    .slice(0, 8);
  return {
    summary: {
      total_cases: rows.length,
      total_minutes: rows.reduce((sum, item) => sum + item.late_minutes, 0),
    },
    rows,
    employeeRanking,
    departmentRanking,
  };
}

export function getOvertimeMonitoring(filters, context) {
  const rows = applyRecordFilters(context.attendanceRecords, context, filters).filter((item) => item.overtime_minutes > 0);
  return {
    summary: {
      total_cases: rows.length,
      total_minutes: rows.reduce((sum, item) => sum + item.overtime_minutes, 0),
      approved_cases: rows.filter((item) => item.overtime_minutes > 0).length,
    },
    rows,
  };
}

export function buildHrAttendanceDashboard(filters, context) {
  const daily = getDailyAttendanceMonitoring(filters, context);
  const pendingApprovals = attendanceRequests.filter((item) => item.status === "menunggu");
  const unresolvedConflicts = attendanceConflicts.filter((item) => item.resolution_status === "unresolved");
  const trend7 = buildAttendanceTrend({ records: applyRecordFilters(context.attendanceRecords, context, filters), days: 7 });
  const trend30 = buildAttendanceTrend({ records: applyRecordFilters(context.attendanceRecords, context, filters), days: 30 });
  const departmentRanking = buildDepartmentAttendanceRanking({
    records: applyRecordFilters(context.attendanceRecords, context, filters),
    departments: context.departments,
    employees: context.employees,
  });

  return {
    summary: {
      total_active_employees: context.employees.filter((item) => item.is_active).length,
      hadir_hari_ini: daily.summary.hadir,
      terlambat_hari_ini: daily.summary.terlambat,
      alpha_hari_ini: daily.summary.alpha,
      izin_hari_ini: daily.summary.izin,
      sakit_hari_ini: daily.summary.sakit,
      cuti_hari_ini: daily.summary.cuti,
      belum_check_out: daily.summary.belum_check_out,
      lembur_hari_ini: daily.summary.lembur,
      conflict_absensi: unresolvedConflicts.length,
      pengajuan_pending: pendingApprovals.length,
      data_belum_siap_payroll: unresolvedConflicts.length + pendingApprovals.length,
    },
    daily,
    pendingApprovals,
    unresolvedConflicts,
    lateToday: daily.rows.filter((item) => item.late_minutes > 0).slice(0, 6),
    alphaToday: daily.rows.filter((item) => item.status_main === "alpha").slice(0, 6),
    noCheckoutToday: daily.rows.filter((item) => item.actual_checkin && !item.actual_checkout).slice(0, 6),
    trend7,
    trend30,
    departmentRanking,
  };
}

export function buildManagerAttendanceDashboard(managerId, filters, context) {
  const scope = context.managerScopes.find((item) => item.manager_id === managerId);
  const scopedDepartmentIds = new Set(scope?.department_ids || []);
  const records = applyRecordFilters(context.attendanceRecords, context, filters).filter((item) => scopedDepartmentIds.has(item.department_id));
  const teamEmployees = context.employees.filter((item) => scopedDepartmentIds.has(item.department_id) && item.is_active);
  const summary = summarizeStatuses(records);
  const pendingApprovals = attendanceRequests.filter((item) => item.status === "menunggu" && scopedDepartmentIds.has(context.employeeMap.get(item.employee_id)?.department_id));
  const disciplineRanking = buildEmployeeDisciplineRanking({ records, employees: teamEmployees }).slice(0, 5);

  return {
    summary: {
      total_anggota_tim: teamEmployees.length,
      hadir_hari_ini: summary.hadir,
      terlambat: summary.terlambat,
      tidak_hadir: summary.alpha,
      belum_check_out: summary.belum_check_out,
      pengajuan_pending: pendingApprovals.length,
      lembur_tim_hari_ini: summary.lembur,
    },
    teamToday: records.slice(0, 10),
    lateTeam: records.filter((item) => item.late_minutes > 0).slice(0, 6),
    noCheckout: records.filter((item) => item.actual_checkin && !item.actual_checkout).slice(0, 6),
    pendingApprovals,
    disciplineRanking,
  };
}

export function markAttendanceDataReadyForPayroll(payrollPeriodId, payload) {
  const employeeIds = payload?.employeeIds || [];
  return {
    payroll_period_id: payrollPeriodId,
    marked_employee_ids: employeeIds,
    marked_at: new Date().toISOString(),
    note: payload?.note || "Data ditandai siap payroll setelah review HR.",
  };
}

export function lockAttendanceForPayroll(payrollPeriodId, payload = {}) {
  return {
    payroll_period_id: payrollPeriodId,
    status: "locked",
    locked_by: payload.lockedBy || "emp-pres-001",
    locked_at: new Date().toISOString(),
    note: payload.note || "Periode presensi dikunci untuk payroll.",
  };
}

export function unlockAttendanceForPayroll(payrollPeriodId, reason) {
  return {
    payroll_period_id: payrollPeriodId,
    status: "dalam_review",
    unlocked_at: new Date().toISOString(),
    reason,
  };
}

export function getAttendanceIssuesBlockingPayroll(payrollPeriodId, { conflicts = attendanceConflicts, requests = attendanceRequests }) {
  return {
    payroll_period_id: payrollPeriodId,
    unresolved_conflicts: conflicts.filter((item) => item.resolution_status === "unresolved"),
    pending_requests: requests.filter((item) => item.status === "menunggu"),
    processed_conflict_records: attendanceProcessedRecords.filter((item) => item.validation_status === "conflict"),
  };
}

export function getAttendanceFinalizationStatus(payrollPeriodId, { summaries = [], issues }) {
  const totalEmployees = summaries.length;
  const totalReady = summaries.filter((item) => item.payroll_readiness_status === "ready").length;
  const totalNeedReview = summaries.filter((item) => item.payroll_readiness_status !== "ready").length;
  const totalLocked = summaries.filter((item) => item.locked_at).length;
  const unresolved = issues?.unresolved_conflicts?.length || 0;
  const pending = issues?.pending_requests?.length || 0;
  const progress = totalEmployees ? Math.round((totalReady / totalEmployees) * 100) : 0;

  return {
    id: `finalization-${payrollPeriodId}`,
    company_id: summaries[0]?.company_id || "cmp-hum-001",
    payroll_period_id: payrollPeriodId,
    status: unresolved || pending ? "dalam_review" : totalLocked === totalEmployees && totalEmployees > 0 ? "locked" : totalReady === totalEmployees && totalEmployees > 0 ? "siap_payroll" : "draft",
    total_employees: totalEmployees,
    total_ready: totalReady,
    total_need_review: totalNeedReview,
    total_locked: totalLocked,
    finalized_by: null,
    finalized_at: null,
    locked_by: totalLocked ? "emp-pres-001" : null,
    locked_at: totalLocked ? new Date().toISOString() : null,
    note: unresolved || pending ? "Masih ada issue yang perlu dibersihkan sebelum payroll." : "Periode presensi siap dilanjutkan ke payroll.",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    progress_percent: progress,
  };
}

export function exportAttendancePayrollRecap(payrollPeriodId, format) {
  return {
    payroll_period_id: payrollPeriodId,
    format,
    exported_at: new Date().toISOString(),
    file_name: `rekap-presensi-payroll-${payrollPeriodId}.${format === "excel" ? "xlsx" : format === "csv" ? "csv" : "pdf"}`,
  };
}
