import { useEffect, useMemo, useState } from "react";

import HrPresensiChangeLogList from "@/components/hrPresensi/HrPresensiChangeLogList";
import HrPresensiSettingsForm from "@/components/hrPresensi/HrPresensiSettingsForm";
import HrPresensiSettingsList from "@/components/hrPresensi/HrPresensiSettingsList";
import { useHrPresensiAccess } from "@/hooks/useHrPresensiAccess";
import { getEmployeeList } from "@/services/employeeService";
import {
  assertHrPresensiSettingsAccess,
  archiveHrAttendanceMethod,
  archiveHrAttendanceMethodAssignment,
  archiveHrLeaveBalancePolicy,
  archiveHrLocation,
  archiveHrPayrollPeriodPolicy,
  archiveHrPermissionType,
  archiveHrScheduleGroup,
  archiveHrShift,
  archiveHrShiftAssignment,
  archiveHrSpecialLeaveType,
  createHrAttendanceMethod,
  createHrAttendanceMethodAssignment,
  createHrLeaveBalancePolicy,
  createHrLocation,
  createHrPayrollPeriodPolicy,
  createHrPermissionType,
  createHrScheduleGroup,
  createHrShift,
  createHrShiftAssignment,
  createHrSpecialLeaveType,
  getHrAttendanceMethodAssignments,
  getHrAttendanceMethods,
  getHrLeaveBalancePolicies,
  getHrLocations,
  getHrPayrollPeriodPolicies,
  getHrPermissionTypes,
  getHrPresensiChangeLogs,
  getHrScheduleGroups,
  getHrShiftAssignments,
  getHrShifts,
  getHrSpecialLeaveTypes,
  updateHrAttendanceMethod,
  updateHrAttendanceMethodAssignment,
  updateHrLeaveBalancePolicy,
  updateHrLocation,
  updateHrPayrollPeriodPolicy,
  updateHrPermissionType,
  updateHrScheduleGroup,
  updateHrShift,
  updateHrShiftAssignment,
  updateHrSpecialLeaveType,
} from "@/services/hrPresensiSettingsService";

const defaultLocationForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  address: "",
  timezone: "Asia/Jakarta",
  attendance_radius_meters: 100,
  latitude: "",
  longitude: "",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultShiftForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  scheduled_checkin: "",
  scheduled_checkout: "",
  break_start: "",
  break_end: "",
  grace_minutes: 0,
  cross_day: false,
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultScheduleGroupForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  default_location_id: "",
  default_shift_id: "",
  work_pattern_text: "[]",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultShiftAssignmentForm = {
  id: "",
  employee_id: "",
  schedule_group_id: "",
  shift_id: "",
  location_id: "",
  notes: "",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultMethodForm = {
  id: "",
  code: "",
  name: "",
  method_type: "",
  description: "",
  requires_location_validation: false,
  requires_biometric_verification: false,
  fallback_method_code: "",
  is_primary_method: false,
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultMethodAssignmentForm = {
  id: "",
  employee_id: "",
  attendance_method_id: "",
  location_id: "",
  assignment_scope: "employee",
  notes: "",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultLeavePolicyForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  annual_quota_days: 12,
  carry_forward_days: 0,
  reset_month: 1,
  reset_day: 1,
  is_prorated: false,
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultSpecialLeaveTypeForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  default_days: 1,
  requires_attachment: false,
  deducts_leave_balance: false,
  approval_flow_code: "",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultPermissionTypeForm = {
  id: "",
  code: "",
  name: "",
  category: "izin",
  description: "",
  requires_attachment: false,
  requires_approval: true,
  affects_payroll: false,
  default_approval_rule_code: "",
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const defaultPayrollPeriodForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  cutoff_start_day: 1,
  cutoff_end_day: 31,
  lock_days_before_payroll: 3,
  includes_approved_overtime: true,
  is_active: true,
  effective_start_date: "",
  effective_end_date: "",
};

const settingTabs = [
  { key: "locations", label: "Lokasi Kantor" },
  { key: "shift-shift", label: "Shift" },
  { key: "shift-groups", label: "Grup Jadwal" },
  { key: "shift-assignments", label: "Assignment Jadwal" },
  { key: "methods", label: "Metode Absensi" },
  { key: "method-assignments", label: "Assignment Metode" },
  { key: "leave-policies", label: "Kebijakan Cuti" },
  { key: "special-leave-types", label: "Jenis Cuti Khusus" },
  { key: "permission-types", label: "Jenis Izin" },
  { key: "payroll-periods", label: "Periode Payroll" },
];

function formatEffectiveMeta(startDate, endDate) {
  return `Efektif ${startDate}${endDate ? ` s.d. ${endDate}` : ""}`;
}

function mapRecordList(rows, type, directory = {}) {
  if (type === "locations") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | ${item.timezone}`,
      isActive: item.is_active,
      meta: `Radius ${item.attendance_radius_meters} m | ${item.latitude ?? "-"}, ${item.longitude ?? "-"} | ${formatEffectiveMeta(item.effective_start_date, item.effective_end_date)}`,
    }));
  }

  if (type === "shift-shift") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | ${item.scheduled_checkin} - ${item.scheduled_checkout}`,
      isActive: item.is_active,
      meta: `${item.cross_day ? "Lintas hari" : "Hari yang sama"} | toleransi ${item.grace_minutes} menit`,
    }));
  }

  if (type === "shift-groups") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | ${directory.shiftMap.get(item.default_shift_id) || "Tanpa shift default"}`,
      isActive: item.is_active,
      meta: `Lokasi default ${directory.locationMap.get(item.default_location_id) || "-"} | ${formatEffectiveMeta(item.effective_start_date, item.effective_end_date)}`,
    }));
  }

  if (type === "shift-assignments") {
    return rows.map((item) => ({
      id: item.id,
      title: directory.employeeMap.get(item.employee_id) || `Karyawan #${item.employee_id}`,
      subtitle: directory.scheduleGroupMap.get(item.schedule_group_id) || directory.shiftMap.get(item.shift_id) || "Belum lengkap",
      isActive: item.is_active,
      meta: `${formatEffectiveMeta(item.effective_start_date, item.effective_end_date)}${item.location_id ? ` | ${directory.locationMap.get(item.location_id) || "-"}` : ""}`,
    }));
  }

  if (type === "methods") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | ${item.method_type}`,
      isActive: item.is_active,
      meta: `${item.is_primary_method ? "Metode utama" : "Metode pendukung"}${item.requires_location_validation ? " | validasi lokasi" : ""}`,
    }));
  }

  if (type === "method-assignments") {
    return rows.map((item) => ({
      id: item.id,
      title: directory.employeeMap.get(item.employee_id) || `Karyawan #${item.employee_id}`,
      subtitle: `${directory.methodMap.get(item.attendance_method_id) || "-"} | ${item.assignment_scope}`,
      isActive: item.is_active,
      meta: `${formatEffectiveMeta(item.effective_start_date, item.effective_end_date)}${item.location_id ? ` | ${directory.locationMap.get(item.location_id) || "-"}` : ""}`,
    }));
  }

  if (type === "leave-policies") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | kuota ${item.annual_quota_days} hari`,
      isActive: item.is_active,
      meta: `Carry forward ${item.carry_forward_days} hari | reset ${item.reset_day}/${item.reset_month}`,
    }));
  }

  if (type === "special-leave-types") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | default ${item.default_days} hari`,
      isActive: item.is_active,
      meta: `${item.requires_attachment ? "Lampiran wajib" : "Lampiran opsional"}${item.deducts_leave_balance ? " | potong saldo" : " | tidak potong saldo"}`,
    }));
  }

  if (type === "permission-types") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} | ${item.category}`,
      isActive: item.is_active,
      meta: `${item.requires_approval ? "Perlu approval" : "Tanpa approval"}${item.affects_payroll ? " | pengaruhi payroll" : ""}`,
    }));
  }

  return rows.map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: `${item.code} | cutoff ${item.cutoff_start_day}-${item.cutoff_end_day}`,
    isActive: item.is_active,
    meta: `${formatEffectiveMeta(item.effective_start_date, item.effective_end_date)} | lock ${item.lock_days_before_payroll} hari`,
  }));
}

function buildLocationFields() {
  return [
    { key: "code", label: "Kode lokasi" },
    { key: "name", label: "Nama lokasi" },
    { key: "timezone", label: "Zona waktu" },
    { key: "attendance_radius_meters", label: "Radius kantor (meter)", type: "number" },
    { key: "latitude", label: "Latitude kantor", type: "number", step: "0.0000001" },
    { key: "longitude", label: "Longitude kantor", type: "number", step: "0.0000001" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "address", label: "Alamat", type: "textarea", wide: true, rows: 3 },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Lokasi aktif dipakai untuk presensi kantor" },
  ];
}

function buildShiftFields() {
  return [
    { key: "code", label: "Kode shift" },
    { key: "name", label: "Nama shift" },
    { key: "scheduled_checkin", label: "Jam masuk", type: "time" },
    { key: "scheduled_checkout", label: "Jam pulang", type: "time" },
    { key: "break_start", label: "Break mulai", type: "time" },
    { key: "break_end", label: "Break selesai", type: "time" },
    { key: "grace_minutes", label: "Toleransi (menit)", type: "number" },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "cross_day", label: "Lintas hari", type: "checkbox", wide: true, checkboxLabel: "Shift melewati pergantian hari" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Shift aktif dipakai untuk assignment" },
  ];
}

function buildScheduleGroupFields(locationOptions, shiftOptions) {
  return [
    { key: "code", label: "Kode grup jadwal" },
    { key: "name", label: "Nama grup jadwal" },
    { key: "default_location_id", label: "Lokasi default", type: "select", options: locationOptions },
    { key: "default_shift_id", label: "Shift default", type: "select", options: shiftOptions },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "work_pattern_text", label: "Pola kerja (JSON)", type: "textarea", wide: true, rows: 5 },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Grup jadwal aktif dipakai untuk assignment" },
  ];
}

function buildShiftAssignmentFields(employeeOptions, scheduleGroupOptions, shiftOptions, locationOptions) {
  return [
    { key: "employee_id", label: "Karyawan", type: "select", options: employeeOptions },
    { key: "schedule_group_id", label: "Grup jadwal", type: "select", options: scheduleGroupOptions },
    { key: "shift_id", label: "Shift override", type: "select", options: shiftOptions },
    { key: "location_id", label: "Lokasi", type: "select", options: locationOptions },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "notes", label: "Catatan", type: "textarea", wide: true, rows: 3 },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Assignment aktif dipakai sistem" },
  ];
}

function buildMethodFields(methodOptions) {
  return [
    { key: "code", label: "Kode metode" },
    { key: "name", label: "Nama metode" },
    {
      key: "method_type",
      label: "Tipe metode",
      type: "select",
      options: [
        { value: "face_recognition", label: "Face Recognition" },
        { value: "mobile", label: "Mobile GPS + Selfie" },
        { value: "manual", label: "Manual HR" },
        { value: "fingerprint", label: "Fingerprint" },
      ],
    },
    { key: "fallback_method_code", label: "Fallback metode", type: "select", options: methodOptions },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "requires_location_validation", label: "Validasi lokasi", type: "checkbox", wide: true, checkboxLabel: "Metode ini wajib validasi lokasi kantor" },
    { key: "requires_biometric_verification", label: "Verifikasi biometrik", type: "checkbox", wide: true, checkboxLabel: "Metode ini memakai verifikasi biometrik" },
    { key: "is_primary_method", label: "Metode utama", type: "checkbox", wide: true, checkboxLabel: "Set sebagai metode utama kantor" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Metode aktif dipakai untuk assignment" },
  ];
}

function buildMethodAssignmentFields(employeeOptions, methodOptions, locationOptions) {
  return [
    { key: "employee_id", label: "Karyawan", type: "select", options: employeeOptions },
    { key: "attendance_method_id", label: "Metode absensi", type: "select", options: methodOptions },
    { key: "location_id", label: "Lokasi terkait", type: "select", options: locationOptions },
    {
      key: "assignment_scope",
      label: "Berlaku untuk siapa",
      type: "select",
      options: [
        { value: "employee", label: "Karyawan tertentu" },
        { value: "employee_location", label: "Karyawan di lokasi tertentu" },
      ],
    },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "notes", label: "Catatan", type: "textarea", wide: true, rows: 3 },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Assignment metode aktif dipakai sistem" },
  ];
}

function buildLeavePolicyFields() {
  return [
    { key: "code", label: "Kode kebijakan" },
    { key: "name", label: "Nama kebijakan" },
    { key: "annual_quota_days", label: "Kuota tahunan (hari)", type: "number" },
    { key: "carry_forward_days", label: "Carry forward (hari)", type: "number" },
    { key: "reset_month", label: "Bulan reset", type: "number" },
    { key: "reset_day", label: "Tanggal reset", type: "number" },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "is_prorated", label: "Prorata", type: "checkbox", wide: true, checkboxLabel: "Kebijakan ini mendukung prorata kuota" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Kebijakan aktif dipakai perusahaan" },
  ];
}

function buildSpecialLeaveTypeFields() {
  return [
    { key: "code", label: "Kode jenis cuti khusus" },
    { key: "name", label: "Nama jenis cuti khusus" },
    { key: "default_days", label: "Default hari", type: "number" },
    { key: "approval_flow_code", label: "Kode alur approval" },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "requires_attachment", label: "Lampiran", type: "checkbox", wide: true, checkboxLabel: "Lampiran digital wajib diunggah" },
    { key: "deducts_leave_balance", label: "Potong saldo", type: "checkbox", wide: true, checkboxLabel: "Jenis ini memotong saldo cuti reguler" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Jenis cuti khusus aktif dipakai" },
  ];
}

function buildPermissionTypeFields() {
  return [
    { key: "code", label: "Kode jenis izin" },
    { key: "name", label: "Nama jenis izin" },
    {
      key: "category",
      label: "Kategori izin",
      type: "select",
      options: [
        { value: "izin", label: "Izin" },
        { value: "dispensasi", label: "Dispensasi" },
        { value: "koreksi", label: "Koreksi Kehadiran" },
      ],
    },
    { key: "default_approval_rule_code", label: "Kode approval default" },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "requires_attachment", label: "Lampiran", type: "checkbox", wide: true, checkboxLabel: "Jenis izin ini wajib lampiran" },
    { key: "requires_approval", label: "Approval", type: "checkbox", wide: true, checkboxLabel: "Jenis izin ini wajib approval" },
    { key: "affects_payroll", label: "Payroll", type: "checkbox", wide: true, checkboxLabel: "Jenis izin ini mempengaruhi payroll" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Jenis izin aktif dipakai" },
  ];
}

function buildPayrollPeriodFields() {
  return [
    { key: "code", label: "Kode periode" },
    { key: "name", label: "Nama periode payroll" },
    { key: "cutoff_start_day", label: "Cutoff mulai", type: "number" },
    { key: "cutoff_end_day", label: "Cutoff selesai", type: "number" },
    { key: "lock_days_before_payroll", label: "Lock sebelum payroll (hari)", type: "number" },
    { key: "effective_start_date", label: "Tanggal efektif mulai", type: "date" },
    { key: "effective_end_date", label: "Tanggal efektif selesai", type: "date" },
    { key: "description", label: "Deskripsi", type: "textarea", wide: true, rows: 3 },
    { key: "includes_approved_overtime", label: "Lembur disetujui", type: "checkbox", wide: true, checkboxLabel: "Periode ini menghitung lembur yang sudah disetujui" },
    { key: "is_active", label: "Status aktif", type: "checkbox", wide: true, checkboxLabel: "Periode payroll aktif dipakai" },
  ];
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function HrPresensiSettingsWorkspace() {
  const access = useHrPresensiAccess();
  const [activeTab, setActiveTab] = useState("locations");
  const [rows, setRows] = useState({
    locations: [],
    shifts: [],
    scheduleGroups: [],
    shiftAssignments: [],
    methods: [],
    methodAssignments: [],
    leavePolicies: [],
    specialLeaveTypes: [],
    permissionTypes: [],
    payrollPeriods: [],
    logs: [],
  });
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationForm, setLocationForm] = useState(defaultLocationForm);
  const [shiftForm, setShiftForm] = useState(defaultShiftForm);
  const [scheduleGroupForm, setScheduleGroupForm] = useState(defaultScheduleGroupForm);
  const [shiftAssignmentForm, setShiftAssignmentForm] = useState(defaultShiftAssignmentForm);
  const [methodForm, setMethodForm] = useState(defaultMethodForm);
  const [methodAssignmentForm, setMethodAssignmentForm] = useState(defaultMethodAssignmentForm);
  const [leavePolicyForm, setLeavePolicyForm] = useState(defaultLeavePolicyForm);
  const [specialLeaveTypeForm, setSpecialLeaveTypeForm] = useState(defaultSpecialLeaveTypeForm);
  const [permissionTypeForm, setPermissionTypeForm] = useState(defaultPermissionTypeForm);
  const [payrollPeriodForm, setPayrollPeriodForm] = useState(defaultPayrollPeriodForm);

  async function loadSettings() {
    if (access.status === "loading") {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      assertHrPresensiSettingsAccess(access);
      const [
        locations,
        shifts,
        scheduleGroups,
        shiftAssignments,
        methods,
        methodAssignments,
        leavePolicies,
        specialLeaveTypes,
        permissionTypes,
        payrollPeriods,
        logs,
        employeeRows,
      ] = await Promise.all([
        getHrLocations(),
        getHrShifts(),
        getHrScheduleGroups(),
        getHrShiftAssignments(),
        getHrAttendanceMethods(),
        getHrAttendanceMethodAssignments(),
        getHrLeaveBalancePolicies(),
        getHrSpecialLeaveTypes(),
        getHrPermissionTypes(),
        getHrPayrollPeriodPolicies(),
        getHrPresensiChangeLogs([
          "locations",
          "shifts",
          "schedule_groups",
          "shift_assignments",
          "attendance_methods",
          "attendance_method_assignments",
          "leave_balance_policies",
          "special_leave_types",
          "permission_types",
          "payroll_period_policies",
        ]),
        getEmployeeList(),
      ]);

      setRows({
        locations,
        shifts,
        scheduleGroups,
        shiftAssignments,
        methods,
        methodAssignments,
        leavePolicies,
        specialLeaveTypes,
        permissionTypes,
        payrollPeriods,
        logs,
      });
      setEmployees(employeeRows);
    } catch (error) {
      console.error(error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Gagal memuat pengaturan HR Presensi dari Supabase.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (access.status !== "loading") {
      void loadSettings();
    }
  }, [access.status]);

  const directory = useMemo(
    () => ({
      employeeMap: new Map(employees.map((item) => [item.id, item.nama_lengkap])),
      locationMap: new Map(rows.locations.map((item) => [item.id, item.name])),
      shiftMap: new Map(rows.shifts.map((item) => [item.id, item.name])),
      scheduleGroupMap: new Map(rows.scheduleGroups.map((item) => [item.id, item.name])),
      methodMap: new Map(rows.methods.map((item) => [item.id, item.name])),
    }),
    [employees, rows],
  );

  const employeeOptions = employees.map((item) => ({ value: String(item.id), label: item.nama_lengkap }));
  const locationOptions = rows.locations.map((item) => ({ value: item.id, label: item.name }));
  const shiftOptions = rows.shifts.map((item) => ({ value: item.id, label: item.name }));
  const scheduleGroupOptions = rows.scheduleGroups.map((item) => ({ value: item.id, label: item.name }));
  const methodOptions = rows.methods.map((item) => ({ value: item.code, label: item.name }));
  const methodIdOptions = rows.methods.map((item) => ({ value: item.id, label: item.name }));

  const activeRows = useMemo(() => {
    if (activeTab === "locations") return rows.locations;
    if (activeTab === "shift-shift") return rows.shifts;
    if (activeTab === "shift-groups") return rows.scheduleGroups;
    if (activeTab === "shift-assignments") return rows.shiftAssignments;
    if (activeTab === "methods") return rows.methods;
    if (activeTab === "method-assignments") return rows.methodAssignments;
    if (activeTab === "leave-policies") return rows.leavePolicies;
    if (activeTab === "special-leave-types") return rows.specialLeaveTypes;
    if (activeTab === "permission-types") return rows.permissionTypes;
    return rows.payrollPeriods;
  }, [activeTab, rows]);

  useEffect(() => {
    setSelectedId(activeRows[0]?.id || "");
  }, [activeTab, activeRows]);

  useEffect(() => {
    const selected =
      activeTab === "locations"
        ? rows.locations.find((item) => item.id === selectedId)
        : activeTab === "shift-shift"
          ? rows.shifts.find((item) => item.id === selectedId)
          : activeTab === "shift-groups"
            ? rows.scheduleGroups.find((item) => item.id === selectedId)
            : activeTab === "shift-assignments"
              ? rows.shiftAssignments.find((item) => item.id === selectedId)
              : activeTab === "methods"
                ? rows.methods.find((item) => item.id === selectedId)
                : activeTab === "method-assignments"
                  ? rows.methodAssignments.find((item) => item.id === selectedId)
                  : activeTab === "leave-policies"
                    ? rows.leavePolicies.find((item) => item.id === selectedId)
                    : activeTab === "special-leave-types"
                      ? rows.specialLeaveTypes.find((item) => item.id === selectedId)
                      : activeTab === "permission-types"
                        ? rows.permissionTypes.find((item) => item.id === selectedId)
                        : rows.payrollPeriods.find((item) => item.id === selectedId);

    if (!selected) return;

    if (activeTab === "locations") {
      setLocationForm({
        ...defaultLocationForm,
        ...selected,
        latitude: selected.latitude ?? "",
        longitude: selected.longitude ?? "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "shift-shift") {
      setShiftForm({
        ...defaultShiftForm,
        ...selected,
        break_start: selected.break_start || "",
        break_end: selected.break_end || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "shift-groups") {
      setScheduleGroupForm({
        ...defaultScheduleGroupForm,
        ...selected,
        default_location_id: selected.default_location_id || "",
        default_shift_id: selected.default_shift_id || "",
        work_pattern_text: JSON.stringify(selected.work_pattern ?? [], null, 2),
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "shift-assignments") {
      setShiftAssignmentForm({
        ...defaultShiftAssignmentForm,
        ...selected,
        employee_id: String(selected.employee_id),
        schedule_group_id: selected.schedule_group_id || "",
        shift_id: selected.shift_id || "",
        location_id: selected.location_id || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "methods") {
      setMethodForm({
        ...defaultMethodForm,
        ...selected,
        fallback_method_code: selected.fallback_method_code || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "method-assignments") {
      setMethodAssignmentForm({
        ...defaultMethodAssignmentForm,
        ...selected,
        employee_id: String(selected.employee_id),
        attendance_method_id: selected.attendance_method_id,
        location_id: selected.location_id || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "leave-policies") {
      setLeavePolicyForm({
        ...defaultLeavePolicyForm,
        ...selected,
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "special-leave-types") {
      setSpecialLeaveTypeForm({
        ...defaultSpecialLeaveTypeForm,
        ...selected,
        approval_flow_code: selected.approval_flow_code || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else if (activeTab === "permission-types") {
      setPermissionTypeForm({
        ...defaultPermissionTypeForm,
        ...selected,
        default_approval_rule_code: selected.default_approval_rule_code || "",
        effective_end_date: selected.effective_end_date || "",
      });
    } else {
      setPayrollPeriodForm({
        ...defaultPayrollPeriodForm,
        ...selected,
        effective_end_date: selected.effective_end_date || "",
      });
    }
  }, [activeTab, rows, selectedId]);

  function setFormValue(setter) {
    return (key, value) => setter((current) => ({ ...current, [key]: value }));
  }

  function createNew() {
    setSelectedId("");

    if (activeTab === "locations") setLocationForm({ ...defaultLocationForm, effective_start_date: todayDate() });
    if (activeTab === "shift-shift") setShiftForm({ ...defaultShiftForm, effective_start_date: todayDate() });
    if (activeTab === "shift-groups") setScheduleGroupForm({ ...defaultScheduleGroupForm, effective_start_date: todayDate() });
    if (activeTab === "shift-assignments") setShiftAssignmentForm({ ...defaultShiftAssignmentForm, effective_start_date: todayDate() });
    if (activeTab === "methods") setMethodForm({ ...defaultMethodForm, effective_start_date: todayDate() });
    if (activeTab === "method-assignments") setMethodAssignmentForm({ ...defaultMethodAssignmentForm, effective_start_date: todayDate() });
    if (activeTab === "leave-policies") setLeavePolicyForm({ ...defaultLeavePolicyForm, effective_start_date: todayDate() });
    if (activeTab === "special-leave-types") setSpecialLeaveTypeForm({ ...defaultSpecialLeaveTypeForm, effective_start_date: todayDate() });
    if (activeTab === "permission-types") setPermissionTypeForm({ ...defaultPermissionTypeForm, effective_start_date: todayDate() });
    if (activeTab === "payroll-periods") setPayrollPeriodForm({ ...defaultPayrollPeriodForm, effective_start_date: todayDate() });
  }

  function validateCurrentForm() {
    if (activeTab === "locations") {
      if (Number(locationForm.attendance_radius_meters) <= 0) {
        throw new Error("Radius kantor harus lebih besar dari 0.");
      }

      if (locationForm.latitude === "" || locationForm.longitude === "") {
        throw new Error("Latitude dan longitude lokasi kantor wajib diisi.");
      }

      if (Number(locationForm.latitude) < -90 || Number(locationForm.latitude) > 90) {
        throw new Error("Latitude lokasi kantor harus berada di antara -90 sampai 90.");
      }

      if (Number(locationForm.longitude) < -180 || Number(locationForm.longitude) > 180) {
        throw new Error("Longitude lokasi kantor harus berada di antara -180 sampai 180.");
      }
    }

    if (activeTab === "shift-shift") {
      const sameDayConflict = !shiftForm.cross_day && shiftForm.scheduled_checkout && shiftForm.scheduled_checkin && shiftForm.scheduled_checkout <= shiftForm.scheduled_checkin;
      if (sameDayConflict) {
        throw new Error("Shift yang pulangnya lebih awal dari jam masuk harus ditandai sebagai lintas hari.");
      }
    }

    if (activeTab === "methods" && methodForm.is_primary_method && !methodForm.is_active) {
      throw new Error("Metode utama tidak boleh dalam status nonaktif.");
    }

    if (activeTab === "shift-assignments" && !shiftAssignmentForm.schedule_group_id && !shiftAssignmentForm.shift_id) {
      throw new Error("Assignment jadwal minimal harus memilih grup jadwal atau shift override.");
    }

    if (activeTab === "leave-policies") {
      if (Number(leavePolicyForm.annual_quota_days) < 0) throw new Error("Kuota tahunan tidak boleh negatif.");
      if (Number(leavePolicyForm.carry_forward_days) < 0) throw new Error("Carry forward tidak boleh negatif.");
      if (Number(leavePolicyForm.reset_month) < 1 || Number(leavePolicyForm.reset_month) > 12) throw new Error("Bulan reset harus berada di antara 1 sampai 12.");
      if (Number(leavePolicyForm.reset_day) < 1 || Number(leavePolicyForm.reset_day) > 31) throw new Error("Tanggal reset harus berada di antara 1 sampai 31.");
    }

    if (activeTab === "special-leave-types" && Number(specialLeaveTypeForm.default_days) < 0) {
      throw new Error("Default hari cuti khusus tidak boleh negatif.");
    }

    if (activeTab === "permission-types" && !permissionTypeForm.category) {
      throw new Error("Kategori jenis izin wajib dipilih.");
    }

    if (activeTab === "payroll-periods") {
      const startDay = Number(payrollPeriodForm.cutoff_start_day);
      const endDay = Number(payrollPeriodForm.cutoff_end_day);
      if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
        throw new Error("Cutoff payroll harus berada di antara 1 sampai 31.");
      }
      if (Number(payrollPeriodForm.lock_days_before_payroll) < 0) {
        throw new Error("Hari lock payroll tidak boleh negatif.");
      }
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setFeedback(null);

    try {
      assertHrPresensiSettingsAccess(access);
      validateCurrentForm();

      if (activeTab === "locations") {
        const payload = {
          ...locationForm,
          attendance_radius_meters: Number(locationForm.attendance_radius_meters),
          latitude: Number(locationForm.latitude),
          longitude: Number(locationForm.longitude),
          effective_end_date: locationForm.effective_end_date || null,
        };
        const row = locationForm.id ? await updateHrLocation(locationForm.id, payload) : await createHrLocation(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-shift") {
        const payload = {
          ...shiftForm,
          grace_minutes: Number(shiftForm.grace_minutes),
          break_start: shiftForm.break_start || null,
          break_end: shiftForm.break_end || null,
          effective_end_date: shiftForm.effective_end_date || null,
        };
        const row = shiftForm.id ? await updateHrShift(shiftForm.id, payload) : await createHrShift(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-groups") {
        const payload = {
          ...scheduleGroupForm,
          default_location_id: scheduleGroupForm.default_location_id || null,
          default_shift_id: scheduleGroupForm.default_shift_id || null,
          effective_end_date: scheduleGroupForm.effective_end_date || null,
        };
        const row = scheduleGroupForm.id ? await updateHrScheduleGroup(scheduleGroupForm.id, payload) : await createHrScheduleGroup(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-assignments") {
        const payload = {
          ...shiftAssignmentForm,
          employee_id: Number(shiftAssignmentForm.employee_id),
          schedule_group_id: shiftAssignmentForm.schedule_group_id || null,
          shift_id: shiftAssignmentForm.shift_id || null,
          location_id: shiftAssignmentForm.location_id || null,
          notes: shiftAssignmentForm.notes || null,
          effective_end_date: shiftAssignmentForm.effective_end_date || null,
        };
        const row = shiftAssignmentForm.id ? await updateHrShiftAssignment(shiftAssignmentForm.id, payload) : await createHrShiftAssignment(payload);
        setSelectedId(row.id);
      } else if (activeTab === "methods") {
        const payload = {
          ...methodForm,
          fallback_method_code: methodForm.fallback_method_code || null,
          effective_end_date: methodForm.effective_end_date || null,
        };
        const row = methodForm.id ? await updateHrAttendanceMethod(methodForm.id, payload) : await createHrAttendanceMethod(payload);
        setSelectedId(row.id);
      } else if (activeTab === "method-assignments") {
        const payload = {
          ...methodAssignmentForm,
          employee_id: Number(methodAssignmentForm.employee_id),
          location_id: methodAssignmentForm.location_id || null,
          notes: methodAssignmentForm.notes || null,
          effective_end_date: methodAssignmentForm.effective_end_date || null,
        };
        const row = methodAssignmentForm.id
          ? await updateHrAttendanceMethodAssignment(methodAssignmentForm.id, payload)
          : await createHrAttendanceMethodAssignment(payload);
        setSelectedId(row.id);
      } else if (activeTab === "leave-policies") {
        const payload = {
          ...leavePolicyForm,
          annual_quota_days: Number(leavePolicyForm.annual_quota_days),
          carry_forward_days: Number(leavePolicyForm.carry_forward_days),
          reset_month: Number(leavePolicyForm.reset_month),
          reset_day: Number(leavePolicyForm.reset_day),
          effective_end_date: leavePolicyForm.effective_end_date || null,
        };
        const row = leavePolicyForm.id
          ? await updateHrLeaveBalancePolicy(leavePolicyForm.id, payload)
          : await createHrLeaveBalancePolicy(payload);
        setSelectedId(row.id);
      } else if (activeTab === "special-leave-types") {
        const payload = {
          ...specialLeaveTypeForm,
          default_days: Number(specialLeaveTypeForm.default_days),
          approval_flow_code: specialLeaveTypeForm.approval_flow_code || null,
          effective_end_date: specialLeaveTypeForm.effective_end_date || null,
        };
        const row = specialLeaveTypeForm.id
          ? await updateHrSpecialLeaveType(specialLeaveTypeForm.id, payload)
          : await createHrSpecialLeaveType(payload);
        setSelectedId(row.id);
      } else if (activeTab === "permission-types") {
        const payload = {
          ...permissionTypeForm,
          default_approval_rule_code: permissionTypeForm.default_approval_rule_code || null,
          effective_end_date: permissionTypeForm.effective_end_date || null,
        };
        const row = permissionTypeForm.id
          ? await updateHrPermissionType(permissionTypeForm.id, payload)
          : await createHrPermissionType(payload);
        setSelectedId(row.id);
      } else {
        const payload = {
          ...payrollPeriodForm,
          cutoff_start_day: Number(payrollPeriodForm.cutoff_start_day),
          cutoff_end_day: Number(payrollPeriodForm.cutoff_end_day),
          lock_days_before_payroll: Number(payrollPeriodForm.lock_days_before_payroll),
          effective_end_date: payrollPeriodForm.effective_end_date || null,
        };
        const row = payrollPeriodForm.id
          ? await updateHrPayrollPeriodPolicy(payrollPeriodForm.id, payload)
          : await createHrPayrollPeriodPolicy(payload);
        setSelectedId(row.id);
      }

      await loadSettings();
      setFeedback({ type: "success", message: "Perubahan berhasil disimpan ke Supabase." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal menyimpan perubahan." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    setIsSaving(true);
    setFeedback(null);

    try {
      assertHrPresensiSettingsAccess(access);
      const endDate =
        activeTab === "locations"
          ? locationForm.effective_end_date || todayDate()
          : activeTab === "shift-shift"
            ? shiftForm.effective_end_date || todayDate()
            : activeTab === "shift-groups"
              ? scheduleGroupForm.effective_end_date || todayDate()
              : activeTab === "shift-assignments"
                ? shiftAssignmentForm.effective_end_date || todayDate()
                : activeTab === "methods"
                  ? methodForm.effective_end_date || todayDate()
                  : activeTab === "method-assignments"
                    ? methodAssignmentForm.effective_end_date || todayDate()
                    : activeTab === "leave-policies"
                      ? leavePolicyForm.effective_end_date || todayDate()
                      : activeTab === "special-leave-types"
                        ? specialLeaveTypeForm.effective_end_date || todayDate()
                        : activeTab === "permission-types"
                          ? permissionTypeForm.effective_end_date || todayDate()
                          : payrollPeriodForm.effective_end_date || todayDate();

      if (activeTab === "locations" && locationForm.id) await archiveHrLocation(locationForm.id, endDate);
      if (activeTab === "shift-shift" && shiftForm.id) await archiveHrShift(shiftForm.id, endDate);
      if (activeTab === "shift-groups" && scheduleGroupForm.id) await archiveHrScheduleGroup(scheduleGroupForm.id, endDate);
      if (activeTab === "shift-assignments" && shiftAssignmentForm.id) await archiveHrShiftAssignment(shiftAssignmentForm.id, endDate);
      if (activeTab === "methods" && methodForm.id) await archiveHrAttendanceMethod(methodForm.id, endDate);
      if (activeTab === "method-assignments" && methodAssignmentForm.id) await archiveHrAttendanceMethodAssignment(methodAssignmentForm.id, endDate);
      if (activeTab === "leave-policies" && leavePolicyForm.id) await archiveHrLeaveBalancePolicy(leavePolicyForm.id, endDate);
      if (activeTab === "special-leave-types" && specialLeaveTypeForm.id) await archiveHrSpecialLeaveType(specialLeaveTypeForm.id, endDate);
      if (activeTab === "permission-types" && permissionTypeForm.id) await archiveHrPermissionType(permissionTypeForm.id, endDate);
      if (activeTab === "payroll-periods" && payrollPeriodForm.id) await archiveHrPayrollPeriodPolicy(payrollPeriodForm.id, endDate);

      await loadSettings();
      setFeedback({ type: "success", message: "Data berhasil dinonaktifkan tanpa hard delete." });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal menonaktifkan data." });
    } finally {
      setIsSaving(false);
    }
  }

  const listRows = mapRecordList(activeRows, activeTab, directory);

  const domainLogs = rows.logs.filter((item) => {
    if (activeTab === "locations") return item.domain_name === "locations";
    if (activeTab === "shift-shift") return item.domain_name === "shifts";
    if (activeTab === "shift-groups") return item.domain_name === "schedule_groups";
    if (activeTab === "shift-assignments") return item.domain_name === "shift_assignments";
    if (activeTab === "methods") return item.domain_name === "attendance_methods";
    if (activeTab === "method-assignments") return item.domain_name === "attendance_method_assignments";
    if (activeTab === "leave-policies") return item.domain_name === "leave_balance_policies";
    if (activeTab === "special-leave-types") return item.domain_name === "special_leave_types";
    if (activeTab === "permission-types") return item.domain_name === "permission_types";
    return item.domain_name === "payroll_period_policies";
  });

  const formConfig =
    activeTab === "locations"
      ? {
          title: "Form Lokasi Kantor",
          description: "Kelola lokasi, radius default kantor, status aktif, dan tanggal efektif tanpa hard delete.",
          fields: buildLocationFields(),
          form: locationForm,
          onChange: setFormValue(setLocationForm),
          canArchive: Boolean(locationForm.id),
        }
      : activeTab === "shift-shift"
        ? {
            title: "Form Shift",
            description: "Kelola jam masuk, lintas hari, toleransi, dan tanggal efektif.",
            fields: buildShiftFields(),
            form: shiftForm,
            onChange: setFormValue(setShiftForm),
            canArchive: Boolean(shiftForm.id),
          }
        : activeTab === "shift-groups"
          ? {
              title: "Form Grup Jadwal",
              description: "Kelola grup jadwal, default shift, lokasi, dan pola kerja JSON.",
              fields: buildScheduleGroupFields(locationOptions, shiftOptions),
              form: scheduleGroupForm,
              onChange: setFormValue(setScheduleGroupForm),
              canArchive: Boolean(scheduleGroupForm.id),
            }
          : activeTab === "shift-assignments"
            ? {
                title: "Form Assignment Jadwal",
                description: "Kelola assignment dasar karyawan ke grup jadwal atau shift override.",
                fields: buildShiftAssignmentFields(employeeOptions, scheduleGroupOptions, shiftOptions, locationOptions),
                form: shiftAssignmentForm,
                onChange: setFormValue(setShiftAssignmentForm),
                canArchive: Boolean(shiftAssignmentForm.id),
              }
            : activeTab === "methods"
              ? {
                  title: "Form Metode Absensi",
                  description: "Kelola metode absensi aktif, metode utama, dan validasi lokasi atau biometrik.",
                  fields: buildMethodFields(methodOptions),
                  form: methodForm,
                  onChange: setFormValue(setMethodForm),
                  canArchive: Boolean(methodForm.id),
                }
              : activeTab === "method-assignments"
                ? {
                    title: "Form Assignment Metode",
                    description: "Kelola assignment dasar metode absensi ke karyawan atau konteks lokasi.",
                    fields: buildMethodAssignmentFields(employeeOptions, methodIdOptions, locationOptions),
                    form: methodAssignmentForm,
                    onChange: setFormValue(setMethodAssignmentForm),
                    canArchive: Boolean(methodAssignmentForm.id),
                  }
                : activeTab === "leave-policies"
                  ? {
                      title: "Form Kebijakan Cuti",
                      description: "Kelola policy cuti global perusahaan dengan kuota, reset, dan effective date.",
                      fields: buildLeavePolicyFields(),
                      form: leavePolicyForm,
                      onChange: setFormValue(setLeavePolicyForm),
                      canArchive: Boolean(leavePolicyForm.id),
                    }
                  : activeTab === "special-leave-types"
                    ? {
                        title: "Form Jenis Cuti Khusus",
                        description: "Kelola jenis cuti khusus yang tidak selalu memotong saldo reguler.",
                        fields: buildSpecialLeaveTypeFields(),
                        form: specialLeaveTypeForm,
                        onChange: setFormValue(setSpecialLeaveTypeForm),
                        canArchive: Boolean(specialLeaveTypeForm.id),
                      }
                    : activeTab === "permission-types"
                      ? {
                          title: "Form Jenis Izin",
                          description: "Kelola jenis izin, kategori, requirement lampiran, dan dampaknya ke payroll.",
                          fields: buildPermissionTypeFields(),
                          form: permissionTypeForm,
                          onChange: setFormValue(setPermissionTypeForm),
                          canArchive: Boolean(permissionTypeForm.id),
                        }
                      : {
                          title: "Form Periode Payroll",
                          description: "Kelola cutoff payroll, lock period, dan effective date untuk finalisasi presensi.",
                          fields: buildPayrollPeriodFields(),
                          form: payrollPeriodForm,
                          onChange: setFormValue(setPayrollPeriodForm),
                          canArchive: Boolean(payrollPeriodForm.id),
                        };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[14px] border border-[var(--border-soft)] bg-white px-2 py-2 shadow-sm">
        <div className="flex min-w-max gap-1.5">
          {settingTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-[10px] border px-3.5 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white"
                  : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 text-sm text-[var(--text-muted)] shadow-sm">
          Memuat data live HR Presensi dari Supabase...
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <HrPresensiSettingsList
          title={settingTabs.find((item) => item.key === activeTab)?.label || "Pengaturan"}
          description="Semua data diambil langsung dari Supabase, mendukung effective date, dan arsip tanpa hard delete."
          rows={listRows}
          activeId={selectedId}
          onSelect={setSelectedId}
          onCreate={createNew}
        />

        <HrPresensiSettingsForm
          title={formConfig.title}
          description={formConfig.description}
          fields={formConfig.fields}
          form={formConfig.form}
          onChange={formConfig.onChange}
          onSubmit={() => void handleSave()}
          onArchive={formConfig.canArchive ? () => void handleArchive() : undefined}
          isSaving={isSaving}
          canArchive={formConfig.canArchive}
          feedback={feedback}
        />

        <HrPresensiChangeLogList logs={domainLogs} />
      </div>
    </div>
  );
}
