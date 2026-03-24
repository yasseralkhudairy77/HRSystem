import type {
  AttendanceRequest,
  AttendanceResolutionResult,
  AttendanceRequestStatus,
  AttendanceRequestType,
  EmployeeAnnouncement,
  EmployeeFaceRegistration,
  EmployeeSchedule,
  PresenceBranch,
  PresenceDepartment,
  PresenceEmployee,
  WorkShift,
} from "@/types/hrPresence";

function monthKeyFromDate(value: string) {
  return value.slice(0, 7);
}

export function formatEmployeeRequestTypeLabel(type: AttendanceRequestType) {
  return {
    izin: "Izin",
    sakit: "Sakit",
    cuti: "Cuti",
    lembur: "Lembur",
    tukar_shift: "Tukar Shift",
    koreksi_absensi: "Koreksi Absensi",
  }[type];
}

export function formatEmployeeRequestStatusLabel(status: AttendanceRequestStatus) {
  return {
    draft: "Draft",
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    dibatalkan: "Dibatalkan",
  }[status];
}

export function formatTodayStateLabel(status: AttendanceResolutionResult["status_main"]) {
  return {
    hadir: "Sudah Hadir",
    terlambat: "Terlambat",
    alpha: "Tidak Hadir",
    izin: "Izin",
    sakit: "Sakit",
    cuti: "Cuti",
    lembur: "Lembur",
    pulang_cepat: "Pulang Cepat",
    tidak_absen_masuk: "Tidak Absen Masuk",
    tidak_absen_pulang: "Tidak Absen Pulang",
    hari_libur: "Hari Libur",
    off_schedule: "Tidak Ada Jadwal",
  }[status];
}

export function findEmployeeById(employees: PresenceEmployee[], employeeId: string) {
  return employees.find((item) => item.id === employeeId) || null;
}

export function getEmployeeScheduleForDate(schedules: EmployeeSchedule[], employeeId: string, workDate: string) {
  return schedules.find((item) => item.employee_id === employeeId && item.work_date === workDate) || null;
}

export function getEmployeeAttendanceForDate(records: AttendanceResolutionResult[], employeeId: string, workDate: string) {
  return records.find((item) => item.employee_id === employeeId && item.attendance_date === workDate) || null;
}

export function buildEmployeeMonthSummary(records: AttendanceResolutionResult[], employeeId: string, monthKey: string) {
  const scopedRecords = records.filter((item) => item.employee_id === employeeId && monthKeyFromDate(item.attendance_date) === monthKey);
  return {
    total: scopedRecords.length,
    hadir: scopedRecords.filter((item) => item.status_main === "hadir").length,
    terlambat: scopedRecords.filter((item) => item.status_main === "terlambat").length,
    izin: scopedRecords.filter((item) => item.status_main === "izin").length,
    sakit: scopedRecords.filter((item) => item.status_main === "sakit").length,
    cuti: scopedRecords.filter((item) => item.status_main === "cuti").length,
    alpha: scopedRecords.filter((item) => item.status_main === "alpha").length,
  };
}

export function buildEmployeeTodayState({
  employeeId,
  workDate,
  records,
  schedules,
  shifts,
}: {
  employeeId: string;
  workDate: string;
  records: AttendanceResolutionResult[];
  schedules: EmployeeSchedule[];
  shifts: WorkShift[];
}) {
  const shiftMap = new Map(shifts.map((item) => [item.id, item]));
  const schedule = getEmployeeScheduleForDate(schedules, employeeId, workDate);
  const attendance = getEmployeeAttendanceForDate(records, employeeId, workDate);
  const shift = attendance?.shift_id ? shiftMap.get(attendance.shift_id) : schedule?.shift_id ? shiftMap.get(schedule.shift_id) : null;
  const hasCheckedIn = Boolean(attendance?.actual_checkin);
  const hasCheckedOut = Boolean(attendance?.actual_checkout);
  const isOnBreak = Boolean(attendance?.break_checkin && !attendance?.break_checkout);

  const statusMain = attendance?.status_main || (schedule ? "off_schedule" : "off_schedule");
  const stateLabel = attendance ? formatTodayStateLabel(attendance.status_main) : schedule ? "Belum Absen" : "Tidak Ada Jadwal";

  return {
    schedule,
    attendance,
    shift,
    statusLabel: stateLabel,
    statusMain,
    hasCheckedIn,
    hasCheckedOut,
    isOnBreak,
    checkinButtonDisabled: hasCheckedIn || ["hari_libur", "off_schedule", "izin", "sakit", "cuti"].includes(statusMain),
    checkoutButtonDisabled: !hasCheckedIn || hasCheckedOut || ["hari_libur", "off_schedule", "izin", "sakit", "cuti"].includes(statusMain),
    breakStartDisabled: !hasCheckedIn || hasCheckedOut || isOnBreak || !shift?.has_break,
    breakEndDisabled: !isOnBreak,
  };
}

