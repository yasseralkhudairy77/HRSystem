import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Sparkles } from "lucide-react";

import companyLogo from "@/assets/TEMITRA.webp";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function buildInitialOpenState(sections, activeMenu) {
  return sections.reduce((accumulator, section) => {
    accumulator[section.key] = section.items.some((item) => item.key === activeMenu);
    return accumulator;
  }, {});
}

export default function AppSidebar({ activeMenu, sections, onMenuSelect, search, onSearchChange }) {
  const [openSections, setOpenSections] = useState(() => buildInitialOpenState(sections, activeMenu));

  const activeSectionKey = useMemo(
    () => sections.find((section) => section.items.some((item) => item.key === activeMenu))?.key,
    [activeMenu, sections],
  );

  useEffect(() => {
    if (!activeSectionKey) {
      return;
    }

    setOpenSections((current) => ({
      ...current,
      [activeSectionKey]: true,
    }));
  }, [activeSectionKey]);

  useEffect(() => {
    if (!search) {
      return;
    }

    setOpenSections(
      sections.reduce((accumulator, section) => {
        accumulator[section.key] = true;
        return accumulator;
      }, {}),
    );
  }, [search, sections]);

  const toggleSection = (sectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  return (
    <aside className="border-r border-[var(--border-soft)] bg-[linear-gradient(180deg,#f9fbfd_0%,#f1f5fa_100%)] p-4 lg:p-5">
      <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-soft)] bg-white">
          <img src={companyLogo} alt="TEMITRA logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="font-semibold text-[var(--text-main)]">HireUMKM</div>
            <div className="text-xs text-[var(--text-muted)]">Sistem kerja HR untuk UMKM</div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-[var(--brand-700)]" />
          <div className="text-xs leading-5 text-[var(--text-muted)]">Navigasi dibuat padat dan rapi supaya modul tetap mudah dipakai walau informasinya banyak.</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari menu..."
            className="border-[var(--border-soft)] bg-white pl-9"
          />
        </div>
      </div>

      <ScrollArea className="mt-4 h-[calc(100vh-180px)] pr-2">
        <div className="space-y-4 pb-2">
          {sections.map((section) => {
            const isOpen = openSections[section.key] ?? false;
            const hasActiveItem = section.items.some((item) => item.key === activeMenu);

            return (
              <div key={section.key} className="space-y-2">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between px-2 text-left"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--text-soft)] transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </button>

                {isOpen ? (
                  <div
                    className={cn(
                      "space-y-1.5 rounded-xl border bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_20px_rgba(15,23,42,0.03)]",
                      hasActiveItem ? "border-[var(--border-strong)]" : "border-[var(--border-soft)]",
                    )}
                  >
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeMenu === item.key;

                      return (
                        <button
                          key={item.key}
                          onClick={() => onMenuSelect(item.key)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                            active
                              ? "border-[var(--brand-800)] bg-[linear-gradient(180deg,var(--brand-800),var(--brand-900))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                              : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
