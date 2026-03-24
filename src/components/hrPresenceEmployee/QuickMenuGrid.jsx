import { ChevronRight } from "lucide-react";

const toneMap = {
  emerald: "from-emerald-500/18 to-emerald-50 text-emerald-700",
  sky: "from-sky-500/18 to-sky-50 text-sky-700",
  amber: "from-amber-500/18 to-amber-50 text-amber-700",
  rose: "from-rose-500/18 to-rose-50 text-rose-700",
  violet: "from-violet-500/18 to-violet-50 text-violet-700",
  orange: "from-orange-500/18 to-orange-50 text-orange-700",
  slate: "from-slate-500/18 to-slate-50 text-slate-700",
};

export default function QuickMenuGrid({ items, onNavigate }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onNavigate(item.route)}
          className={`rounded-[24px] border border-slate-200 bg-gradient-to-br ${toneMap[item.tone] || toneMap.slate} p-4 text-left shadow-sm`}
        >
          <div className="text-sm font-semibold">{item.label}</div>
          <div className="mt-1 min-h-[36px] text-xs leading-5 opacity-80">{item.description}</div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
            Buka menu
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </button>
      ))}
    </div>
  );
}
