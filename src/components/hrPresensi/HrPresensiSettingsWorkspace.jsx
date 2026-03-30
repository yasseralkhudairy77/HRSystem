import { useEffect, useMemo, useState } from "react";

import HrPresensiChangeLogList from "@/components/hrPresensi/HrPresensiChangeLogList";
import HrPresensiSettingsForm from "@/components/hrPresensi/HrPresensiSettingsForm";
import HrPresensiSettingsList from "@/components/hrPresensi/HrPresensiSettingsList";
import { getEmployeeList } from "@/services/employeeService";
import {
  archiveHrAttendanceMethod,
  archiveHrAttendanceMethodAssignment,
  archiveHrLocation,
  archiveHrScheduleGroup,
  archiveHrShift,
  archiveHrShiftAssignment,
  createHrAttendanceMethod,
  createHrAttendanceMethodAssignment,
  createHrLocation,
  createHrScheduleGroup,
  createHrShift,
  createHrShiftAssignment,
  getHrAttendanceMethodAssignments,
  getHrAttendanceMethods,
  getHrLocations,
  getHrPresensiChangeLogs,
  getHrScheduleGroups,
  getHrShiftAssignments,
  getHrShifts,
  updateHrAttendanceMethod,
  updateHrAttendanceMethodAssignment,
  updateHrLocation,
  updateHrScheduleGroup,
  updateHrShift,
  updateHrShiftAssignment,
} from "@/services/hrPresensiSettingsService";

const defaultLocationForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  address: "",
  timezone: "Asia/Jakarta",
  attendance_radius_meters: 100,
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

const settingTabs = [
  { key: "locations", label: "Lokasi Kantor" },
  { key: "shift-shift", label: "Shift" },
  { key: "shift-groups", label: "Grup Jadwal" },
  { key: "shift-assignments", label: "Assignment Jadwal" },
  { key: "methods", label: "Metode Absensi" },
  { key: "method-assignments", label: "Assignment Metode" },
];

function mapRecordList(rows, type, directory = {}) {
  if (type === "locations") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} • ${item.timezone}`,
      isActive: item.is_active,
      meta: `Efektif ${item.effective_start_date}${item.effective_end_date ? ` s.d. ${item.effective_end_date}` : ""}`,
    }));
  }

  if (type === "shift-shift") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} • ${item.scheduled_checkin} - ${item.scheduled_checkout}`,
      isActive: item.is_active,
      meta: `${item.cross_day ? "Lintas hari" : "Hari yang sama"} • toleransi ${item.grace_minutes} menit`,
    }));
  }

  if (type === "shift-groups") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} • ${directory.shiftMap.get(item.default_shift_id) || "Tanpa shift default"}`,
      isActive: item.is_active,
      meta: `Lokasi default ${directory.locationMap.get(item.default_location_id) || "-"}`,
    }));
  }

  if (type === "shift-assignments") {
    return rows.map((item) => ({
      id: item.id,
      title: directory.employeeMap.get(item.employee_id) || `Karyawan #${item.employee_id}`,
      subtitle: `${directory.scheduleGroupMap.get(item.schedule_group_id) || directory.shiftMap.get(item.shift_id) || "Belum lengkap"}`,
      isActive: item.is_active,
      meta: `Efektif ${item.effective_start_date}${item.location_id ? ` • ${directory.locationMap.get(item.location_id) || "-"}` : ""}`,
    }));
  }

  if (type === "methods") {
    return rows.map((item) => ({
      id: item.id,
      title: item.name,
      subtitle: `${item.code} • ${item.method_type}`,
      isActive: item.is_active,
      meta: `${item.is_primary_method ? "Metode utama" : "Metode pendukung"}${item.requires_location_validation ? " • validasi lokasi" : ""}`,
    }));
  }

  return rows.map((item) => ({
    id: item.id,
    title: directory.employeeMap.get(item.employee_id) || `Karyawan #${item.employee_id}`,
    subtitle: `${directory.methodMap.get(item.attendance_method_id) || "-"} • ${item.assignment_scope}`,
    isActive: item.is_active,
    meta: `Efektif ${item.effective_start_date}${item.location_id ? ` • ${directory.locationMap.get(item.location_id) || "-"}` : ""}`,
  }));
}

