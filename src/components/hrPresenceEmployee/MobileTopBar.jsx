import { ChevronLeft, BellDot } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MobileTopBar({ title, subtitle, onBack, rightActionLabel = "Info" }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-white/70 bg-white/90 px-4 py-3 backdrop-blur md:-mx-5 md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl text-slate-600" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-10 w-10 rounded-2xl bg-slate-100" />
          )}
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
          </div>
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
          <BellDot className="h-4 w-4" />
          <span className="sr-only">{rightActionLabel}</span>
        </button>
      </div>
    </div>
  );
}
