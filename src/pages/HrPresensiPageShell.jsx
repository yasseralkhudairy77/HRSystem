import { useEffect, useMemo } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Settings2, ShieldCheck, Users } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import HrPresensiDailyAttendanceWorkspace from "@/components/hrPresensi/HrPresensiDailyAttendanceWorkspace";
import HrPresensiTimeOffWorkspace from "@/components/hrPresensi/HrPresensiTimeOffWorkspace";
import PageHeader from "@/components/common/PageHeader";
import HrPresensiSettingsWorkspace from "@/components/hrPresensi/HrPresensiSettingsWorkspace";
import HrPresensiStatusStrip from "@/components/hrPresensi/HrPresensiStatusStrip";
import HrPresensiTabBar from "@/components/hrPresensi/HrPresensiTabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { hrPresensiCoreAttendanceRules, hrPresensiInternalTabs, hrPresensiOperationalList, hrPresensiPlaceholderRows, hrPresensiRightPanelHighlights, hrPresensiRoleDashboards, hrPresensiRoleOptions, hrPresensiStatusStrip } from "@/data/hrPresensi";
import { useHrPresensiAccess } from "@/hooks/useHrPresensiAccess";
import { canAccessHrPresensiTab, getHrPresensiScopeLabel } from "@/services/hrPresensiAccessService";

const defaultStrip = [
  { key: "phase", label: "Fase", value: "Fase 1", note: "Fokus pada shell, role, dan master data dasar.", tone: "info" },
  { key: "scope", label: "Scope", value: "Pondasi aman", note: "Belum membangun transaksi check-in/check-out penuh.", tone: "neutral" },
  { key: "audit", label: "Guard data", value: "Sementara", note: "Scope data dijaga di layer query dan service sambil menunggu RLS backend.", tone: "warning" },
];

function navigateTo(menu) {
  window.dispatchEvent(new CustomEvent("app:navigate", { detail: { menu } }));
}

function formatRoleLabel(role) {
  return hrPresensiRoleOptions.find((item) => item.key === role)?.label || role;
}

function PlaceholderTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-soft)] bg-white shadow-sm">
      <table className="min-w-full text-[13px]">
        <thead className="bg-[var(--surface-0)] text-left">
          <tr>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Item</th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Konteks</th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Status</th>
            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[rgba(214,222,234,0.82)]">
              <td className="px-5 py-3.5 font-medium text-[var(--text-main)]">{row.primary}</td>
              <td className="px-5 py-3.5 text-[var(--text-muted)]">{row.secondary}</td>
              <td className="px-5 py-3.5">
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {row.status}
                </span>
              </td>
              <td className="px-5 py-3.5 text-[var(--text-muted)]">{row.meta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildDashboardMetrics(access, roleDashboard) {
  if (access.status !== "ready" || !access.role || !access.employee) {
    return roleDashboard.metrics;
  }

  if (access.role === "hr") {
    return [
      { ...roleDashboard.metrics[0], value: `${access.scope.totalActiveEmployees} karyawan`, note: "Scope data HR meliputi seluruh karyawan aktif yang berhasil dikenali resolver." },
      { ...roleDashboard.metrics[1], value: "Pengaturan live", note: "Master data dan policy dapat diakses penuh oleh HR melalui query guard sementara." },
      { ...roleDashboard.metrics[2], value: access.employee.cabang || "Semua cabang", note: "Dashboard HR tetap menjadi pusat monitoring lintas unit." },
      { ...roleDashboard.metrics[3], value: access.employee.nama_lengkap, note: "Profil login sudah terhubung ke data employee nyata." },
    ];
  }

  if (access.role === "atasan") {
    return [
      { ...roleDashboard.metrics[0], value: `${access.scope.allowedEmployeeIds.length} anggota`, note: "Atasan hanya melihat scope tim langsung dari relasi atasan-bawahan." },
      { ...roleDashboard.metrics[1], value: "Mode atasan aktif", note: "Tab yang muncul dibatasi ke kebutuhan monitoring tim dan approval." },
      { ...roleDashboard.metrics[2], value: access.employee.departemen || "-", note: "Scope tim mengikuti data organisasi yang sudah ada di master karyawan." },
      { ...roleDashboard.metrics[3], value: access.employee.nama_lengkap, note: "Profil ini dikenali sebagai atasan karena memiliki bawahan aktif." },
    ];
  }

  return [
    { ...roleDashboard.metrics[0], value: "Data pribadi", note: "Karyawan hanya melihat profil dan konteks presensinya sendiri." },
    { ...roleDashboard.metrics[1], value: access.employee.shift || "Belum ada shift", note: "Info kerja diambil dari data employee yang terhubung ke session." },
    { ...roleDashboard.metrics[2], value: access.employee.lokasi_kerja || access.employee.cabang || "-", note: "Lokasi kerja tampil sebagai konteks utama untuk langkah berikutnya." },
    { ...roleDashboard.metrics[3], value: access.employee.nama_lengkap, note: "Dashboard ini otomatis mengikuti role nyata hasil resolver." },
  ];
}

function renderAccessFallback(access) {
  const title = access.status === "signed_out" ? "Sesi login belum tersedia" : "Akun belum terhubung ke profil karyawan";
  const description =
    access.issueMessage ||
    "HR Presensi membutuhkan session yang valid dan mapping ke data employee agar role serta scope data bisa dihitung dengan benar.";

  return (
    <div className="space-y-4">
      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-50 p-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
              <div className="text-sm leading-6 text-[var(--text-muted)]">{description}</div>
              <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                {access.sessionEmail ? `Email sesi terdeteksi: ${access.sessionEmail}. ` : ""}
                Kasus ini dicatat di log review lokal agar mudah dilacak saat sinkronisasi akun dan profil karyawan diperbaiki.
              </div>
              <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                Fallback ini sengaja tidak memakai preview role. Modul tetap tertahan sampai session user benar-benar terhubung ke data employee yang valid.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HrPresensiPageShell({ pageKey }) {
  const access = useHrPresensiAccess();

  const activeTab = hrPresensiInternalTabs.find((tab) => tab.key === pageKey) || hrPresensiInternalTabs[0];
  const accessibleTabs = useMemo(() => hrPresensiInternalTabs.filter((tab) => canAccessHrPresensiTab(access, tab)), [access]);
  const role = access.role;
  const roleDashboard = role ? hrPresensiRoleDashboards[role] : null;

  const statusItems = useMemo(() => {
    const baseItems = hrPresensiStatusStrip[pageKey] || defaultStrip;
    if (access.status !== "ready" || !role) return baseItems;

    return [
      ...baseItems,
      { key: "role-live", label: "Role aktif", value: formatRoleLabel(role), note: "Role diambil dari resolver session user ke employee, bukan preview frontend.", tone: "success" },
      { key: "scope-live", label: "Scope data", value: getHrPresensiScopeLabel(access), note: "Pembatasan query saat ini masih guard sementara sampai enforcement backend aktif.", tone: "warning" },
    ];
  }, [access, pageKey, role]);

  useEffect(() => {
    if (access.status !== "ready" || !role) return;
    if (!activeTab.roles.includes(role)) {
      const fallbackTab = accessibleTabs[0];
      if (fallbackTab && fallbackTab.key !== pageKey) {
        navigateTo(fallbackTab.key);
      }
    }
  }, [access.status, accessibleTabs, activeTab.roles, pageKey, role]);

  if (access.status === "loading") {
    return (
      <div className="space-y-4">
        <PageHeader title="HR Presensi" description="Memuat akses role nyata berdasarkan session login dan data employee." breadcrumbItems={[{ label: "HR Presensi" }]} />
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 text-sm text-[var(--text-muted)] shadow-sm">Memeriksa session login, mapping akun, role, dan scope data HR Presensi...</div>
      </div>
    );
  }

  if (access.status !== "ready" || !role || !access.canAccessModule) {
    return (
      <div className="space-y-4">
        <PageHeader title="HR Presensi" description="Akses modul ditentukan dari session nyata dan mapping ke profil karyawan." breadcrumbItems={[{ label: "HR Presensi" }]} />
        {renderAccessFallback(access)}
      </div>
    );
  }

  if (!activeTab.roles.includes(role)) {
    return null;
  }

  const metrics = buildDashboardMetrics(access, roleDashboard);

  const renderDashboard = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="space-y-4">
        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{roleDashboard.title}</div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{roleDashboard.description}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Profil login: <span className="font-semibold text-[var(--text-main)]">{access.employee.nama_lengkap}</span> | Scope: <span className="font-semibold text-[var(--text-main)]">{getHrPresensiScopeLabel(access)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <Card key={item.id} className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{item.label}</div>
                <div className="mt-2 text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{item.value}</div>
                <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{item.note}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
              <div className="text-lg font-semibold text-[var(--text-main)]">Peta kesiapan fase 1</div>
              <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">Daftar area yang sudah siap menjadi pondasi transaksi, approval inbox, dan finalisasi snapshot payroll.</div>
            </div>
            <div className="divide-y divide-[rgba(214,222,234,0.82)]">
              {hrPresensiOperationalList.map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[150px_minmax(0,1fr)_160px] md:items-start">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{item.area}</div>
                    <div className="mt-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{item.status}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-main)]">{item.title}</div>
                    <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{item.note}</div>
                  </div>
                  <div className="text-[13px] text-[var(--text-muted)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">PIC utama</div>
                    <div className="mt-2 font-medium text-[var(--text-main)]">{item.owner}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="text-lg font-semibold text-[var(--text-main)]">Aturan inti presensi</div>
            <div className="text-sm leading-6 text-[var(--text-muted)]">
              Source of truth modul menegaskan bahwa status utama harian dan atribut tambahan harus dipisahkan sejak awal agar proses approval, laporan, dan payroll tidak bias.
            </div>
            {hrPresensiCoreAttendanceRules.map((item) => (
              <div key={item} className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-3.5 py-3 text-sm leading-6 text-[var(--text-muted)]">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[var(--brand-800)]">
              <CheckCircle2 className="h-4 w-4" />
              <div className="text-sm font-semibold text-[var(--text-main)]">Akses aktif saat ini</div>
            </div>
            <div className="text-sm leading-6 text-[var(--text-muted)]">
              Role nyata saat ini adalah <span className="font-semibold text-[var(--text-main)]">{formatRoleLabel(role)}</span>. Tab yang tidak relevan akan diblok dan diarahkan ke tab pertama yang diizinkan.
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Tab yang tersedia</div>
              <div className="mt-2 space-y-2">
                {accessibleTabs.map((tab) => (
                  <div key={tab.key} className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-medium text-[var(--text-main)]">{tab.label}</div>
                    <ArrowRight className="h-4 w-4 text-[var(--text-soft)]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">{hrPresensiRightPanelHighlights[0]}</div>
            <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Access control di query dan service sudah role-aware, tetapi masih guard sementara. Enforcement keamanan final melalui RLS atau backend policy akan dilanjutkan di fase berikutnya.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPlaceholderShell = (title, description, rows = []) => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
              <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{description}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">{formatRoleLabel(role)}</div>
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">{getHrPresensiScopeLabel(access)}</div>
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">Guard sementara</div>
            </div>
          </div>
        </div>

        {pageKey === "hr-presensi-persetujuan" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Inbox Persetujuan", value: "1 antrian", note: "Semua approval masuk ke satu inbox operasional." },
              { label: "Aksi utama", value: "Setujui / Tolak / Klarifikasi", note: "Penolakan wajib alasan dan tetap tercatat." },
              { label: "Kontrol waktu", value: "Eskalasi H+5", note: "Approval yang macet otomatis naik ke HR." },
            ].map((item) => (
              <Card key={item.label} className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{item.label}</div>
                  <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em] text-[var(--text-main)]">{item.value}</div>
                  <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{item.note}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {pageKey === "hr-presensi-laporan" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Format laporan", value: "Standar modul", note: "Header + status strip + filter bar + tabel + panel detail kanan." },
              { label: "Finalisasi", value: "HR only", note: "Hanya HR yang boleh membuat finalisasi ke payroll." },
              { label: "Data payroll", value: "Snapshot versioned", note: "Payroll membaca snapshot final per periode, bukan data live." },
            ].map((item) => (
              <Card key={item.label} className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
                <CardContent className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{item.label}</div>
                  <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.02em] text-[var(--text-main)]">{item.value}</div>
                  <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">{item.note}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {rows.length ? (
          <PlaceholderTable rows={rows} />
        ) : (
          <EmptyState
            title="Shell halaman sudah disiapkan"
            description="Tab ini sudah terhubung ke role dan scope data nyata, sehingga bisa dilanjutkan ke transaksi live tanpa kembali ke preview role."
            actionLabel={role === "hr" ? "Buka Pengaturan" : "Kembali ke Dashboard"}
            onAction={() => navigateTo(role === "hr" ? "hr-presensi-pengaturan" : "hr-presensi-dashboard")}
          />
        )}
      </div>

      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-3 p-5">
          <div className="text-lg font-semibold text-[var(--text-main)]">Panel detail kanan</div>
          <div className="text-sm leading-6 text-[var(--text-muted)]">Pola layout modul dijaga konsisten: header, status strip, filter tipis, area list utama, dan panel kanan untuk konteks atau detail kerja.</div>
          <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
            Role aktif: <span className="font-semibold text-[var(--text-main)]">{formatRoleLabel(role)}</span>
          </div>
          <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
            Scope data: <span className="font-semibold text-[var(--text-main)]">{getHrPresensiScopeLabel(access)}</span>
          </div>
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Guard data di fase ini masih belum menjadi security final. Layer backend dan RLS akan menjadi langkah berikutnya.
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={activeTab.label}
        description={activeTab.description}
        breadcrumbItems={[{ label: "HR Presensi" }, { label: activeTab.label }]}
        actions={
          <>
            <Button variant="outline" className="rounded-[12px]">
              {role === "hr" ? <ShieldCheck className="mr-2 h-4 w-4" /> : role === "atasan" ? <Users className="mr-2 h-4 w-4" /> : <CalendarClock className="mr-2 h-4 w-4" />}
              {formatRoleLabel(role)}
            </Button>
            <Button variant="outline" className="rounded-[12px]">
              {access.employee.nama_lengkap}
            </Button>
          </>
        }
      />

      <HrPresensiStatusStrip items={statusItems} />
      <HrPresensiTabBar tabs={accessibleTabs} activeKey={pageKey} onSelect={navigateTo} />

      {pageKey === "hr-presensi-dashboard" ? renderDashboard() : null}
      {pageKey === "hr-presensi-absensi-harian" ? <HrPresensiDailyAttendanceWorkspace /> : null}
      {pageKey === "hr-presensi-dinas-luar" ? renderPlaceholderShell("Dinas Luar", "Area ini menyiapkan shell untuk pengajuan, monitoring, dan validasi aktivitas di luar lokasi kantor.", hrPresensiPlaceholderRows["hr-presensi-dinas-luar"]) : null}
      {pageKey === "hr-presensi-cuti-izin-sakit" ? <HrPresensiTimeOffWorkspace access={access} /> : null}
      {pageKey === "hr-presensi-persetujuan" ? renderPlaceholderShell("Persetujuan", "Area ini disiapkan untuk approval presensi berbasis peran atasan dan HR, tanpa membangun engine approval penuh di fase ini.", hrPresensiPlaceholderRows["hr-presensi-persetujuan"]) : null}
      {pageKey === "hr-presensi-laporan" ? renderPlaceholderShell("Laporan", "Area ini menyiapkan struktur laporan operasional dan kesiapan data presensi sebelum diperdalam lebih lanjut.", hrPresensiPlaceholderRows["hr-presensi-laporan"]) : null}
      {pageKey === "hr-presensi-pengaturan" ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-sm">
              <div className="text-lg font-semibold text-[var(--text-main)]">Pondasi master data awal</div>
              <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">UI fase 1 disederhanakan mengikuti domain resmi: Lokasi Kantor, Shift & Jadwal, Metode Absensi, Kebijakan Cuti, Jenis Pengajuan, dan Periode Payroll.</div>
            </div>
            <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--brand-800)]">
                <Settings2 className="h-4 w-4" />
                <div className="text-sm font-semibold text-[var(--text-main)]">Catatan fase 1.7</div>
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Query pengaturan kini role-aware dan hanya bisa dijalankan oleh HR. Enforcement backend final masih menjadi fase berikutnya.</div>
            </div>
          </div>
          <HrPresensiSettingsWorkspace />
        </div>
      ) : null}
    </div>
  );
}
