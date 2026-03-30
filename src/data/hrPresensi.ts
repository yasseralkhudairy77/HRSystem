import { CalendarClock, ClipboardCheck, FileBarChart2, LayoutDashboard, Plane, Settings2 } from "lucide-react";

import type { HrPresensiMasterSection, HrPresensiRoleOption, HrPresensiStatusStripItem, HrPresensiTabItem } from "@/types/hrPresensiModule";

export const hrPresensiInternalTabs: HrPresensiTabItem[] = [
  { key: "hr-presensi-dashboard", label: "Dashboard", route: "/hr-presensi/dashboard", description: "Ringkasan kesiapan operasional, kepatuhan absensi, dan kesehatan konfigurasi.", roles: ["karyawan", "atasan", "hr"] },
  { key: "hr-presensi-absensi-harian", label: "Absensi Harian", route: "/hr-presensi/absensi-harian", description: "Layar kerja harian untuk memantau kehadiran dan exception yang perlu ditindak.", roles: ["karyawan", "atasan", "hr"] },
  { key: "hr-presensi-dinas-luar", label: "Dinas Luar", route: "/hr-presensi/dinas-luar", description: "Shell pengajuan dan monitoring aktivitas kerja di luar lokasi kantor.", roles: ["karyawan", "atasan", "hr"] },
  { key: "hr-presensi-cuti-izin-sakit", label: "Cuti, Izin & Sakit", route: "/hr-presensi/cuti-izin-sakit", description: "Shell administrasi pengajuan absensi non-hadir dengan policy global perusahaan.", roles: ["karyawan", "atasan", "hr"] },
  { key: "hr-presensi-persetujuan", label: "Persetujuan", route: "/hr-presensi/persetujuan", description: "Antrian approval berbasis role untuk atasan dan HR.", roles: ["atasan", "hr"] },
  { key: "hr-presensi-laporan", label: "Laporan", route: "/hr-presensi/laporan", description: "Ringkasan operasional dan kesiapan data sebelum masuk proses lanjutan.", roles: ["atasan", "hr"] },
  { key: "hr-presensi-pengaturan", label: "Pengaturan", route: "/hr-presensi/pengaturan", description: "Pondasi master data, metode absensi, policy cuti, dan payroll period.", roles: ["hr"] },
];

export const hrPresensiInternalRouteItems = hrPresensiInternalTabs.map((tab, index) => ({
  key: tab.key,
  route: tab.route,
  label: tab.label,
  icon: [LayoutDashboard, CalendarClock, Plane, ClipboardCheck, ClipboardCheck, FileBarChart2, Settings2][index],
}));

export const hrPresensiRoleOptions: HrPresensiRoleOption[] = [
  { key: "hr", label: "HR", note: "Akses penuh ke pengaturan dan laporan." },
  { key: "atasan", label: "Atasan", note: "Fokus approval, monitoring tim, dan laporan." },
  { key: "karyawan", label: "Karyawan", note: "Fokus ke absensi pribadi, dinas luar, dan pengajuan." },
];

export const hrPresensiStatusStrip: Record<string, HrPresensiStatusStripItem[]> = {
  "hr-presensi-dashboard": [
    { key: "period", label: "Periode aktif", value: "Payroll Apr 2026", note: "Periode aktif dipakai untuk kesiapan data lintas tab.", tone: "info" },
    { key: "attendance", label: "Metode utama", value: "Face Recognition", note: "Metode utama kantor dipersiapkan, implementasi penuh di fase berikutnya.", tone: "success" },
    { key: "master", label: "Master data siap", value: "7 domain inti", note: "Lokasi, shift, grup jadwal, metode, policy, jenis pengajuan, payroll period.", tone: "neutral" },
    { key: "audit", label: "Jejak perubahan", value: "Aktif", note: "Perubahan sensitif dipersiapkan masuk ke log perubahan setting.", tone: "warning" },
  ],
  "hr-presensi-pengaturan": [
    { key: "effective", label: "Effective dating", value: "Siap", note: "Semua master inti mendukung tanggal mulai berlaku.", tone: "success" },
    { key: "policy", label: "Policy cuti", value: "Global perusahaan", note: "Pondasi policy bersifat lintas unit dan fleksibel untuk payroll.", tone: "info" },
    { key: "role", label: "Role guard", value: "Dasar", note: "HR, Atasan, dan Karyawan dibatasi sesuai tab yang relevan.", tone: "neutral" },
    { key: "log", label: "Log setting", value: "Siap dilacak", note: "Perubahan penting dicatat untuk audit dan review.", tone: "warning" },
  ],
};

