import { CircleAlert, CircleCheckBig, FileCheck2, ShieldEllipsis } from "lucide-react";

import { employeeDensity } from "@/components/employees/employeeDensity";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeStatusOverview } from "@/types/employeeProfile";

type EmployeeDataStatusCardProps = {
  status: EmployeeStatusOverview;
};

export default function EmployeeDataStatusCard({ status }: EmployeeDataStatusCardProps) {
  const metrics = [
    { label: "Data lengkap", value: `${status.dataLengkap}%`, icon: CircleCheckBig, tone: "bg-[#edf6ef] text-[#2d6b45]" },
    { label: "Dokumen terunggah", value: String(status.dokumenTerunggah), icon: FileCheck2, tone: "bg-[#f1f5fb] text-[var(--brand-800)]" },
    { label: "Data perlu diperbarui", value: String(status.dataPerluDiperbarui), icon: CircleAlert, tone: "bg-[#faf6ea] text-[#7a6122]" },
    { label: "Menunggu verifikasi HR", value: String(status.menungguVerifikasiHr), icon: ShieldEllipsis, tone: "bg-[#f4f4f6] text-[var(--text-main)]" },
  ];

  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className={employeeDensity.mainPadding}>
        <div className={employeeDensity.sectionTitle}>Status Kelengkapan Data</div>
        <div className={employeeDensity.sectionDescription}>
          Panel ringkas untuk membantu HR maupun karyawan melihat kondisi data dan item yang masih perlu ditindaklanjuti.
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full bg-[var(--brand-800)]" style={{ width: `${status.dataLengkap}%` }} />
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div key={metric.label} className={`${employeeDensity.inset} p-3`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-medium leading-5 text-[var(--text-main)]">{metric.label}</div>
                  <div className={`rounded-[8px] p-1.5 ${metric.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--text-main)]">{metric.value}</div>
              </div>
            );
          })}
        </div>

        <div className={`${employeeDensity.inset} mt-4 p-3.5`}>
          <div className="text-sm font-semibold text-[var(--text-main)]">Perhatian Saat Ini</div>
          <div className="mt-2.5 space-y-1.5">
            {status.checklist.map((item) => (
              <div key={item} className="flex items-start gap-2 text-[13px] leading-5 text-[var(--text-muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-800)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
