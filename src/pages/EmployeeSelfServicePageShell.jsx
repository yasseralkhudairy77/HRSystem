import { useEffect, useMemo, useState } from "react";
import { Camera, Clock3, Coffee, FileUp, Fingerprint, MapPin, ScanFace, Sparkles } from "lucide-react";

import AttendanceActionButton from "@/components/hrPresenceEmployee/AttendanceActionButton";
import AttendanceHistoryCard from "@/components/hrPresenceEmployee/AttendanceHistoryCard";
import EmployeeHeaderCard from "@/components/hrPresenceEmployee/EmployeeHeaderCard";
import EmployeeStatusBadge from "@/components/hrPresenceEmployee/EmployeeStatusBadge";
import EmptyStateMobile from "@/components/hrPresenceEmployee/EmptyStateMobile";
import InfoCard from "@/components/hrPresenceEmployee/InfoCard";
import MobileBottomNav from "@/components/hrPresenceEmployee/MobileBottomNav";
import MobileTopBar from "@/components/hrPresenceEmployee/MobileTopBar";
import QuickMenuGrid from "@/components/hrPresenceEmployee/QuickMenuGrid";
import RequestHistoryCard from "@/components/hrPresenceEmployee/RequestHistoryCard";
import ScheduleListCard from "@/components/hrPresenceEmployee/ScheduleListCard";
import TodayAttendanceCard from "@/components/hrPresenceEmployee/TodayAttendanceCard";
import { Button } from "@/components/ui/button";
import { attendanceRequests, employeeSelfServiceDemo, presenceEmployees, workShifts } from "@/data";
import { formatEmployeeRequestStatusLabel, formatEmployeeRequestTypeLabel } from "@/lib/hrPresenceEmployee";

const pageMeta = {
  "employee-home": { title: "Beranda", subtitle: "Ringkasan harian karyawan" },
  "employee-schedule": { title: "Jadwal Saya", subtitle: "Jadwal kerja pribadi" },
  "employee-history": { title: "Riwayat Absensi", subtitle: "Presensi harian dan anomali" },
  "employee-requests": { title: "Pengajuan Saya", subtitle: "Pantau approval pribadi" },
  "employee-services": { title: "Semua Menu", subtitle: "Layanan karyawan" },
  "employee-profile": { title: "Profil", subtitle: "Info personal sederhana" },
  "employee-attendance-action": { title: "Presensi Hari Ini", subtitle: "Check-in dan check-out" },
  "employee-break": { title: "Absen Istirahat", subtitle: "Catat jeda kerja" },
  "employee-request-form": { title: "Pengajuan Presensi", subtitle: "Izin, sakit, cuti, lembur, dan koreksi" },
  "employee-face-id": { title: "Daftar Face ID", subtitle: "Registrasi biometrik" },
  "employee-overtime": { title: "Lembur Harian", subtitle: "Lihat dan ajukan lembur" },
  "employee-shift-swap": { title: "Tukar Shift", subtitle: "Ajukan perubahan jadwal" },
};

const routeKeyMap = {
  "/karyawan/beranda": "employee-home",
  "/karyawan/jadwal-saya": "employee-schedule",
  "/karyawan/riwayat-absensi": "employee-history",
  "/karyawan/pengajuan-saya": "employee-requests",
  "/karyawan/semua-menu": "employee-services",
  "/karyawan/profil": "employee-profile",
  "/karyawan/presensi": "employee-attendance-action",
  "/karyawan/absen-istirahat": "employee-break",
  "/karyawan/pengajuan/form": "employee-request-form",
  "/karyawan/daftar-face-id": "employee-face-id",
  "/karyawan/lembur-harian": "employee-overtime",
  "/karyawan/tukar-shift": "employee-shift-swap",
};

const requestTypes = [
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "cuti", label: "Cuti" },
  { value: "lembur", label: "Lembur" },
  { value: "tukar_shift", label: "Tukar Shift" },
  { value: "koreksi_absensi", label: "Koreksi" },
];

function navigateToRoute(route) {
  const menu = routeKeyMap[route];
  if (!menu) return;
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: { menu } }));
}

