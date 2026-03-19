import { employeeDensity } from "@/components/employees/employeeDensity";
import { Card, CardContent } from "@/components/ui/card";
import type { EmployeeChangeRecord } from "@/types/employeeProfile";

type ChangeHistoryTableProps = {
  title?: string;
  description?: string;
  rows: EmployeeChangeRecord[];
};

export default function ChangeHistoryTable({
  title = "Riwayat Perubahan Terakhir",
  description = "Perubahan terbaru pada profil karyawan untuk audit trail administrasi.",
  rows,
}: ChangeHistoryTableProps) {
  return (
    <Card className={employeeDensity.cardFlat}>
      <CardContent className="p-0">
        <div className={employeeDensity.header}>
          <div className={employeeDensity.sectionTitle}>{title}</div>
          <div className={employeeDensity.sectionDescription}>{description}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--surface-0)] text-left">
              <tr>
                <th className={employeeDensity.tableHeadCell}>Tanggal</th>
                <th className={employeeDensity.tableHeadCell}>Field</th>
                <th className={employeeDensity.tableHeadCell}>Perubahan</th>
                <th className={employeeDensity.tableHeadCell}>Diperbarui Oleh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[rgba(214,222,234,0.82)] transition-colors hover:bg-[var(--surface-0)]/65">
                  <td className={`${employeeDensity.tableCell} text-[var(--text-muted)]`}>{row.tanggal}</td>
                  <td className={`${employeeDensity.tableCell} font-medium text-[var(--text-main)]`}>{row.field}</td>
                  <td className={`${employeeDensity.tableCell} text-[var(--text-main)]`}>{row.perubahan}</td>
                  <td className={`${employeeDensity.tableCell} text-[var(--text-muted)]`}>{row.diperbaruiOleh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
