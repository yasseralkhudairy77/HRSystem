import PresenceStatusBadge from "@/components/hrPresence/PresenceStatusBadge";
import ShiftColorBadge from "@/components/hrPresence/ShiftColorBadge";

function formatDayHeader(date) {
  const parsed = new Date(`${date}T00:00:00`);
  return {
    day: parsed.toLocaleDateString("id-ID", { weekday: "short" }),
    date: parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }),
  };
}

export default function ScheduleMatrix({ rows = [] }) {
  const dates = rows[0]?.cells?.map((cell) => cell.date) || [];

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-sm">
      <div className="overflow-auto">
        <table className="min-w-max border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-[var(--border-soft)] bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">NIK</th>
              <th className="sticky left-[140px] z-30 border-b border-r border-[var(--border-soft)] bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Nama karyawan</th>
              {dates.map((date) => {
                const header = formatDayHeader(date);
                const weekday = new Date(`${date}T00:00:00`).getDay();
                const isSunday = weekday === 0;

                return (
                  <th key={date} className={`border-b border-[var(--border-soft)] px-3 py-3 text-center ${isSunday ? "bg-rose-50" : "bg-[var(--surface-0)]"}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{header.day}</div>
                    <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{header.date}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employee_id}>
                <td className="sticky left-0 z-20 border-b border-r border-[var(--border-soft)] bg-white px-4 py-4 text-sm font-medium text-[var(--text-main)]">{row.employee_id}</td>
                <td className="sticky left-[140px] z-20 border-b border-r border-[var(--border-soft)] bg-white px-4 py-4 text-sm font-semibold text-[var(--text-main)]">{row.employee_name}</td>
                {row.cells.map((cell) => {
                  const isHoliday = cell.status === "holiday";
                  const isOff = cell.status === "off";
                  return (
                    <td key={`${row.employee_id}-${cell.date}`} className={`border-b border-[var(--border-soft)] px-2 py-2 ${isHoliday ? "bg-amber-50/80" : isOff ? "bg-slate-50" : "bg-white"}`}>
                      {cell.status === "scheduled" ? (
                        <div className="min-w-[116px] rounded-2xl border border-[var(--border-soft)] bg-white p-2 shadow-sm">
                          <ShiftColorBadge label={cell.shift_name} color={cell.color_hex} className="w-full border-none bg-transparent p-0 shadow-none" />
                        </div>
                      ) : isHoliday ? (
                        <div className="min-w-[116px] rounded-2xl border border-amber-200 bg-white/70 px-2 py-3 text-center">
                          <div className="text-xs font-semibold text-amber-700">{cell.shift_name}</div>
                          <div className="mt-1 flex justify-center">
                            <PresenceStatusBadge value="Nasional" />
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-[116px] rounded-2xl border border-dashed border-[var(--border-soft)] bg-white px-2 py-3 text-center text-xs font-medium text-[var(--text-soft)]">
                          Off
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
