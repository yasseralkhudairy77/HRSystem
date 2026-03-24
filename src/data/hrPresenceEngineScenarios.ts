import { resolveAttendanceStatus } from "@/services/attendanceEngineService";

const baseSettings = {
  tolerance_late_minutes: 10,
  early_checkin_limit_minutes: 60,
  late_checkin_limit_minutes: 180,
  checkout_limit_minutes: 240,
};

const baseEmployee = {
  id: "emp-scn-001",
  company_id: "cmp-scn-001",
  employee_id: "EMP-SCN-001",
  employee_name: "Karyawan Skenario",
  job_title: "Staff Operasional",
  branch_id: "branch-scn-001",
  department_id: "dep-scn-001",
  employment_status: "Aktif",
  joined_at: "2026-01-01",
  is_active: true,
};

const normalShift = {
  id: "shift-normal",
  company_id: "cmp-scn-001",
  shift_code: "SCN01",
  shift_name: "Shift Pagi",
  checkin_time: "08:00",
  checkout_time: "16:00",
  has_break: true,
  break_start_time: "12:00",
  break_end_time: "13:00",
  total_work_minutes: 420,
  cross_day: false,
  color_hex: "#2563EB",
  description: "Shift normal",
  is_active: true,
  created_at: "",
  updated_at: "",
};

const crossDayShift = {
  ...normalShift,
  id: "shift-malam",
  shift_code: "SCN02",
  shift_name: "Shift Malam",
  checkin_time: "22:00",
  checkout_time: "07:00",
  break_start_time: "02:00",
  break_end_time: "02:30",
  total_work_minutes: 510,
  cross_day: true,
  color_hex: "#0F172A",
};

function buildContext({
  workDate,
  shift = normalShift,
  actualCheckin = null,
  actualCheckout = null,
  exceptionType = null,
  holiday = false,
  schedule = true,
}) {
  return {
    employee: baseEmployee,
    workDate,
    settings: baseSettings,
    employeeSchedules: schedule
      ? [
          {
            id: `sch-${workDate}`,
            company_id: baseEmployee.company_id,
            employee_id: baseEmployee.id,
            work_date: workDate,
            shift_id: shift.id,
            branch_id: baseEmployee.branch_id,
            department_id: baseEmployee.department_id,
            assigned_by: null,
            source_type: "manual",
            note: null,
            created_at: "",
            updated_at: "",
          },
        ]
      : [],
    departmentWorkShifts: [],
    workShifts: [shift],
    holidays: holiday
      ? [
          {
            id: `holiday-${workDate}`,
            company_id: baseEmployee.company_id,
            holiday_name: "Hari Libur Skenario",
            holiday_date: workDate,
            holiday_type: "nasional",
            department_id: null,
            description: "Hari libur uji",
            is_active: true,
            created_at: "",
            updated_at: "",
          },
        ]
      : [],
    attendanceRecords:
      actualCheckin || actualCheckout
        ? [
            {
              id: `att-${workDate}`,
              company_id: baseEmployee.company_id,
              employee_id: baseEmployee.id,
              attendance_date: workDate,
              shift_id: shift.id,
              branch_id: baseEmployee.branch_id,
              department_id: baseEmployee.department_id,
              scheduled_checkin: null,
              scheduled_checkout: null,
              actual_checkin: actualCheckin,
              actual_checkout: actualCheckout,
              break_checkin: null,
              break_checkout: null,
              status: "hadir",
              late_minutes: 0,
              early_leave_minutes: 0,
              overtime_minutes: 0,
              attendance_source: "fingerprint",
              selfie_url: null,
              latitude: null,
              longitude: null,
              device_id: "dev-scn-001",
              note: null,
              created_at: "",
              updated_at: "",
            },
          ]
        : [],
    attendanceExceptions: exceptionType
      ? [
          {
            id: `exc-${workDate}`,
            company_id: baseEmployee.company_id,
            employee_id: baseEmployee.id,
            attendance_record_id: null,
            exception_type: exceptionType,
            exception_date: workDate,
            description: `Exception ${exceptionType}`,
            approved_by: "approver-001",
            status: "disetujui",
            created_at: "",
            updated_at: "",
          },
        ]
      : [],
    minimumOvertimeMinutes: 30,
    earlyLeaveToleranceMinutes: 5,
  };
}

