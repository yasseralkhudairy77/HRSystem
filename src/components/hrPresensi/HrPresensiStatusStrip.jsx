const toneMap = {
  neutral: "border-[var(--border-soft)] bg-white text-[var(--text-main)]",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export default function HrPresensiStatusStrip({ items }) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.key} className={`rounded-[12px] border px-4 py-3 ${toneMap[item.tone || "neutral"]}`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">{item.label}</div>
          <div className="mt-1.5 text-base font-semibold tracking-[-0.02em]">{item.value}</div>
          <div className="mt-1.5 text-[12px] leading-5 opacity-80">{item.note}</div>
        </div>
      ))}
    </div>
  );
}
