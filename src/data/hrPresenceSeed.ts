import {
  calculateShiftWorkMinutes,
  detectCrossDayShift,
  formatAttendanceStatusLabel,
  generateMonthlyScheduleMatrix,
  groupAttendanceRecordsByEmployee,
} from "@/lib/hrPresence";
import { evaluateAttendanceRecords } from "@/services/attendanceEngineService";
import type {
  AttendanceException,
  AttendancePenalty,
  AttendanceRecord,
  AttendanceSettings,
  DepartmentWorkShift,
  EmployeeSchedule,
  FingerprintDevice,
  Holiday,
  HrPresenceEntityRelation,
  PresenceBranch,
  PresenceCompany,
  PresenceDepartment,
  PresenceEmployee,
  WorkShift,
} from "@/types/hrPresence";

const companyId = "cmp-hum-001";
const createdAt = "2026-03-01T08:00:00.000Z";
const updatedAt = "2026-03-24T08:00:00.000Z";
const demoMonth = 3;
const demoYear = 2026;

const attendanceStatusOverrides: Record<string, Record<string, AttendanceRecord["status"]>> = {
  "emp-pres-001": {
    "2026-03-05": "terlambat",
    "2026-03-12": "izin",
    "2026-03-20": "pulang_cepat",
  },
  "emp-pres-002": {
    "2026-03-04": "sakit",
    "2026-03-18": "terlambat",
  },
  "emp-pres-003": {
    "2026-03-10": "terlambat",
    "2026-03-25": "lembur",
  },
  "emp-pres-004": {
    "2026-03-06": "alpha",
    "2026-03-22": "izin",
  },
  "emp-pres-005": {
    "2026-03-08": "tidak_absen_pulang",
    "2026-03-15": "lembur",
  },
  "emp-pres-006": {
    "2026-03-03": "pulang_cepat",
    "2026-03-14": "cuti",
  },
  "emp-pres-007": {
    "2026-03-07": "terlambat",
    "2026-03-21": "sakit",
  },
  "emp-pres-008": {
    "2026-03-11": "tidak_absen_masuk",
    "2026-03-19": "terlambat",
  },
  "emp-pres-009": {
    "2026-03-13": "lembur",
    "2026-03-26": "pulang_cepat",
  },
  "emp-pres-010": {
    "2026-03-09": "izin",
    "2026-03-24": "terlambat",
  },
};

export const presenceCompanies: PresenceCompany[] = [
  { id: companyId, name: "HireUMKM Group" },
];

export const presenceBranches: PresenceBranch[] = [
  { id: "br-pres-001", company_id: companyId, branch_name: "Head Office Bandung", city: "Bandung", is_active: true },
  { id: "br-pres-002", company_id: companyId, branch_name: "Cabang Bogor Utara", city: "Bogor", is_active: true },
];

export const presenceDepartments: PresenceDepartment[] = [
  { id: "dep-pres-001", company_id: companyId, department_name: "Human Resources", branch_id: null, is_active: true },
  { id: "dep-pres-002", company_id: companyId, department_name: "Operasional Outlet", branch_id: null, is_active: true },
  { id: "dep-pres-003", company_id: companyId, department_name: "Gudang & Logistik", branch_id: null, is_active: true },
  { id: "dep-pres-004", company_id: companyId, department_name: "Keuangan", branch_id: null, is_active: true },
];

