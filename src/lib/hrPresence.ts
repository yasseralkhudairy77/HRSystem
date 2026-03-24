import type {
  ApprovalStatus,
  AttendanceException,
  AttendanceExceptionSummary,
  AttendanceRecord,
  AttendanceSource,
  AttendanceStatus,
  AttendanceSummary,
  EmployeeSchedule,
  Holiday,
  MonthlyScheduleCell,
  MonthlyScheduleMatrixRow,
  PresenceEmployee,
  WorkShift,
} from "@/types/hrPresence";

const MINUTES_PER_DAY = 24 * 60;

export function timeStringToMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateShiftWorkMinutes(params: {
  checkinTime: string;
  checkoutTime: string;
  hasBreak?: boolean;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}) {
  const checkin = timeStringToMinutes(params.checkinTime);
  const checkout = timeStringToMinutes(params.checkoutTime);

  if (checkin === null || checkout === null) {
    return 0;
  }

  let total = checkout - checkin;
  if (total <= 0) {
    total += MINUTES_PER_DAY;
  }

  if (params.hasBreak && params.breakStartTime && params.breakEndTime) {
    const breakStart = timeStringToMinutes(params.breakStartTime);
    const breakEnd = timeStringToMinutes(params.breakEndTime);

    if (breakStart !== null && breakEnd !== null) {
      let breakDuration = breakEnd - breakStart;
      if (breakDuration <= 0) {
        breakDuration += MINUTES_PER_DAY;
      }

      total -= breakDuration;
    }
  }

  return Math.max(total, 0);
}

export function detectCrossDayShift(checkinTime: string, checkoutTime: string) {
  const checkin = timeStringToMinutes(checkinTime);
  const checkout = timeStringToMinutes(checkoutTime);

  if (checkin === null || checkout === null) {
    return false;
  }

  return checkout <= checkin;
}

export function formatAttendanceStatusLabel(status: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    hadir: "Hadir",
    terlambat: "Terlambat",
    alpha: "Alpha",
    izin: "Izin",
    sakit: "Sakit",
    cuti: "Cuti",
    lembur: "Lembur",
    pulang_cepat: "Pulang cepat",
    tidak_absen_masuk: "Tidak absen masuk",
    tidak_absen_pulang: "Tidak absen pulang",
  };

  return labels[status] || status;
}

export function buildShiftColorMap(shifts: WorkShift[]) {
  return shifts.reduce<Record<string, string>>((accumulator, shift) => {
    accumulator[shift.id] = shift.color_hex;
    return accumulator;
  }, {});
}

function createDateRange(date: Date, totalDays: number) {
  return Array.from({ length: totalDays }, (_, index) => {
    const current = new Date(date.getFullYear(), date.getMonth(), index + 1);
    return current.toISOString().slice(0, 10);
  });
}

export function generateMonthlyScheduleMatrix(params: {
  employees: PresenceEmployee[];
  schedules: EmployeeSchedule[];
  shifts: WorkShift[];
  holidays?: Holiday[];
  month: number;
  year: number;
}) {
  const { employees, schedules, shifts, holidays = [], month, year } = params;
  const shiftMap = new Map(shifts.map((shift) => [shift.id, shift]));
  const holidayMap = new Map(holidays.filter((item) => item.is_active).map((item) => [item.holiday_date, item]));
  const dates = createDateRange(new Date(year, month - 1, 1), new Date(year, month, 0).getDate());

  return employees.map<MonthlyScheduleMatrixRow>((employee) => {
    const employeeSchedules = schedules.filter((schedule) => schedule.employee_id === employee.id);

    const cells = dates.map<MonthlyScheduleCell>((date) => {
      const schedule = employeeSchedules.find((item) => item.work_date === date);
      const holiday = holidayMap.get(date);

      if (schedule) {
        const shift = shiftMap.get(schedule.shift_id);

        return {
          date,
          shift_id: schedule.shift_id,
          shift_name: shift?.shift_name || "Shift belum ditemukan",
          color_hex: shift?.color_hex || null,
          status: "scheduled",
          note: schedule.note,
        };
      }

      if (holiday) {
        return {
          date,
          shift_id: null,
          shift_name: holiday.holiday_name,
          color_hex: null,
          status: "holiday",
          note: holiday.description,
        };
      }

      return {
        date,
        shift_id: null,
        shift_name: "Off",
        color_hex: null,
        status: "off",
        note: null,
      };
    });

    return {
      employee_id: employee.id,
      employee_name: employee.employee_name,
      branch_id: employee.branch_id,
      department_id: employee.department_id,
      cells,
    };
  });
}

export function summarizeAttendanceRecords(records: AttendanceRecord[]): AttendanceSummary {
  const initialByStatus: Record<AttendanceStatus, number> = {
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
  };

  const initialSources: Record<AttendanceSource, number> = {
    mobile: 0,
    fingerprint: 0,
    manual: 0,
    face_recognition: 0,
  };

  return records.reduce<AttendanceSummary>(
    (summary, record) => {
      summary.totalRecords += 1;
      summary.byStatus[record.status] += 1;
      summary.totalLateMinutes += record.late_minutes;
      summary.totalEarlyLeaveMinutes += record.early_leave_minutes;
      summary.totalOvertimeMinutes += record.overtime_minutes;
      summary.sources[record.attendance_source] += 1;
      return summary;
    },
    {
      totalRecords: 0,
      byStatus: initialByStatus,
      totalLateMinutes: 0,
      totalEarlyLeaveMinutes: 0,
      totalOvertimeMinutes: 0,
      sources: initialSources,
    },
  );
}

export function summarizeAttendanceExceptions(exceptions: AttendanceException[]): AttendanceExceptionSummary {
  return exceptions.reduce<AttendanceExceptionSummary>(
    (summary, exception) => {
      summary.totalExceptions += 1;
      summary.byType[exception.exception_type] = (summary.byType[exception.exception_type] || 0) + 1;
      summary.byStatus[exception.status] = (summary.byStatus[exception.status] || 0) + 1;
      return summary;
    },
    {
      totalExceptions: 0,
      byType: {},
      byStatus: {
        draft: 0,
        menunggu: 0,
        disetujui: 0,
        ditolak: 0,
      } as Record<ApprovalStatus, number>,
    },
  );
}

export function groupAttendanceRecordsByEmployee(records: AttendanceRecord[]) {
  return records.reduce<Record<string, AttendanceRecord[]>>((accumulator, record) => {
    if (!accumulator[record.employee_id]) {
      accumulator[record.employee_id] = [];
    }

    accumulator[record.employee_id].push(record);
    return accumulator;
  }, {});
}

export function createAttendanceUiHelpers(params: {
  employees: PresenceEmployee[];
  schedules: EmployeeSchedule[];
  attendanceRecords: AttendanceRecord[];
  attendanceExceptions: AttendanceException[];
  shifts: WorkShift[];
  holidays: Holiday[];
  month: number;
  year: number;
}) {
  const scheduleMatrix = generateMonthlyScheduleMatrix({
    employees: params.employees,
    schedules: params.schedules,
    shifts: params.shifts,
    holidays: params.holidays,
    month: params.month,
    year: params.year,
  });

  return {
    shiftColorMap: buildShiftColorMap(params.shifts),
    attendanceSummary: summarizeAttendanceRecords(params.attendanceRecords),
    exceptionSummary: summarizeAttendanceExceptions(params.attendanceExceptions),
    scheduleMatrix,
    attendanceByEmployee: groupAttendanceRecordsByEmployee(params.attendanceRecords),
  };
}
