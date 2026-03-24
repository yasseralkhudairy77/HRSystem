export default function DataTable({ columns = [], rows = [], emptyState }) {
  if (!rows.length && emptyState) {
    return emptyState;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-soft)]">
          <thead className="bg-[var(--surface-0)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="hover:bg-[var(--surface-0)]">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm text-[var(--text-main)]">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