export const presenceEmployees: PresenceEmployee[] = [
  { id: "emp-pres-001", company_id: companyId, employee_id: "EMP-260012", employee_name: "Yasser Al Khudairy", job_title: "HRD", branch_id: "br-pres-002", department_id: "dep-pres-001", employment_status: "Aktif", joined_at: "2026-03-01", is_active: true },
  { id: "emp-pres-002", company_id: companyId, employee_id: "EMP-260013", employee_name: "Rani Permata", job_title: "Admin Finance", branch_id: "br-pres-001", department_id: "dep-pres-004", employment_status: "Aktif", joined_at: "2025-11-03", is_active: true },
  { id: "emp-pres-003", company_id: companyId, employee_id: "EMP-260014", employee_name: "Fajar Nugraha", job_title: "Supervisor Outlet", branch_id: "br-pres-002", department_id: "dep-pres-002", employment_status: "Aktif", joined_at: "2024-02-12", is_active: true },
  { id: "emp-pres-004", company_id: companyId, employee_id: "EMP-260015", employee_name: "Dewi Lestari", job_title: "Kasir Outlet", branch_id: "br-pres-002", department_id: "dep-pres-002", employment_status: "Probation", joined_at: "2026-02-17", is_active: true },
  { id: "emp-pres-005", company_id: companyId, employee_id: "EMP-260016", employee_name: "Maya Salsabila", job_title: "Admin Gudang", branch_id: "br-pres-001", department_id: "dep-pres-003", employment_status: "Aktif", joined_at: "2026-01-20", is_active: true },
  { id: "emp-pres-006", company_id: companyId, employee_id: "EMP-260017", employee_name: "Bima Saputra", job_title: "Staff Gudang", branch_id: "br-pres-001", department_id: "dep-pres-003", employment_status: "Aktif", joined_at: "2026-03-10", is_active: true },
  { id: "emp-pres-007", company_id: companyId, employee_id: "EMP-260018", employee_name: "Nadia Putri", job_title: "Kasir Outlet", branch_id: "br-pres-002", department_id: "dep-pres-002", employment_status: "Aktif", joined_at: "2026-03-18", is_active: true },
  { id: "emp-pres-008", company_id: companyId, employee_id: "EMP-260019", employee_name: "Yoga Pratama", job_title: "Kurir Operasional", branch_id: "br-pres-001", department_id: "dep-pres-003", employment_status: "Freelance", joined_at: "2026-03-10", is_active: true },
  { id: "emp-pres-009", company_id: companyId, employee_id: "EMP-260020", employee_name: "Siska Maulida", job_title: "Admin Marketplace", branch_id: "br-pres-001", department_id: "dep-pres-004", employment_status: "Aktif", joined_at: "2026-03-25", is_active: true },
  { id: "emp-pres-010", company_id: companyId, employee_id: "EMP-260021", employee_name: "Teguh Saputra", job_title: "Store Supervisor", branch_id: "br-pres-002", department_id: "dep-pres-002", employment_status: "Aktif", joined_at: "2025-12-01", is_active: true },
];

