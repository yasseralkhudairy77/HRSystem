import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PresenceSectionCard({ title, description, action, children, className, contentClassName }) {
  return (
    <Card className={cn("overflow-hidden rounded-[28px] border-[var(--border-soft)] bg-white shadow-sm", className)}>
      {(title || description || action) ? (
        <CardHeader className="border-b border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              {title ? <CardTitle className="text-lg font-semibold text-[var(--text-main)]">{title}</CardTitle> : null}
              {description ? <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
            </div>
            {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