export const hrPresensiDashboardSummary = [
  { id: "sum-1", label: "Lokasi aktif", value: "4", note: "Sudah dipetakan ke lokasi kerja dan area presensi utama." },
  { id: "sum-2", label: "Shift aktif", value: "6", note: "Mencakup operasional kantor, outlet, dan pola lintas hari." },
  { id: "sum-3", label: "Metode absensi", value: "4", note: "Face recognition disiapkan sebagai arah utama fase berikutnya." },
  { id: "sum-4", label: "Jenis pengajuan", value: "7", note: "Mencakup cuti, izin, sakit, dinas luar, dan koreksi awal." },
];

export const hrPresensiRoleDashboards = {
  hr: {
    title: "Dashboard HR",
    description: "Pusat kendali administrasi kehadiran end-to-end, kesiapan finalisasi, dan kebersihan master data.",
    metrics: [
      { id: "hr-1", label: "Status hari ini", value: "312 record", note: "Rekap status utama hari ini sudah mulai terbentuk." },
      { id: "hr-2", label: "Perlu tindakan", value: "18 item", note: "Koreksi, approval pending, dan kasus perlu review." },
      { id: "hr-3", label: "Ringkasan periode", value: "Payroll Apr 2026", note: "Periode aktif akan memakai snapshot final, bukan data live." },
      { id: "hr-4", label: "Akses cepat", value: "Pengaturan", note: "Master data dan policy inti menjadi fokus fase 1." },
    ],
  },
  atasan: {
    title: "Dashboard Atasan",
    description: "Fokus ke kondisi tim hari ini, item yang butuh persetujuan, dan anggota tim yang perlu perhatian.",
    metrics: [
      { id: "spv-1", label: "Kondisi tim hari ini", value: "24 anggota", note: "Ringkasan hadir, dinas luar, cuti, dan pending." },
      { id: "spv-2", label: "Perlu persetujuan", value: "7 item", note: "Masuk ke inbox persetujuan tunggal." },
      { id: "spv-3", label: "Tim perlu perhatian", value: "3 orang", note: "Flag Mencurigakan atau Risiko Tinggi." },
      { id: "spv-4", label: "Akses cepat", value: "Inbox Persetujuan", note: "Penolakan wajib alasan dan eskalasi H+5 ke HR." },
    ],
  },
  karyawan: {
    title: "Dashboard Karyawan",
    description: "Ringkasan status hari ini, aksi utama, info kerja hari ini, dan pengajuan pribadi.",
    metrics: [
      { id: "emp-1", label: "Status hari ini", value: "Belum Check In", note: "Check in tidak otomatis dan memakai jam server." },
      { id: "emp-2", label: "Aksi utama", value: "Presensi Masuk", note: "Metode utama kantor: pengenalan wajah + validasi lokasi." },
      { id: "emp-3", label: "Info kerja hari ini", value: "Office Regular", note: "Jam resmi, lokasi kerja, dan shift tampil ringkas." },
      { id: "emp-4", label: "Pengajuan saya", value: "2 pending", note: "Submit tepat waktu melindungi dari alpha final." },
    ],
  },
};

export const hrPresensiOperationalList = [
  { id: "ops-001", area: "Absensi Harian", title: "Shell harian siap dipakai tim internal", status: "Siap fase 1", owner: "Tim HRIS", note: "Fase 1 menyiapkan kerangka filter, list, dan panel detail tanpa mesin anomali penuh." },
  { id: "ops-002", area: "Dinas Luar", title: "Alur pengajuan awal siap dipetakan", status: "Butuh transaksi fase 2", owner: "HR Operasional", note: "Pondasi role, kategori pengajuan, dan audit trail sudah bisa dilanjutkan." },
  { id: "ops-003", area: "Persetujuan", title: "Guard peran disiapkan di level modul", status: "Siap fase 1", owner: "Atasan + HR", note: "Integrasi ke approval matrix detail bisa diperdalam di fase berikutnya." },
  { id: "ops-004", area: "Pengaturan", title: "Master data presensi siap diadministrasikan", status: "Prioritas tinggi", owner: "HR Admin", note: "Perubahan sensitif diarahkan ke setting change logs untuk audit." },
];

export const hrPresensiRightPanelHighlights = [
  "Navigasi utama modul dibuat tipis dan horizontal agar pekerjaan harian tetap fokus ke data.",
  "Dashboard dan Pengaturan diperdalam di fase 1, sedangkan tab transaksi lain disiapkan sebagai shell aman.",
  "Setiap master data inti mendukung tanggal efektif untuk menghindari perubahan mendadak tanpa histori.",
];

