export type HrPresensiRole = "karyawan" | "atasan" | "hr";

export type HrPresensiTabKey =
  | "hr-presensi-dashboard"
  | "hr-presensi-absensi-harian"
  | "hr-presensi-dinas-luar"
  | "hr-presensi-cuti-izin-sakit"
  | "hr-presensi-persetujuan"
  | "hr-presensi-laporan"
  | "hr-presensi-pengaturan";

export interface HrPresensiTabItem {
  key: HrPresensiTabKey;
  label: string;
  route: string;
  description: string;
  roles: HrPresensiRole[];
}

export interface HrPresensiStatusStripItem {
  key: string;
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "info" | "success" | "warning";
}

export interface HrPresensiRoleOption {
  key: HrPresensiRole;
  label: string;
  note: string;
}

export interface HrPresensiMasterRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  effective_start_date: string;
  effective_end_date?: string | null;
  owner?: string;
  summary: string;
  fields: Array<{ label: string; value: string }>;
}

export interface HrPresensiMasterSection {
  key:
    | "locations"
    | "shifts"
    | "schedule_groups"
    | "attendance_methods"
    | "leave_balance_policies"
    | "special_leave_types"
    | "permission_types"
    | "payroll_period_policies"
    | "setting_change_logs";
  label: string;
  description: string;
  tableName: string;
  supportsEffectiveDate: boolean;
  records: HrPresensiMasterRecord[];
}