export const hrPresenceEngineScenarioResults = [
  {
    id: "scn-01",
    title: "Hadir normal",
    expected: "hadir",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-01", actualCheckin: "2026-03-01T08:00:00.000Z", actualCheckout: "2026-03-01T16:00:00.000Z" })),
  },
  {
    id: "scn-02",
    title: "Terlambat 5 menit masih toleransi",
    expected: "hadir",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-02", actualCheckin: "2026-03-02T08:05:00.000Z", actualCheckout: "2026-03-02T16:00:00.000Z" })),
  },
  {
    id: "scn-03",
    title: "Terlambat melewati toleransi",
    expected: "terlambat",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-03", actualCheckin: "2026-03-03T08:17:00.000Z", actualCheckout: "2026-03-03T16:00:00.000Z" })),
  },
  {
    id: "scn-04",
    title: "Pulang cepat",
    expected: "pulang_cepat",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-04", actualCheckin: "2026-03-04T08:00:00.000Z", actualCheckout: "2026-03-04T15:10:00.000Z" })),
  },
  {
    id: "scn-05",
    title: "Lembur",
    expected: "lembur",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-05", actualCheckin: "2026-03-05T08:00:00.000Z", actualCheckout: "2026-03-05T17:05:00.000Z" })),
  },
  {
    id: "scn-06",
    title: "Alpha",
    expected: "alpha",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-06" })),
  },
  {
    id: "scn-07",
    title: "Izin resmi",
    expected: "izin",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-07", exceptionType: "izin" })),
  },
  {
    id: "scn-08",
    title: "Sakit resmi",
    expected: "sakit",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-08", exceptionType: "sakit" })),
  },
  {
    id: "scn-09",
    title: "Cuti resmi",
    expected: "cuti",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-09", exceptionType: "cuti" })),
  },
  {
    id: "scn-10",
    title: "Tidak absen masuk",
    expected: "tidak_absen_masuk",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-10", actualCheckout: "2026-03-10T16:00:00.000Z" })),
  },
  {
    id: "scn-11",
    title: "Tidak absen pulang",
    expected: "tidak_absen_pulang",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-11", actualCheckin: "2026-03-11T08:00:00.000Z" })),
  },
  {
    id: "scn-12",
    title: "Shift malam lintas hari hadir normal",
    expected: "hadir",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-12", shift: crossDayShift, actualCheckin: "2026-03-12T22:00:00.000Z", actualCheckout: "2026-03-13T07:00:00.000Z" })),
  },
  {
    id: "scn-13",
    title: "Shift malam lintas hari terlambat",
    expected: "terlambat",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-13", shift: crossDayShift, actualCheckin: "2026-03-13T22:18:00.000Z", actualCheckout: "2026-03-14T07:00:00.000Z" })),
  },
  {
    id: "scn-14",
    title: "Hadir di hari libur dengan jadwal aktif",
    expected: "hadir",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-14", holiday: true, actualCheckin: "2026-03-14T08:00:00.000Z", actualCheckout: "2026-03-14T16:00:00.000Z" })),
  },
  {
    id: "scn-15",
    title: "Hari libur tanpa jadwal kerja",
    expected: "hari_libur",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-15", holiday: true, schedule: false })),
  },
  {
    id: "scn-16",
    title: "Tidak ada jadwal kerja sama sekali",
    expected: "off_schedule",
    result: resolveAttendanceStatus(buildContext({ workDate: "2026-03-16", schedule: false })),
  },
].map((scenario) => ({
  ...scenario,
  pass: scenario.result.status_main === scenario.expected,
}));