export const attendanceSettings: AttendanceSettings[] = [
  {
    id: "ats-001",
    company_id: companyId,
    tolerance_late_minutes: 10,
    early_checkin_limit_minutes: 60,
    late_checkin_limit_minutes: 180,
    checkout_limit_minutes: 240,
    allow_mobile_attendance: true,
    allow_fingerprint_attendance: true,
    allow_face_recognition: true,
    require_selfie: true,
    require_location: true,
    attendance_radius_meter: 120,
    auto_generate_alpha: true,
    default_report_format: "table",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
];

function createShift(params: Omit<WorkShift, "company_id" | "total_work_minutes" | "cross_day" | "created_at" | "updated_at">): WorkShift {
  return {
    ...params,
    company_id: companyId,
    total_work_minutes: calculateShiftWorkMinutes({
      checkinTime: params.checkin_time,
      checkoutTime: params.checkout_time,
      hasBreak: params.has_break,
      breakStartTime: params.break_start_time,
      breakEndTime: params.break_end_time,
    }),
    cross_day: detectCrossDayShift(params.checkin_time, params.checkout_time),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export const attendancePenalties: AttendancePenalty[] = [
  {
    id: "atp-001",
    company_id: companyId,
    penalty_name: "Denda terlambat ringan",
    penalty_type: "discipline",
    calculation_type: "flat",
    amount: 25000,
    applies_to: "terlambat",
    is_active: true,
    description: "Berlaku untuk keterlambatan 1 sampai 15 menit.",
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "atp-002",
    company_id: companyId,
    penalty_name: "Denda tidak absen masuk",
    penalty_type: "attendance",
    calculation_type: "flat",
    amount: 50000,
    applies_to: "tidak_absen_masuk",
    is_active: true,
    description: "Berlaku jika karyawan bekerja tetapi tidak melakukan absen masuk.",
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "atp-003",
    company_id: companyId,
    penalty_name: "Denda pulang cepat per menit",
    penalty_type: "attendance",
    calculation_type: "per_minute",
    amount: 3000,
    applies_to: "pulang_cepat",
    is_active: true,
    description: "Berlaku untuk pulang sebelum jam kerja selesai tanpa izin.",
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "atp-004",
    company_id: companyId,
    penalty_name: "Denda tidak absen pulang",
    penalty_type: "attendance",
    calculation_type: "flat",
    amount: 35000,
    applies_to: "tidak_absen_pulang",
    is_active: true,
    description: "Berlaku jika check-out tidak tercatat dan tidak ada koreksi manual.",
    created_at: createdAt,
    updated_at: updatedAt,
  },
];

export const holidays: Holiday[] = [
  {
    id: "hol-001",
    company_id: companyId,
    holiday_name: "Hari Raya Nyepi",
    holiday_date: "2026-03-19",
    holiday_type: "nasional",
    department_id: null,
    description: "Hari libur nasional, kecuali tim tertentu yang tetap berjaga.",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "hol-002",
    company_id: companyId,
    holiday_name: "Libur Internal Gudang Stock Opname",
    holiday_date: "2026-03-28",
    holiday_type: "departemen",
    department_id: "dep-pres-003",
    description: "Tim gudang libur setelah stock opname bulanan.",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
];

export const workShifts: WorkShift[] = [
  createShift({
    id: "sft-001",
    shift_code: "JK01",
    shift_name: "Non Shift",
    checkin_time: "08:00",
    checkout_time: "16:00",
    has_break: true,
    break_start_time: "12:00",
    break_end_time: "13:00",
    color_hex: "#4F46E5",
    description: "Jam kerja reguler untuk back office dan admin.",
    is_active: true,
  }),
  createShift({
    id: "sft-002",
    shift_code: "JK02",
    shift_name: "Shift 1",
    checkin_time: "07:00",
    checkout_time: "15:00",
    has_break: true,
    break_start_time: "11:30",
    break_end_time: "12:30",
    color_hex: "#10B981",
    description: "Shift pagi untuk outlet dan operasional depan.",
    is_active: true,
  }),
  createShift({
    id: "sft-003",
    shift_code: "JK03",
    shift_name: "Shift 2",
    checkin_time: "15:00",
    checkout_time: "23:00",
    has_break: true,
    break_start_time: "18:30",
    break_end_time: "19:00",
    color_hex: "#8B5CF6",
    description: "Shift sore untuk outlet dengan trafik malam.",
    is_active: true,
  }),
  createShift({
    id: "sft-004",
    shift_code: "JK04",
    shift_name: "Shift Malam",
    checkin_time: "22:00",
    checkout_time: "06:00",
    has_break: true,
    break_start_time: "02:00",
    break_end_time: "02:30",
    color_hex: "#0F172A",
    description: "Shift lintas hari untuk gudang dan keamanan.",
    is_active: true,
  }),
  createShift({
    id: "sft-005",
    shift_code: "JK05",
    shift_name: "Mobile Field",
    checkin_time: "09:00",
    checkout_time: "17:00",
    has_break: true,
    break_start_time: "12:30",
    break_end_time: "13:00",
    color_hex: "#F97316",
    description: "Jam kerja lapangan untuk kurir dan tim mobile.",
    is_active: true,
  }),
];

export const departmentWorkShifts: DepartmentWorkShift[] = [
  {
    id: "dws-001",
    company_id: companyId,
    department_id: "dep-pres-001",
    default_shift_id: "sft-001",
    work_pattern_type: "5_2",
    allow_multi_shift: false,
    effective_start_date: "2026-01-01",
    effective_end_date: null,
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "dws-002",
    company_id: companyId,
    department_id: "dep-pres-002",
    default_shift_id: "sft-002",
    work_pattern_type: "shift_rotation",
    allow_multi_shift: true,
    effective_start_date: "2026-01-01",
    effective_end_date: null,
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "dws-003",
    company_id: companyId,
    department_id: "dep-pres-003",
    default_shift_id: "sft-004",
    work_pattern_type: "6_1",
    allow_multi_shift: true,
    effective_start_date: "2026-01-01",
    effective_end_date: null,
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "dws-004",
    company_id: companyId,
    department_id: "dep-pres-004",
    default_shift_id: "sft-001",
    work_pattern_type: "5_2",
    allow_multi_shift: false,
    effective_start_date: "2026-01-01",
    effective_end_date: null,
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
];

export const fingerprintDevices: FingerprintDevice[] = [
  {
    id: "fpd-001",
    company_id: companyId,
    device_name: "Fingerprint Front Office Bandung",
    device_code: "BDG-FO-01",
    ip_address: "192.168.10.11",
    api_endpoint: null,
    branch_id: "br-pres-001",
    location_name: "Lobby Head Office Bandung",
    connection_status: "online",
    last_sync_at: "2026-03-24T08:40:00.000Z",
    description: "Mesin utama untuk back office dan finance.",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "fpd-002",
    company_id: companyId,
    device_name: "Fingerprint Outlet Bogor Utara",
    device_code: "BGR-OUT-01",
    ip_address: "192.168.20.15",
    api_endpoint: "https://device.local/bogor-utara",
    branch_id: "br-pres-002",
    location_name: "Kasir belakang outlet Bogor Utara",
    connection_status: "online",
    last_sync_at: "2026-03-24T08:37:00.000Z",
    description: "Dipakai outlet pagi dan shift sore.",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
  {
    id: "fpd-003",
    company_id: companyId,
    device_name: "Face ID Gudang Bandung",
    device_code: "BDG-GDG-03",
    ip_address: "192.168.10.27",
    api_endpoint: "https://device.local/gudang-bandung",
    branch_id: "br-pres-001",
    location_name: "Pintu masuk gudang Bandung",
    connection_status: "perlu_cek",
    last_sync_at: "2026-03-24T07:10:00.000Z",
    description: "Perangkat hybrid fingerprint dan face recognition.",
    is_active: true,
    created_at: createdAt,
    updated_at: updatedAt,
  },
];

function getDatesInMonth(year: number, month: number) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index + 1));
    return date.toISOString().slice(0, 10);
  });
}

function getDayOfWeek(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function isHolidayForEmployee(date: string, departmentId: string) {
  return holidays.some((holiday) => holiday.holiday_date === date && (holiday.department_id === null || holiday.department_id === departmentId));
}

function defaultShiftForEmployee(employee: PresenceEmployee, dayOfWeek: number) {
  if (employee.department_id === "dep-pres-002") {
    return dayOfWeek % 2 === 0 ? "sft-002" : "sft-003";
  }

  if (employee.department_id === "dep-pres-003") {
    return employee.id === "emp-pres-008" ? "sft-005" : "sft-004";
  }

  return "sft-001";
}

function shouldScheduleEmployee(employee: PresenceEmployee, date: string) {
  const dayOfWeek = getDayOfWeek(date);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (employee.department_id === "dep-pres-002") {
    return dayOfWeek !== 0;
  }

  if (employee.department_id === "dep-pres-003") {
    return dayOfWeek !== 0;
  }

  return !isWeekend;
}

export const employeeSchedules: EmployeeSchedule[] = getDatesInMonth(demoYear, demoMonth).flatMap((date) =>
  presenceEmployees.flatMap((employee) => {
    if (!shouldScheduleEmployee(employee, date)) {
      return [];
    }

    if (isHolidayForEmployee(date, employee.department_id)) {
      return [];
    }

    const shiftId = defaultShiftForEmployee(employee, getDayOfWeek(date));

    return [
      {
        id: `sch-${employee.id}-${date}`,
        company_id: companyId,
        employee_id: employee.id,
        work_date: date,
        shift_id: shiftId,
        branch_id: employee.branch_id,
        department_id: employee.department_id,
        assigned_by: "emp-pres-001",
        source_type: "default_department",
        note: shiftId === "sft-004" ? "Shift lintas hari untuk gudang" : null,
        created_at: createdAt,
        updated_at: updatedAt,
      },
    ];
  }),
);

const shiftMap = new Map(workShifts.map((shift) => [shift.id, shift]));

function createAttendanceTimestamps(date: string, shift: WorkShift, status: AttendanceRecord["status"]) {
  const datePrefix = `${date}T`;
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDateString = nextDate.toISOString().slice(0, 10);
  const checkinDate = datePrefix;
  const checkoutDate = shift.cross_day ? `${nextDateString}T` : datePrefix;

  if (status === "alpha") {
    return {
      actual_checkin: null,
      actual_checkout: null,
      break_checkin: null,
      break_checkout: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
    };
  }

  if (status === "izin" || status === "sakit" || status === "cuti") {
    return {
      actual_checkin: null,
      actual_checkout: null,
      break_checkin: null,
      break_checkout: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
    };
  }

  const lateMinutes = status === "terlambat" ? 17 : 0;
  const earlyLeaveMinutes = status === "pulang_cepat" ? 35 : 0;
  const overtimeMinutes = status === "lembur" ? 75 : 0;
  const missingCheckin = status === "tidak_absen_masuk";
  const missingCheckout = status === "tidak_absen_pulang";

  const actualCheckin = missingCheckin ? null : `${checkinDate}${shift.checkin_time}:00.000Z`;
  const actualCheckoutBase = shift.cross_day ? `${checkoutDate}${shift.checkout_time}:00.000Z` : `${checkinDate}${shift.checkout_time}:00.000Z`;

  return {
    actual_checkin: actualCheckin ? shift.cross_day || lateMinutes ? offsetTime(actualCheckin, lateMinutes) : actualCheckin : null,
    actual_checkout: missingCheckout ? null : offsetTime(actualCheckoutBase, earlyLeaveMinutes ? -earlyLeaveMinutes : overtimeMinutes),
    break_checkin: shift.has_break && shift.break_start_time ? `${checkinDate}${shift.break_start_time}:00.000Z` : null,
    break_checkout:
      shift.has_break && shift.break_end_time
        ? `${shift.cross_day && shift.break_start_time && shift.break_end_time && shift.break_end_time < shift.break_start_time ? checkoutDate : checkinDate}${shift.break_end_time}:00.000Z`
        : null,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    overtime_minutes: overtimeMinutes,
  };
}

function offsetTime(timestamp: string, minutesOffset: number) {
  const date = new Date(timestamp);
  date.setUTCMinutes(date.getUTCMinutes() + minutesOffset);
  return date.toISOString();
}

function defaultAttendanceSource(employee: PresenceEmployee) {
  if (employee.department_id === "dep-pres-003") {
    return employee.id === "emp-pres-008" ? "mobile" : "face_recognition";
  }

  return employee.branch_id === "br-pres-002" ? "fingerprint" : "mobile";
}

function defaultDeviceId(employee: PresenceEmployee) {
  if (employee.department_id === "dep-pres-003") {
    return "fpd-003";
  }

  return employee.branch_id === "br-pres-002" ? "fpd-002" : "fpd-001";
}

export const attendanceRecords: AttendanceRecord[] = employeeSchedules.map((schedule) => {
  const employee = presenceEmployees.find((item) => item.id === schedule.employee_id)!;
  const shift = shiftMap.get(schedule.shift_id)!;
  const status = attendanceStatusOverrides[employee.id]?.[schedule.work_date] || "hadir";
  const timeData = createAttendanceTimestamps(schedule.work_date, shift, status);
  const source = defaultAttendanceSource(employee);

  return {
    id: `att-${schedule.id}`,
    company_id: companyId,
    employee_id: employee.id,
    attendance_date: schedule.work_date,
    shift_id: schedule.shift_id,
    branch_id: schedule.branch_id,
    department_id: schedule.department_id,
    scheduled_checkin: `${schedule.work_date}T${shift.checkin_time}:00.000Z`,
    scheduled_checkout: `${shift.cross_day ? new Date(new Date(`${schedule.work_date}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10) : schedule.work_date}T${shift.checkout_time}:00.000Z`,
    actual_checkin: timeData.actual_checkin,
    actual_checkout: timeData.actual_checkout,
    break_checkin: timeData.break_checkin,
    break_checkout: timeData.break_checkout,
    status,
    late_minutes: timeData.late_minutes,
    early_leave_minutes: timeData.early_leave_minutes,
    overtime_minutes: timeData.overtime_minutes,
    attendance_source: source,
    selfie_url: source === "mobile" || source === "face_recognition" ? `https://dummy.hireumkm.dev/selfie/${employee.employee_id}/${schedule.work_date}.jpg` : null,
    latitude: source === "mobile" ? -6.903447 : null,
    longitude: source === "mobile" ? 107.573116 : null,
    device_id: source === "manual" ? null : defaultDeviceId(employee),
    note:
      status === "alpha"
        ? "Tidak ada aktivitas presensi pada hari kerja."
        : status === "lembur"
          ? "Ada lembur untuk closing atau stock opname."
          : status === "pulang_cepat"
            ? "Pulang lebih awal dan perlu review atasan."
            : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
});

export const attendanceExceptions: AttendanceException[] = attendanceRecords
  .filter((record) => record.status !== "hadir")
  .map((record) => ({
    id: `exc-${record.id}`,
    company_id: companyId,
    employee_id: record.employee_id,
    attendance_record_id: record.id,
    exception_type: record.status === "lembur" ? "terlambat" : record.status,
    exception_date: record.attendance_date,
    description: `${formatAttendanceStatusLabel(record.status)} pada ${record.attendance_date}${record.note ? ` - ${record.note}` : ""}`,
    approved_by: ["izin", "sakit", "cuti"].includes(record.status) ? "emp-pres-003" : null,
    status:
      record.status === "izin" || record.status === "sakit" || record.status === "cuti"
        ? "disetujui"
        : record.status === "alpha"
          ? "menunggu"
          : "draft",
    created_at: createdAt,
    updated_at: updatedAt,
  }));

const attendanceEvaluation = evaluateAttendanceRecords({
  employees: presenceEmployees,
  attendanceDates: getDatesInMonth(demoYear, demoMonth),
  settings: attendanceSettings[0],
  employeeSchedules,
  departmentWorkShifts,
  workShifts,
  holidays,
  attendanceRecords,
  attendanceExceptions,
  minimumOvertimeMinutes: 30,
  earlyLeaveToleranceMinutes: 5,
});

export const resolvedAttendanceRecords = attendanceEvaluation.records;
export const attendanceResolvedSummary = attendanceEvaluation.attendanceSummary;
export const absenceResolvedSummary = attendanceEvaluation.absenceSummary;

export const hrPresenceEntityRelations: HrPresenceEntityRelation[] = [
  {
    from: "WorkShift",
    to: "EmployeeSchedule",
    relation: "one-to-many",
    detail: "Satu template shift bisa dipakai banyak jadwal kerja harian karyawan.",
  },
  {
    from: "WorkShift",
    to: "AttendanceRecord",
    relation: "one-to-many",
    detail: "Shift menjadi acuan jam masuk dan pulang yang dibandingkan dengan absensi aktual.",
  },
  {
    from: "DepartmentWorkShift",
    to: "WorkShift",
    relation: "many-to-one",
    detail: "Mapping departemen menentukan shift default yang dipakai untuk generate jadwal.",
  },
  {
    from: "Holiday",
    to: "EmployeeSchedule",
    relation: "rule-impact",
    detail: "Hari libur dapat mengosongkan jadwal kerja atau memberi catatan holiday di matrix jadwal.",
  },
  {
    from: "Holiday",
    to: "AttendanceRecord",
    relation: "rule-impact",
    detail: "Hari libur mempengaruhi apakah absensi perlu dibuat atau tidak pada tanggal tertentu.",
  },
  {
    from: "FingerprintDevice",
    to: "AttendanceRecord",
    relation: "one-to-many",
    detail: "Perangkat fingerprint atau face recognition menjadi sumber pencatatan absensi.",
  },
  {
    from: "AttendanceRecord",
    to: "AttendanceException",
    relation: "one-to-many",
    detail: "Satu record absensi bisa memunculkan anomali, izin, sakit, atau kebutuhan approval.",
  },
  {
    from: "EmployeeSchedule",
    to: "Laporan Jadwal Kerja",
    relation: "report-source",
    detail: "Schedule harian disusun menjadi matrix jadwal kerja bulanan.",
  },
  {
    from: "AttendanceRecord",
    to: "Laporan Ketidakhadiran",
    relation: "report-source",
    detail: "Status absensi dan exception dipakai untuk rekap izin, sakit, cuti, alpha, dan pulang cepat.",
  },
];

export const hrPresenceDemoBundle = {
  company: presenceCompanies[0],
  branches: presenceBranches,
  departments: presenceDepartments,
  employees: presenceEmployees,
  attendanceSettings,
  attendancePenalties,
  holidays,
  workShifts,
  departmentWorkShifts,
  fingerprintDevices,
  employeeSchedules,
  attendanceRecords,
  resolvedAttendanceRecords,
  attendanceExceptions,
  relations: hrPresenceEntityRelations,
};

export const hrPresenceUiHelpers = {
  shiftColorMap: attendanceEvaluation.shiftColorMap,
  attendanceSummary: attendanceResolvedSummary,
  absenceSummary: absenceResolvedSummary,
  scheduleMatrix: generateMonthlyScheduleMatrix({
    employees: presenceEmployees,
    schedules: employeeSchedules,
    shifts: workShifts,
    holidays,
    month: demoMonth,
    year: demoYear,
  }),
  attendanceByEmployee: groupAttendanceRecordsByEmployee(resolvedAttendanceRecords),
  resolvedRecords: resolvedAttendanceRecords,
};

export const hrPresenceDemoMeta = {
  companyId,
  month: demoMonth,
  year: demoYear,
  counts: {
    employees: presenceEmployees.length,
    branches: presenceBranches.length,
    departments: presenceDepartments.length,
    shifts: workShifts.length,
    holidays: holidays.length,
    devices: fingerprintDevices.length,
    schedules: employeeSchedules.length,
    attendanceRecords: attendanceRecords.length,
    resolvedAttendanceRecords: resolvedAttendanceRecords.length,
    attendanceExceptions: attendanceExceptions.length,
  },
};
