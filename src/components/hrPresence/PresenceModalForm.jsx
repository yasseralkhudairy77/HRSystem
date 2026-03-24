import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PresenceModalForm({ open, title, description, sections = [], onClose, footer }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.36)] p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--border-soft)] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] px-6 py-5">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Form Placeholder</div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-main)]">{title}</div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>
          </div>
          <Button variant="outline" className="rounded-full px-3" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[calc(92vh-180px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                <div className="text-base font-semibold text-[var(--text-main)]">{section.title}</div>
                {section.description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{section.description}</p> : null}
                <div className="mt-4 space-y-3">
                  {section.fields?.map((field) => (
                    <div key={field.label} className="rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-3 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{field.label}</div>
                      <div className="mt-1.5 text-sm text-[var(--text-main)]">{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--border-soft)] bg-white px-6 py-4">
          {footer || (
            <>
              <Button variant="outline" className="rounded-xl" onClick={onClose}>
                Tutup
              </Button>
              <Button className="rounded-xl">Simpan placeholder</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
