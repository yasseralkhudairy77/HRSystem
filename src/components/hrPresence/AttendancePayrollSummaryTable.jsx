import PresenceDataTable from "@/components/hrPresence/PresenceDataTable";

export default function AttendancePayrollSummaryTable({ rows = [] }) {
  return (
    <PresenceDataTable
      stickyColumns={2}
      columns={[
        { key: "nik", label: "NIK", width: 120 },
        { key: "nama", label: "Nama karyawan", width: 220 },
        { key: "departemen", label: "Departemen", width: 180 },
        { key: "periode", label: "Periode payroll", width: 160 },
        { key: "scheduled_work_days", label: "Hari kerja", width: 100 },
        { key: "present_days", label: "Hadir", width: 90 },
        { key: "alpha_days", label: "Alpha", width: 90 },
        { key: "izin_days", label: "Izin", width: 90 },
        { key: "sakit_days", label: "Sakit", width: 90 },
        { key: "cuti_days", label: "Cuti", width: 90 },
        { key: "late_count", label: "Terlambat", width: 100 },
        { key: "total_late_minutes", label: "Menit telat", width: 110 },
        { key: "early_leave_count", label: "Pulang cepat", width: 110 },
        { key: "total_overtime_minutes", label: "Lembur", width: 110 },
        { key: "holiday_work_days", label: "Kerja saat libur", width: 120 },
        { key: "unresolved_conflict_count", label: "Conflict", width: 90 },
        { key: "payroll_readiness_status", label: "Readiness", width: 130, type: "status" },
        { key: "attendance_final_status", label: "Final status", width: 130, type: "status" },
        { key: "aksi", label: "Aksi", width: 100 },
      ]}
      rows={rows}
    />
  );
}
