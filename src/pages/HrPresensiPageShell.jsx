import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, CheckCircle2, Settings2, ShieldCheck, Users } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import HrPresensiSettingsWorkspace from "@/components/hrPresensi/HrPresensiSettingsWorkspace";
import HrPresensiStatusStrip from "@/components/hrPresensi/HrPresensiStatusStrip";
import HrPresensiTabBar from "@/components/hrPresensi/HrPresensiTabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  hrPresensiCoreAttendanceRules,
  hrPresensiInternalTabs,
  hrPresensiOperationalList,
  hrPresensiPlaceholderRows,
  hrPresensiRightPanelHighlights,
  hrPresensiRoleDashboards,
  hrPresensiRoleOptions,
  hrPresensiStatusStrip,
} from "@/data/hrPresensi";

const ROLE_STORAGE_KEY = "hr-presensi:role-preview";

const defaultStrip = [
  { key: "phase", label: "Fase", value: "Fase 1", note: "Fokus pada shell, role, dan master data dasar.", tone: "info" },
  { key: "scope", label: "Scope", value: "Pondasi aman", note: "Belum membangun transaksi check-in/check-out penuh.", tone: "neutral" },
  { key: "status", label: "Status modul", value: "Aktif", note: "Siap dipakai untuk pemetaan modul dan kelanjutan fase 2.", tone: "success" },
  { key: "audit", label: "Audit trail", value: "Disiapkan", note: "Perubahan sensitif diarahkan ke setting change logs.", tone: "warning" },
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

export default function HrPresensiPageShell({ pageKey }) {
  const [role, setRole] = useState(() => {
    if (typeof window === "undefined") return "hr";
    return window.localStorage.getItem(ROLE_STORAGE_KEY) || "hr";
  });

  const activeTab = hrPresensiInternalTabs.find((tab) => tab.key === pageKey) || hrPresensiInternalTabs[0];
  const accessibleTabs = useMemo(() => hrPresensiInternalTabs.filter((tab) => tab.roles.includes(role)), [role]);
  const statusItems = hrPresensiStatusStrip[pageKey] || defaultStrip;
  const roleDashboard = hrPresensiRoleDashboards[role];

  useEffect(() => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  useEffect(() => {
    if (!activeTab.roles.includes(role)) {
      const fallbackTab = accessibleTabs[0];
      if (fallbackTab && fallbackTab.key !== pageKey) {
        navigateTo(fallbackTab.key);
      }
    }
  }, [accessibleTabs, activeTab.roles, pageKey, role]);

  if (!activeTab.roles.includes(role)) {
    return null;
  }

  const renderDashboard = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
      <div className="space-y-4">
        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{roleDashboard.title}</div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{roleDashboard.description}</div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roleDashboard.metrics.map((item) => (
            <Card key={item.id} className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{item.label}</div>
                <div className="mt-2 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{item.value}</div>
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
                    <div className="mt-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {item.status}
                    </div>
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
              Mode role saat ini adalah <span className="font-semibold text-[var(--text-main)]">{formatRoleLabel(role)}</span>. Tab yang tidak relevan akan diblok dan diarahkan ke tab pertama yang diizinkan.
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
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              {hrPresensiRightPanelHighlights[0]}
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
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">Periode aktif</div>
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">Semua lokasi</div>
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)]">Status default</div>
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
            description="Tab ini sudah terhubung ke modul HR Presensi dan siap dilanjutkan di fase berikutnya tanpa perlu membongkar struktur utama."
            actionLabel="Buka Pengaturan"
            onAction={() => navigateTo("hr-presensi-pengaturan")}
          />
        )}
      </div>

      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-3 p-5">
          <div className="text-lg font-semibold text-[var(--text-main)]">Panel detail kanan</div>
          <div className="text-sm leading-6 text-[var(--text-muted)]">
            Pola layout modul dijaga konsisten: header, status strip, filter tipis, area list utama, dan panel kanan untuk konteks atau detail kerja.
          </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              Role aktif: <span className="font-semibold text-[var(--text-main)]">{formatRoleLabel(role)}</span>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              Fase 1 baru menyiapkan shell aman dan belum mengaktifkan engine transaksi penuh agar fondasi tetap sehat.
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm leading-6 text-[var(--text-muted)]">
              Panel ini nantinya dipakai untuk detail record, audit trail, alasan reopen, dan status risiko.
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
            <div className="flex flex-wrap gap-2 rounded-[12px] border border-[var(--border-soft)] bg-white p-1.5">
              {hrPresensiRoleOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRole(option.key)}
                  className={`rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                    option.key === role ? "bg-[var(--brand-800)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button variant="outline" className="rounded-[12px]">
              {role === "hr" ? <ShieldCheck className="mr-2 h-4 w-4" /> : role === "atasan" ? <Users className="mr-2 h-4 w-4" /> : <CalendarClock className="mr-2 h-4 w-4" />}
              Mode {formatRoleLabel(role)}
            </Button>
          </>
        }
      />

      <HrPresensiStatusStrip items={statusItems} />
      <HrPresensiTabBar tabs={accessibleTabs} activeKey={pageKey} onSelect={navigateTo} />

      {pageKey === "hr-presensi-dashboard" ? renderDashboard() : null}
      {pageKey === "hr-presensi-absensi-harian" ? renderPlaceholderShell("Absensi Harian", "Area ini nanti menjadi workspace operasional untuk memantau status hadir, telat, koreksi, dan anomali presensi harian.", hrPresensiPlaceholderRows["hr-presensi-absensi-harian"]) : null}
      {pageKey === "hr-presensi-dinas-luar" ? renderPlaceholderShell("Dinas Luar", "Area ini menyiapkan shell untuk pengajuan, monitoring, dan validasi aktivitas di luar lokasi kantor.", hrPresensiPlaceholderRows["hr-presensi-dinas-luar"]) : null}
      {pageKey === "hr-presensi-cuti-izin-sakit" ? renderPlaceholderShell("Cuti, Izin & Sakit", "Area ini menjadi fondasi policy global perusahaan untuk cuti, izin, sakit, dan koreksi kehadiran.", hrPresensiPlaceholderRows["hr-presensi-cuti-izin-sakit"]) : null}
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
                <div className="text-sm font-semibold text-[var(--text-main)]">Catatan fase 1</div>
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Perubahan sensitif wajib punya histori. Karena itu schema tetap menyiapkan log perubahan dan effective date walau transaksi penuh belum aktif.</div>
            </div>
          </div>
          <HrPresensiSettingsWorkspace />
        </div>
      ) : null}
    </div>
  );
}
