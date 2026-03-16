import { ClipboardCheck, FileText, MessageSquare, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rightRailDifferentiators, rightRailUserRoles } from "@/data";

const differentiatorIcons = [ShieldCheck, MessageSquare, ClipboardCheck, FileText];

export default function RightRail() {
  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Peran user utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
          {rightRailUserRoles.map((item) => (
            <div key={item} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">Fitur pembeda untuk UMKM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--text-muted)]">
          {rightRailDifferentiators.map((item, index) => {
            const Icon = differentiatorIcons[index];

            return (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3">
                <Icon className="mt-0.5 h-4 w-4 text-[var(--brand-700)]" />
                <span>{item}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
