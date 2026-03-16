import { Card, CardContent } from "@/components/ui/card";

export default function MetricCard({ label, value, note }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</div>
        <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">{value}</div>
        <div className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{note}</div>
      </CardContent>
    </Card>
  );
}
