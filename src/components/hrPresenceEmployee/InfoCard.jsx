import { Info } from "lucide-react";

export default function InfoCard({ title, description, tone = "info", actionLabel, onAction }) {
  const tones = {
    info: "border-sky-200 bg-sky-50/80 text-sky-900",
    warning: "border-amber-200 bg-amber-50/90 text-amber-900",
    success: "border-emerald-200 bg-emerald-50/90 text-emerald-900",
  };

  return (
    <div className={`rounded-[24px] border p-4 ${tones[tone] || tones.info}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70">
          <Info className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs leading-5 opacity-85">{description}</div>
          {actionLabel ? (
            <button type="button" onClick={onAction} className="mt-3 text-xs font-semibold underline underline-offset-4">
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
