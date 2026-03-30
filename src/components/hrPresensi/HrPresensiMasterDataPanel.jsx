import { Card, CardContent } from "@/components/ui/card";

export default function HrPresensiMasterDataPanel({
  sections,
  activeSectionKey,
  onSectionSelect,
  selectedRecordId,
  onRecordSelect,
}) {
  const activeSection = sections.find((section) => section.key === activeSectionKey) || sections[0];
  const selectedRecord = activeSection?.records.find((record) => record.id === selectedRecordId) || activeSection?.records[0] || null;

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Master domain</div>
          <div className="mt-3 space-y-2">
            {sections.map((section) => {
              const active = section.key === activeSection?.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onSectionSelect(section.key)}
                  className={`w-full rounded-[12px] border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--brand-800)] bg-[linear-gradient(180deg,var(--brand-800),var(--brand-900))] text-white"
                      : "border-[var(--border-soft)] bg-white text-[var(--text-main)] hover:bg-[var(--surface-0)]"
                  }`}
                >
                  <div className="text-sm font-semibold">{section.label}</div>
                  <div className={`mt-1 text-[12px] leading-5 ${active ? "text-slate-200" : "text-[var(--text-muted)]"}`}>{section.description}</div>
                  <div className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${active ? "text-slate-200" : "text-[var(--text-soft)]"}`}>
                    {section.records.length} record • {section.tableName}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
            <div className="text-lg font-semibold text-[var(--text-main)]">{activeSection?.label}</div>
            <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{activeSection?.description}</div>
          </div>

          <div className="divide-y divide-[rgba(214,222,234,0.82)]">
            {activeSection?.records.map((record) => {
              const active = record.id === selectedRecord?.id;
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => onRecordSelect(record.id)}
                  className={`w-full px-5 py-4 text-left transition ${active ? "bg-[var(--surface-0)]" : "bg-white hover:bg-[var(--surface-0)]/75"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-main)]">{record.title}</div>
                      <div className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{record.subtitle}</div>
                    </div>
                    <div className="rounded-full border border-[var(--border-soft)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {record.status}
                    </div>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">{record.summary}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Panel detail</div>
            <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{selectedRecord?.title || "-"}</div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{selectedRecord?.summary || "Pilih salah satu record untuk melihat detail master data."}</div>
          </div>

          <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 text-sm">
            <div className="grid gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Status</div>
                <div className="mt-1 font-medium text-[var(--text-main)]">{selectedRecord?.status || "-"}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Efektif mulai</div>
                <div className="mt-1 font-medium text-[var(--text-main)]">{selectedRecord?.effective_start_date || "-"}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Efektif sampai</div>
                <div className="mt-1 font-medium text-[var(--text-main)]">{selectedRecord?.effective_end_date || "Belum ditentukan"}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">PIC</div>
                <div className="mt-1 font-medium text-[var(--text-main)]">{selectedRecord?.owner || "-"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(selectedRecord?.fields || []).map((field) => (
              <div key={`${selectedRecord?.id}-${field.label}`} className="rounded-[12px] border border-[var(--border-soft)] px-3.5 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{field.label}</div>
                <div className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-main)]">{field.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
