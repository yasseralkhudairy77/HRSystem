import { LockKeyhole, PencilLine, ShieldAlert } from "lucide-react";

import { employeeDensity } from "@/components/employees/employeeDensity";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeField, EmployeeRole, FieldAccess } from "@/types/employeeProfile";

type PersonalInfoFormProps = {
  title: string;
  description: string;
  fields: EmployeeField[];
  role: EmployeeRole;
};

const accessConfig: Record<
  FieldAccess,
  {
    label: string;
    icon: typeof LockKeyhole;
    badgeClass: string;
  }
> = {
  "hr-only": {
    label: "HR master",
    icon: LockKeyhole,
    badgeClass: "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)]",
  },
  "employee-edit": {
    label: "Self service",
    icon: PencilLine,
    badgeClass: "border-[#d6dfec] bg-[#f5f8fd] text-[var(--brand-800)]",
  },
  "needs-verification": {
    label: "Verifikasi HR",
    icon: ShieldAlert,
    badgeClass: "border-[#eadfbf] bg-[#faf6ea] text-[#7a6122]",
  },
};

function resolveFieldAppearance(access: FieldAccess, role: EmployeeRole) {
  if (role === "hr") return "border-[var(--border-soft)] bg-white";
  if (access === "employee-edit") return "border-[#c8d7ea] bg-[#fbfcfe]";
  if (access === "needs-verification") return "border-[#e7ddbf] bg-[#fffdf7]";
  return "border-[var(--border-soft)] bg-[var(--surface-0)]";
}

export default function PersonalInfoForm({ title, description, fields, role }: PersonalInfoFormProps) {
  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className="border-b border-[rgba(214,222,234,0.82)] pb-4">
          <div className={employeeDensity.sectionTitle}>{title}</div>
          <div className={`${employeeDensity.sectionDescription} max-w-3xl`}>{description}</div>
        </div>

        <div className="mt-4 grid gap-x-4 gap-y-3 md:grid-cols-2">
          {fields.map((field) => {
            const config = accessConfig[field.access];
            const Icon = config.icon;

            return (
              <div key={field.id} className="grid grid-rows-[20px_minmax(40px,auto)_28px] gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className={employeeDensity.fieldLabel}>{field.label}</div>
                  <div className={`inline-flex h-5 items-center gap-1 rounded-md border px-2 py-0 text-[10px] font-semibold uppercase tracking-[0.06em] ${config.badgeClass}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </div>
                </div>

                <div className={`rounded-[10px] border px-3.5 py-2 ${resolveFieldAppearance(field.access, role)}`}>
                  <div className="text-sm font-medium leading-5 text-[var(--text-main)]">{field.value}</div>
                </div>

                <div className="pt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{field.helperText || "\u00A0"}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[var(--text-soft)]">
          <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-0)] px-2.5 py-1">HR master: hanya dikelola admin HR</div>
          <div className="rounded-md border border-[#d6dfec] bg-[#f5f8fd] px-2.5 py-1 text-[var(--brand-800)]">Self service: dapat diajukan langsung oleh karyawan</div>
          <div className="rounded-md border border-[#eadfbf] bg-[#faf6ea] px-2.5 py-1 text-[#7a6122]">Verifikasi HR: perubahan baru aktif setelah diperiksa HR</div>
        </div>
      </CardContent>
    </Card>
  );
}
