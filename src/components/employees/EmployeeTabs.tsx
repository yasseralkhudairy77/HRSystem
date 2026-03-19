import { employeeDensity } from "@/components/employees/employeeDensity";
import type { EmployeeTabKey } from "@/types/employeeProfile";

type EmployeeTabsProps = {
  tabs: Array<{ key: EmployeeTabKey; label: string }>;
  activeTab: EmployeeTabKey;
  onChange: (tab: EmployeeTabKey) => void;
};

export default function EmployeeTabs({ tabs, activeTab, onChange }: EmployeeTabsProps) {
  return (
    <div className={`overflow-x-auto ${employeeDensity.cardFlat}`}>
      <div className="flex min-w-max border-b border-[rgba(214,222,234,0.82)] bg-[var(--surface-0)]/45">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`border-b-2 px-4 py-2.5 text-[13px] font-semibold leading-5 transition ${
                active
                  ? "border-[var(--brand-800)] bg-white text-[var(--text-main)]"
                  : "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-white hover:text-[var(--text-main)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
