import { useMemo, useState } from "react";
import { CalendarPlus2, Download, FileSpreadsheet, Filter, LineChart, Link2, Plus, Printer, RefreshCcw, Save, ShieldAlert, ShieldPlus, Upload } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import AttendanceDashboardCard from "@/components/hrPresence/AttendanceDashboardCard";
import AttendanceImpactBadge from "@/components/hrPresence/AttendanceImpactBadge";
import AttendanceIssueWidget from "@/components/hrPresence/AttendanceIssueWidget";
import AttendancePayrollSummaryTable from "@/components/hrPresence/AttendancePayrollSummaryTable";
import AttendanceTrendChart from "@/components/hrPresence/AttendanceTrendChart";
import ConflictResolutionPanel from "@/components/hrPresence/ConflictResolutionPanel";
import ConflictTable from "@/components/hrPresence/ConflictTable";
import DepartmentSummaryTable from "@/components/hrPresence/DepartmentSummaryTable";
import DeviceStatusCard from "@/components/hrPresence/DeviceStatusCard";
import EmployeeAttendanceDrawer from "@/components/hrPresence/EmployeeAttendanceDrawer";
import FinalizationProgressCard from "@/components/hrPresence/FinalizationProgressCard";
import ImportBatchSummaryCard from "@/components/hrPresence/ImportBatchSummaryCard";
import ImportPreviewPanel from "@/components/hrPresence/ImportPreviewPanel";
import LateMinutesBadge from "@/components/hrPresence/LateMinutesBadge";
import MappingFormModal from "@/components/hrPresence/MappingFormModal";
import OvertimeBadge from "@/components/hrPresence/OvertimeBadge";
import PayrollCutoffPanel from "@/components/hrPresence/PayrollCutoffPanel";
import PayrollReadinessCard from "@/components/hrPresence/PayrollReadinessCard";
import PendingApprovalWidget from "@/components/hrPresence/PendingApprovalWidget";
import PresenceDataTable from "@/components/hrPresence/PresenceDataTable";
import PresenceFilterBar from "@/components/hrPresence/PresenceFilterBar";
import PresenceModalForm from "@/components/hrPresence/PresenceModalForm";
import PresenceSectionCard from "@/components/hrPresence/PresenceSectionCard";
import PresenceSummaryCard from "@/components/hrPresence/PresenceSummaryCard";
import RawLogDetailDrawer from "@/components/hrPresence/RawLogDetailDrawer";
import RawLogTable from "@/components/hrPresence/RawLogTable";
import ScheduleMatrix from "@/components/hrPresence/ScheduleMatrix";
import ShiftColorBadge from "@/components/hrPresence/ShiftColorBadge";
import SourceBadge from "@/components/hrPresence/SourceBadge";
import SyncStatusBadge from "@/components/hrPresence/SyncStatusBadge";
import TeamAttendanceWidget from "@/components/hrPresence/TeamAttendanceWidget";
import { Button } from "@/components/ui/button";
import {
  attendancePenalties,
  attendanceConflicts,
  attendanceImportBatches,
  attendanceIntegrationScenarios,
  attendanceIntegrationUi,
  attendanceProcessedRecords,
  attendanceRawLogs,
  attendanceMonitoringUi,
  attendanceFinalizationPeriod,
  attendancePayrollImpacts,
  attendancePayrollSummaries,
  attendanceSettings,
  attendanceSyncJobs,
  departmentWorkShifts,
  employeeDeviceMappingsResolved,
  fingerprintDevices,
  holidays,
  hrPresenceDemoMeta,
  hrPresenceUiHelpers,
  presenceBranches,
  presenceDepartments,
  presenceEmployees,
  resolvedAttendanceRecords,
  workShifts,
} from "@/data";
import { formatAttendanceStatusLabel } from "@/lib/hrPresence";
import { exportAttendancePayrollRecap, lockAttendanceForPayroll, markAttendanceDataReadyForPayroll, unlockAttendanceForPayroll } from "@/services/attendanceMonitoringService";