export const hrPresensiCoreAttendanceRules = [
  "1 hari hanya memiliki 1 status utama.",
  "Status utama: Hadir, Dinas Luar, Cuti, Cuti Khusus, Izin, Sakit, Alpha, Libur.",
  "Atribut tambahan: Telat, Belum Pulang, Lembur, Pending, Auto Check Out, Mencurigakan.",
  "Manual HR diperbolehkan, tetapi wajib alasan, bukti, dan audit trail.",
];

export const hrPresensiMasterSections: HrPresensiMasterSection[] = [
  {
    key: "locations",
    label: "Lokasi Kantor",
    description: "Titik lokasi, area kerja, dan aturan dasar presensi per tempat kerja.",
    tableName: "hr_attendance_locations",
    supportsEffectiveDate: true,
    records: [
      {
        id: "loc-01",
        title: "Kantor Pusat Jakarta",
        subtitle: "Radius 120 meter • WFO utama",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Operasional",
        summary: "Lokasi default untuk tim HR, finance, dan support pusat.",
        fields: [
          { label: "Kode lokasi", value: "JKT-HQ" },
          { label: "Alamat", value: "Jl. Kuningan Barat No. 18, Jakarta Selatan" },
          { label: "Mode presensi", value: "Face recognition + fallback manual" },
          { label: "Zona waktu", value: "Asia/Jakarta" },
        ],
      },
      {
        id: "loc-02",
        title: "Outlet Bandung 01",
        subtitle: "Radius 80 meter • Operasional outlet",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Area",
        summary: "Lokasi operasional dengan pola shift outlet dan kebutuhan dinas luar terbatas.",
        fields: [
          { label: "Kode lokasi", value: "BDG-OT1" },
          { label: "Alamat", value: "Jl. Riau No. 41, Bandung" },
          { label: "Mode presensi", value: "Mobile + selfie + GPS" },
          { label: "Zona waktu", value: "Asia/Jakarta" },
        ],
      },
    ],
  },
  {
    key: "shifts",
    label: "Shift & Jadwal",
    description: "Jam kerja dasar, pola jadwal, dan grouping penempatan shift karyawan.",
    tableName: "hr_attendance_shifts + hr_attendance_schedule_groups",
    supportsEffectiveDate: true,
    records: [
      {
        id: "shift-01",
        title: "Office Regular",
        subtitle: "08:30 - 17:30",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Admin",
        summary: "Shift kantor umum dengan break siang standar.",
        fields: [
          { label: "Check-in", value: "08:30" },
          { label: "Check-out", value: "17:30" },
          { label: "Break", value: "12:00 - 13:00" },
          { label: "Grace period", value: "10 menit" },
        ],
      },
      {
        id: "shift-02",
        title: "Outlet Pagi",
        subtitle: "07:00 - 15:00",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Area",
        summary: "Shift outlet pagi dengan fokus kesiapan operasional awal hari.",
        fields: [
          { label: "Check-in", value: "07:00" },
          { label: "Check-out", value: "15:00" },
          { label: "Break", value: "11:30 - 12:00" },
          { label: "Grace period", value: "5 menit" },
        ],
      },
    ],
  },
  {
    key: "schedule_groups",
    label: "Shift & Jadwal",
    description: "Template grup jadwal untuk assignment rotasi dan pola kerja per tim.",
    tableName: "hr_attendance_schedule_groups",
    supportsEffectiveDate: true,
    records: [
      {
        id: "sched-01",
        title: "Back Office Reguler",
        subtitle: "Mon - Fri • Office Regular",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Admin",
        summary: "Template dasar untuk unit support dan administrasi.",
        fields: [
          { label: "Pola", value: "Senin - Jumat" },
          { label: "Shift default", value: "Office Regular" },
          { label: "Lokasi utama", value: "Kantor Pusat Jakarta" },
          { label: "Catatan", value: "Sabtu/Minggu off kecuali ada override" },
        ],
      },
    ],
  },
  {
    key: "attendance_methods",
    label: "Metode Absensi",
    description: "Daftar metode presensi yang boleh dipakai per lokasi dan policy.",
    tableName: "hr_attendance_methods",
    supportsEffectiveDate: true,
    records: [
      {
        id: "method-01",
        title: "Face Recognition",
        subtitle: "Arah utama kantor",
        status: "Pilot",
        effective_start_date: "2026-04-01",
        owner: "HRIS",
        summary: "Disiapkan sebagai metode utama kantor, belum diaktifkan penuh di fase ini.",
        fields: [
          { label: "Kategori", value: "Biometrik" },
          { label: "Butuh perangkat", value: "Ya" },
          { label: "Fallback", value: "Manual approval" },
          { label: "Status implementasi", value: "Pilot / persiapan" },
        ],
      },
      {
        id: "method-02",
        title: "Mobile GPS + Selfie",
        subtitle: "Untuk mobile dan outlet",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Operasional",
        summary: "Metode fleksibel untuk outlet dan aktivitas lapangan.",
        fields: [
          { label: "Kategori", value: "Mobile" },
          { label: "Butuh perangkat", value: "Aplikasi mobile" },
          { label: "Fallback", value: "Review atasan" },
          { label: "Status implementasi", value: "Siap" },
        ],
      },
    ],
  },
  {
    key: "leave_balance_policies",
    label: "Kebijakan Cuti",
    description: "Policy global perusahaan untuk akrual, reset, dan perhitungan saldo cuti.",
    tableName: "hr_leave_balance_policies",
    supportsEffectiveDate: true,
    records: [
      {
        id: "leave-01",
        title: "Cuti Tahunan Global",
        subtitle: "12 hari per tahun",
        status: "Aktif",
        effective_start_date: "2026-01-01",
        owner: "HR Policy",
        summary: "Policy cuti tahunan global perusahaan dengan reset tahunan.",
        fields: [
          { label: "Kuota tahunan", value: "12 hari" },
          { label: "Carry forward", value: "Maksimal 3 hari" },
          { label: "Reset", value: "1 Januari" },
          { label: "Prorata", value: "Ya, untuk join mid-year" },
        ],
      },
    ],
  },
  {
    key: "special_leave_types",
    label: "Kebijakan Cuti",
    description: "Jenis cuti non-reguler yang tetap membutuhkan policy dan approval jelas.",
    tableName: "hr_special_leave_types",
    supportsEffectiveDate: true,
    records: [
      {
        id: "sp-leave-01",
        title: "Cuti Menikah",
        subtitle: "3 hari",
        status: "Aktif",
        effective_start_date: "2026-01-01",
        owner: "HR Policy",
        summary: "Cuti khusus dengan dokumen pendukung wajib.",
        fields: [
          { label: "Durasi default", value: "3 hari" },
          { label: "Butuh lampiran", value: "Ya" },
          { label: "Memotong saldo tahunan", value: "Tidak" },
          { label: "Approval", value: "Atasan + HR" },
        ],
      },
    ],
  },
  {
    key: "permission_types",
    label: "Jenis Pengajuan",
    description: "Jenis izin, sakit, koreksi, dan dinas luar yang dipakai lintas proses.",
    tableName: "hr_permission_types",
    supportsEffectiveDate: true,
    records: [
      {
        id: "perm-01",
        title: "Dinas Luar",
        subtitle: "Perlu tujuan dan waktu kerja",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Operasional",
        summary: "Kategori pengajuan untuk aktivitas kerja di luar lokasi utama.",
        fields: [
          { label: "Kategori", value: "Kehadiran khusus" },
          { label: "Lampiran wajib", value: "Opsional" },
          { label: "Approval", value: "Atasan" },
          { label: "Payroll impact", value: "Ya, tergantung hasil approval" },
        ],
      },
      {
        id: "perm-02",
        title: "Koreksi Absensi",
        subtitle: "Untuk miss scan / data tidak sinkron",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Admin",
        summary: "Kategori koreksi awal untuk penanganan data presensi yang belum lengkap.",
        fields: [
          { label: "Kategori", value: "Koreksi" },
          { label: "Lampiran wajib", value: "Ya" },
          { label: "Approval", value: "Atasan + HR" },
          { label: "Payroll impact", value: "Ya" },
        ],
      },
    ],
  },
  {
    key: "payroll_period_policies",
    label: "Periode Payroll",
    description: "Jembatan dasar antara kebijakan presensi dan periode payroll yang aktif.",
    tableName: "hr_payroll_period_policies",
    supportsEffectiveDate: true,
    records: [
      {
        id: "pay-01",
        title: "Payroll Bulanan Standard",
        subtitle: "Cutoff 25 - 24",
        status: "Aktif",
        effective_start_date: "2026-04-01",
        owner: "HR Payroll",
        summary: "Policy periode payroll default untuk sinkronisasi presensi ke penggajian.",
        fields: [
          { label: "Cutoff mulai", value: "Tanggal 25" },
          { label: "Cutoff selesai", value: "Tanggal 24" },
          { label: "Lock rule", value: "H-2 payroll" },
          { label: "Lembur masuk periode", value: "Ya, jika approved" },
        ],
      },
    ],
  },
  {
    key: "setting_change_logs",
    label: "Riwayat Perubahan",
    description: "Jejak perubahan sensitif untuk policy, master, dan struktur presensi.",
    tableName: "hr_setting_change_logs",
    supportsEffectiveDate: false,
    records: [
      {
        id: "log-01",
        title: "Policy cuti tahunan diperbarui",
        subtitle: "Efektif 1 Jan 2026",
        status: "Tercatat",
        effective_start_date: "2026-01-01",
        owner: "Nadia HR Policy",
        summary: "Carry forward diturunkan dari 5 hari menjadi 3 hari untuk menjaga konsistensi payroll.",
        fields: [
          { label: "Domain", value: "leave_balance_policies" },
          { label: "Aksi", value: "update" },
          { label: "Pelaku", value: "Nadia HR Policy" },
          { label: "Waktu catat", value: "2025-12-18 10:14 WIB" },
        ],
      },
      {
        id: "log-02",
        title: "Metode Face Recognition dibuat pilot",
        subtitle: "Tahap persiapan fase 1",
        status: "Tercatat",
        effective_start_date: "2026-04-01",
        owner: "Raka HRIS",
        summary: "Metode disiapkan sebagai default jangka menengah namun belum menjadi transaksi penuh.",
        fields: [
          { label: "Domain", value: "attendance_methods" },
          { label: "Aksi", value: "create" },
          { label: "Pelaku", value: "Raka HRIS" },
          { label: "Waktu catat", value: "2026-03-29 15:30 WIB" },
        ],
      },
    ],
  },
];

