import { employeeDensity } from "@/components/employees/employeeDensity";

type EmployeeMasterRecordGridProps = {
  items: Array<[string, string]>;
};

export default function EmployeeMasterRecordGrid({ items }: EmployeeMasterRecordGridProps) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className={`${employeeDensity.inset} px-3.5 py-2.5`}>
          <div className={employeeDensity.fieldLabel}>{label}</div>
          <div className="mt-1.5 text-sm font-medium leading-5 text-[var(--text-main)]">{value}</div>
        </div>
      ))}
    </div>
  );
}
