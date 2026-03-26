import {
  attendanceSettings,
  employeeSchedules,
  holidays,
  presenceBranches,
  presenceDepartments,
  presenceEmployees,
  resolvedAttendanceRecords,
  workShifts,
} from "@/data/hrPresenceSeed";
import {
  buildAnnouncementFeed,
  buildEmployeeAttendanceHistory,
  buildEmployeeDirectoryMaps,
  buildEmployeeMonthSummary,
  buildEmployeeRequests,
  buildEmployeeScheduleList,
  buildEmployeeServiceMenus,
  buildEmployeeTodayState,
  buildFaceRegistrationState,
  findEmployeeById,
  pickHomeShortcuts,
} from "@/lib/hrPresenceEmployee";
import type { AttendanceRequest, EmployeeAnnouncement, EmployeeFaceRegistration } from "@/types/hrPresence";

const companyId = "cmp-hum-001";
const currentEmployeeId = "emp-pres-001";
const todayDate = "2026-03-24";
const activeMonthKey = "2026-03";

export const employeeAnnouncements: EmployeeAnnouncement[] = [
  {
    id: "ann-emp-001",
    company_id: companyId,
    title: "Pengingat briefing pagi outlet",
    summary: "Briefing pagi besok dimulai 10 menit lebih awal untuk persiapan promo akhir bulan.",
    published_at: "2026-03-24T07:00:00.000Z",
    audience: "Semua karyawan operasional",
    tone: "info",
  },
  {
    id: "ann-emp-002",
    company_id: companyId,
    title: "Batas pengajuan cuti Lebaran",
    summary: "Pengajuan cuti Lebaran ditutup pada 30 Maret 2026 agar jadwal bisa segera dikunci.",
    published_at: "2026-03-22T09:15:00.000Z",
    audience: "Semua karyawan",
    tone: "warning",
  },
  {
    id: "ann-emp-003",
    company_id: companyId,
    title: "Template selfie presensi diperbarui",
    summary: "Pastikan wajah terlihat jelas dan pencahayaan cukup saat memakai presensi mobile.",
    published_at: "2026-03-20T08:00:00.000Z",
    audience: "Karyawan mobile attendance",
    tone: "success",
  },
];

export const attendanceRequests: AttendanceRequest[] = [
  {
    id: "atr-001",
    company_id: companyId,
    employee_id: currentEmployeeId,
    request_type: "koreksi_absensi",
    title: "Koreksi jam pulang 20 Maret 2026",
    description: "Jam pulang belum tercatat karena jaringan fingerprint outlet sempat putus.",
    request_date: "2026-03-21",
    start_date: "2026-03-20",
    end_date: null,
    attendance_record_id: "att-sch-emp-pres-001-2026-03-20",
    schedule_id: "sch-emp-pres-001-2026-03-20",
    attachment_url: "https://dummy.hireumkm.dev/attachments/koreksi-yasser-2026-03-20.jpg",
    status: "menunggu",
    approved_by: null,
    approval_note: null,
    created_at: "2026-03-21T08:10:00.000Z",
    updated_at: "2026-03-21T08:10:00.000Z",
  },
  {
    id: "atr-002",
    company_id: companyId,
    employee_id: currentEmployeeId,
    request_type: "izin",
    title: "Izin keperluan keluarga",
    description: "Perlu izin setengah hari untuk mendampingi keluarga kontrol kesehatan.",
    request_date: "2026-03-12",
    start_date: "2026-03-12",
    end_date: "2026-03-12",
    attendance_record_id: "att-sch-emp-pres-001-2026-03-12",
    schedule_id: "sch-emp-pres-001-2026-03-12",
    attachment_url: null,
    status: "disetujui",
    approved_by: "emp-pres-003",
    approval_note: "Disetujui atasan langsung. Pastikan serah tugas sebelum jam 10.00.",
    created_at: "2026-03-11T18:20:00.000Z",
    updated_at: "2026-03-11T20:00:00.000Z",
  },
  {
    id: "atr-003",
    company_id: companyId,
    employee_id: currentEmployeeId,
    request_type: "lembur",
    title: "Lembur closing payroll Maret",
    description: "Butuh tambahan waktu untuk finalisasi rekap payroll dan approval owner.",
    request_date: "2026-03-25",
    start_date: "2026-03-25",
    end_date: "2026-03-25",
    status: "menunggu",
    approved_by: null,
    approval_note: null,
    created_at: "2026-03-24T09:00:00.000Z",
    updated_at: "2026-03-24T09:00:00.000Z",
  },
  {
    id: "atr-004",
    company_id: companyId,
    employee_id: currentEmployeeId,
    request_type: "tukar_shift",
    title: "Tukar shift dengan Rani Permata",
    description: "Permintaan tukar shift karena ada agenda keluarga pada sore hari.",
    request_date: "2026-03-18",
    start_date: "2026-03-27",
    end_date: "2026-03-27",
    related_employee_id: "emp-pres-002",
    status: "ditolak",
    approved_by: "emp-pres-003",
    approval_note: "Ditolak karena tim finance perlu coverage penuh pada tanggal tersebut.",
    created_at: "2026-03-18T07:00:00.000Z",
    updated_at: "2026-03-18T11:00:00.000Z",
  },
  {
    id: "atr-005",
    company_id: companyId,
    employee_id: currentEmployeeId,
    request_type: "cuti",
    title: "Cuti keluarga awal April",
    description: "Pengajuan cuti 2 hari untuk keperluan keluarga di luar kota.",
    request_date: "2026-03-24",
    start_date: "2026-04-02",
    end_date: "2026-04-03",
    status: "draft",
    approved_by: null,
    approval_note: null,
    created_at: "2026-03-24T10:00:00.000Z",
    updated_at: "2026-03-24T10:00:00.000Z",
  },
];

