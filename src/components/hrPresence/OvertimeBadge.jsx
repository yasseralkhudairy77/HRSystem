export default function OvertimeBadge({ value }) {
  return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">{value ? `${value} mnt` : "-"}</span>;
}
