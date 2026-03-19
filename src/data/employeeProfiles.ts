import type { EmployeeProfile, EmployeeRole, EmployeeTabKey } from "@/types/employeeProfile";

export const employeeDetailTabs: Array<{ key: EmployeeTabKey; label: string }> = [
  { key: "personal", label: "Personal" },
  { key: "identity", label: "Identitas" },
  { key: "contact", label: "Kontak & Alamat" },
  { key: "family", label: "Keluarga" },
  { key: "education", label: "Pendidikan" },
  { key: "job", label: "Pekerjaan" },
  { key: "documents", label: "Dokumen" },
  { key: "history", label: "Riwayat Perubahan" },
];

export const rolePreviewOptions: Array<{ key: EmployeeRole; label: string; subtitle: string }> = [
  { key: "hr", label: "HRD / Superadmin", subtitle: "Akses penuh untuk verifikasi dan pengelolaan data master." },
  { key: "employee", label: "Karyawan", subtitle: "Employee self-service untuk melihat data pribadi dan ajukan perubahan." },
];

export const roleAccessBlueprint: Record<
  EmployeeRole,
  {
    title: string;
    description: string;
    capabilities: string[];
    editableNow: string[];
    verificationRequired: string[];
    restricted: string[];
  }
> = {
  hr: {
    title: "Hak Akses HRD / Superadmin",
    description: "Mode ini menampilkan seluruh data master karyawan dan kontrol verifikasi perubahan lintas modul.",
    capabilities: [
      "Melihat seluruh data administrasi, pekerjaan, dan dokumen karyawan.",
      "Mengubah field master seperti ID karyawan, jabatan, departemen, status kerja, dan cabang.",
      "Memverifikasi perubahan yang diajukan karyawan sebelum dipakai payroll atau administrasi.",
    ],
    editableNow: ["ID karyawan", "Jabatan", "Departemen", "Tanggal masuk", "Status kerja", "Tipe kontrak", "Cabang", "Atasan"],
    verificationRequired: ["No KTP", "No KK", "NPWP", "BPJS", "Status pernikahan"],
    restricted: ["Tidak ada batasan pada mode HR."],
  },
  employee: {
    title: "Hak Akses Employee Self-Service",
    description: "Mode ini fokus pada transparansi data pribadi, pembaruan data tertentu, dan alur verifikasi ke HR.",
    capabilities: [
      "Melihat data pribadi, pekerjaan, dan status kelengkapan data milik sendiri.",
      "Mengubah field tertentu tanpa perlu bantuan HR untuk koreksi ringan.",
      "Mengunggah dokumen dan mengajukan perubahan data yang perlu diverifikasi.",
    ],
    editableNow: ["Alamat domisili", "Nomor HP", "Email pribadi", "Kontak darurat", "Pendidikan", "Data keluarga", "Dokumen pribadi"],
    verificationRequired: ["No KTP", "No KK", "NPWP", "BPJS", "Status pernikahan"],
    restricted: ["ID karyawan", "Jabatan", "Departemen", "Tanggal masuk", "Status kerja", "Cabang", "Atasan", "Data payroll"],
  },
};

