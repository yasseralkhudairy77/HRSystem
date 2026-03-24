import {
  attendanceRequests,
} from "@/data/hrPresenceEmployeeSeed";
import {
  attendanceConflicts,
  attendanceProcessedRecords,
} from "@/data/hrPresenceIntegrationSeed";
import {
  attendanceSettings,
  presenceBranches,
  presenceDepartments,
  presenceEmployees,
  resolvedAttendanceRecords,
  workShifts,
} from "@/data/hrPresenceSeed";
import {
  buildAttendancePayrollImpact,
  buildDepartmentAttendanceRanking,
  buildEmployeeDisciplineRanking,
  buildMonitoringContext,
  buildHrAttendanceDashboard,
  buildManagerAttendanceDashboard,
  buildAttendanceTrend,
  generateAttendancePayrollSummary,
  getAbsenceMonitoring,
  getAttendanceFinalizationStatus,
  getAttendanceIssuesBlockingPayroll,
  getDailyAttendanceMonitoring,
  getLateMonitoring,
  getOvertimeMonitoring,
} from "@/services/attendanceMonitoringService";
import type {
  AttendanceFinalizationPeriod,
  AttendanceMonitoringSnapshot,
  AttendancePayrollImpact,
  AttendancePayrollSummary,
} from "@/types/hrPresence";

export const payrollPeriods = [
  {
    id: "payroll-2026-03",
    label: "Payroll Maret 2026",
    start_date: "2026-03-01",
    end_date: "2026-03-31",
    cutoff_date: "2026-03-31",
  },
];

export const managerScopes = [
  {
    manager_id: "emp-pres-003",
    manager_name: "Andra Pratama",
    department_ids: ["dept-pres-001", "dept-pres-002"],
  },
  {
    manager_id: "emp-pres-008",
    manager_name: "Nadia Maharani",
    department_ids: ["dept-pres-003"],
  },
];

const monitoringContext = buildMonitoringContext({
  attendanceRecords: resolvedAttendanceRecords,
  employees: presenceEmployees,
  branches: presenceBranches,
  departments: presenceDepartments,
  workShifts,
  payrollPeriods,
  managerScopes,
});

export const hrAttendanceDashboard = buildHrAttendanceDashboard({ date: "2026-03-24" }, monitoringContext);
export const managerAttendanceDashboard = buildManagerAttendanceDashboard("emp-pres-003", { date: "2026-03-24" }, monitoringContext);
export const dailyAttendanceMonitoring = getDailyAttendanceMonitoring({ dateFrom: "2026-03-01", dateTo: "2026-03-31" }, monitoringContext);
export const absenceMonitoring = getAbsenceMonitoring({ dateFrom: "2026-03-01", dateTo: "2026-03-31" }, monitoringContext);
export const lateMonitoring = getLateMonitoring({ dateFrom: "2026-03-01", dateTo: "2026-03-31" }, monitoringContext);
export const overtimeMonitoring = getOvertimeMonitoring({ dateFrom: "2026-03-01", dateTo: "2026-03-31" }, monitoringContext);
export const attendancePayrollImpacts: AttendancePayrollImpact[] = buildAttendancePayrollImpact("payroll-2026-03", {
  records: resolvedAttendanceRecords,
  employees: presenceEmployees,
  conflicts: attendanceConflicts,
  requests: attendanceRequests,
});
export const attendancePayrollSummaries: AttendancePayrollSummary[] = generateAttendancePayrollSummary("payroll-2026-03", {
  records: resolvedAttendanceRecords,
  employees: presenceEmployees,
  conflicts: attendanceConflicts,
  requests: attendanceRequests,
});
const attendanceIssuesBlockingPayroll = getAttendanceIssuesBlockingPayroll("payroll-2026-03", {
  conflicts: attendanceConflicts,
  requests: attendanceRequests,
});
export const attendanceFinalizationPeriod: AttendanceFinalizationPeriod = getAttendanceFinalizationStatus("payroll-2026-03", {
  summaries: attendancePayrollSummaries,
  issues: attendanceIssuesBlockingPayroll,
});

export const attendanceMonitoringSnapshots: AttendanceMonitoringSnapshot[] = [
  {
    id: "snap-2026-03-24-all",
    company_id: "cmp-hum-001",
    snapshot_date: "2026-03-24",
    branch_id: null,
    department_id: null,
    total_active_employees: presenceEmployees.filter((item) => item.is_active).length,
    total_present: hrAttendanceDashboard.summary.hadir_hari_ini,
    total_late: hrAttendanceDashboard.summary.terlambat_hari_ini,
    total_alpha: hrAttendanceDashboard.summary.alpha_hari_ini,
    total_izin: hrAttendanceDashboard.summary.izin_hari_ini,
    total_sakit: hrAttendanceDashboard.summary.sakit_hari_ini,
    total_cuti: hrAttendanceDashboard.summary.cuti_hari_ini,
    total_no_checkout: hrAttendanceDashboard.summary.belum_check_out,
    total_conflict: hrAttendanceDashboard.summary.conflict_absensi,
    total_pending_approval: hrAttendanceDashboard.summary.pengajuan_pending,
    created_at: "2026-03-24T09:00:00.000Z",
    updated_at: "2026-03-24T09:00:00.000Z",
  },
];

