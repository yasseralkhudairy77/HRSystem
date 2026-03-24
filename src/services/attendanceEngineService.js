import {
  buildShiftColorMap,
  timeStringToMinutes,
} from "@/lib/hrPresence";

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutes(date, minutes) {
  const next = new Date(date.getTime());
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return next;
}

function formatDateKey(value) {
  const parsed = toDate(value);
  if (!parsed) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function startOfDayUtc(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function initialStatusMap() {
  return {
    hadir: 0,
    terlambat: 0,
    alpha: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    lembur: 0,
    pulang_cepat: 0,
    tidak_absen_masuk: 0,
    tidak_absen_pulang: 0,
    hari_libur: 0,
    off_schedule: 0,
  };
}

export function buildShiftDateTimeRange(workDate, shift) {
  if (!workDate || !shift) {
    return {
      scheduled_checkin_datetime: null,
      scheduled_checkout_datetime: null,
      break_start_datetime: null,
      break_end_datetime: null,
      is_cross_day: false,
    };
  }

  const baseDate = startOfDayUtc(workDate);
  const checkinMinutes = timeStringToMinutes(shift.checkin_time);
  const checkoutMinutes = timeStringToMinutes(shift.checkout_time);
  const breakStartMinutes = timeStringToMinutes(shift.break_start_time);
  const breakEndMinutes = timeStringToMinutes(shift.break_end_time);
  const isCrossDay = Boolean(shift.cross_day || (checkoutMinutes !== null && checkinMinutes !== null && checkoutMinutes <= checkinMinutes));

  const scheduledCheckin = checkinMinutes === null ? null : addMinutes(baseDate, checkinMinutes);
  const scheduledCheckout = checkoutMinutes === null ? null : addMinutes(baseDate, checkoutMinutes + (isCrossDay ? 24 * 60 : 0));

  let breakStart = breakStartMinutes === null ? null : addMinutes(baseDate, breakStartMinutes);
  let breakEnd = breakEndMinutes === null ? null : addMinutes(baseDate, breakEndMinutes);

  if (isCrossDay && breakStartMinutes !== null && breakEndMinutes !== null && breakEndMinutes <= breakStartMinutes) {
    breakEnd = addMinutes(baseDate, breakEndMinutes + 24 * 60);
  }

  return {
    scheduled_checkin_datetime: scheduledCheckin?.toISOString() || null,
    scheduled_checkout_datetime: scheduledCheckout?.toISOString() || null,
    break_start_datetime: breakStart?.toISOString() || null,
    break_end_datetime: breakEnd?.toISOString() || null,
    is_cross_day: isCrossDay,
  };
}

export function calculateLateMinutes(actualCheckin, scheduledCheckin, toleranceMinutes = 0) {
  const actual = toDate(actualCheckin);
  const scheduled = toDate(scheduledCheckin);

  if (!actual || !scheduled) {
    return 0;
  }

  const differenceMinutes = Math.round((actual.getTime() - scheduled.getTime()) / 60000);
  return differenceMinutes > toleranceMinutes ? differenceMinutes : 0;
}

export function calculateEarlyLeaveMinutes(actualCheckout, scheduledCheckout, toleranceMinutes = 0) {
  const actual = toDate(actualCheckout);
  const scheduled = toDate(scheduledCheckout);

  if (!actual || !scheduled) {
    return 0;
  }

  const differenceMinutes = Math.round((scheduled.getTime() - actual.getTime()) / 60000);
  return differenceMinutes > toleranceMinutes ? differenceMinutes : 0;
}

export function calculateOvertimeMinutes(actualCheckout, scheduledCheckout, minimumOvertimeMinutes = 0) {
  const actual = toDate(actualCheckout);
  const scheduled = toDate(scheduledCheckout);

  if (!actual || !scheduled) {
    return 0;
  }

  const differenceMinutes = Math.round((actual.getTime() - scheduled.getTime()) / 60000);
  return differenceMinutes >= minimumOvertimeMinutes ? differenceMinutes : 0;
}

export function resolveEmployeeSchedule(employeeId, workDate, context) {
  const { employeeSchedules = [], employees = [], departmentWorkShifts = [] } = context;
  const directSchedule = employeeSchedules.find((item) => item.employee_id === employeeId && item.work_date === workDate) || null;

  if (directSchedule) {
    return {
      schedule: directSchedule,
      resolution_source: "employee_schedule",
      status: "scheduled",
    };
  }

  const employee = employees.find((item) => item.id === employeeId) || null;
  if (!employee) {
    return {
      schedule: null,
      resolution_source: "missing_employee",
      status: "off_schedule",
    };
  }

  const departmentDefault = departmentWorkShifts.find((item) => {
    if (item.department_id !== employee.department_id || !item.is_active) {
      return false;
    }

    const startDate = item.effective_start_date;
    const endDate = item.effective_end_date;
    if (startDate && workDate < startDate) {
      return false;
    }

    if (endDate && workDate > endDate) {
      return false;
    }

    return true;
  });

  if (!departmentDefault) {
    return {
      schedule: null,
      resolution_source: "department_default_missing",
      status: "off_schedule",
    };
  }

  return {
    schedule: {
      id: `fallback-${employeeId}-${workDate}`,
      company_id: employee.company_id,
      employee_id: employee.id,
      work_date: workDate,
      shift_id: departmentDefault.default_shift_id,
      branch_id: employee.branch_id,
      department_id: employee.department_id,
      assigned_by: null,
      source_type: "default_department",
      note: "Jadwal ditarik dari default departemen.",
      created_at: "",
      updated_at: "",
    },
    resolution_source: "department_default",
    status: "scheduled",
  };
}

function findHolidayForEmployee(workDate, employee, holidays = []) {
  return holidays.find((holiday) => holiday.holiday_date === workDate && holiday.is_active && (holiday.department_id === null || holiday.department_id === employee?.department_id)) || null;
}

function findApprovedException(employeeId, workDate, exceptions = []) {
  return exceptions.find((exception) => exception.employee_id === employeeId && exception.exception_date === workDate && exception.status === "disetujui") || null;
}

function findActualAttendance(employeeId, workDate, attendanceRecords = []) {
  return attendanceRecords.find((record) => record.employee_id === employeeId && record.attendance_date === workDate) || null;
}

export function buildAttendanceFlags(result) {
  return {
    is_late: result.late_minutes > 0,
    is_early_leave: result.early_leave_minutes > 0,
    is_overtime: result.overtime_minutes > 0,
    is_cross_day: Boolean(result.is_cross_day),
    is_holiday: Boolean(result.is_holiday),
    is_holiday_attendance: Boolean(result.is_holiday_attendance),
    has_break_record: Boolean(result.break_checkin || result.break_checkout),
  };
}

export function resolveAttendanceStatus(params) {
  const {
    employee,
    workDate,
    settings,
    employeeSchedules = [],
    departmentWorkShifts = [],
    workShifts = [],
    holidays = [],
    attendanceRecords = [],
    attendanceExceptions = [],
    minimumOvertimeMinutes = 30,
    earlyLeaveToleranceMinutes = 0,
  } = params;

  const scheduleResolution = resolveEmployeeSchedule(employee.id, workDate, {
    employeeSchedules,
    employees: [employee],
    departmentWorkShifts,
  });
  const schedule = scheduleResolution.schedule;
  const shift = schedule ? workShifts.find((item) => item.id === schedule.shift_id) || null : null;
  const holiday = findHolidayForEmployee(workDate, employee, holidays);
  const approvedException = findApprovedException(employee.id, workDate, attendanceExceptions);
  const actualAttendance = findActualAttendance(employee.id, workDate, attendanceRecords);
  const shiftRange = buildShiftDateTimeRange(workDate, shift);

  const baseResult = {
    id: actualAttendance?.id || `resolved-${employee.id}-${workDate}`,
    employee_id: employee.id,
    attendance_date: workDate,
    shift_id: shift?.id || null,
    branch_id: schedule?.branch_id || employee.branch_id || null,
    department_id: schedule?.department_id || employee.department_id || null,
    scheduled_checkin: shiftRange.scheduled_checkin_datetime,
    scheduled_checkout: shiftRange.scheduled_checkout_datetime,
    actual_checkin: actualAttendance?.actual_checkin || null,
    actual_checkout: actualAttendance?.actual_checkout || null,
    break_checkin: actualAttendance?.break_checkin || null,
    break_checkout: actualAttendance?.break_checkout || null,
    status_main: "off_schedule",
    late_minutes: 0,
    early_leave_minutes: 0,
    overtime_minutes: 0,
    is_cross_day: shiftRange.is_cross_day,
    is_holiday: Boolean(holiday),
    is_holiday_attendance: false,
    note: actualAttendance?.note || null,
    reason: "",
    source: actualAttendance?.attendance_source || "system",
  };

  if (holiday && !schedule) {
    const result = {
      ...baseResult,
      status_main: "hari_libur",
      reason: `Tanggal ${workDate} adalah hari libur resmi dan karyawan tidak memiliki jadwal kerja.`,
    };

    return {
      ...result,
      ...buildAttendanceFlags(result),
    };
  }

  if (!schedule || !shift) {
    const result = {
      ...baseResult,
      status_main: "off_schedule",
      reason: `Tidak ada jadwal kerja aktif untuk ${workDate}.`,
    };

    return {
      ...result,
      ...buildAttendanceFlags(result),
    };
  }

  if (approvedException?.exception_type === "cuti") {
    const result = {
      ...baseResult,
      status_main: "cuti",
      reason: "Ada data cuti resmi yang disetujui.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  if (approvedException?.exception_type === "sakit") {
    const result = {
      ...baseResult,
      status_main: "sakit",
      reason: "Ada data sakit resmi yang disetujui.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  if (approvedException?.exception_type === "izin") {
    const result = {
      ...baseResult,
      status_main: "izin",
      reason: "Ada data izin resmi yang disetujui.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  const hasCheckin = Boolean(actualAttendance?.actual_checkin);
  const hasCheckout = Boolean(actualAttendance?.actual_checkout);

  if (!hasCheckin && !hasCheckout) {
    const result = {
      ...baseResult,
      status_main: "alpha",
      reason: "Ada jadwal kerja aktif tetapi tidak ada check-in dan check-out.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  if (hasCheckin && !hasCheckout) {
    const result = {
      ...baseResult,
      actual_checkin: actualAttendance.actual_checkin,
      status_main: "tidak_absen_pulang",
      reason: "Ada check-in tetapi tidak ada check-out.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  if (!hasCheckin && hasCheckout) {
    const result = {
      ...baseResult,
      actual_checkout: actualAttendance.actual_checkout,
      status_main: "tidak_absen_masuk",
      reason: "Ada check-out tetapi tidak ada check-in.",
    };
    return { ...result, ...buildAttendanceFlags(result) };
  }

  const lateMinutes = calculateLateMinutes(actualAttendance.actual_checkin, shiftRange.scheduled_checkin_datetime, settings?.tolerance_late_minutes || 0);
  const earlyLeaveMinutes = calculateEarlyLeaveMinutes(actualAttendance.actual_checkout, shiftRange.scheduled_checkout_datetime, earlyLeaveToleranceMinutes);
  const overtimeMinutes = calculateOvertimeMinutes(actualAttendance.actual_checkout, shiftRange.scheduled_checkout_datetime, minimumOvertimeMinutes);

  let statusMain = "hadir";
  let reason = "Presensi sesuai jadwal aktif.";

  if (lateMinutes > 0) {
    statusMain = "terlambat";
    reason = `Check-in melewati toleransi ${settings?.tolerance_late_minutes || 0} menit.`;
  } else if (earlyLeaveMinutes > 0) {
    statusMain = "pulang_cepat";
    reason = "Check-out lebih awal dari jadwal pulang.";
  } else if (overtimeMinutes > 0) {
    statusMain = "lembur";
    reason = `Check-out melebihi jadwal pulang minimal ${minimumOvertimeMinutes} menit.`;
  }

  const result = {
    ...baseResult,
    actual_checkin: actualAttendance.actual_checkin,
    actual_checkout: actualAttendance.actual_checkout,
    status_main: statusMain,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    overtime_minutes: overtimeMinutes,
    is_holiday_attendance: Boolean(holiday),
    reason,
  };

  return {
    ...result,
    ...buildAttendanceFlags(result),
  };
}

export function generateAttendanceSummary(records = []) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;
      summary.byStatus[record.status_main] += 1;
      if (record.is_late) summary.lateCount += 1;
      if (record.is_early_leave) summary.earlyLeaveCount += 1;
      if (record.is_overtime) summary.overtimeCount += 1;
      if (record.is_holiday) summary.holidayCount += 1;
      return summary;
    },
    {
      total: 0,
      byStatus: initialStatusMap(),
      lateCount: 0,
      earlyLeaveCount: 0,
      overtimeCount: 0,
      holidayCount: 0,
    },
  );
}

export function generateAbsenceSummary(records = []) {
  const summary = {
    alpha: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    pulang_cepat: 0,
    tidak_absen_masuk: 0,
    tidak_absen_pulang: 0,
    hari_libur: 0,
    off_schedule: 0,
  };

  records.forEach((record) => {
    if (summary[record.status_main] !== undefined) {
      summary[record.status_main] += 1;
    }
  });

  return summary;
}

export function evaluateAttendanceForDate(workDate, context) {
  const {
    employees = [],
    employeeIds = employees.map((employee) => employee.id),
  } = context;

  return employeeIds
    .map((employeeId) => {
      const employee = employees.find((item) => item.id === employeeId);
      if (!employee) {
        return null;
      }

      return resolveAttendanceStatus({
        employee,
        workDate,
        ...context,
      });
    })
    .filter(Boolean);
}

export function evaluateAttendanceRecords(context) {
  const { employees = [], attendanceDates = [], workShifts = [] } = context;
  const dates = attendanceDates.length
    ? attendanceDates
    : Array.from(
        new Set([
          ...context.employeeSchedules.map((item) => item.work_date),
          ...context.holidays.map((item) => item.holiday_date),
          ...context.attendanceRecords.map((item) => item.attendance_date),
        ]),
      ).sort();

  const results = dates.flatMap((workDate) => evaluateAttendanceForDate(workDate, { ...context, workDate, employees }));
  const shiftColorMap = buildShiftColorMap(workShifts);

  return {
    records: results,
    attendanceSummary: generateAttendanceSummary(results),
    absenceSummary: generateAbsenceSummary(results),
    shiftColorMap,
  };
}