export const employeeProfileRecords: EmployeeProfile[] = [
  {
    id: "emp-preview-001",
    initials: "AR",
    namaLengkap: "Aulia Rahma",
    employeeId: "EMP-24017",
    jabatan: "Senior Admin Finance",
    departemen: "Finance & Accounting",
    statusKerja: "Tetap",
    tanggalMasuk: "14 Jan 2021",
    cabang: "Head Office Jakarta",
    statusKaryawan: "Aktif",
    namaUsaha: "PT Nusa Daya Karya",
    atasan: "Wulan Sari",
    tipeKontrak: "PKWTT",
    quickActions: [
      { id: "documents", label: "Lihat Dokumen" },
      { id: "history", label: "Riwayat Perubahan" },
      { id: "print", label: "Cetak Data" },
    ],
    personalFields: [
      { id: "full-name", label: "Nama Lengkap", value: "Aulia Rahma", access: "hr-only", helperText: "Nama legal sesuai dokumen identitas." },
      { id: "nickname", label: "Nama Panggilan", value: "Aulia", access: "employee-edit", helperText: "Dipakai untuk kebutuhan komunikasi internal." },
      { id: "gender", label: "Jenis Kelamin", value: "Perempuan", access: "hr-only" },
      { id: "religion", label: "Agama", value: "Islam", access: "needs-verification", helperText: "Perubahan dicatat untuk kebutuhan administrasi dan cuti." },
      { id: "birth-place", label: "Tempat Lahir", value: "Bandung", access: "hr-only" },
      { id: "marital", label: "Status Pernikahan", value: "Menikah", access: "needs-verification", helperText: "Perlu verifikasi HR sebelum dipakai modul benefit." },
      { id: "birth-date", label: "Tanggal Lahir", value: "27 Apr 1996", access: "hr-only" },
      { id: "citizenship", label: "Kewarganegaraan", value: "Indonesia", access: "hr-only" },
      { id: "blood", label: "Golongan Darah", value: "O", access: "employee-edit", helperText: "Bisa diperbarui untuk kebutuhan data darurat." },
    ],
    identityFields: [
      { id: "ktp", label: "No KTP", value: "3174 2204 9600 0012", access: "needs-verification" },
      { id: "kk", label: "No KK", value: "3174 2204 1200 9988", access: "needs-verification" },
      { id: "npwp", label: "NPWP", value: "91.234.567.8-428.000", access: "needs-verification" },
      { id: "bpjs-health", label: "BPJS Kesehatan", value: "0001892734561", access: "needs-verification" },
      { id: "bpjs-work", label: "BPJS Ketenagakerjaan", value: "BPU-88927161", access: "needs-verification" },
      { id: "passport", label: "Passport", value: "-", access: "hr-only", helperText: "Kosong karena belum dibutuhkan untuk perjalanan dinas." },
    ],
    contactFields: [
      { id: "phone", label: "No HP", value: "0812-3344-5566", access: "employee-edit" },
      { id: "personal-email", label: "Email pribadi", value: "aulia.rahma@gmail.com", access: "employee-edit" },
      { id: "office-email", label: "Email kantor", value: "aulia.rahma@nusadayakarya.id", access: "hr-only" },
      { id: "ktp-address", label: "Alamat KTP", value: "Jl. Kopo Indah II No. 19, Bandung", access: "needs-verification" },
      { id: "domicile", label: "Alamat domisili", value: "Jl. Caman Raya No. 12, Bekasi", access: "employee-edit" },
      { id: "city", label: "Kota", value: "Bekasi", access: "employee-edit" },
      { id: "province", label: "Provinsi", value: "Jawa Barat", access: "employee-edit" },
      { id: "postal", label: "Kode pos", value: "17145", access: "employee-edit" },
      { id: "emergency", label: "Kontak darurat", value: "Rizal Pratama / 0817-7000-1221", access: "employee-edit" },
    ],
    jobFields: [
      { id: "nik", label: "NIK", value: "NDK-HO-24017", access: "hr-only" },
      { id: "join-date", label: "Tanggal masuk", value: "14 Jan 2021", access: "hr-only" },
      { id: "employment", label: "Status kerja", value: "Tetap", access: "hr-only" },
      { id: "department", label: "Departemen", value: "Finance & Accounting", access: "hr-only" },
      { id: "position", label: "Jabatan", value: "Senior Admin Finance", access: "hr-only" },
      { id: "job-level", label: "Job Level", value: "Senior Staff", access: "hr-only", helperText: "Dipakai untuk membantu urutan visual di struktur organisasi." },
      { id: "supervisor", label: "Atasan Langsung", value: "Wulan Sari", access: "hr-only", helperText: "Relasi utama untuk pembentukan struktur organisasi otomatis." },
      { id: "work-location", label: "Lokasi kerja", value: "Head Office Jakarta", access: "hr-only" },
      { id: "shift", label: "Shift", value: "Regular 08.30 - 17.30", access: "hr-only" },
      { id: "contract", label: "Tipe kontrak", value: "PKWTT", access: "hr-only" },
    ],
    familyMembers: [
      { id: "fam-001", nama: "Rizal Pratama", hubungan: "Suami", tanggalLahir: "02 Jun 1992", status: "Kontak darurat" },
      { id: "fam-002", nama: "Kayla Pradita", hubungan: "Anak", tanggalLahir: "11 Okt 2020", status: "Tanggungan" },
    ],
    educationRecords: [
      { id: "edu-001", jenjang: "S1", institusi: "Universitas Padjadjaran", jurusan: "Akuntansi", tahunLulus: "2018" },
      { id: "edu-002", jenjang: "SMA", institusi: "SMA Negeri 5 Bandung", jurusan: "IPS", tahunLulus: "2014" },
    ],
    documentRecords: [
      { id: "doc-001", dokumen: "KTP", nomor: "3174 2204 9600 0012", status: "Sudah lengkap", diperbarui: "12 Jan 2024" },
      { id: "doc-002", dokumen: "KK", nomor: "3174 2204 1200 9988", status: "Sudah lengkap", diperbarui: "12 Jan 2024" },
      { id: "doc-003", dokumen: "NPWP", nomor: "91.234.567.8-428.000", status: "Perlu dicek", diperbarui: "15 Feb 2024" },
      { id: "doc-004", dokumen: "BPJS Kesehatan", nomor: "0001892734561", status: "Sudah lengkap", diperbarui: "20 Mar 2024" },
    ],
    changeHistory: [
      { id: "chg-001", tanggal: "12-01-2024", field: "Status Karyawan", perubahan: "Probation -> Tetap", diperbaruiOleh: "HRD" },
      { id: "chg-002", tanggal: "15-02-2024", field: "Alamat Domisili", perubahan: "Jakarta -> Bekasi", diperbaruiOleh: "Karyawan" },
      { id: "chg-003", tanggal: "20-03-2024", field: "Jabatan", perubahan: "Staff -> Senior Staff", diperbaruiOleh: "HRD" },
      { id: "chg-004", tanggal: "03-04-2024", field: "NPWP", perubahan: "Belum ada -> 91.234.567.8-428.000", diperbaruiOleh: "Karyawan" },
    ],
    statusOverview: {
      dataLengkap: 85,
      dokumenTerunggah: 4,
      dataPerluDiperbarui: 1,
      menungguVerifikasiHr: 2,
      checklist: ["Alamat domisili sudah diperbarui", "NPWP menunggu verifikasi HR", "BPJS Ketenagakerjaan perlu sinkronisasi dengan payroll"],
    },
    orgMeta: {
      atasanEmployeeId: null,
      jobLevel: "Senior Staff",
      orgStatus: "active",
    },
  },
  {
    id: "emp-preview-002",
    initials: "RM",
    namaLengkap: "Rizky Maulana",
    employeeId: "EMP-25062",
    jabatan: "Staff Operasional Outlet",
    departemen: "Store Operations",
    statusKerja: "Probation",
    tanggalMasuk: "03 Nov 2025",
    cabang: "Cabang Bekasi Timur",
    statusKaryawan: "Aktif",
    namaUsaha: "PT Nusa Daya Karya",
    atasan: "Farhan Dwi",
    tipeKontrak: "PKWT 12 bulan",
    quickActions: [
      { id: "documents", label: "Lihat Dokumen" },
      { id: "history", label: "Riwayat Perubahan" },
      { id: "print", label: "Cetak Data" },
    ],
    personalFields: [
      { id: "full-name", label: "Nama Lengkap", value: "Rizky Maulana", access: "hr-only" },
      { id: "nickname", label: "Nama Panggilan", value: "Rizky", access: "employee-edit" },
      { id: "gender", label: "Jenis Kelamin", value: "Laki-laki", access: "hr-only" },
      { id: "religion", label: "Agama", value: "Islam", access: "needs-verification" },
      { id: "birth-place", label: "Tempat Lahir", value: "Bekasi", access: "hr-only" },
      { id: "marital", label: "Status Pernikahan", value: "Belum menikah", access: "needs-verification" },
      { id: "birth-date", label: "Tanggal Lahir", value: "10 Sep 2000", access: "hr-only" },
      { id: "citizenship", label: "Kewarganegaraan", value: "Indonesia", access: "hr-only" },
      { id: "blood", label: "Golongan Darah", value: "A", access: "employee-edit" },
    ],
    identityFields: [
      { id: "ktp", label: "No KTP", value: "3275 1009 0000 1162", access: "needs-verification" },
      { id: "kk", label: "No KK", value: "3275 1009 2200 7741", access: "needs-verification" },
      { id: "npwp", label: "NPWP", value: "-", access: "needs-verification", helperText: "Belum tersedia karena masih probation awal." },
      { id: "bpjs-health", label: "BPJS Kesehatan", value: "0006671298121", access: "needs-verification" },
      { id: "bpjs-work", label: "BPJS Ketenagakerjaan", value: "BPU-11827711", access: "needs-verification" },
      { id: "passport", label: "Passport", value: "-", access: "hr-only" },
    ],
    contactFields: [
      { id: "phone", label: "No HP", value: "0813-7788-9900", access: "employee-edit" },
      { id: "personal-email", label: "Email pribadi", value: "rizky.maulana@gmail.com", access: "employee-edit" },
      { id: "office-email", label: "Email kantor", value: "rizky.maulana@nusadayakarya.id", access: "hr-only" },
      { id: "ktp-address", label: "Alamat KTP", value: "Jl. Narogong Raya No. 41, Bekasi", access: "needs-verification" },
      { id: "domicile", label: "Alamat domisili", value: "Jl. Pulo Ribung Permai Blok D2, Bekasi", access: "employee-edit" },
      { id: "city", label: "Kota", value: "Bekasi", access: "employee-edit" },
      { id: "province", label: "Provinsi", value: "Jawa Barat", access: "employee-edit" },
      { id: "postal", label: "Kode pos", value: "17133", access: "employee-edit" },
      { id: "emergency", label: "Kontak darurat", value: "Siti Maesaroh / 0812-1188-9901", access: "employee-edit" },
    ],
    jobFields: [
      { id: "nik", label: "NIK", value: "NDK-BET-25062", access: "hr-only" },
      { id: "join-date", label: "Tanggal masuk", value: "03 Nov 2025", access: "hr-only" },
      { id: "employment", label: "Status kerja", value: "Probation", access: "hr-only" },
      { id: "department", label: "Departemen", value: "Store Operations", access: "hr-only" },
      { id: "position", label: "Jabatan", value: "Staff Operasional Outlet", access: "hr-only" },
      { id: "job-level", label: "Job Level", value: "Staff", access: "hr-only", helperText: "Dipakai untuk membantu urutan visual di struktur organisasi." },
      { id: "supervisor", label: "Atasan Langsung", value: "Farhan Dwi", access: "hr-only", helperText: "Relasi utama untuk pembentukan struktur organisasi otomatis." },
      { id: "work-location", label: "Lokasi kerja", value: "Cabang Bekasi Timur", access: "hr-only" },
      { id: "shift", label: "Shift", value: "Shift B 14.00 - 22.00", access: "hr-only" },
      { id: "contract", label: "Tipe kontrak", value: "PKWT 12 bulan", access: "hr-only" },
    ],
    familyMembers: [{ id: "fam-003", nama: "Siti Maesaroh", hubungan: "Ibu", tanggalLahir: "14 Nov 1976", status: "Kontak darurat" }],
    educationRecords: [{ id: "edu-003", jenjang: "SMK", institusi: "SMK Negeri 1 Bekasi", jurusan: "Akuntansi", tahunLulus: "2019" }],
    documentRecords: [
      { id: "doc-005", dokumen: "KTP", nomor: "3275 1009 0000 1162", status: "Sudah lengkap", diperbarui: "04 Nov 2025" },
      { id: "doc-006", dokumen: "KK", nomor: "3275 1009 2200 7741", status: "Sudah lengkap", diperbarui: "04 Nov 2025" },
      { id: "doc-007", dokumen: "NPWP", nomor: "-", status: "Belum lengkap", diperbarui: "04 Nov 2025" },
      { id: "doc-008", dokumen: "BPJS Kesehatan", nomor: "0006671298121", status: "Perlu dicek", diperbarui: "07 Nov 2025" },
    ],
    changeHistory: [
      { id: "chg-005", tanggal: "04-11-2025", field: "Alamat Domisili", perubahan: "Bekasi Barat -> Bekasi Timur", diperbaruiOleh: "Karyawan" },
      { id: "chg-006", tanggal: "08-11-2025", field: "Shift", perubahan: "Shift A -> Shift B", diperbaruiOleh: "HRD" },
      { id: "chg-007", tanggal: "12-11-2025", field: "Kontak Darurat", perubahan: "Belum ada -> Siti Maesaroh", diperbaruiOleh: "Karyawan" },
    ],
    statusOverview: {
      dataLengkap: 72,
      dokumenTerunggah: 3,
      dataPerluDiperbarui: 2,
      menungguVerifikasiHr: 3,
      checklist: ["NPWP belum tersedia", "BPJS Kesehatan menunggu sinkronisasi", "Surat kontrak probation masih review final"],
    },
    orgMeta: {
      atasanEmployeeId: null,
      jobLevel: "Staff",
      orgStatus: "active",
    },
  },
];
