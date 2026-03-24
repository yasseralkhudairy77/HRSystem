import PresenceDataTable from "@/components/hrPresence/PresenceDataTable";

export default function DepartmentSummaryTable({ rows = [] }) {
  return (
    <PresenceDataTable
      columns={[
        { key: "department_name", label: "Departemen", width: 220 },
        { key: "present_rate", label: "Kehadiran", width: 120 },
        { key: "late_cases", label: "Terlambat", width: 120 },
        { key: "alpha_cases", label: "Alpha", width: 100 },
        { key: "overtime_cases", label: "Lembur", width: 100 },
      ]}
      rows={rows.map((item) => ({
        ...item,
        present_rate: `${item.present_rate}%`,
      }))}
    />
  );
}