export const hrPresensiPlaceholderRows = {
  "hr-presensi-absensi-harian": [
    { id: "att-01", primary: "Nadia Putri", secondary: "Face recognition • Kantor Pusat Jakarta", status: "Hadir", meta: "Radius default 100 m • Jam server • Check in manual" },
    { id: "att-02", primary: "Bima Saputra", secondary: "Face recognition + lokasi", status: "Mencurigakan", meta: "Selfie valid, lokasi akurat, perlu review tambahan" },
    { id: "att-03", primary: "Rani Permata", secondary: "Auto check out tolerance", status: "Belum Pulang", meta: "Reminder aktif • Koreksi dapat diajukan" },
  ],
  "hr-presensi-dinas-luar": [
    { id: "trip-01", primary: "Kunjungan vendor Bandung", secondary: "Mode terencana", status: "Menunggu approval", meta: "GPS, lat/long, accuracy, selfie, foto bukti, catatan singkat" },
    { id: "trip-02", primary: "Survey lokasi baru", secondary: "Mode mendadak", status: "Butuh alasan singkat", meta: "Tujuan baru masuk histori dan perlu review ringan" },
  ],
  "hr-presensi-cuti-izin-sakit": [
    { id: "leave-req-01", primary: "Cuti tahunan 2 hari", secondary: "Mengurangi saldo reguler", status: "Siap fase 1", meta: "Cuti setengah hari memotong 0,5 hari dan tidak dihitung telat/pulang cepat" },
    { id: "leave-req-02", primary: "Sakit 1 hari", secondary: "Atasan approve operasional", status: "Butuh dokumen HR", meta: "Bukti digital masuk sistem, dokumen fisik tetap ke HR" },
  ],
  "hr-presensi-persetujuan": [
    { id: "apr-01", primary: "Inbox Persetujuan Tunggal", secondary: "Setujui • Tolak • Minta Klarifikasi", status: "Aman", meta: "Alasan penolakan wajib dan audit trail wajib" },
    { id: "apr-02", primary: "Approval belum diproses H+5", secondary: "Eskalasi ke HR", status: "Risiko Tinggi", meta: "Submit tepat waktu melindungi karyawan dari alpha final" },
  ],
  "hr-presensi-laporan": [
    { id: "rep-01", primary: "Finalisasi ke Payroll", secondary: "Snapshot final per periode", status: "HR only", meta: "Payroll membaca snapshot versioned, bukan data live" },
    { id: "rep-02", primary: "Reopen finalisasi", secondary: "Wajib alasan", status: "Kontrol ketat", meta: "Panel detail kanan akan dipakai untuk audit dan histori versi" },
  ],
};