function buildLocationFields() {
  return [
    { key: "code", label: "Kode lokasi" },
    { key: "name", label: "Nama lokasi" },
    { key: "timezone", label: "Zona waktu" },
    { key: "attendance_radius_meters", label: "Radius kantor (meter)", type: "number" },
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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function HrPresensiSettingsWorkspace() {
  const [activeTab, setActiveTab] = useState("locations");
  const [rows, setRows] = useState({
    locations: [],
    shifts: [],
    scheduleGroups: [],
    shiftAssignments: [],
    methods: [],
    methodAssignments: [],
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

  async function loadSettings() {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [locations, shifts, scheduleGroups, shiftAssignments, methods, methodAssignments, logs, employeeRows] = await Promise.all([
        getHrLocations(),
        getHrShifts(),
        getHrScheduleGroups(),
        getHrShiftAssignments(),
        getHrAttendanceMethods(),
        getHrAttendanceMethodAssignments(),
        getHrPresensiChangeLogs(["locations", "shifts", "schedule_groups", "shift_assignments", "attendance_methods", "attendance_method_assignments"]),
        getEmployeeList(),
      ]);
      setRows({ locations, shifts, scheduleGroups, shiftAssignments, methods, methodAssignments, logs });
      setEmployees(employeeRows);
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat pengaturan HR Presensi dari Supabase." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const directory = useMemo(() => ({
    employeeMap: new Map(employees.map((item) => [item.id, item.nama_lengkap])),
    locationMap: new Map(rows.locations.map((item) => [item.id, item.name])),
    shiftMap: new Map(rows.shifts.map((item) => [item.id, item.name])),
    scheduleGroupMap: new Map(rows.scheduleGroups.map((item) => [item.id, item.name])),
    methodMap: new Map(rows.methods.map((item) => [item.id, item.name])),
  }), [employees, rows]);

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
    return rows.methodAssignments;
  }, [activeTab, rows]);

  useEffect(() => {
    const firstId = activeRows[0]?.id || "";
    setSelectedId(firstId);
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
                : rows.methodAssignments.find((item) => item.id === selectedId);

    if (!selected) return;

    if (activeTab === "locations") {
      setLocationForm({ ...defaultLocationForm, ...selected, effective_end_date: selected.effective_end_date || "" });
    } else if (activeTab === "shift-shift") {
      setShiftForm({ ...defaultShiftForm, ...selected, break_start: selected.break_start || "", break_end: selected.break_end || "", effective_end_date: selected.effective_end_date || "" });
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
      setMethodForm({ ...defaultMethodForm, ...selected, fallback_method_code: selected.fallback_method_code || "", effective_end_date: selected.effective_end_date || "" });
    } else {
      setMethodAssignmentForm({
        ...defaultMethodAssignmentForm,
        ...selected,
        employee_id: String(selected.employee_id),
        attendance_method_id: selected.attendance_method_id,
        location_id: selected.location_id || "",
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
  }

  function validateCurrentForm() {
    if (activeTab === "locations" && Number(locationForm.attendance_radius_meters) <= 0) throw new Error("Radius kantor harus lebih besar dari 0.");
    if (activeTab === "shift-shift") {
      if (!shiftForm.cross_day && shiftForm.scheduled_checkout && shiftForm.scheduled_checkin && shiftForm.scheduled_checkout <= shiftForm.scheduled_checkin) {
        throw new Error("Shift yang pulangnya lebih awal dari jam masuk harus ditandai sebagai lintas hari.");
      }
    }
    if (activeTab === "methods" && methodForm.is_primary_method && !methodForm.is_active) {
      throw new Error("Metode utama tidak boleh dalam status nonaktif.");
    }
    if (activeTab === "shift-assignments" && !shiftAssignmentForm.schedule_group_id && !shiftAssignmentForm.shift_id) {
      throw new Error("Assignment jadwal minimal harus memilih grup jadwal atau shift override.");
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setFeedback(null);
    try {
      validateCurrentForm();
      if (activeTab === "locations") {
        const payload = { ...locationForm, attendance_radius_meters: Number(locationForm.attendance_radius_meters), effective_end_date: locationForm.effective_end_date || null };
        const row = locationForm.id ? await updateHrLocation(locationForm.id, payload) : await createHrLocation(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-shift") {
        const payload = { ...shiftForm, grace_minutes: Number(shiftForm.grace_minutes), break_start: shiftForm.break_start || null, break_end: shiftForm.break_end || null, effective_end_date: shiftForm.effective_end_date || null };
        const row = shiftForm.id ? await updateHrShift(shiftForm.id, payload) : await createHrShift(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-groups") {
        const payload = { ...scheduleGroupForm, default_location_id: scheduleGroupForm.default_location_id || null, default_shift_id: scheduleGroupForm.default_shift_id || null, effective_end_date: scheduleGroupForm.effective_end_date || null };
        const row = scheduleGroupForm.id ? await updateHrScheduleGroup(scheduleGroupForm.id, payload) : await createHrScheduleGroup(payload);
        setSelectedId(row.id);
      } else if (activeTab === "shift-assignments") {
        const payload = { ...shiftAssignmentForm, employee_id: Number(shiftAssignmentForm.employee_id), schedule_group_id: shiftAssignmentForm.schedule_group_id || null, shift_id: shiftAssignmentForm.shift_id || null, location_id: shiftAssignmentForm.location_id || null, effective_end_date: shiftAssignmentForm.effective_end_date || null };
        const row = shiftAssignmentForm.id ? await updateHrShiftAssignment(shiftAssignmentForm.id, payload) : await createHrShiftAssignment(payload);
        setSelectedId(row.id);
      } else if (activeTab === "methods") {
        const payload = { ...methodForm, fallback_method_code: methodForm.fallback_method_code || null, effective_end_date: methodForm.effective_end_date || null };
        const row = methodForm.id ? await updateHrAttendanceMethod(methodForm.id, payload) : await createHrAttendanceMethod(payload);
        setSelectedId(row.id);
      } else {
        const payload = { ...methodAssignmentForm, employee_id: Number(methodAssignmentForm.employee_id), location_id: methodAssignmentForm.location_id || null, effective_end_date: methodAssignmentForm.effective_end_date || null };
        const row = methodAssignmentForm.id ? await updateHrAttendanceMethodAssignment(methodAssignmentForm.id, payload) : await createHrAttendanceMethodAssignment(payload);
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
                  : methodAssignmentForm.effective_end_date || todayDate();

      if (activeTab === "locations" && locationForm.id) await archiveHrLocation(locationForm.id, endDate);
      if (activeTab === "shift-shift" && shiftForm.id) await archiveHrShift(shiftForm.id, endDate);
      if (activeTab === "shift-groups" && scheduleGroupForm.id) await archiveHrScheduleGroup(scheduleGroupForm.id, endDate);
      if (activeTab === "shift-assignments" && shiftAssignmentForm.id) await archiveHrShiftAssignment(shiftAssignmentForm.id, endDate);
      if (activeTab === "methods" && methodForm.id) await archiveHrAttendanceMethod(methodForm.id, endDate);
      if (activeTab === "method-assignments" && methodAssignmentForm.id) await archiveHrAttendanceMethodAssignment(methodAssignmentForm.id, endDate);

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
    return item.domain_name === "attendance_method_assignments";
  });

  const formConfig =
    activeTab === "locations"
      ? {
          title: "Form Lokasi Kantor",
          description: "Kelola lokasi, radius default kantor, dan tanggal efektif tanpa hard delete.",
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
                  description: "Kelola metode absensi aktif, metode utama, dan validasi lokasi/biometrik.",
                  fields: buildMethodFields(methodOptions),
                  form: methodForm,
                  onChange: setFormValue(setMethodForm),
                  canArchive: Boolean(methodForm.id),
                }
              : {
                  title: "Form Assignment Metode",
                  description: "Kelola assignment dasar metode absensi ke karyawan atau konteks lokasi.",
                  fields: buildMethodAssignmentFields(employeeOptions, methodIdOptions, locationOptions),
                  form: methodAssignmentForm,
                  onChange: setFormValue(setMethodAssignmentForm),
                  canArchive: Boolean(methodAssignmentForm.id),
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
                activeTab === tab.key ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white" : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 text-sm text-[var(--text-muted)] shadow-sm">Memuat data live HR Presensi dari Supabase...</div> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <HrPresensiSettingsList
          title={settingTabs.find((item) => item.key === activeTab)?.label || "Pengaturan"}
          description="Semua data diambil langsung dari Supabase dan mendukung effective date."
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
