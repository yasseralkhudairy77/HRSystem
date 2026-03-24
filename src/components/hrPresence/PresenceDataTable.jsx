import { MoreHorizontal } from "lucide-react";

import PresenceStatusBadge from "@/components/hrPresence/PresenceStatusBadge";
import { Button } from "@/components/ui/button";

function renderCellContent(column, row) {
  if (column.render) {
    return column.render(row);
  }

  if (column.type === "status") {
    return <PresenceStatusBadge value={row[column.key]} />;
  }

  return row[column.key];
}

export default function PresenceDataTable({ columns = [], rows = [], stickyColumns = 0, dense = false }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className="border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]"
                  style={index < stickyColumns ? { position: "sticky", left: index * 140, zIndex: 12, minWidth: column.width || 140 } : { minWidth: column.width || 140 }}
                >
                  {column.label}
                </th>
              ))}
              <th className="border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="group">
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`border-b border-[var(--border-soft)] px-4 align-top text-sm text-[var(--text-main)] ${dense ? "py-3" : "py-4"}`}
                    style={index < stickyColumns ? { position: "sticky", left: index * 140, background: "white", zIndex: 8, minWidth: column.width || 140 } : { minWidth: column.width || 140 }}
                  >
                    {renderCellContent(column, row)}
                  </td>
                ))}
                <td className={`border-b border-[var(--border-soft)] px-4 text-right ${dense ? "py-3" : "py-4"}`}>
                  <Button variant="outline" className="rounded-full px-3">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
