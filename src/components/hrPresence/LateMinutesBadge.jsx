export default function LateMinutesBadge({ value }) {
  return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">{value ? `${value} mnt` : "-"}</span>;
}