function formatDateLabel(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDateLabel(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
}

function SectionTitle({ title, description, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description ? <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div> : null}
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction} className="text-xs font-semibold text-emerald-700">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value, tone = "slate" }) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-[22px] p-3 ${toneMap[tone] || toneMap.slate}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function FilterChip({ label, active }) {
  return (
    <button type="button" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
      {label}
    </button>
  );
}

export default function EmployeeSelfServicePageShell({ pageKey }) {
  const [now, setNow] = useState(() => new Date(`${employeeSelfServiceDemo.todayDate}T09:12:00`));
  const [selectedRequestType, setSelectedRequestType] = useState("izin");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const meta = pageMeta[pageKey];

  useEffect(() => {
    const timer = window.setInterval(() => setNow((current) => new Date(current.getTime() + 60000)), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const shiftMap = useMemo(() => new Map(workShifts.map((item) => [item.id, item])), []);
  const employeeMap = useMemo(() => new Map(presenceEmployees.map((item) => [item.id, item])), []);
  const currentEmployee = employeeSelfServiceDemo.currentEmployee;
  const branchName = employeeSelfServiceDemo.directoryMaps.branchMap.get(currentEmployee?.branch_id || "") || "-";
  const departmentName = employeeSelfServiceDemo.directoryMaps.departmentMap.get(currentEmployee?.department_id || "") || "-";
  const nowLabel = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = formatDateLabel(employeeSelfServiceDemo.todayDate);

  if (!meta || !currentEmployee) return null;

  const onBack = pageKey === "employee-home" ? null : () => navigateToRoute("/karyawan/beranda");
  const showFeedback = (message) => {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(""), 2200);
  };

  const renderHome = () => (
    <>
      <EmployeeHeaderCard employee={currentEmployee} branchName={branchName} departmentName={departmentName} />
      <TodayAttendanceCard nowLabel={nowLabel} dateLabel={dateLabel} todayState={employeeSelfServiceDemo.todayState} settings={employeeSelfServiceDemo.settings} />
      <div className="grid grid-cols-2 gap-3">
        <AttendanceActionButton icon={Fingerprint} label="Absen Masuk" subtitle={employeeSelfServiceDemo.todayState.hasCheckedIn ? "Masuk sudah tercatat" : "Siap check-in dari mobile"} tone="primary" disabled={employeeSelfServiceDemo.todayState.checkinButtonDisabled} onClick={() => showFeedback("Check-in demo berhasil direkam.")} />
        <AttendanceActionButton icon={Clock3} label="Absen Pulang" subtitle={employeeSelfServiceDemo.todayState.hasCheckedOut ? "Pulang sudah tercatat" : "Selesaikan shift hari ini"} disabled={employeeSelfServiceDemo.todayState.checkoutButtonDisabled} onClick={() => showFeedback("Check-out demo berhasil direkam.")} />
      </div>
      {employeeSelfServiceDemo.todayState.shift?.has_break ? (
        <div className="grid grid-cols-2 gap-3">
          <AttendanceActionButton icon={Coffee} label="Mulai Istirahat" subtitle="Catat jam mulai break" disabled={employeeSelfServiceDemo.todayState.breakStartDisabled} onClick={() => navigateToRoute("/karyawan/absen-istirahat")} />
          <AttendanceActionButton icon={Coffee} label="Selesai Istirahat" subtitle="Akhiri break aktif" tone="primary" disabled={employeeSelfServiceDemo.todayState.breakEndDisabled} onClick={() => navigateToRoute("/karyawan/absen-istirahat")} />
        </div>
      ) : null}
      <div className="space-y-3">
        <SectionTitle title="Ringkasan bulan berjalan" description="Agar karyawan cepat paham pola kehadiran pribadi." />
        <div className="grid grid-cols-3 gap-3">
          <MiniMetric label="Hadir" value={employeeSelfServiceDemo.monthlySummary.hadir} tone="emerald" />
          <MiniMetric label="Terlambat" value={employeeSelfServiceDemo.monthlySummary.terlambat} tone="amber" />
          <MiniMetric label="Izin" value={employeeSelfServiceDemo.monthlySummary.izin} tone="sky" />
          <MiniMetric label="Sakit" value={employeeSelfServiceDemo.monthlySummary.sakit} tone="violet" />
          <MiniMetric label="Cuti" value={employeeSelfServiceDemo.monthlySummary.cuti} tone="slate" />
          <MiniMetric label="Alpha" value={employeeSelfServiceDemo.monthlySummary.alpha} tone="rose" />
        </div>
      </div>
      {employeeSelfServiceDemo.requestSummary.menunggu ? <InfoCard title={`${employeeSelfServiceDemo.requestSummary.menunggu} pengajuan masih menunggu`} description="Pantau status approval agar tidak ada request yang terlewat, terutama koreksi absensi dan lembur." tone="warning" actionLabel="Lihat pengajuan saya" onAction={() => navigateToRoute("/karyawan/pengajuan-saya")} /> : null}
      <div className="space-y-3">
        <SectionTitle title="Shortcut penting" description="Menu yang paling sering dipakai karyawan tiap hari." />
        <QuickMenuGrid items={employeeSelfServiceDemo.quickShortcuts} onNavigate={navigateToRoute} />
      </div>
      <div className="space-y-3">
        <SectionTitle title="Info & pengumuman" description="Update singkat yang relevan untuk aktivitas kerja hari ini." />
        {employeeSelfServiceDemo.announcements.slice(0, 2).map((item) => <InfoCard key={item.id} title={item.title} description={item.summary} tone={item.tone || "info"} />)}
      </div>
    </>
  );

  const renderSchedule = () => (
    <>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle title="Filter bulan" description="List mobile bulanan dengan highlight hari ini dan badge shift." />
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip label="Maret 2026" active />
          <FilterChip label="Kalender ringan" />
          <FilterChip label="List bulanan" active />
        </div>
      </div>
      <div className="space-y-3">
        {employeeSelfServiceDemo.scheduleList.slice(0, 14).map((item) => <ScheduleListCard key={item.id} item={item} label={formatShortDateLabel(item.work_date)} isToday={item.work_date === employeeSelfServiceDemo.todayDate} />)}
      </div>
    </>
  );

  const renderHistory = () => (
    <>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle title="Filter riwayat" description="Ringkas untuk mobile, tetap cukup jelas buat koreksi presensi." />
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip label="Maret 2026" active />
          <FilterChip label="Semua status" active />
          <FilterChip label="Perlu koreksi" />
        </div>
      </div>
      <div className="space-y-3">
        {employeeSelfServiceDemo.historyList.slice(0, 10).map((item) => <AttendanceHistoryCard key={item.id} item={item} shift={item.shift_id ? shiftMap.get(item.shift_id) : null} dateLabel={formatDateLabel(item.attendance_date)} onCorrection={() => navigateToRoute("/karyawan/pengajuan/form")} />)}
      </div>
    </>
  );

  const renderRequests = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MiniMetric label="Menunggu" value={employeeSelfServiceDemo.requestSummary.menunggu} tone="amber" />
        <MiniMetric label="Disetujui" value={employeeSelfServiceDemo.requestSummary.disetujui} tone="emerald" />
        <MiniMetric label="Ditolak" value={employeeSelfServiceDemo.requestSummary.ditolak} tone="rose" />
        <MiniMetric label="Draft" value={employeeSelfServiceDemo.requestList.filter((item) => item.status === "draft").length} tone="slate" />
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-sm font-semibold text-slate-900">Kelola pengajuan</div><div className="mt-1 text-xs text-slate-500">Buat pengajuan baru atau pantau approval yang sedang berjalan.</div></div>
          <Button className="rounded-2xl bg-emerald-500 hover:bg-emerald-600" onClick={() => navigateToRoute("/karyawan/pengajuan/form")}>Buat baru</Button>
        </div>
      </div>
      <div className="space-y-3">
        {employeeSelfServiceDemo.requestList.map((item) => <RequestHistoryCard key={item.id} item={item} typeLabel={formatEmployeeRequestTypeLabel(item.request_type)} statusLabel={formatEmployeeRequestStatusLabel(item.status)} relatedEmployeeName={item.related_employee_id ? employeeMap.get(item.related_employee_id)?.employee_name : null} onOpen={() => showFeedback(`Detail ${item.title} dibuka.`)} onCancel={() => showFeedback(`Pengajuan ${item.title} dibatalkan (demo).`)} />)}
      </div>
    </>
  );

  const renderServices = () => (
    <>
      <InfoCard title="Semua layanan karyawan" description="Semua fitur dibungkus dalam kartu besar agar mudah dijangkau jempol dan tetap nyaman di web mobile." tone="info" />
      <QuickMenuGrid items={employeeSelfServiceDemo.serviceMenus} onNavigate={navigateToRoute} />
    </>
  );

  const renderProfile = () => (
    <>
      <EmployeeHeaderCard employee={currentEmployee} branchName={branchName} departmentName={departmentName} />
      <div className="grid grid-cols-2 gap-3">
        {employeeSelfServiceDemo.profileCards.map((item) => <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{item.label}</div><div className="mt-2 text-sm font-semibold text-slate-900">{item.value}</div></div>)}
      </div>
      <InfoCard title="ID Card Digital" description="Versi awal ini menyiapkan tempat untuk kartu identitas digital karyawan, QR internal, dan info kerja singkat." tone="success" />
      <InfoCard title="Pengaturan sederhana" description="Notifikasi, preferensi presensi mobile, dan sinkronisasi akun akan ditempatkan di halaman ini pada tahap berikutnya." tone="info" />
    </>
  );

  const renderAttendanceAction = () => (
    <>
      <TodayAttendanceCard nowLabel={nowLabel} dateLabel={dateLabel} todayState={employeeSelfServiceDemo.todayState} settings={employeeSelfServiceDemo.settings} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle title="Verifikasi presensi" description="Struktur selfie, GPS, dan Face ID disiapkan dari sekarang agar mudah disambung ke device nanti." />
        <div className="mt-4 grid gap-3">
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
            <Camera className="mx-auto h-7 w-7 text-slate-400" />
            <div className="mt-2 text-sm font-semibold text-slate-700">Preview selfie presensi</div>
            <div className="mt-1 text-xs text-slate-500">Placeholder kamera/selfie akan muncul di area ini saat integrasi device aktif.</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin className="h-4 w-4 text-slate-400" />Lokasi</div><div className="mt-2 text-xs text-slate-500">GPS placeholder aktif untuk web mobile / hybrid app.</div></div>
            <div className="rounded-[22px] bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ScanFace className="h-4 w-4 text-slate-400" />Face ID</div><div className="mt-2 text-xs text-slate-500">Siap untuk status verifikasi wajah berhasil/gagal.</div></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <AttendanceActionButton icon={Fingerprint} label="Absen Masuk" subtitle={employeeSelfServiceDemo.todayState.hasCheckedIn ? "Sudah check-in" : "Rekam jam masuk sekarang"} tone="primary" disabled={employeeSelfServiceDemo.todayState.checkinButtonDisabled} onClick={() => showFeedback("Absen masuk tersimpan (demo).")} />
        <AttendanceActionButton icon={Clock3} label="Absen Pulang" subtitle={employeeSelfServiceDemo.todayState.hasCheckedOut ? "Sudah check-out" : "Tutup shift hari ini"} disabled={employeeSelfServiceDemo.todayState.checkoutButtonDisabled} onClick={() => showFeedback("Absen pulang tersimpan (demo).")} />
      </div>
    </>
  );

  const renderBreak = () => employeeSelfServiceDemo.todayState.shift?.has_break ? (
    <>
      <InfoCard title={employeeSelfServiceDemo.todayState.isOnBreak ? "Sedang istirahat" : "Shift hari ini punya waktu istirahat"} description={employeeSelfServiceDemo.todayState.isOnBreak ? "Sistem menunggu Anda menekan selesai istirahat untuk melanjutkan kerja." : `Break dijadwalkan sekitar ${employeeSelfServiceDemo.todayState.shift.break_start_time} - ${employeeSelfServiceDemo.todayState.shift.break_end_time}.`} tone={employeeSelfServiceDemo.todayState.isOnBreak ? "warning" : "info"} />
      <div className="grid grid-cols-2 gap-3">
        <AttendanceActionButton icon={Coffee} label="Mulai Istirahat" subtitle="Catat jam mulai" disabled={employeeSelfServiceDemo.todayState.breakStartDisabled} onClick={() => showFeedback("Mulai istirahat direkam (demo).")} />
        <AttendanceActionButton icon={Coffee} label="Selesai Istirahat" subtitle="Catat jam selesai" tone="primary" disabled={employeeSelfServiceDemo.todayState.breakEndDisabled} onClick={() => showFeedback("Selesai istirahat direkam (demo).")} />
      </div>
    </>
  ) : <EmptyStateMobile title="Tidak ada jadwal istirahat khusus" description="Shift hari ini tidak memakai flow absen istirahat terpisah atau pengaturan istirahat belum diaktifkan." />;

  const renderRequestForm = () => (
    <>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <SectionTitle title="Pilih jenis pengajuan" description="Satu form engine dinamis agar UX tetap sederhana di layar mobile." />
        <div className="mt-3 flex flex-wrap gap-2">
          {requestTypes.map((item) => <button key={item.value} type="button" onClick={() => setSelectedRequestType(item.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedRequestType === item.value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{item.label}</button>)}
        </div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-4">
          <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Judul pengajuan</div><div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Contoh: {formatEmployeeRequestTypeLabel(selectedRequestType)} pribadi {employeeSelfServiceDemo.todayDate}</div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tanggal mulai</div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">24 Mar 2026</div></div>
            <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tanggal selesai</div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">24 Mar 2026</div></div>
          </div>
          <div><div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Keterangan</div><div className="min-h-[120px] rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500">Area input keterangan pengajuan yang rapi, lapang, dan enak dipakai dari layar mobile.</div></div>
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FileUp className="h-4 w-4 text-slate-400" />Lampiran pendukung</div><div className="mt-2 text-xs text-slate-500">Placeholder upload surat dokter, bukti, atau foto pendukung akan diletakkan di area ini.</div></div>
          <Button className="h-12 w-full rounded-2xl bg-emerald-500 text-sm font-semibold hover:bg-emerald-600" onClick={() => showFeedback(`Pengajuan ${formatEmployeeRequestTypeLabel(selectedRequestType)} berhasil dikirim (demo).`)}>Simpan pengajuan</Button>
        </div>
      </div>
    </>
  );

  const renderFaceId = () => (
    <>
      <InfoCard title="Face ID siap dipakai" description="Struktur pendaftaran wajah sudah disiapkan agar nanti mudah disambung ke verifikasi biometrik sungguhan." tone={employeeSelfServiceDemo.faceRegistration?.status === "aktif" ? "success" : "warning"} />
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <ScanFace className="mx-auto h-8 w-8 text-slate-400" />
          <div className="mt-3 text-sm font-semibold text-slate-900">Preview wajah karyawan</div>
          <div className="mt-1 text-xs text-slate-500">Placeholder frame kamera / instruksi posisi wajah akan tampil di sini.</div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">Status pendaftaran</div><div className="mt-1 text-xs text-slate-500">{employeeSelfServiceDemo.faceRegistration?.verification_note}</div></div><EmployeeStatusBadge value={employeeSelfServiceDemo.faceRegistration?.status || "belum_terdaftar"} /></div>
        <Button className="mt-4 h-12 w-full rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={() => showFeedback("Flow daftar ulang Face ID dibuka (demo).")}>Daftar ulang wajah</Button>
      </div>
    </>
  );

  const renderOvertime = () => (
    <>
      <InfoCard title="Lembur harian" description="Halaman ini menyiapkan alur cepat untuk melihat lembur aktif, mengajukan lembur baru, dan memantau status persetujuan." tone="info" />
      <Button className="h-12 w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600" onClick={() => navigateToRoute("/karyawan/pengajuan/form")}>Ajukan lembur baru</Button>
      <div className="space-y-3">{employeeSelfServiceDemo.overtimeEntries.map((item) => <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.date} - {item.hours}</div></div><EmployeeStatusBadge value={item.status} /></div></div>)}</div>
    </>
  );

  const renderShiftSwap = () => (
    <>
      <InfoCard title="Tukar shift" description="Flow awal untuk memilih tanggal, melihat rekan satu departemen, dan memantau status pengajuan tukar jadwal." tone="info" />
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><SectionTitle title="Shift yang bisa ditukar" description="Contoh jadwal terdekat milik sendiri." /><div className="mt-3 space-y-3">{employeeSelfServiceDemo.scheduleList.slice(0, 3).map((item) => <ScheduleListCard key={item.id} item={item} label={formatShortDateLabel(item.work_date)} />)}</div></div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"><SectionTitle title="Pilih rekan penukar" description="Rekan dari departemen yang sama agar proses lebih realistis." /><div className="mt-3 grid gap-3">{employeeSelfServiceDemo.shiftSwapPeers.map((item) => <button key={item.id} type="button" onClick={() => showFeedback(`Rekan ${item.employee_name} dipilih untuk tukar shift (demo).`)} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-left"><div className="text-sm font-semibold text-slate-900">{item.employee_name}</div><div className="mt-1 text-xs text-slate-500">{item.job_title}</div></button>)}</div></div>
    </>
  );

  const content = {
    "employee-home": renderHome(),
    "employee-schedule": renderSchedule(),
    "employee-history": renderHistory(),
    "employee-requests": renderRequests(),
    "employee-services": renderServices(),
    "employee-profile": renderProfile(),
    "employee-attendance-action": renderAttendanceAction(),
    "employee-break": renderBreak(),
    "employee-request-form": renderRequestForm(),
    "employee-face-id": renderFaceId(),
    "employee-overtime": renderOvertime(),
    "employee-shift-swap": renderShiftSwap(),
  }[pageKey];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(260px,340px)]">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef5ff_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.16)] md:p-5">
        <MobileTopBar title={meta.title} subtitle={meta.subtitle} onBack={onBack} />
        <div className="space-y-4 pt-4">{feedbackMessage ? <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{feedbackMessage}</div> : null}{content}</div>
        <MobileBottomNav activeKey={pageKey} onNavigate={navigateToRoute} />
      </div>
      <div className="hidden space-y-4 xl:block">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-emerald-500" />Cakupan pengalaman karyawan</div><div className="mt-4 space-y-3">{employeeSelfServiceDemo.mobileStates.map((item) => <div key={item.key} className="rounded-[20px] bg-slate-50 p-3"><div className="text-sm font-semibold text-slate-800">{item.label}</div><div className="mt-1 text-xs leading-5 text-slate-500">{item.summary}</div></div>)}</div></div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-semibold text-slate-900">Terhubung ke data presensi</div><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="rounded-[20px] bg-slate-50 p-3">Jadwal aktif dibaca dari {employeeSelfServiceDemo.scheduleList.length} record EmployeeSchedule.</div><div className="rounded-[20px] bg-slate-50 p-3">Riwayat absensi dibaca dari {employeeSelfServiceDemo.historyList.length} record hasil engine AttendanceRecord.</div><div className="rounded-[20px] bg-slate-50 p-3">Pengajuan pribadi dibaca dari {attendanceRequests.length} dummy request yang siap dikembangkan ke workflow approval.</div><div className="rounded-[20px] bg-slate-50 p-3">Status hari ini dibentuk dari jadwal, shift, setting presensi, dan hasil kalkulasi absensi otomatis.</div></div></div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm font-semibold text-slate-900">Catatan tahap ini</div><div className="mt-3 space-y-2 text-sm leading-6 text-slate-600"><div>Bagian yang sudah interaktif: navigasi mobile, tombol aksi demo, bottom nav, filter chip, request type switcher, dan shortcut layanan.</div><div>Bagian yang masih placeholder: kamera, GPS, Face ID sungguhan, upload file real, slip gaji aktif, dan notifikasi push.</div></div></div>
      </div>
    </div>
  );
}
