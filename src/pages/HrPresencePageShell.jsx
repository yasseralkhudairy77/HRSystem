import { useMemo, useState } from "react";
import { CalendarPlus2, Download, FileSpreadsheet, Filter, Plus, Printer, RefreshCcw, Save } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import PresenceDataTable from "@/components/hrPresence/PresenceDataTable";
import PresenceFilterBar from "@/components/hrPresence/PresenceFilterBar";
import PresenceModalForm from "@/components/hrPresence/PresenceModalForm";
import PresenceSectionCard from "@/components/hrPresence/PresenceSectionCard";
import PresenceSummaryCard from "@/components/hrPresence/PresenceSummaryCard";
import ScheduleMatrix from "@/components/hrPresence/ScheduleMatrix";
import ShiftColorBadge from "@/components/hrPresence/ShiftColorBadge";
import { Button } from "@/components/ui/button";
import {
  attendancePenalties,
  attendanceRecords,
  attendanceSettings,
  departmentWorkShifts,
  fingerprintDevices,
  holidays,
  hrPresenceDemoMeta,
  hrPresenceUiHelpers,
  presenceBranches,
  presenceDepartments,
  presenceEmployees,
  workShifts,
} from "@/data";
import { formatAttendanceStatusLabel } from "@/lib/hrPresence";

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
  const meta = pageMeta[pageKey];

  const branchMap = useMemo(() => new Map(presenceBranches.map((item) => [item.id, item.branch_name])), []);
  const departmentMap = useMemo(() => new Map(presenceDepartments.map((item) => [item.id, item.department_name])), []);
  const employeeMap = useMemo(() => new Map(presenceEmployees.map((item) => [item.id, item])), []);
  const shiftMap = useMemo(() => new Map(workShifts.map((item) => [item.id, item])), []);

  if (!meta) {
    return null;
  }

  const summaryStatus = hrPresenceUiHelpers.attendanceSummary.byStatus;
  const settings = attendanceSettings[0];

  const attendanceRows = attendanceRecords.slice(0, 18).map((record) => {
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
      sumber: prettify(record.attendance_source),
    };
  });

  const exceptionRows = attendanceRecords.filter((item) => item.status !== "hadir").slice(0, 18).map((record) => {
    const employee = employeeMap.get(record.employee_id);
    return {
      id: record.id,
      tanggal: formatDate(record.attendance_date),
      nama: <div><div className="font-semibold">{employee?.employee_name}</div><div className="text-xs text-[var(--text-muted)]">{employee?.employee_id}</div></div>,
      cabang: branchMap.get(record.branch_id || "") || "-",
      departemen: departmentMap.get(record.department_id || "") || "-",
      jenis: formatAttendanceStatusLabel(record.status),
      approval: ["izin", "sakit", "cuti"].includes(record.status) ? "Disetujui" : record.status === "alpha" ? "Menunggu" : "Draft",
      keterangan: record.note || "Perlu review HR dan atasan.",
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
    status: item.is_active ? "Aktif" : "Nonaktif",
  }));

  const headerActions = {
    "hr-presensi-absensi-karyawan": [<ActionButton key="sync" icon={RefreshCcw} label="Sinkronisasi" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-laporan-jadwal-kerja": [<ActionButton key="print" icon={Printer} label="Cetak" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="xls" icon={FileSpreadsheet} label="Export Excel" onClick={() => setOpenModal(true)} />, <ActionButton key="pdf" icon={Download} label="Export PDF" onClick={() => setOpenModal(true)} />],
    "hr-presensi-laporan-ketidakhadiran": [<ActionButton key="print" icon={Printer} label="Print" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="exp" icon={Download} label="Export" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-setelan-umum": [<ActionButton key="save" icon={Save} label="Simpan" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-denda": [<ActionButton key="add" icon={Plus} label="Tambah denda" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-hari-libur": [<ActionButton key="add" icon={CalendarPlus2} label="Tambah hari libur" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-jam-kerja-departemen": [<ActionButton key="add" icon={Plus} label="Tambah mapping" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-jam-kerja": [<ActionButton key="add" icon={Plus} label="Tambah jam kerja" variant="default" onClick={() => setOpenModal(true)} />],
    "hr-presensi-pengaturan-mesin-fingerprint": [<ActionButton key="sync" icon={RefreshCcw} label="Sinkronisasi" variant="default" onClick={() => setOpenModal(true)} />, <ActionButton key="add" icon={Plus} label="Tambah mesin" onClick={() => setOpenModal(true)} />],
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

    if (pageKey === "hr-presensi-pengaturan-setelan-umum") {
      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <PresenceSectionCard title="Aturan check-in / check-out"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Toleransi telat" value={`${settings.tolerance_late_minutes} menit`} /><SettingTile label="Check-in awal" value={`${settings.early_checkin_limit_minutes} menit`} /><SettingTile label="Check-in terlambat" value={`${settings.late_checkin_limit_minutes} menit`} /><SettingTile label="Checkout limit" value={`${settings.checkout_limit_minutes} menit`} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Metode absensi"><div className="grid gap-3 md:grid-cols-3"><SettingTile label="Mobile" value={settings.allow_mobile_attendance ? "Aktif" : "Nonaktif"} /><SettingTile label="Fingerprint" value={settings.allow_fingerprint_attendance ? "Aktif" : "Nonaktif"} /><SettingTile label="Face recognition" value={settings.allow_face_recognition ? "Aktif" : "Nonaktif"} /></div></PresenceSectionCard>
            <PresenceSectionCard title="Validasi lokasi dan selfie"><div className="grid gap-3 md:grid-cols-2"><SettingTile label="Wajib selfie" value={settings.require_selfie ? "Ya" : "Tidak"} /><SettingTile label="Wajib lokasi" value={settings.require_location ? "Ya" : "Tidak"} /><SettingTile label="Radius" value={`${settings.attendance_radius_meter} meter`} /><SettingTile label="Format laporan" value={prettify(settings.default_report_format)} /></div></PresenceSectionCard>
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
      return <><div className="grid gap-4 md:grid-cols-3"><PresenceSummaryCard label="Mesin aktif" value={fingerprintDevices.filter((item) => item.is_active).length} note="Perangkat yang masih digunakan." tone="emerald" /><PresenceSummaryCard label="Online" value={fingerprintDevices.filter((item) => item.connection_status === "online").length} note="Terkoneksi dan siap sinkron." tone="sky" /><PresenceSummaryCard label="Perlu cek" value={fingerprintDevices.filter((item) => item.connection_status === "perlu_cek").length} note="Perlu perhatian admin." tone="amber" /></div><PresenceFilterBar filters={meta.filters} rightActions={<ActionButton icon={RefreshCcw} label="Sinkronisasi" variant="default" onClick={() => setOpenModal(true)} />} /><PresenceSectionCard title="Daftar mesin fingerprint"><PresenceDataTable columns={[{ key: "mesin", label: "Mesin", width: 240 }, { key: "lokasi", label: "Lokasi", width: 230 }, { key: "alamat", label: "IP / endpoint", width: 160 }, { key: "koneksi", label: "Koneksi", width: 130, type: "status" }, { key: "sinkron", label: "Last sync", width: 180 }, { key: "status", label: "Status", width: 120, type: "status" }]} rows={deviceRows} /></PresenceSectionCard></>;
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
    </div>
  );
}
