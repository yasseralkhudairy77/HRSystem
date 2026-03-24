import { Search } from "lucide-react";

export default function FilterBar({ filters = [], actions }) {
  return (
    <div className="rounded-3xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filters.map((filter) => (
            <div key={filter.label} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{filter.label}</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-main)]">
                <Search className="h-4 w-4 text-[var(--text-soft)]" />
                <span>{filter.placeholder}</span>
              </div>
            </div>
          ))}
        </div>

        {actions ? <div className="flex flex-wrap gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
