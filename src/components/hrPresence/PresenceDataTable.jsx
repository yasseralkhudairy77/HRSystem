import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown, MoreHorizontal } from "lucide-react";

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

function getStickyOffset(columns, index) {
  return columns.slice(0, index).reduce((total, column) => total + (column.width || 140), 0);
}

export default function PresenceDataTable({
  columns = [],
  rows = [],
  stickyColumns = 0,
  dense = false,
  hideActions = false,
  onRowAction,
  actionLabel = "Detail",
  emptyState = "Belum ada data untuk filter yang dipilih.",
  sortState = null,
  onSortChange,
}) {
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
                  style={index < stickyColumns ? { position: "sticky", left: getStickyOffset(columns, index), zIndex: 12, minWidth: column.width || 140 } : { minWidth: column.width || 140 }}
                >
                  {column.sortable ? (
                    <button type="button" className="inline-flex items-center gap-2 text-left" onClick={() => onSortChange?.(column.key)}>
                      <span>{column.label}</span>
                      {sortState?.key === column.key ? (
                        sortState.direction === "asc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              {!hideActions ? (
                <th className="border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Aksi
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="group">
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={`border-b border-[var(--border-soft)] px-4 align-top text-sm text-[var(--text-main)] ${dense ? "py-3" : "py-4"}`}
                      style={index < stickyColumns ? { position: "sticky", left: getStickyOffset(columns, index), background: "white", zIndex: 8, minWidth: column.width || 140 } : { minWidth: column.width || 140 }}
                    >
                      {renderCellContent(column, row)}
                    </td>
                  ))}
                  {!hideActions ? (
                    <td className={`border-b border-[var(--border-soft)] px-4 text-right ${dense ? "py-3" : "py-4"}`}>
                      <Button variant="outline" className="rounded-full px-3" onClick={() => onRowAction?.(row)}>
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        {actionLabel}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (hideActions ? 0 : 1)} className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
