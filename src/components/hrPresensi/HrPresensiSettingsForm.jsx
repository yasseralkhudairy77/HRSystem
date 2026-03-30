import { Input } from "@/components/ui/input";

function FieldRenderer({ field, value, onChange }) {
  if (field.type === "textarea") {
    return <textarea value={value ?? ""} onChange={(event) => onChange(field.key, event.target.value)} rows={field.rows || 4} className="min-h-[108px] w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgba(30,79,143,0.22)]" />;
  }

  if (field.type === "select") {
    return (
      <select value={value ?? ""} onChange={(event) => onChange(field.key, event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgba(30,79,143,0.22)]">
        <option value="">Pilih</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field.key, event.target.checked)} />
        {field.checkboxLabel}
      </label>
    );
  }

  return <Input type={field.type || "text"} value={value ?? ""} onChange={(event) => onChange(field.key, event.target.value)} />;
}

export default function HrPresensiSettingsForm({
  title,
  description,
  fields,
  form,
  onChange,
  onSubmit,
  onArchive,
  isSaving,
  canArchive,
  feedback,
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
        <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">{description}</div>
      </div>
      <div className="space-y-4 p-5">
        {feedback ? <div className={`rounded-[12px] border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.message}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={field.wide ? "md:col-span-2" : ""}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{field.label}</div>
              <FieldRenderer field={field} value={form[field.key]} onChange={onChange} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(214,222,234,0.82)] px-5 py-4">
        <div className="text-xs leading-5 text-[var(--text-muted)]">Simpan perubahan akan menulis audit trail dan tidak menghapus data lama.</div>
        <div className="flex gap-2">
          {canArchive ? (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Nonaktifkan
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-[10px] border border-[var(--brand-800)] bg-[var(--brand-800)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-900)] disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
