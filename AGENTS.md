# AGENTS.md

## Source of Truth: HR Presensi

Nama modul:
HR Presensi - Time & Attendance Management System

Posisi modul:
HR Presensi adalah modul di dalam webapp utama HR, bukan aplikasi terpisah.
Modul ini menjadi pusat administrasi kehadiran end-to-end dan terhubung ke payroll melalui data final dan snapshot, bukan data live.

## Role
- Karyawan
- Atasan
- HR

## Struktur Menu Utama HR Presensi
- Dashboard
- Absensi Harian
- Dinas Luar
- Cuti, Izin & Sakit
- Persetujuan
- Laporan
- Pengaturan

## Struktur Navigasi
- Sidebar kiri hanya untuk modul besar webapp utama
- Saat klik HR Presensi, user langsung masuk ke Dashboard Presensi
- Navigasi internal HR Presensi memakai tab horizontal tipis
- Fitur detail memakai subtab horizontal kecil
- Tidak menggunakan sidebar kiri kedua

## Dashboard
### Dashboard HR
- status hari ini
- perlu tindakan
- ringkasan periode
- akses cepat

### Dashboard Atasan
- kondisi tim hari ini
- perlu persetujuan
- tim perlu perhatian

### Dashboard Karyawan
- status hari ini
- aksi utama
- info kerja hari ini
- pengajuan saya

## Absensi Kantor
- metode utama: pengenalan wajah
- validasi tambahan: lokasi kantor
- radius kantor default: 100 meter
- jam resmi: jam server
- check in tidak auto
- check out: reminder + toleransi + auto check out + koreksi
- device hanya alat monitoring tambahan, bukan pagar utama

## Dinas Luar
- mode: terencana dan mendadak
- jika mendadak, alasan singkat wajib
- bukti wajib:
  - GPS
  - latitude/longitude
  - accuracy
  - timestamp server
  - selfie
  - foto bukti
  - catatan singkat
- tujuan bisa terdaftar atau baru
- tujuan baru masuk histori dulu dan diberi review ringan

## Cuti, Izin, Sakit
- cuti reguler mengurangi saldo
- cuti setengah hari memotong 0,5 hari
- cuti setengah hari tidak dianggap telat/pulang cepat
- cuti khusus tidak mengurangi saldo reguler
- izin tidak memakai saldo
- sakit memakai bukti digital dan dokumen fisik ke HR
- atasan approve operasional, HR final dokumen sakit

## Persetujuan dan Kontrol
- semua approval masuk ke 1 Inbox Persetujuan
- aksi: setujui, tolak, minta klarifikasi
- alasan penolakan wajib
- submit tepat waktu melindungi karyawan dari alpha final
- jika atasan tidak proses sampai H+5, eskalasi ke HR
- audit trail wajib
- flag 3 level: Aman, Mencurigakan, Risiko Tinggi

## Laporan dan Finalisasi
- format laporan: header + status strip + filter bar + tabel + panel detail kanan
- laporan:
  - Kehadiran
  - Ketidakhadiran
  - Dinas Luar
  - Keterlambatan
  - Lembur
  - Finalisasi ke Payroll
- payroll membaca snapshot final per periode
- finalisasi hanya oleh HR
- reopen wajib alasan
- snapshot payroll harus versioned

## Pengaturan dan Master Data
- Lokasi Kantor
- Shift dan Jadwal
- Metode Absensi
- Kebijakan Cuti
- Jenis Pengajuan
- Periode Payroll

## Aturan Inti
- 1 hari = 1 status utama
- Status utama:
  - Hadir
  - Dinas Luar
  - Cuti
  - Cuti Khusus
  - Izin
  - Sakit
  - Alpha
  - Libur
- Atribut tambahan:
  - Telat
  - Belum Pulang
  - Lembur
  - Pending
  - Auto Check Out
  - Mencurigakan
- Semua master penting wajib pakai tanggal efektif
- Perubahan sensitif wajib punya riwayat perubahan
- Manual HR boleh, tapi wajib alasan, bukti, dan audit trail

## Arah Visual
- dewasa
- elegan
- SAP-like
- minim card besar
- fokus ke tabel, list, status strip, dan panel detail

## Guard Rails Engineering
- Gunakan data live Supabase untuk master data yang sudah masuk fase implementasi
- Gunakan nonaktifkan atau arsip, jangan hard delete
- Jangan melebar ke transaksi penuh di luar scope fase aktif
- Semua UI user-facing full Bahasa Indonesia
- Payroll harus membaca snapshot final, bukan data live
