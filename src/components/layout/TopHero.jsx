import { Bell, Command, PanelTop, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TopHero({ activeItem }) {
  return (
    <div className="enterprise-panel mb-5 overflow-hidden rounded-xl">
      <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.96))] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--brand-800)]">
            <PanelTop className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Workspace HireUMKM</div>
            <div className="text-lg font-semibold text-[var(--text-main)]">{activeItem?.label || "Dashboard"}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
            <Input placeholder="Cari halaman, data, atau aksi cepat..." className="pl-9" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="subtle" size="sm" className="gap-2">
              <Command className="h-4 w-4" />
              Shortcut
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifikasi
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            <Sparkles className="h-3.5 w-3.5" />
            Sistem kerja yang rapi dan mudah dibaca
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            HireUMKM merangkum pekerjaan HR harian dalam layout yang padat, terstruktur, dan tetap mudah dipahami oleh owner, admin, HR, supervisor, dan agency.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button>Lihat semua laporan</Button>
          <Button variant="outline">Buka detail</Button>
        </div>
      </div>
    </div>
  );
}
