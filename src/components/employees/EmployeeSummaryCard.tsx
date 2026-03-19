import { CalendarDays, FileStack, GitBranch, History, Printer, ShieldCheck, UserRound } from "lucide-react";

import StatusBadge from "@/components/common/StatusBadge";
import EmployeeMasterRecordGrid from "@/components/employees/EmployeeMasterRecordGrid";
import { employeeDensity } from "@/components/employees/employeeDensity";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeProfile } from "@/types/employeeProfile";

type EmployeeSummaryCardProps = {
  employee: EmployeeProfile;
  onQuickAction: (actionId: string) => void;
  onManageOrganization?: () => void;
};

const quickActionIcons = {
  documents: FileStack,
  history: History,
  print: Printer,
};

export default function EmployeeSummaryCard({ employee, onQuickAction, onManageOrganization }: EmployeeSummaryCardProps) {
  const infoRows = [
    ["ID Karyawan", employee.employeeId],
    ["Jabatan", employee.jabatan],
    ["Departemen", employee.departemen],
    ["Status Kerja", employee.statusKerja],
    ["Tanggal Masuk", employee.tanggalMasuk],
    ["Cabang", employee.cabang],
    ["Status Karyawan", employee.statusKaryawan],
    ["Atasan", employee.atasan],
  ];

  return (
    <Card className={employeeDensity.card}>
      <CardContent className="p-0">
        <div className="grid gap-0 xl:grid-cols-[244px_minmax(0,1fr)_228px]">
          <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-5 xl:border-b-0 xl:border-r">
            <div className="flex items-start gap-4 xl:flex-col xl:gap-4">
              <Avatar className="h-20 w-20 rounded-[16px] border-[var(--border-strong)] bg-[linear-gradient(145deg,#eff4fb,#dfe8f4)]">
                <AvatarFallback className="rounded-[16px] bg-transparent text-xl font-semibold tracking-[0.08em] text-[var(--brand-900)]">
                  {employee.initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2.5">
                <div>
                  <div className={employeeDensity.overline}>Profil Karyawan</div>
                  <div className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-main)]">{employee.namaLengkap}</div>
                  <div className="mt-1 text-[13px] text-[var(--text-muted)]">{employee.namaUsaha}</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={employee.statusKerja} />
                  <StatusBadge value={employee.statusKaryawan} />
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-800)]" />
              Employee Master Record
            </div>
            <div className="mt-4">
              <EmployeeMasterRecordGrid items={infoRows} />
            </div>
          </div>

          <div className="border-t border-[rgba(214,222,234,0.82)] bg-[var(--surface-0)] px-5 py-5 xl:border-l xl:border-t-0">
            <div className={employeeDensity.overline}>Quick Action</div>
            <div className="mt-3 grid gap-2">
              {employee.quickActions.map((action) => {
                const Icon = quickActionIcons[action.id as keyof typeof quickActionIcons] || FileStack;
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="justify-start rounded-[9px] border-[rgba(191,204,220,0.78)] bg-white px-3"
                    onClick={() => onQuickAction(action.id)}
                  >
                    <Icon className="mr-2 h-3.5 w-3.5 text-[var(--brand-800)]" />
                    {action.label}
                  </Button>
                );
              })}

              {onManageOrganization ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start rounded-[9px] border-[rgba(191,204,220,0.78)] bg-white px-3"
                  onClick={onManageOrganization}
                >
                  <GitBranch className="mr-2 h-3.5 w-3.5 text-[var(--brand-800)]" />
                  Edit Struktur
                </Button>
              ) : null}
            </div>

            <div className={`${employeeDensity.inset} mt-4 bg-white px-3.5 py-3`}>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-main)]">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-800)]" />
                Snapshot Administrasi
              </div>
              <div className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">
                Ringkasan ini disiapkan sebagai titik masuk tunggal agar HR maupun karyawan memahami data inti sebelum masuk ke tab detail.
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-soft)]">
              <UserRound className="h-3.5 w-3.5" />
              Tampilan dirancang untuk admin HR dan employee self-service.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