export const employeeFaceRegistrations: EmployeeFaceRegistration[] = [
  {
    id: "face-001",
    employee_id: currentEmployeeId,
    status: "aktif",
    registered_at: "2026-03-05T07:30:00.000Z",
    verification_note: "Verifikasi wajah aktif dan terakhir dipakai saat sinkronisasi 24 Maret 2026.",
  },
];

const currentEmployee = findEmployeeById(presenceEmployees, currentEmployeeId);
const serviceMenus = buildEmployeeServiceMenus();
const directoryMaps = buildEmployeeDirectoryMaps({
  branches: presenceBranches,
  departments: presenceDepartments,
  employees: presenceEmployees,
});
const todayState = buildEmployeeTodayState({
  employeeId: currentEmployeeId,
  workDate: todayDate,
  records: resolvedAttendanceRecords,
  schedules: employeeSchedules,
  shifts: workShifts,
  settings: attendanceSettings[0],
});
const monthSummary = buildEmployeeMonthSummary(resolvedAttendanceRecords, currentEmployeeId, activeMonthKey);
const requestsBundle = buildEmployeeRequests({
  employeeId: currentEmployeeId,
  requests: attendanceRequests,
});

export const employeeSelfServiceDemo = {
  currentEmployeeId,
  currentEmployee,
  todayDate,
  activeMonthKey,
  directoryMaps,
  settings: attendanceSettings[0],
  todayState,
  todayHoliday: holidays.find((item) => item.holiday_date === todayDate) || null,
  monthlySummary: monthSummary,
  scheduleList: buildEmployeeScheduleList({
    employeeId: currentEmployeeId,
    schedules: employeeSchedules,
    shifts: workShifts,
    monthKey: activeMonthKey,
  }),
  historyList: buildEmployeeAttendanceHistory({
    employeeId: currentEmployeeId,
    records: resolvedAttendanceRecords,
    monthKey: activeMonthKey,
  }),
  requestList: requestsBundle.items,
  requestSummary: requestsBundle.summary,
  announcements: buildAnnouncementFeed(employeeAnnouncements),
  faceRegistration: buildFaceRegistrationState(employeeFaceRegistrations, currentEmployeeId),
  quickShortcuts: pickHomeShortcuts(serviceMenus),
  serviceMenus,
  overtimeEntries: [
    {
      id: "ovt-001",
      title: "Closing payroll Maret",
      date: "2026-03-25",
      hours: "2 jam",
      status: "menunggu",
    },
    {
      id: "ovt-002",
      title: "Pendampingan interview massal",
      date: "2026-03-15",
      hours: "1.5 jam",
      status: "disetujui",
    },
  ],
  shiftSwapPeers: presenceEmployees
    .filter((item) => item.id !== currentEmployeeId && item.department_id === currentEmployee?.department_id)
    .slice(0, 4),
  profileCards: [
    { label: "ID Karyawan", value: currentEmployee?.employee_id || "-" },
    { label: "Cabang", value: directoryMaps.branchMap.get(currentEmployee?.branch_id || "") || "-" },
    { label: "Departemen", value: directoryMaps.departmentMap.get(currentEmployee?.department_id || "") || "-" },
    { label: "Status kerja", value: currentEmployee?.employment_status || "-" },
  ],
  mobileStates: [
    { key: "belum-absen", label: "Punya shift hari ini dan belum absen", summary: "Tombol masuk aktif, status utama Belum Absen." },
    { key: "sudah-checkin", label: "Sudah check-in tetapi belum check-out", summary: "Tombol masuk nonaktif, tombol pulang aktif." },
    { key: "sudah-pulang", label: "Sudah check-out", summary: "Dua tombol utama nonaktif dan status selesai." },
    { key: "libur", label: "Karyawan libur", summary: "Tampil status Hari Libur tanpa memicu alpha." },
    { key: "tidak-ada-jadwal", label: "Tidak punya jadwal", summary: "Tampil status Tidak Ada Jadwal." },
    { key: "terlambat", label: "Karyawan terlambat", summary: "Status utama Terlambat dengan menit keterlambatan." },
    { key: "istirahat", label: "Sedang istirahat", summary: "Tombol selesai istirahat aktif." },
    { key: "pending-request", label: "Punya pengajuan menunggu approval", summary: "Beranda menonjolkan pending request." },
    { key: "rejected-request", label: "Punya pengajuan ditolak", summary: "List pengajuan menampilkan badge ditolak dan catatan approver." },
    { key: "cross-day", label: "Melihat jadwal shift lintas hari", summary: "Jadwal menandai shift malam dan lintas hari dengan jelas." },
  ],
};