const pageMeta = {
  "hr-presensi-absensi-karyawan": {
    title: "Absensi Karyawan",
    breadcrumbs: ["HR Presensi", "Absensi Karyawan"],
    description: "Ringkasan kehadiran harian yang lebih tegas, lebih mudah discan, dan terasa siap dipakai harian oleh admin HR.",
    filters: [
      { label: "Periode tanggal", placeholder: "01 Mar 2026 - 31 Mar 2026", type: "date", wide: true },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Karyawan", placeholder: "Semua karyawan" },
      { label: "Status", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-laporan-jadwal-kerja": {
    title: "Laporan Jadwal Kerja",
    breadcrumbs: ["HR Presensi", "Laporan Jadwal Kerja"],
    description: "Matrix jadwal bulanan dengan sticky column, warna shift konsisten, dan scroll horizontal yang tetap nyaman.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Karyawan", placeholder: "Semua karyawan" },
    ],
  },
  "hr-presensi-laporan-ketidakhadiran": {
    title: "Laporan Ketidakhadiran",
    breadcrumbs: ["HR Presensi", "Laporan Ketidakhadiran"],
    description: "Rekap alpha, izin, sakit, cuti, dan anomali absensi yang ringkas tetapi tetap cukup detail untuk tindak lanjut.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Jenis", placeholder: "Semua jenis" },
      { label: "Approval", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-dashboard-hr": {
    title: "Dashboard Presensi HR",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Dashboard Presensi HR"],
    description: "Dashboard pusat untuk HR memantau kondisi kehadiran, issue operasional, pending approval, dan kesiapan data menuju payroll.",
    filters: [
      { label: "Tanggal / periode", placeholder: "24 Mar 2026", type: "date", wide: true },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Status kerja", placeholder: "Semua status", type: "advanced" },
      { label: "Payroll period", placeholder: "Payroll Maret 2026", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-dashboard-atasan": {
    title: "Dashboard Presensi Atasan",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Dashboard Presensi Atasan"],
    description: "Sudut pandang leader untuk memantau timnya sendiri: siapa hadir, terlambat, belum check-out, dan siapa yang butuh approval.",
    filters: [
      { label: "Tanggal", placeholder: "24 Mar 2026", type: "date" },
      { label: "Departemen", placeholder: "Tim saya" },
      { label: "Status", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-harian": {
    title: "Monitoring Harian",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Monitoring Harian"],
    description: "Layar operasional harian untuk HR melihat kondisi presensi berjalan lengkap dengan payroll impact flag dan approval terkait.",
    filters: [
      { label: "Tanggal", placeholder: "24 Mar 2026", type: "date" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Shift", placeholder: "Semua shift" },
      { label: "Status", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-ketidakhadiran": {
    title: "Monitoring Ketidakhadiran",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Monitoring Ketidakhadiran"],
    description: "Fokus pada alpha, izin, sakit, cuti, pulang cepat, no check-in, no check-out, dan exception lain yang perlu tindak lanjut.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Jenis", placeholder: "Semua jenis", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-keterlambatan": {
    title: "Monitoring Keterlambatan",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Monitoring Keterlambatan"],
    description: "Pantau jumlah kasus telat, total menit, ranking keterlambatan, dan potensi dampaknya ke disiplin serta payroll.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Karyawan", placeholder: "Semua karyawan" },
    ],
  },
  "hr-presensi-monitoring-lembur": {
    title: "Monitoring Lembur",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Monitoring Lembur"],
    description: "Daftar lembur yang tercatat, yang disetujui, dan yang sudah siap dibawa ke payroll pada periode berjalan.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Status approval", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-rekap-payroll": {
    title: "Rekap Presensi Payroll",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Rekap Presensi Payroll"],
    description: "Bridge utama dari presensi ke payroll. Semua ringkasan per karyawan per periode dibentuk di sini sebelum gaji dihitung.",
    filters: [
      { label: "Periode payroll", placeholder: "Payroll Maret 2026", type: "advanced" },
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
      { label: "Readiness", placeholder: "Semua readiness", type: "advanced" },
      { label: "Finalisasi", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-monitoring-cutoff-finalisasi": {
    title: "Cutoff & Finalisasi Presensi",
    breadcrumbs: ["HR Presensi", "Monitoring Presensi", "Cutoff & Finalisasi Presensi"],
    description: "Checkpoint sebelum payroll. HR bisa melihat issue yang memblokir, menandai siap payroll, lalu lock periode presensi.",
    filters: [
      { label: "Periode payroll", placeholder: "Payroll Maret 2026", type: "advanced" },
      { label: "Status finalisasi", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-log-absensi-mentah": {
    title: "Log Absensi Mentah",
    breadcrumbs: ["HR Presensi", "Operasional", "Log Absensi Mentah"],
    description: "Pantau semua raw log dari fingerprint, mobile, manual, dan source lain sebelum atau sesudah diproses menjadi attendance record.",
    filters: [
      { label: "Periode", placeholder: "24 Mar 2026", type: "date", wide: true },
      { label: "Source", placeholder: "Semua source", type: "advanced" },
      { label: "Mesin", placeholder: "Semua mesin" },
      { label: "Employee", placeholder: "Semua employee" },
      { label: "Status proses", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-sinkronisasi-absensi": {
    title: "Sinkronisasi Absensi",
    breadcrumbs: ["HR Presensi", "Operasional", "Sinkronisasi Absensi"],
    description: "Upload file log, jalankan sync, review preview import, lalu pantau batch sinkronisasi dan hasil prosesnya dalam satu layar.",
    filters: [
      { label: "Sumber import", placeholder: "Semua sumber", type: "advanced" },
      { label: "Mesin", placeholder: "Semua mesin" },
      { label: "Status batch", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-review-konflik-absensi": {
    title: "Review Konflik Absensi",
    breadcrumbs: ["HR Presensi", "Operasional", "Review Konflik Absensi"],
    description: "Raw log bermasalah dikumpulkan di sini agar HR bisa resolve, abaikan, mapping ulang, atau proses ulang dengan audit trail yang jelas.",
    filters: [
      { label: "Periode", placeholder: "Maret 2026", type: "date" },
      { label: "Jenis conflict", placeholder: "Semua conflict", type: "advanced" },
      { label: "Mesin", placeholder: "Semua mesin" },
      { label: "Employee", placeholder: "Semua employee" },
    ],
  },
  "hr-presensi-pengaturan-setelan-umum": {
    title: "Setelan Umum",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Setelan Umum"],
    description: "Form pengaturan inti presensi dibagi per card section supaya lebih ringan dibaca dan terasa seperti halaman settings profesional.",
    filters: [],
  },
  "hr-presensi-pengaturan-denda": {
    title: "Denda",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Denda"],
    description: "Daftar rule denda dibuat lebih rapi agar nominal, status aktif, dan cakupan pelanggaran cepat dipahami.",
    filters: [
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Jenis pelanggaran", placeholder: "Semua jenis" },
      { label: "Status", placeholder: "Aktif", type: "advanced" },
    ],
  },
  "hr-presensi-pengaturan-hari-libur": {
    title: "Hari Libur",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Hari Libur"],
    description: "Kalender hari libur nasional dan internal dengan tabel yang lebih ringan dan mudah dipakai admin HR.",
    filters: [
      { label: "Tahun", placeholder: "2026" },
      { label: "Jenis libur", placeholder: "Semua jenis" },
    ],
  },
  "hr-presensi-pengaturan-jam-kerja-departemen": {
    title: "Jam Kerja Departemen",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Jam Kerja Departemen"],
    description: "Mapping departemen ke shift default dibuat lebih presisi supaya relasi operasional cepat dipahami.",
    filters: [
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Departemen", placeholder: "Semua departemen" },
    ],
  },
  "hr-presensi-pengaturan-jam-kerja": {
    title: "Jam Kerja",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Jam Kerja"],
    description: "Master shift dipoles serius karena warna, lintas hari, dan total jam akan dipakai langsung oleh laporan jadwal kerja.",
    filters: [
      { label: "Cari jam kerja", placeholder: "Cari nama atau kode shift" },
      { label: "Status", placeholder: "Aktif", type: "advanced" },
    ],
  },
  "hr-presensi-pengaturan-mesin-fingerprint": {
    title: "Mesin Fingerprint",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Mesin Fingerprint"],
    description: "Monitoring perangkat presensi dibuat ringan tetapi tetap terasa enterprise dan siap dipakai sungguhan.",
    filters: [
      { label: "Cabang", placeholder: "Semua cabang" },
      { label: "Status koneksi", placeholder: "Semua status", type: "advanced" },
    ],
  },
  "hr-presensi-pengaturan-integrasi-absensi": {
    title: "Integrasi Absensi",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Integrasi Absensi"],
    description: "Atur fondasi import, duplicate window, auto process, direction mode, dan validasi mobile agar semua source absensi tetap konsisten.",
    filters: [],
  },
  "hr-presensi-pengaturan-mapping-karyawan-mesin": {
    title: "Mapping Karyawan Mesin",
    breadcrumbs: ["HR Presensi", "Pengaturan", "Mapping Karyawan Mesin"],
    description: "Hubungkan employee internal dengan PIN atau kode eksternal dari mesin agar raw log fingerprint dan mobile bisa dikenali sistem.",
    filters: [
      { label: "Cari karyawan", placeholder: "Cari nama atau NIK" },
      { label: "Mesin", placeholder: "Semua mesin" },
      { label: "Source", placeholder: "Semua source", type: "advanced" },
    ],
  },
};

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function prettify(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function ActionButton({ icon: Icon, label, variant = "outline", onClick }) {
  return (
    <Button variant={variant} className="rounded-xl" onClick={onClick}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function SettingTile({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</div>
      <div className="mt-1.5 text-sm font-semibold text-[var(--text-main)]">{value}</div>
      {note ? <div className="mt-1 text-xs text-[var(--text-muted)]">{note}</div> : null}
    </div>
  );
}

export default function HrPresencePageShell({ pageKey }) {
  const [openModal, setOpenModal] = useState(false);
  const [selectedRawLogId, setSelectedRawLogId] = useState(null);
  const [selectedConflictId, setSelectedConflictId] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedPayrollSummaryId, setSelectedPayrollSummaryId] = useState(null);
  const meta = pageMeta[pageKey];

  const branchMap = useMemo(() => new Map(presenceBranches.map((item) => [item.id, item.branch_name])), []);
  const departmentMap = useMemo(() => new Map(presenceDepartments.map((item) => [item.id, item.department_name])), []);
  const employeeMap = useMemo(() => new Map(presenceEmployees.map((item) => [item.id, item])), []);
  const shiftMap = useMemo(() => new Map(workShifts.map((item) => [item.id, item])), []);
  const deviceMap = useMemo(() => new Map(fingerprintDevices.map((item) => [item.id, item])), []);
  const selectedRawLog = attendanceRawLogs.find((item) => item.id === selectedRawLogId) || null;
  const selectedConflict = attendanceConflicts.find((item) => item.id === selectedConflictId) || null;
  const selectedPayrollSummary = attendancePayrollSummaries.find((item) => item.id === selectedPayrollSummaryId) || null;

  if (!meta) {
    return null;
  }

  const summaryStatus = hrPresenceUiHelpers.attendanceSummary.byStatus;
  const settings = attendanceSettings[0];

  const attendanceRows = resolvedAttendanceRecords.slice(0, 18).map((record) => {
    const employee = employeeMap.get(record.employee_id);
    const shift = record.shift_id ? shiftMap.get(record.shift_id) : null;
    return {
      id: record.id,
      tanggal: formatDate(record.attendance_date),
      nik: employee?.employee_id || "-",
      nama: <div><div className="font-semibold">{employee?.employee_name}</div><div className="text-xs text-[var(--text-muted)]">{employee?.job_title}</div></div>,
      departemen: departmentMap.get(record.department_id || "") || "-",
      shift: shift ? <ShiftColorBadge label={shift.shift_name} time={`${shift.checkin_time} - ${shift.checkout_time}`} color={shift.color_hex} crossDay={shift.cross_day} className="rounded-xl px-2.5 py-1.5" /> : "-",
      jadwalMasuk: shift?.checkin_time || "-",
      jadwalPulang: shift?.checkout_time || "-",
      masukAktual: formatTime(record.actual_checkin),
      pulangAktual: formatTime(record.actual_checkout),
      status: formatAttendanceStatusLabel(record.status),
      terlambat: record.late_minutes ? `${record.late_minutes} mnt` : "-",
      lembur: record.overtime_minutes ? `${record.overtime_minutes} mnt` : "-",
      sumber: prettify(record.source),
    };
  });

  const exceptionRows = resolvedAttendanceRecords.filter((item) => item.status_main !== "hadir" && item.status_main !== "hari_libur" && item.status_main !== "off_schedule").slice(0, 18).map((record) => {
    const employee = employeeMap.get(record.employee_id);
    return {
      id: record.id,
      tanggal: formatDate(record.attendance_date),
      nama: <div><div className="font-semibold">{employee?.employee_name}</div><div className="text-xs text-[var(--text-muted)]">{employee?.employee_id}</div></div>,
      cabang: branchMap.get(record.branch_id || "") || "-",
      departemen: departmentMap.get(record.department_id || "") || "-",
      jenis: formatAttendanceStatusLabel(record.status_main),
      approval: ["izin", "sakit", "cuti"].includes(record.status_main) ? "Disetujui" : record.status_main === "alpha" ? "Menunggu" : "Draft",
      keterangan: record.reason || record.note || "Perlu review HR dan atasan.",
    };
  });

  const holidayRows = holidays.map((item) => ({
    id: item.id,
    tanggal: formatDate(item.holiday_date),
    nama: item.holiday_name,
    jenis: prettify(item.holiday_type),
    cakupan: item.department_id ? departmentMap.get(item.department_id) : "Semua unit terkait",
    status: item.is_active ? "Aktif" : "Nonaktif",
  }));

  const penaltyRows = attendancePenalties.map((item) => ({
    id: item.id,
    aturan: <div><div className="font-semibold">{item.penalty_name}</div><div className="text-xs text-[var(--text-muted)]">{item.description}</div></div>,
    berlakuUntuk: prettify(item.applies_to),
    hitung: item.calculation_type === "flat" ? "Flat" : "Per menit",
    nominal: formatCurrency(item.amount),
    status: item.is_active ? "Aktif" : "Nonaktif",
  }));

  const deptShiftRows = departmentWorkShifts.map((item) => {
    const shift = shiftMap.get(item.default_shift_id);
    return {
      id: item.id,
      departemen: departmentMap.get(item.department_id) || "-",
      polaKerja: prettify(item.work_pattern_type),
      shiftDefault: shift ? <ShiftColorBadge label={shift.shift_name} time={`${shift.checkin_time} - ${shift.checkout_time}`} color={shift.color_hex} crossDay={shift.cross_day} className="rounded-xl px-2.5 py-1.5" /> : "-",
      multiShift: item.allow_multi_shift ? "Ya" : "Tidak",
      berlakuMulai: formatDate(item.effective_start_date),
      status: item.is_active ? "Aktif" : "Nonaktif",
    };
  });

  const shiftRows = workShifts.map((item) => ({
    id: item.id,
    kode: item.shift_code,
    nama: <div><div className="font-semibold">{item.shift_name}</div><div className="text-xs text-[var(--text-muted)]">{item.description}</div></div>,
    waktu: `${item.checkin_time} - ${item.checkout_time}`,
    totalJam: `${Math.floor(item.total_work_minutes / 60)} jam ${item.total_work_minutes % 60} menit`,
    lintasHari: item.cross_day ? "Ya" : "Tidak",
    warna: <ShiftColorBadge label="Preview warna" color={item.color_hex} crossDay={item.cross_day} className="rounded-xl px-2.5 py-1.5" />,
    status: item.is_active ? "Aktif" : "Nonaktif",
  }));

  const deviceRows = fingerprintDevices.map((item) => ({
    id: item.id,
    mesin: <div><div className="font-semibold">{item.device_name}</div><div className="text-xs text-[var(--text-muted)]">{item.device_code}</div></div>,
    lokasi: <div><div>{item.location_name}</div><div className="text-xs text-[var(--text-muted)]">{branchMap.get(item.branch_id || "") || "Belum diikat ke cabang"}</div></div>,
    koneksi: prettify(item.connection_status),
    sinkron: formatDateTime(item.last_sync_at),
    alamat: item.ip_address,
    mappedUser: employeeDeviceMappingsResolved.filter((mapping) => mapping.device_id === item.id && mapping.is_active).length,
    status: item.is_active ? "Aktif" : "Nonaktif",
  }));

  const mappingRows = employeeDeviceMappingsResolved.map((item) => {
    const employee = employeeMap.get(item.employee_id);
    const device = item.device_id ? deviceMap.get(item.device_id) : null;
    return {
      id: item.id,
      nama: <div><div className="font-semibold">{employee?.employee_name || "-"}</div><div className="text-xs text-[var(--text-muted)]">{employee?.job_title || "-"}</div></div>,
      nik: employee?.employee_id || "-",
      source: <SourceBadge value={item.source_type} />,
      mesin: device ? <div><div>{device.device_name}</div><div className="text-xs text-[var(--text-muted)]">{device.device_code}</div></div> : "Mobile / tanpa mesin",
      kodeEksternal: item.external_employee_code,
      namaEksternal: item.external_employee_name || "-",
      utama: item.is_primary ? "Utama" : "Cadangan",
      status: item.is_active ? "Aktif" : "Nonaktif",
      aksi: <button type="button" className="text-sm font-semibold text-[var(--brand-900)]" onClick={() => setShowMappingModal(true)}>Ubah</button>,
    };
  });

  const rawLogRows = attendanceRawLogs.map((item) => ({
    id: item.id,
    datetime: formatDateTime(item.log_datetime),
    source: <SourceBadge value={item.source_type} />,
    mesin: item.device_name || "-",
    kodeEksternal: item.external_employee_code || "-",
    employeeInternal: item.employee_id ? employeeMap.get(item.employee_id)?.employee_name || item.employee_id : "-",
    direction: prettify(item.direction || "unknown"),
    verification: prettify(item.verification_type || "-"),
    sync: <SyncStatusBadge value={item.sync_status} />,
    proses: <SyncStatusBadge value={item.process_status} />,
    note: item.process_note || "-",
    detail: <button type="button" className="text-sm font-semibold text-[var(--brand-900)]" onClick={() => setSelectedRawLogId(item.id)}>Detail</button>,
  }));

  const batchRows = attendanceImportBatches.map((item) => ({
    id: item.id,
    batch: <div><div className="font-semibold">{item.batch_code}</div><div className="text-xs text-[var(--text-muted)]">{formatDateTime(item.import_started_at)}</div></div>,
    source: <SyncStatusBadge value={prettify(item.import_source)} />,
    fileDevice: item.file_name || deviceMap.get(item.device_id || "")?.device_name || "-",
    total: item.total_rows,
    berhasil: item.success_rows,
    duplicate: item.duplicate_rows,
    conflict: item.conflict_rows,
    status: <SyncStatusBadge value={item.status} />,
    aksi: <button type="button" className="text-sm font-semibold text-[var(--brand-900)]" onClick={() => setOpenModal(true)}>Detail</button>,
  }));

  const syncJobRows = attendanceSyncJobs.map((item) => ({
    id: item.id,
    syncType: prettify(item.sync_type),
    mesin: item.device_id ? deviceMap.get(item.device_id)?.device_name || item.device_id : "Semua source non-device",
    fetched: item.total_fetched,
    processed: item.total_processed,
    conflict: item.total_conflict,
    duplicate: item.total_duplicate,
    status: <SyncStatusBadge value={item.status} />,
    waktu: formatDateTime(item.started_at),
  }));

  const conflictRows = attendanceConflicts.map((item) => {
    const rawLog = attendanceRawLogs.find((log) => log.id === item.raw_log_id);
    return {
      id: item.id,
      waktu: rawLog ? formatDateTime(rawLog.log_datetime) : "-",
      source: rawLog ? <SourceBadge value={rawLog.source_type} /> : "-",
      employeeRaw: rawLog?.employee_name_raw || rawLog?.external_employee_code || "-",
      employeeInternal: item.employee_id ? employeeMap.get(item.employee_id)?.employee_name || item.employee_id : "-",
      jenis: prettify(item.conflict_type),
      deskripsi: item.conflict_description,
      suggested: item.suggested_action || "Review manual",
      status: <SyncStatusBadge value={item.resolution_status} />,
      aksi: <button type="button" className="text-sm font-semibold text-[var(--brand-900)]" onClick={() => setSelectedConflictId(item.id)}>Resolve</button>,
    };
  });

  const payrollSummaryRows = attendancePayrollSummaries.map((item) => {
    const employee = employeeMap.get(item.employee_id);
    return {
      id: item.id,
      nik: employee?.employee_id || "-",
      nama: <div><div className="font-semibold">{employee?.employee_name || item.employee_id}</div><div className="text-xs text-[var(--text-muted)]">{employee?.job_title || "-"}</div></div>,
      departemen: departmentMap.get(employee?.department_id || "") || "-",
      periode: attendanceMonitoringUi.payrollPeriods[0]?.label || "Payroll berjalan",
      ...item,
      total_late_minutes: <LateMinutesBadge value={item.total_late_minutes} />,
      total_overtime_minutes: <OvertimeBadge value={item.total_overtime_minutes} />,
      payroll_readiness_status: prettify(item.payroll_readiness_status),
      attendance_final_status: prettify(item.attendance_final_status),
      aksi: <button type="button" className="text-sm font-semibold text-[var(--brand-900)]" onClick={() => setSelectedPayrollSummaryId(item.id)}>Detail</button>,
    };
  });

  const payrollImpactRows = attendancePayrollImpacts.slice(0, 16).map((item) => {
    const employee = employeeMap.get(item.employee_id);
    return {
      id: item.id,
      tanggal: formatDate(item.attendance_date),
      karyawan: employee?.employee_name || item.employee_id,
      jenis: <AttendanceImpactBadge value={item.impact_type} />,
      kategori: prettify(item.impact_category),
      nilai: `${item.impact_value} ${item.impact_unit}`,
      approval: item.approval_status ? prettify(item.approval_status) : "Perlu review",
      note: item.note || "-",
    };
  });

  const headerActions = {
    "hr-presensi-absensi-karyawan": [<ActionButton key="sync" icon={RefreshCcw} label="Sinkronisasi" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-laporan-jadwal-kerja": [<ActionButton key="print" icon={Printer} label="Cetak" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="xls" icon={FileSpreadsheet} label="Export Excel" onClick={() => setOpenModal(true)} />, <ActionButton key="pdf" icon={Download} label="Export PDF" onClick={() => setOpenModal(true)} />],
    "hr-presensi-laporan-ketidakhadiran": [<ActionButton key="print" icon={Printer} label="Print" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-dashboard-hr": [<ActionButton key="refresh" icon={RefreshCcw} label="Refresh dashboard" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export ringkas" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-dashboard-atasan": [<ActionButton key="approval" icon={ShieldAlert} label="Lihat approval" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-harian": [<ActionButton key="review" icon={ShieldAlert} label="Review harian" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-ketidakhadiran": [<ActionButton key="print" icon={Printer} label="Print" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-keterlambatan": [<ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />, <ActionButton key="trend" icon={LineChart} label="Lihat tren" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-lembur": [<ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />, <ActionButton key="approval" icon={ShieldAlert} label="Approval lembur" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-rekap-payroll": [<ActionButton key="csv" icon={FileSpreadsheet} label="Export CSV" onClick={() => setOpenModal(true)} />, <ActionButton key="ready" icon={Save} label="Tandai siap payroll" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-monitoring-cutoff-finalisasi": [<ActionButton key="lock" icon={ShieldPlus} label="Lock periode" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="send" icon={SendHorizontal} label="Kirim ke payroll" onClick={() => setOpenModal(true)} />],
    "hr-presensi-log-absensi-mentah": [<ActionButton key="filter" icon={Filter} label="Filter" onClick={() => setOpenModal(true)} />, <ActionButton key="sync" icon={RefreshCcw} label="Proses ulang" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-sinkronisasi-absensi": [<ActionButton key="upload" icon={Upload} label="Upload file" onClick={() => setOpenModal(true)} />, <ActionButton key="sync" icon={RefreshCcw} label="Sinkronisasi sekarang" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-review-konflik-absensi": [<ActionButton key="mapping" icon={Link2} label="Buka mapping" onClick={() => setShowMappingModal(true)} />, <ActionButton key="reprocess" icon={RefreshCcw} label="Proses ulang" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-setelan-umum": [<ActionButton key="save" icon={Save} label="Simpan" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-denda": [<ActionButton key="add" icon={Plus} label="Tambah denda" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-hari-libur": [<ActionButton key="add" icon={CalendarPlus2} label="Tambah hari libur" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-jam-kerja-departemen": [<ActionButton key="add" icon={Plus} label="Tambah mapping" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-jam-kerja": [<ActionButton key="add" icon={Plus} label="Tambah jam kerja" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-mesin-fingerprint": [<ActionButton key="sync" icon={RefreshCcw} label="Sinkronisasi" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="add" icon={Plus} label="Tambah mesin" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-integrasi-absensi": [<ActionButton key="save" icon={Save} label="Simpan aturan" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-mapping-karyawan-mesin": [<ActionButton key="import" icon={Upload} label="Import mapping" onClick={() => setOpenModal(true)} />, <ActionButton key="add" icon={Plus} label="Tambah mapping" variant="default" onClick={() => setShowMappingModal(true)} />],
  }[pageKey];

  const renderContent = () => {
    if (pageKey === "hr-presensi-absensi-karyawan") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {[
              ["Hadir", summaryStatus.hadir, "emerald"],
              ["Terlambat", summaryStatus.terlambat, "amber"],
              ["Tidak Hadir", summaryStatus.alpha, "rose"],
              ["Izin", summaryStatus.izin, "sky"],
              ["Sakit", summaryStatus.sakit, "violet"],
              ["Cuti", summaryStatus.cuti, "slate"],
            ].map(([label, value, tone]) => <PresenceSummaryCard key={label} label={label} value={value} note="Ringkasan status periode aktif." tone={tone} />)}
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Filter} label="Filter" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Daftar absensi harian" description="Kolom-kolom dibuat lebih presisi agar admin cepat menemukan anomali tanpa terasa sesak.">
            <PresenceDataTable dense stickyColumns={2} columns={[
              { key: "tanggal", label: "Tanggal", width: 130 }, { key: "nik", label: "NIK", width: 130 }, { key: "nama", label: "Nama karyawan", width: 220 }, { key: "departemen", label: "Departemen", width: 180 }, { key: "shift", label: "Shift", width: 180 }, { key: "jadwalMasuk", label: "Jadwal masuk", width: 120 }, { key: "jadwalPulang", label: "Jadwal pulang", width: 120 }, { key: "masukAktual", label: "Masuk aktual", width: 120 }, { key: "pulangAktual", label: "Pulang aktual", width: 120 }, { key: "status", label: "Status", width: 130, type: "status" }, { key: "terlambat", label: "Terlambat", width: 110 }, { key: "lembur", label: "Lembur", width: 110 }, { key: "sumber", label: "Sumber", width: 150, type: "status" },
            ]} rows={attendanceRows} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-laporan-jadwal-kerja") {
      return (
        <>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Printer} label="Cetak" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Matrix jadwal kerja bulanan" description="NIK dan nama dibuat sticky, warna shift mengikuti master, dan hari libur diberi penekanan visual ringan.">
            <ScheduleMatrix rows={hrPresenceUiHelpers.scheduleMatrix.slice(0, 10)} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-laporan-ketidakhadiran") {
      const cards = [
        ["Alpha", summaryStatus.alpha, "rose"], ["Izin", summaryStatus.izin, "sky"], ["Sakit", summaryStatus.sakit, "violet"], ["Cuti", summaryStatus.cuti, "slate"],
        ["Terlambat", summaryStatus.terlambat, "amber"], ["Pulang cepat", summaryStatus.pulang_cepat, "amber"], ["Tidak absen masuk", summaryStatus.tidak_absen_masuk, "rose"], ["Tidak absen pulang", summaryStatus.tidak_absen_pulang, "amber"],
      ];
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, tone]) => <PresenceSummaryCard key={label} label={label} value={value} note="Ringkasan exception periode aktif." tone={tone} />)}</div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Printer} label="Print" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Detail ketidakhadiran" description="Tabel ini menonjolkan jenis exception dan approval supaya tindak lanjut lebih cepat.">
            <PresenceDataTable columns={[
              { key: "tanggal", label: "Tanggal", width: 130 }, { key: "nama", label: "Nama karyawan", width: 220 }, { key: "cabang", label: "Cabang", width: 180 }, { key: "departemen", label: "Departemen", width: 180 }, { key: "jenis", label: "Jenis", width: 150, type: "status" }, { key: "approval", label: "Approval", width: 130, type: "status" }, { key: "keterangan", label: "Keterangan", width: 280 },
            ]} rows={exceptionRows} stickyColumns={1} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-dashboard-hr") {
      const summary = hrPresenceUiHelpers.attendanceSummary;
      const dashboard = attendanceMonitoringUi.hrDashboard;
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttendanceDashboardCard label="Total karyawan aktif" value={dashboard.summary.total_active_employees} note="Seluruh perusahaan pada scope aktif." tone="slate" />
            <AttendanceDashboardCard label="Hadir hari ini" value={dashboard.summary.hadir_hari_ini} note="Sudah tercatat hadir atau on-time." tone="emerald" />
            <AttendanceDashboardCard label="Terlambat hari ini" value={dashboard.summary.terlambat_hari_ini} note={`${summary.totalLateMinutes} menit keterlambatan tercatat.`} tone="amber" />
            <AttendanceDashboardCard label="Data belum siap payroll" value={dashboard.summary.data_belum_siap_payroll} note="Conflict atau approval pending masih terbuka." tone="rose" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={RefreshCcw} label="Refresh dashboard" variant="default" onClick={() => setOpenModal(true)} />} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="space-y-6">
              <AttendanceTrendChart title="Tren kehadiran 7 hari terakhir" points={attendanceMonitoringUi.trend7} />
              <PresenceSectionCard title="Daftar karyawan terlambat hari ini" description="Drill down cepat untuk HR sebelum issue dibawa ke tindakan disiplin atau payroll review.">
                <PresenceDataTable columns={[
                  { key: "tanggal", label: "Tanggal", width: 120 },
                  { key: "nama", label: "Nama", width: 220 },
                  { key: "departemen", label: "Departemen", width: 160 },
                  { key: "status", label: "Status", width: 120, type: "status" },
                  { key: "terlambat", label: "Terlambat", width: 120 },
                ]} rows={attendanceRows.filter((item) => item.terlambat !== "-").slice(0, 8)} />
              </PresenceSectionCard>
              <PresenceSectionCard title="Rekap per departemen" description="Membantu HR melihat unit mana yang paling stabil dan mana yang paling sering bermasalah.">
                <DepartmentSummaryTable rows={attendanceMonitoringUi.departmentRanking.slice(0, 8)} />
              </PresenceSectionCard>
            </div>
            <div className="space-y-6">
              <PayrollReadinessCard summary={{ total_data_siap_payroll: attendanceFinalizationPeriod.total_ready, total_need_review: attendanceFinalizationPeriod.total_need_review }} finalization={attendanceFinalizationPeriod} />
              <AttendanceIssueWidget title="Karyawan belum check-out" items={dashboard.noCheckoutToday.map((item) => ({ ...item, employee_name: employeeMap.get(item.employee_id)?.employee_name, note: item.reason }))} />
              <AttendanceIssueWidget title="Konflik absensi aktif" items={dashboard.unresolvedConflicts} />
              <PendingApprovalWidget items={dashboard.pendingApprovals.slice(0, 5)} />
            </div>
          </div>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-dashboard-atasan") {
      const dashboard = attendanceMonitoringUi.managerDashboard;
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttendanceDashboardCard label="Total anggota tim" value={dashboard.summary.total_anggota_tim} note="Scope tim sesuai departemen atasan." tone="slate" />
            <AttendanceDashboardCard label="Hadir hari ini" value={dashboard.summary.hadir_hari_ini} note="Tim yang hadir di hari berjalan." tone="emerald" />
            <AttendanceDashboardCard label="Terlambat" value={dashboard.summary.terlambat} note="Perlu follow-up ringan dari leader." tone="amber" />
            <AttendanceDashboardCard label="Pending approval" value={dashboard.summary.pengajuan_pending} note="Antrian yang masih menunggu keputusan atasan." tone="sky" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={ShieldAlert} label="Buka approval" variant="default" onClick={() => setOpenModal(true)} />} />
          <div className="grid gap-6 xl:grid-cols-2">
            <TeamAttendanceWidget title="Kehadiran tim hari ini" rows={dashboard.teamToday.map((item) => ({ ...item, employee_name: employeeMap.get(item.employee_id)?.employee_name }))} renderMeta={(row) => `${formatAttendanceStatusLabel(row.status_main)} • ${row.attendance_date}`} />
            <TeamAttendanceWidget title="Tim yang terlambat" rows={dashboard.lateTeam.map((item) => ({ ...item, employee_name: employeeMap.get(item.employee_id)?.employee_name }))} renderMeta={(row) => `${row.late_minutes} menit terlambat`} />
            <PendingApprovalWidget items={dashboard.pendingApprovals} />
            <PresenceSectionCard title="Ranking kedisiplinan tim" description="Atasan bisa cepat melihat siapa yang paling stabil dan siapa yang paling sering perlu diingatkan.">
              <PresenceDataTable columns={[
                { key: "employee_name", label: "Karyawan", width: 220 },
                { key: "discipline_score", label: "Skor", width: 120 },
                { key: "late_count", label: "Terlambat", width: 110 },
                { key: "alpha_count", label: "Alpha", width: 110 },
              ]} rows={dashboard.disciplineRanking.slice(0, 8)} />
            </PresenceSectionCard>
          </div>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-harian") {
      const monitoring = attendanceMonitoringUi.dailyMonitoring;
      const dailyRows = monitoring.rows.slice(0, 24).map((record) => {
        const employee = employeeMap.get(record.employee_id);
        const approval = getApprovalStatusForEmployeeDate(record.employee_id, record.attendance_date);
        return {
          id: record.id,
          tanggal: formatDate(record.attendance_date),
          nik: employee?.employee_id || "-",
          nama: employee?.employee_name || "-",
          cabang: branchMap.get(record.branch_id || "") || "-",
          departemen: departmentMap.get(record.department_id || "") || "-",
          shift: shiftMap.get(record.shift_id || "")?.shift_name || "-",
          jadwalMasuk: formatTime(record.scheduled_checkin),
          checkinAktual: formatTime(record.actual_checkin),
          jadwalPulang: formatTime(record.scheduled_checkout),
          checkoutAktual: formatTime(record.actual_checkout),
          status: formatAttendanceStatusLabel(record.status_main),
          late: <LateMinutesBadge value={record.late_minutes} />,
          earlyLeave: record.early_leave_minutes ? `${record.early_leave_minutes} mnt` : "-",
          overtime: <OvertimeBadge value={record.overtime_minutes} />,
          source: prettify(record.source),
          approval: approval ? prettify(approval.status) : "Tidak ada",
          payrollImpact: attendancePayrollImpacts.some((impact) => impact.attendance_record_id === record.id) ? "Ada impact" : "Aman",
        };
      });
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AttendanceDashboardCard label="Hadir" value={monitoring.summary.hadir} note="Sudah tercatat lengkap." tone="emerald" />
            <AttendanceDashboardCard label="Terlambat" value={monitoring.summary.terlambat} note="Melewati toleransi." tone="amber" />
            <AttendanceDashboardCard label="Alpha" value={monitoring.summary.alpha} note="Tidak ada check-in maupun check-out." tone="rose" />
            <AttendanceDashboardCard label="Belum check-out" value={monitoring.summary.belum_check_out} note="Perlu dipantau sebelum tutup hari." tone="sky" />
            <AttendanceDashboardCard label="Conflict" value={monitoring.summary.conflict} note="Butuh review sebelum payroll." tone="violet" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Filter} label="Filter" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Monitoring presensi harian" description="Layar ini dibuat untuk operasi harian HR, termasuk approval, payroll impact, dan drill down ke review.">
            <PresenceDataTable dense stickyColumns={2} columns={[
              { key: "tanggal", label: "Tanggal", width: 130 },
              { key: "nik", label: "NIK", width: 120 },
              { key: "nama", label: "Nama", width: 190 },
              { key: "cabang", label: "Cabang", width: 160 },
              { key: "departemen", label: "Departemen", width: 160 },
              { key: "shift", label: "Shift", width: 140 },
              { key: "jadwalMasuk", label: "Jadwal masuk", width: 110 },
              { key: "checkinAktual", label: "Check-in", width: 110 },
              { key: "jadwalPulang", label: "Jadwal pulang", width: 110 },
              { key: "checkoutAktual", label: "Check-out", width: 110 },
              { key: "status", label: "Status", width: 130, type: "status" },
              { key: "late", label: "Late", width: 100 },
              { key: "earlyLeave", label: "Early leave", width: 100 },
              { key: "overtime", label: "Overtime", width: 100 },
              { key: "source", label: "Source", width: 120, type: "status" },
              { key: "approval", label: "Approval", width: 110, type: "status" },
              { key: "payrollImpact", label: "Payroll impact", width: 130, type: "status" },
            ]} rows={dailyRows} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-ketidakhadiran") {
      const monitoring = attendanceMonitoringUi.absenceMonitoring;
      const absenceRows = monitoring.rows.slice(0, 18).map((record) => {
        const employee = employeeMap.get(record.employee_id);
        return {
          id: record.id,
          tanggal: formatDate(record.attendance_date),
          nama: employee?.employee_name || "-",
          departemen: departmentMap.get(record.department_id || "") || "-",
          jenis: formatAttendanceStatusLabel(record.status_main),
          approval: getApprovalStatusForEmployeeDate(record.employee_id, record.attendance_date) ? "Ada pengajuan" : "Tanpa pengajuan",
          detail: record.reason || record.note || "-",
        };
      });
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Alpha", monitoring.summary.alpha, "rose"],
              ["Izin", monitoring.summary.izin, "sky"],
              ["Sakit", monitoring.summary.sakit, "violet"],
              ["Cuti", monitoring.summary.cuti, "slate"],
              ["Tidak absen masuk", monitoring.summary.tidak_absen_masuk, "amber"],
              ["Tidak absen pulang", monitoring.summary.tidak_absen_pulang, "amber"],
              ["Pulang cepat", monitoring.summary.pulang_cepat, "amber"],
              ["Off schedule", monitoring.summary.off_schedule, "slate"],
            ].map(([label, value, tone]) => <AttendanceDashboardCard key={label} label={label} value={value} note="Ringkasan issue periode aktif." tone={tone} />)}
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Download} label="Export" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Detail ketidakhadiran" description="Semua kategori ketidakhadiran dan anomali dirapikan di satu meja kerja untuk tindak lanjut HR.">
            <PresenceDataTable columns={[
              { key: "tanggal", label: "Tanggal", width: 130 },
              { key: "nama", label: "Nama", width: 220 },
              { key: "departemen", label: "Departemen", width: 170 },
              { key: "jenis", label: "Jenis", width: 140, type: "status" },
              { key: "approval", label: "Approval terkait", width: 130, type: "status" },
              { key: "detail", label: "Detail", width: 260 },
            ]} rows={absenceRows} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-keterlambatan") {
      const monitoring = attendanceMonitoringUi.lateMonitoring;
      const lateRows = monitoring.rows.slice(0, 18).map((record) => {
        const employee = employeeMap.get(record.employee_id);
        return {
          id: record.id,
          nama: employee?.employee_name || "-",
          tanggal: formatDate(record.attendance_date),
          shift: shiftMap.get(record.shift_id || "")?.shift_name || "-",
          jadwalMasuk: formatTime(record.scheduled_checkin),
          checkinAktual: formatTime(record.actual_checkin),
          lateMinutes: <LateMinutesBadge value={record.late_minutes} />,
          source: prettify(record.source),
          payrollImpact: attendancePayrollImpacts.some((impact) => impact.attendance_record_id === record.id && impact.impact_type === "late_penalty_candidate") ? "Kandidat potongan" : "Review",
        };
      });
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttendanceDashboardCard label="Total kasus terlambat" value={monitoring.summary.total_cases} note="Jumlah kejadian di periode aktif." tone="amber" />
            <AttendanceDashboardCard label="Total menit terlambat" value={monitoring.summary.total_minutes} note="Akumulasi menit melewati toleransi." tone="amber" />
            <AttendanceDashboardCard label="Karyawan paling sering telat" value={monitoring.employeeRanking[0]?.employee_name || "-"} note={`${monitoring.employeeRanking[0]?.late_count || 0} kejadian`} tone="rose" />
            <AttendanceDashboardCard label="Departemen paling sering telat" value={monitoring.departmentRanking[0]?.department_name || "-"} note={`${monitoring.departmentRanking[0]?.late_cases || 0} kejadian`} tone="violet" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="space-y-6">
              <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Download} label="Export keterlambatan" variant="default" onClick={() => setOpenModal(true)} />} />
              <PresenceSectionCard title="Daftar keterlambatan" description="Dipakai HR untuk disiplin sekaligus payroll review, jadi kolom lateness dan payroll impact dibuat tegas.">
                <PresenceDataTable columns={[
                  { key: "nama", label: "Nama", width: 220 },
                  { key: "tanggal", label: "Tanggal", width: 120 },
                  { key: "shift", label: "Shift", width: 140 },
                  { key: "jadwalMasuk", label: "Jadwal masuk", width: 110 },
                  { key: "checkinAktual", label: "Check-in aktual", width: 110 },
                  { key: "lateMinutes", label: "Late minutes", width: 110 },
                  { key: "source", label: "Sumber", width: 120, type: "status" },
                  { key: "payrollImpact", label: "Payroll impact", width: 150, type: "status" },
                ]} rows={lateRows} />
              </PresenceSectionCard>
            </div>
            <div className="space-y-6">
              <PresenceSectionCard title="Ranking keterlambatan per karyawan"><PresenceDataTable columns={[{ key: "employee_name", label: "Karyawan", width: 180 }, { key: "late_count", label: "Kejadian", width: 90 }, { key: "total_late_minutes", label: "Menit", width: 90 }]} rows={monitoring.employeeRanking.slice(0, 8)} /></PresenceSectionCard>
              <PresenceSectionCard title="Ranking keterlambatan per departemen"><PresenceDataTable columns={[{ key: "department_name", label: "Departemen", width: 180 }, { key: "late_cases", label: "Kejadian", width: 90 }, { key: "present_rate", label: "Kehadiran", width: 90 }]} rows={monitoring.departmentRanking.slice(0, 8).map((item) => ({ ...item, present_rate: `${item.present_rate}%` }))} /></PresenceSectionCard>
            </div>
          </div>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-lembur") {
      const monitoring = attendanceMonitoringUi.overtimeMonitoring;
      const overtimeRows = monitoring.rows.slice(0, 18).map((record) => {
        const employee = employeeMap.get(record.employee_id);
        return {
          id: record.id,
          nama: employee?.employee_name || "-",
          departemen: departmentMap.get(record.department_id || "") || "-",
          tanggal: formatDate(record.attendance_date),
          mulai: formatTime(record.scheduled_checkout),
          selesai: formatTime(record.actual_checkout),
          total: <OvertimeBadge value={record.overtime_minutes} />,
          approval: attendancePayrollImpacts.some((impact) => impact.attendance_record_id === record.id && impact.impact_type === "overtime_payment_candidate") ? "Disetujui" : "Menunggu",
          payroll: attendancePayrollImpacts.some((impact) => impact.attendance_record_id === record.id && impact.impact_type === "overtime_payment_candidate") ? "Siap payroll" : "Review",
        };
      });
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AttendanceDashboardCard label="Total lembur hari ini" value={monitoring.rows.filter((item) => item.attendance_date === "2026-03-24").length} note="Record lembur pada hari berjalan." tone="emerald" />
            <AttendanceDashboardCard label="Total lembur periode" value={monitoring.summary.total_cases} note="Semua lembur tercatat." tone="sky" />
            <AttendanceDashboardCard label="Total jam lembur" value={`${Math.round(monitoring.summary.total_minutes / 60)} jam`} note="Akumulasi lembur periode aktif." tone="emerald" />
            <AttendanceDashboardCard label="Lembur disetujui" value={monitoring.summary.approved_cases} note="Kandidat pembayaran lembur." tone="violet" />
            <AttendanceDashboardCard label="Siap payroll" value={attendancePayrollImpacts.filter((item) => item.impact_type === "overtime_payment_candidate").length} note="Sudah masuk layer impact payroll." tone="amber" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Download} label="Export lembur" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Monitoring lembur" description="Menyatukan data lembur operasional dengan kesiapan pembayaran lembur untuk payroll.">
            <PresenceDataTable columns={[
              { key: "nama", label: "Nama karyawan", width: 220 },
              { key: "departemen", label: "Departemen", width: 160 },
              { key: "tanggal", label: "Tanggal", width: 120 },
              { key: "mulai", label: "Jam mulai", width: 100 },
              { key: "selesai", label: "Jam selesai", width: 100 },
              { key: "total", label: "Total lembur", width: 120 },
              { key: "approval", label: "Approval", width: 120, type: "status" },
              { key: "payroll", label: "Payroll status", width: 130, type: "status" },
            ]} rows={overtimeRows} />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-rekap-payroll") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttendanceDashboardCard label="Total karyawan periode" value={attendancePayrollSummaries.length} note="Karyawan yang masuk payroll period aktif." tone="slate" />
            <AttendanceDashboardCard label="Total alpha" value={attendancePayrollSummaries.reduce((sum, item) => sum + item.alpha_days, 0)} note="Kandidat potongan hari kerja." tone="rose" />
            <AttendanceDashboardCard label="Total menit terlambat" value={attendancePayrollSummaries.reduce((sum, item) => sum + item.total_late_minutes, 0)} note="Kandidat penalty jika policy aktif." tone="amber" />
            <AttendanceDashboardCard label="Data siap payroll" value={attendanceFinalizationPeriod.total_ready} note="Sudah rapi dan bisa dikonsumsi payroll." tone="emerald" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<div className="flex gap-2"><ActionButton icon={FileSpreadsheet} label="Excel" onClick={() => setOpenModal(true)} /><ActionButton icon={Download} label="CSV" onClick={() => setOpenModal(true)} /><ActionButton icon={Printer} label="PDF" variant="default" onClick={() => setOpenModal(true)} /></div>} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <div className="space-y-6">
              <PresenceSectionCard title="Rekap presensi payroll per karyawan" description="Tabel ini adalah jembatan utama ke payroll. Semua issue, overtime, alpha, dan keterlambatan sudah diringkas per periode.">
                <AttendancePayrollSummaryTable rows={payrollSummaryRows} />
              </PresenceSectionCard>
              <PresenceSectionCard title="Layer attendance payroll impact" description="Belum menghitung nominal gaji, tetapi semua kandidat impact payroll sudah disiapkan agar modul payroll tinggal mengonsumsi layer ini.">
                <PresenceDataTable columns={[
                  { key: "tanggal", label: "Tanggal", width: 120 },
                  { key: "karyawan", label: "Karyawan", width: 220 },
                  { key: "jenis", label: "Impact type", width: 190 },
                  { key: "kategori", label: "Kategori", width: 120, type: "status" },
                  { key: "nilai", label: "Nilai", width: 120 },
                  { key: "approval", label: "Approval", width: 120, type: "status" },
                  { key: "note", label: "Catatan", width: 260 },
                ]} rows={payrollImpactRows} />
              </PresenceSectionCard>
            </div>
            <div className="space-y-6">
              <PayrollReadinessCard summary={{ total_data_siap_payroll: attendanceFinalizationPeriod.total_ready, total_data_belum_valid: attendanceFinalizationPeriod.total_need_review }} finalization={attendanceFinalizationPeriod} />
              <FinalizationProgressCard finalization={attendanceFinalizationPeriod} />
              <AttendanceIssueWidget title="Issue yang memblokir payroll" items={attendanceMonitoringUi.payrollBlockingIssues.unresolved_conflicts} />
            </div>
          </div>
        </>
      );
    }

    if (pageKey === "hr-presensi-monitoring-cutoff-finalisasi") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AttendanceDashboardCard label="Total karyawan" value={attendanceFinalizationPeriod.total_employees} note="Masuk payroll period aktif." tone="slate" />
            <AttendanceDashboardCard label="Total siap" value={attendanceFinalizationPeriod.total_ready} note="Sudah lolos review presensi." tone="emerald" />
            <AttendanceDashboardCard label="Need review" value={attendanceFinalizationPeriod.total_need_review} note="Masih ada conflict atau approval pending." tone="amber" />
            <AttendanceDashboardCard label="Total locked" value={attendanceFinalizationPeriod.total_locked} note="Data sudah dikunci untuk payroll." tone="violet" />
          </div>
          <PayrollCutoffPanel
            finalization={attendanceFinalizationPeriod}
            onReady={() => {
              markAttendanceDataReadyForPayroll("payroll-2026-03", { employeeIds: attendancePayrollSummaries.slice(0, 4).map((item) => item.employee_id) });
              setOpenModal(true);
            }}
            onLock={() => {
              lockAttendanceForPayroll("payroll-2026-03");
              setOpenModal(true);
            }}
            onUnlock={() => {
              unlockAttendanceForPayroll("payroll-2026-03", "Butuh revisi sebelum payroll.");
              setOpenModal(true);
            }}
            onExport={() => {
              exportAttendancePayrollRecap("payroll-2026-03", "excel");
              setOpenModal(true);
            }}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <div className="space-y-6">
              <PresenceSectionCard title="Issue yang memblokir payroll" description="Area ini membantu HR bersih-bersih sebelum periode ditandai siap payroll lalu di-lock.">
                <PresenceDataTable columns={[
                  { key: "employee", label: "Employee raw", width: 180 },
                  { key: "jenis", label: "Jenis issue", width: 180, type: "status" },
                  { key: "deskripsi", label: "Deskripsi", width: 260 },
                  { key: "status", label: "Status", width: 120, type: "status" },
                ]} rows={[
                  ...attendanceMonitoringUi.payrollBlockingIssues.unresolved_conflicts.map((item) => ({ id: item.id, employee: attendanceRawLogs.find((log) => log.id === item.raw_log_id)?.employee_name_raw || "-", jenis: prettify(item.conflict_type), deskripsi: item.conflict_description, status: prettify(item.resolution_status) })),
                  ...attendanceMonitoringUi.payrollBlockingIssues.pending_requests.map((item) => ({ id: item.id, employee: employeeMap.get(item.employee_id)?.employee_name || "-", jenis: prettify(item.request_type), deskripsi: item.description, status: prettify(item.status) })),
                ]} />
              </PresenceSectionCard>
              <PresenceSectionCard title="Audit trail finalisasi" description="Setiap tindakan penting dicatat agar payroll dan HR punya jejak review yang jelas.">
                <PresenceDataTable columns={[
                  { key: "waktu", label: "Waktu", width: 170 },
                  { key: "aksi", label: "Aksi", width: 180 },
                  { key: "pelaku", label: "Pelaku", width: 160 },
                  { key: "catatan", label: "Catatan", width: 260 },
                ]} rows={[
                  { id: "audit-01", waktu: formatDateTime(attendanceFinalizationPeriod.updated_at), aksi: "Generate rekap payroll", pelaku: "HR Payroll", catatan: "Rekap presensi payroll periode Maret berhasil dibentuk." },
                  { id: "audit-02", waktu: formatDateTime(attendanceImportBatches[0]?.updated_at), aksi: "Review conflict absensi", pelaku: "HR Admin", catatan: "Masih ada conflict unresolved yang perlu dibersihkan." },
                ]} />
              </PresenceSectionCard>
            </div>
            <div className="space-y-6">
              <FinalizationProgressCard finalization={attendanceFinalizationPeriod} />
              <AttendanceIssueWidget title="Approval pending" items={attendanceMonitoringUi.payrollBlockingIssues.pending_requests} />
              <AttendanceIssueWidget title="Processed log yang masih conflict" items={attendanceMonitoringUi.processedConflicts} />
            </div>
          </div>
        </>
      );
    }

    if (pageKey === "hr-presensi-log-absensi-mentah") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <PresenceSummaryCard label="Total raw log" value={attendanceIntegrationUi.rawLogSummary.total} note="Semua source yang masuk ke layer mentah." tone="slate" />
            <PresenceSummaryCard label="Fingerprint" value={attendanceIntegrationUi.rawLogSummary.bySource.fingerprint || 0} note="Log dari mesin fingerprint." tone="emerald" />
            <PresenceSummaryCard label="Mobile" value={attendanceIntegrationUi.rawLogSummary.bySource.mobile || 0} note="Log dari aplikasi mobile attendance." tone="sky" />
            <PresenceSummaryCard label="Conflict" value={attendanceIntegrationUi.rawLogSummary.byProcessStatus.conflict || 0} note="Perlu review sebelum final." tone="rose" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Filter} label="Filter" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Daftar log absensi mentah" description="Layer ini menampilkan log sebelum dan sesudah dinormalisasi. Detail log menyimpan payload mentah, mapping, dan status proses.">
            <RawLogTable
              columns={[
                { key: "datetime", label: "Datetime log", width: 170 },
                { key: "source", label: "Source", width: 140 },
                { key: "mesin", label: "Mesin / device", width: 200 },
                { key: "kodeEksternal", label: "Kode eksternal", width: 140 },
                { key: "employeeInternal", label: "Employee internal", width: 180 },
                { key: "direction", label: "Direction", width: 130, type: "status" },
                { key: "verification", label: "Verification", width: 140 },
                { key: "sync", label: "Sync status", width: 130 },
                { key: "proses", label: "Process status", width: 140 },
                { key: "note", label: "Note", width: 260 },
                { key: "detail", label: "Detail", width: 110 },
              ]}
              rows={rawLogRows}
              stickyColumns={2}
            />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-sinkronisasi-absensi") {
      return (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {attendanceIntegrationUi.batchSummaryCards.map((batch) => <ImportBatchSummaryCard key={batch.id} batch={batch} />)}
          </div>
          <ImportPreviewPanel preview={attendanceIntegrationUi.preview} />
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Upload} label="Upload file log" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Riwayat import batch" description="Setiap file atau sync masuk sebagai batch agar HR bisa audit total row, duplicate, conflict, dan hasil prosesnya.">
            <PresenceDataTable
              columns={[
                { key: "batch", label: "Batch code", width: 220 },
                { key: "source", label: "Source", width: 140 },
                { key: "fileDevice", label: "File / device", width: 220 },
                { key: "total", label: "Total rows", width: 100 },
                { key: "berhasil", label: "Berhasil", width: 90 },
                { key: "duplicate", label: "Duplicate", width: 90 },
                { key: "conflict", label: "Conflict", width: 90 },
                { key: "status", label: "Status", width: 120 },
                { key: "aksi", label: "Aksi", width: 100 },
              ]}
              rows={batchRows}
            />
          </PresenceSectionCard>
          <PresenceSectionCard title="Job sinkronisasi" description="Job log ini membantu membedakan batch import file dengan sync rutin dari device atau mobile attendance.">
            <PresenceDataTable
              columns={[
                { key: "syncType", label: "Sync type", width: 170, type: "status" },
                { key: "mesin", label: "Mesin", width: 220 },
                { key: "fetched", label: "Fetched", width: 90 },
                { key: "processed", label: "Processed", width: 90 },
                { key: "conflict", label: "Conflict", width: 90 },
                { key: "duplicate", label: "Duplicate", width: 90 },
                { key: "status", label: "Status", width: 120 },
                { key: "waktu", label: "Started at", width: 170 },
              ]}
              rows={syncJobRows}
            />
          </PresenceSectionCard>
        </>
      );
    }

    if (pageKey === "hr-presensi-review-konflik-absensi") {
      const conflictSummary = attendanceIntegrationUi.conflictSummary;
      return (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <PresenceSummaryCard label="Belum dimapping" value={conflictSummary.byType.employee_not_mapped || 0} note="Kode eksternal belum dikenali." tone="sky" />
            <PresenceSummaryCard label="Duplicate" value={conflictSummary.byType.duplicate_scan || 0} note="Scan ganda dalam duplicate window." tone="amber" />
            <PresenceSummaryCard label="Invalid" value={conflictSummary.byType.invalid_datetime || 0} note="Datetime atau format log salah." tone="rose" />
            <PresenceSummaryCard label="Missing pair" value={conflictSummary.byType.missing_pair || 0} note="Log belum punya pasangan masuk/pulang." tone="amber" />
            <PresenceSummaryCard label="Ambiguous" value={conflictSummary.byType.ambiguous_direction || 0} note="Direction perlu review manual." tone="violet" />
            <PresenceSummaryCard label="Unresolved" value={conflictSummary.byStatus.unresolved || 0} note="Masih menunggu tindakan HR." tone="rose" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={ShieldAlert} label="Review conflict" variant="default" onClick={() => setOpenModal(true)} />} />
          <PresenceSectionCard title="Daftar conflict absensi" description="Semua log bermasalah dikumpulkan di sini, lengkap dengan suggested action agar proses review tidak bolak-balik.">
            <ConflictTable
              columns={[
                { key: "waktu", label: "Waktu log", width: 170 },
                { key: "source", label: "Source", width: 120 },
                { key: "employeeRaw", label: "Employee raw", width: 180 },
                { key: "employeeInternal", label: "Employee internal", width: 180 },
                { key: "jenis", label: "Jenis conflict", width: 170, type: "status" },
                { key: "deskripsi", label: "Deskripsi", width: 260 },
                { key: "suggested", label: "Suggested action", width: 220 },
                { key: "status", label: "Status penyelesaian", width: 150 },
                { key: "aksi", label: "Aksi", width: 110 },
              ]}
              rows={conflictRows}
            />
          </PresenceSectionCard>
          <ConflictResolutionPanel conflict={selectedConflict} onAction={() => setOpenModal(true)} />
        </>
      );
    }

    if (pageKey === "hr-presensi-pengaturan-setelan-umum") {
      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <PresenceSectionCard title="Aturan check-in / check-out"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Toleransi telat" value={`${settings.tolerance_late_minutes} menit`} /><SettingTile label="Check-in awal" value={`${settings.early_checkin_limit_minutes} menit`} /><SettingTile label="Check-in terlambat" value={`${settings.late_checkin_limit_minutes} menit`} /><SettingTile label="Checkout limit" value={`${settings.checkout_limit_minutes} menit`} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Metode absensi"><div className="grid gap-3 md:grid-cols-3"><SettingTile label="Mobile" value={settings.allow_mobile_attendance ? "Aktif" : "Nonaktif"} /><SettingTile label="Fingerprint" value={settings.allow_fingerprint_attendance ? "Aktif" : "Nonaktif"} /><SettingTile label="Face recognition" value={settings.allow_face_recognition ? "Aktif" : "Nonaktif"} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Validasi lokasi dan selfie"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Wajib selfie" value={settings.require_selfie ? "Ya" : "Tidak"} /><SettingTile label="Wajib lokasi" value={settings.require_location ? "Ya" : "Tidak"} /><SettingTile label="Radius" value={`${settings.attendance_radius_meter} meter`} /><SettingTile label="Format laporan" value={prettify(settings.default_report_format)} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Rule sinkronisasi"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Duplicate window" value={`${settings.duplicate_scan_window_minutes || 0} menit`} /><SettingTile label="Auto process import" value={settings.auto_process_imported_logs ? "Aktif" : "Nonaktif"} /><SettingTile label="Require mapping" value={settings.require_employee_mapping_before_processing ? "Ya" : "Tidak"} /><SettingTile label="Direction mode" value={prettify(settings.default_direction_mode || "heuristic")} /></div></PresenceSectionCard>
          </div>
          <div className="space-y-6"><PresenceSummaryCard label="Aturan aktif" value="12" note="Setting inti presensi sudah tersusun per section." tone="emerald" /><PresenceSectionCard title="Otomatisasi status"><div className="space-y-3"><SettingTile label="Auto generate alpha" value={settings.auto_generate_alpha ? "Aktif" : "Nonaktif"} /><SettingTile label="Updated terakhir" value={formatDateTime(settings.updated_at)} /></div></PresenceSectionCard></div>
        </div>
      );
    }

    if (pageKey === "hr-presensi-pengaturan-denda") {
      return <><PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Plus} label="Tambah denda" variant="default" onClick={() => setOpenModal(true)} />} /><PresenceSectionCard title="Daftar rule denda"><PresenceDataTable columns={[{ key: "aturan", label: "Rule denda", width: 280 }, { key: "berlakuUntuk", label: "Berlaku untuk", width: 160 }, { key: "hitung", label: "Perhitungan", width: 140 }, { key: "nominal", label: "Nominal", width: 160 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={penaltyRows} /></PresenceSectionCard></>;
    }

    if (pageKey === "hr-presensi-pengaturan-hari-libur") {
      return <><PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={CalendarPlus2} label="Tambah hari libur" variant="default" onClick={() => setOpenModal(true)} />} /><PresenceSectionCard title="Kalender hari libur"><PresenceDataTable columns={[{ key: "tanggal", label: "Tanggal", width: 150 }, { key: "nama", label: "Nama libur", width: 260 }, { key: "jenis", label: "Jenis", width: 130, type: "status" }, { key: "cakupan", label: "Cakupan", width: 220 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={holidayRows} /></PresenceSectionCard></>;
    }

    if (pageKey === "hr-presensi-pengaturan-jam-kerja-departemen") {
      return <><PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Plus} label="Tambah mapping" variant="default" onClick={() => setOpenModal(true)} />} /><PresenceSectionCard title="Mapping departemen ke shift default"><PresenceDataTable columns={[{ key: "departemen", label: "Departemen", width: 220 }, { key: "polaKerja", label: "Pola kerja", width: 160, type: "status" }, { key: "shiftDefault", label: "Shift default", width: 220 }, { key: "multiShift", label: "Multi shift", width: 120 }, { key: "berlakuMulai", label: "Berlaku mulai", width: 140 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={deptShiftRows} /></PresenceSectionCard></>;
    }

    if (pageKey === "hr-presensi-pengaturan-jam-kerja") {
      return <><PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={Plus} label="Tambah jam kerja" variant="default" onClick={() => setOpenModal(true)} />} /><PresenceSectionCard title="Master jam kerja" description="Preview warna shift, total jam, dan status lintas hari dibuat langsung terlihat."><PresenceDataTable columns={[{ key: "kode", label: "Kode", width: 110 }, { key: "nama", label: "Nama jam kerja", width: 260 }, { key: "waktu", label: "Jam masuk - pulang", width: 170 }, { key: "totalJam", label: "Total jam", width: 160 }, { key: "lintasHari", label: "Lintas hari", width: 130 }, { key: "warna", label: "Preview warna", width: 210 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={shiftRows} /></PresenceSectionCard></>;
    }

    if (pageKey === "hr-presensi-pengaturan-mesin-fingerprint") {
      return <><div className="grid gap-4 md:grid-cols-3"><DeviceStatusCard label="Mesin aktif" value={fingerprintDevices.filter((item) => item.is_active).length} note="Perangkat yang masih digunakan." tone="emerald" /><DeviceStatusCard label="Online" value={fingerprintDevices.filter((item) => item.connection_status === "online").length} note="Terkoneksi dan siap sinkron." tone="sky" /><DeviceStatusCard label="Butuh perhatian" value={fingerprintDevices.filter((item) => item.connection_status !== "online").length} note="Offline atau perlu cek." tone="amber" /></div><PresenceFilterBar filters={meta.filters} rightActions={<div className="flex gap-2"><ActionButton icon={RefreshCcw} label="Sinkronisasi sekarang" variant="default" onClick={() => setOpenModal(true)} /><ActionButton icon={Upload} label="Import file log" onClick={() => setOpenModal(true)} /></div>} /><PresenceSectionCard title="Daftar mesin fingerprint" description="Halaman ini disiapkan untuk tambah mesin, tes koneksi, sinkronisasi sekarang, dan import file log dari device tertentu."><PresenceDataTable columns={[{ key: "mesin", label: "Mesin", width: 240 }, { key: "lokasi", label: "Lokasi", width: 230 }, { key: "alamat", label: "IP / endpoint", width: 160 }, { key: "mappedUser", label: "User mapped", width: 110 }, { key: "koneksi", label: "Koneksi", width: 130, type: "status" }, { key: "sinkron", label: "Last sync", width: 180 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={deviceRows} /></PresenceSectionCard></>;
    }

    if (pageKey === "hr-presensi-pengaturan-integrasi-absensi") {
      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <div className="space-y-6">
            <PresenceSectionCard title="Rule import dan duplicate"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Duplicate scan window" value={`${settings.duplicate_scan_window_minutes || 0} menit`} note="Scan dalam window ini akan dicek sebagai duplicate." /><SettingTile label="Allow unmatched logs" value={settings.allow_unmatched_logs ? "Ya" : "Tidak"} /><SettingTile label="Auto process imported logs" value={settings.auto_process_imported_logs ? "Aktif" : "Nonaktif"} /><SettingTile label="Require mapping before processing" value={settings.require_employee_mapping_before_processing ? "Ya" : "Tidak"} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Rule direction dan shift"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Default direction mode" value={prettify(settings.default_direction_mode || "heuristic")} /><SettingTile label="Max check-in distance" value={`${settings.max_checkin_distance_minutes || 0} menit`} /><SettingTile label="Max checkout distance" value={`${settings.max_checkout_distance_minutes || 0} menit`} /><SettingTile label="Lintas hari" value="Didukung oleh engine pairing dan shift-aware processing" /></div></PresenceSectionCard>
            <PresenceSectionCard title="Validasi mobile"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Location validation" value={settings.mobile_location_validation_enabled ? "Aktif" : "Nonaktif"} /><SettingTile label="Selfie validation" value={settings.mobile_selfie_validation_enabled ? "Aktif" : "Nonaktif"} /><SettingTile label="Radius mobile" value={`${settings.attendance_radius_meter} meter`} /><SettingTile label="Face verification" value="Placeholder siap untuk tahap berikutnya" /></div></PresenceSectionCard>
          </div>
          <div className="space-y-6">
            <PresenceSummaryCard label="Source didukung" value="4" note="Fingerprint, mobile, manual, dan face recognition placeholder." tone="emerald" />
            <PresenceSummaryCard label="Batch terakhir" value={attendanceImportBatches.length} note="Semua import dan sync dicatat per batch." tone="sky" />
            <PresenceSectionCard title="Checklist kesiapan integrasi"><div className="space-y-3"><SettingTile label="Raw log layer" value="Siap" /><SettingTile label="Conflict layer" value="Siap" /><SettingTile label="Reprocess" value="Siap" /><SettingTile label="SDK device nyata" value="Masih placeholder / mock" /></div></PresenceSectionCard>
          </div>
        </div>
      );
    }

    if (pageKey === "hr-presensi-pengaturan-mapping-karyawan-mesin") {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <PresenceSummaryCard label="Mapping aktif" value={employeeDeviceMappingsResolved.filter((item) => item.is_active).length} note="Semua mapping yang masih dipakai sistem." tone="emerald" />
            <PresenceSummaryCard label="Source fingerprint" value={employeeDeviceMappingsResolved.filter((item) => item.source_type === "fingerprint").length} note="Mapping khusus device." tone="sky" />
            <PresenceSummaryCard label="Perlu review" value={attendanceConflicts.filter((item) => item.conflict_type === "employee_not_mapped").length} note="Conflict karena employee belum dikenali." tone="amber" />
          </div>
          <PresenceFilterBar filters={meta.filters} rightActions={<div className="flex gap-2"><ActionButton icon={Upload} label="Import mapping massal" onClick={() => setOpenModal(true)} /><ActionButton icon={Plus} label="Tambah mapping" variant="default" onClick={() => setShowMappingModal(true)} /></div>} />
          <PresenceSectionCard title="Daftar mapping employee dan mesin" description="Layer ini penting agar fingerprint log dan source eksternal bisa dikenali sebagai milik siapa sebelum diproses ke attendance record.">
            <PresenceDataTable
              columns={[
                { key: "nama", label: "Nama karyawan", width: 220 },
                { key: "nik", label: "NIK internal", width: 130 },
                { key: "source", label: "Source", width: 120 },
                { key: "mesin", label: "Mesin", width: 220 },
                { key: "kodeEksternal", label: "Kode eksternal", width: 150 },
                { key: "namaEksternal", label: "Nama eksternal", width: 170 },
                { key: "utama", label: "Utama", width: 100 },
                { key: "status", label: "Status", width: 120, type: "status" },
                { key: "aksi", label: "Aksi", width: 100 },
              ]}
              rows={mappingRows}
            />
          </PresenceSectionCard>
        </>
      );
    }

    return <EmptyState title="Halaman sedang disiapkan" description="Tampilan dasar sudah ada dan akan mengikuti bahasa visual HR Presensi yang sama." actionLabel="Buka placeholder" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={meta.description} breadcrumbItems={meta.breadcrumbs.map((label) => ({ label }))} actions={headerActions} />
      {renderContent()}
      <PresenceSectionCard title="Catatan kesiapan modul" description="Semua halaman memakai keluarga komponen yang sama agar modul presensi terasa lebih matang dan siap dijual.">
        <div className="grid gap-3 md:grid-cols-3">
          <SettingTile label="Data demo" value={`${hrPresenceDemoMeta.counts.attendanceRecords} record absensi`} note="Sudah ada jadwal, exception, dan relasi inti." />
          <SettingTile label="Bahasa visual" value="Satu keluarga desain" note="Filter, badge, modal, dan tabel dibuat konsisten." />
          <SettingTile label="Arah berikutnya" value="Siap ke CRUD nyata" note="Fondasi UI ini siap disambung ke state dan backend tahap berikutnya." />
        </div>
      </PresenceSectionCard>
      <PresenceModalForm
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={meta.title}
        description="Modal placeholder ini sudah dibuat lebih lebar, lebih rapi, dan proporsional agar siap menampung form nyata pada tahap berikutnya."
        sections={[
          { title: "Informasi utama", fields: [{ label: "Halaman aktif", value: meta.title }, { label: "Konteks modul", value: "HR Presensi" }, { label: "Jenis aksi", value: "Tambah / edit / sinkron / export" }] },
          { title: "Catatan UX", fields: [{ label: "Fokus desain", value: "Profesional, presisi, dan mudah dipakai harian" }, { label: "Komponen", value: "Modal akan berbagi pola yang sama di semua halaman presensi" }] },
        ]}
      />
      <MappingFormModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        selectedMapping={
          selectedConflict?.employee_id
            ? {
                employeeName: employeeMap.get(selectedConflict.employee_id)?.employee_name,
                source: "Fingerprint",
                externalCode: attendanceRawLogs.find((item) => item.id === selectedConflict.raw_log_id)?.external_employee_code,
                externalName: attendanceRawLogs.find((item) => item.id === selectedConflict.raw_log_id)?.employee_name_raw,
                deviceName: attendanceRawLogs.find((item) => item.id === selectedConflict.raw_log_id)?.device_name,
                status: "Aktif",
              }
            : null
          }
      />
      <RawLogDetailDrawer log={selectedRawLog} onClose={() => setSelectedRawLogId(null)} />
      <EmployeeAttendanceDrawer summary={selectedPayrollSummary} employeeName={selectedPayrollSummary ? employeeMap.get(selectedPayrollSummary.employee_id)?.employee_name : ""} onClose={() => setSelectedPayrollSummaryId(null)} />
    </div>
  );
}