export function buildEmployeeScheduleList({
  employeeId,
  schedules,
  shifts,
  monthKey,
}: {
  employeeId: string;
  schedules: EmployeeSchedule[];
  shifts: WorkShift[];
  monthKey: string;
}) {
  const shiftMap = new Map(shifts.map((item) => [item.id, item]));
  return schedules
    .filter((item) => item.employee_id === employeeId && monthKeyFromDate(item.work_date) === monthKey)
    .map((item) => {
      const shift = shiftMap.get(item.shift_id);
      return {
        ...item,
        shift,
      };
    });
}

export function buildEmployeeAttendanceHistory({
  employeeId,
  records,
  monthKey,
}: {
  employeeId: string;
  records: AttendanceResolutionResult[];
  monthKey: string;
}) {
  return records
    .filter((item) => item.employee_id === employeeId && monthKeyFromDate(item.attendance_date) === monthKey)
    .sort((left, right) => right.attendance_date.localeCompare(left.attendance_date));
}

export function buildEmployeeRequests({
  employeeId,
  requests,
}: {
  employeeId: string;
  requests: AttendanceRequest[];
}) {
  const scopedRequests = requests
    .filter((item) => item.employee_id === employeeId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  return {
    items: scopedRequests,
    summary: {
      total: scopedRequests.length,
      menunggu: scopedRequests.filter((item) => item.status === "menunggu").length,
      disetujui: scopedRequests.filter((item) => item.status === "disetujui").length,
      ditolak: scopedRequests.filter((item) => item.status === "ditolak").length,
      dibatalkan: scopedRequests.filter((item) => item.status === "dibatalkan").length,
    },
  };
}

export function buildEmployeeDirectoryMaps({
  branches,
  departments,
  employees,
}: {
  branches: PresenceBranch[];
  departments: PresenceDepartment[];
  employees: PresenceEmployee[];
}) {
  return {
    branchMap: new Map(branches.map((item) => [item.id, item.branch_name])),
    departmentMap: new Map(departments.map((item) => [item.id, item.department_name])),
    employeeMap: new Map(employees.map((item) => [item.id, item])),
  };
}

export function buildEmployeeServiceMenus() {
  return [
    { key: "id-card", label: "ID Card Digital", description: "Lihat kartu identitas digital", route: "/karyawan/profil", tone: "sky" },
    { key: "payslip", label: "Slip Gaji", description: "Placeholder payroll pribadi", route: "/karyawan/semua-menu", tone: "emerald" },
    { key: "contract", label: "Dokumen Kontrak", description: "Akses ringkas kontrak kerja", route: "/karyawan/semua-menu", tone: "amber" },
    { key: "discipline", label: "Pelanggaran / SP", description: "Riwayat surat peringatan", route: "/karyawan/semua-menu", tone: "rose" },
    { key: "schedule", label: "Jadwal Saya", description: "Lihat jadwal kerja pribadi", route: "/karyawan/jadwal-saya", tone: "violet" },
    { key: "break", label: "Absen Istirahat", description: "Catat mulai dan selesai istirahat", route: "/karyawan/absen-istirahat", tone: "orange" },
    { key: "overtime", label: "Lembur Harian", description: "Ajukan lembur dan lihat status", route: "/karyawan/lembur-harian", tone: "sky" },
    { key: "swap", label: "Tukar Shift", description: "Ajukan pertukaran jadwal kerja", route: "/karyawan/tukar-shift", tone: "violet" },
    { key: "kpi", label: "Penilaian KPI", description: "Placeholder performa pribadi", route: "/karyawan/semua-menu", tone: "emerald" },
    { key: "face", label: "Daftar Face ID", description: "Kelola verifikasi wajah", route: "/karyawan/daftar-face-id", tone: "slate" },
    { key: "request", label: "Pengajuan Presensi", description: "Buat izin, sakit, cuti, koreksi", route: "/karyawan/pengajuan/form", tone: "rose" },
    { key: "request-history", label: "Riwayat Pengajuan", description: "Pantau status approval", route: "/karyawan/pengajuan-saya", tone: "amber" },
  ];
}

export function pickHomeShortcuts(serviceMenus: ReturnType<typeof buildEmployeeServiceMenus>) {
  return serviceMenus.filter((item) => ["schedule", "request", "break", "overtime"].includes(item.key));
}

export function buildAnnouncementFeed(items: EmployeeAnnouncement[]) {
  return items.sort((left, right) => right.published_at.localeCompare(left.published_at));
}

export function buildFaceRegistrationState(registrations: EmployeeFaceRegistration[], employeeId: string) {
  return registrations.find((item) => item.employee_id === employeeId) || null;
}