export const attendanceMonitoringUi = {
  payrollPeriods,
  managerScopes,
  hrDashboard: hrAttendanceDashboard,
  managerDashboard: managerAttendanceDashboard,
  dailyMonitoring: dailyAttendanceMonitoring,
  absenceMonitoring,
  lateMonitoring,
  overtimeMonitoring,
  payrollSummaries: attendancePayrollSummaries,
  payrollImpacts: attendancePayrollImpacts,
  finalization: attendanceFinalizationPeriod,
  payrollBlockingIssues: attendanceIssuesBlockingPayroll,
  trend7: buildAttendanceTrend({ records: resolvedAttendanceRecords, days: 7 }),
  trend30: buildAttendanceTrend({ records: resolvedAttendanceRecords, days: 30 }),
  departmentRanking: buildDepartmentAttendanceRanking({
    records: resolvedAttendanceRecords,
    departments: presenceDepartments,
    employees: presenceEmployees,
  }),
  employeeDisciplineRanking: buildEmployeeDisciplineRanking({
    records: resolvedAttendanceRecords,
    employees: presenceEmployees,
  }),
  processedConflicts: attendanceProcessedRecords.filter((item) => item.validation_status === "conflict"),
  settings: attendanceSettings[0],
};

export const attendanceMonitoringScenarios = [
  {
    id: "monitoring-hr-company",
    title: "HR melihat dashboard seluruh perusahaan hari ini",
    result: `${hrAttendanceDashboard.summary.hadir_hari_ini} hadir, ${hrAttendanceDashboard.summary.terlambat_hari_ini} terlambat, ${hrAttendanceDashboard.summary.conflict_absensi} conflict.`,
  },
  {
    id: "monitoring-manager-team",
    title: "Atasan melihat dashboard timnya sendiri",
    result: `${managerAttendanceDashboard.summary.total_anggota_tim} anggota tim, ${managerAttendanceDashboard.summary.pengajuan_pending} pending approval.`,
  },
  {
    id: "monitoring-late",
    title: "HR memonitor siapa saja yang terlambat hari ini",
    result: `${lateMonitoring.summary.total_cases} kasus terlambat dengan total ${lateMonitoring.summary.total_minutes} menit.`,
  },
  {
    id: "monitoring-alpha",
    title: "HR memonitor siapa yang alpha minggu ini",
    result: `${absenceMonitoring.rows.filter((item) => item.status_main === "alpha").length} record alpha ditemukan.`,
  },
  {
    id: "monitoring-overtime",
    title: "HR melihat lembur yang sudah disetujui untuk periode berjalan",
    result: `${overtimeMonitoring.summary.total_cases} record lembur siap review payroll.`,
  },
  {
    id: "payroll-summary-generated",
    title: "Rekap presensi payroll satu periode berhasil dibuat",
    result: `${attendancePayrollSummaries.length} summary per karyawan berhasil dibentuk.`,
  },
  {
    id: "payroll-readiness-blocked",
    title: "Conflict unresolved membuat payroll readiness need_review",
    result: `${attendancePayrollSummaries.filter((item) => item.payroll_readiness_status === "need_review").length} karyawan masih butuh review.`,
  },
  {
    id: "payroll-impact-overtime",
    title: "Lembur disetujui memunculkan overtime_payment_candidate",
    result: `${attendancePayrollImpacts.filter((item) => item.impact_type === "overtime_payment_candidate").length} impact lembur ditemukan.`,
  },
  {
    id: "payroll-impact-alpha",
    title: "Alpha memunculkan alpha_deduction_candidate",
    result: `${attendancePayrollImpacts.filter((item) => item.impact_type === "alpha_deduction_candidate").length} impact alpha ditemukan.`,
  },
  {
    id: "payroll-impact-late",
    title: "Keterlambatan berulang memunculkan late_penalty_candidate",
    result: `${attendancePayrollImpacts.filter((item) => item.impact_type === "late_penalty_candidate").length} impact terlambat ditemukan.`,
  },
  {
    id: "finalization-ready",
    title: "Periode berhasil ditandai siap payroll",
    result: `Status finalisasi saat ini: ${attendanceFinalizationPeriod.status}.`,
  },
  {
    id: "lock-period",
    title: "Periode dapat di-lock untuk payroll",
    result: `Progress finalisasi ${attendanceFinalizationPeriod.progress_percent}% dan siap dilanjutkan ke lock setelah issue selesai.`,
  },
];
