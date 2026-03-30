import { cn } from "@/lib/utils";

export default function HrPresensiTabBar({ tabs, activeKey, onSelect }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-[var(--border-soft)] bg-white px-2 py-2 shadow-sm">
      <div className="flex min-w-max gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={cn(
              "rounded-[10px] border px-3.5 py-2 text-sm font-medium transition",
              activeKey === tab.key
                ? "border-[var(--brand-800)] bg-[var(--brand-800)] text-white"
                : "border-transparent bg-white text-[var(--text-muted)] hover:border-[var(--border-soft)] hover:bg-[var(--surface-0)] hover:text-[var(--text-main)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
