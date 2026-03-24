import { Button } from "@/components/ui/button";

export default function ConflictResolutionPanel({ conflict, onAction }) {
  if (!conflict) return null;

  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-[var(--text-main)]">Resolution panel</div>
      <div className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{conflict.conflict_description}</div>
      <div className="mt-3 rounded-2xl bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-main)]">
        Suggested action: {conflict.suggested_action || "Review manual oleh HR"}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-xl" onClick={() => onAction?.("resolve")}>Resolve</Button>
        <Button variant="outline" className="rounded-xl" onClick={() => onAction?.("ignore")}>Abaikan</Button>
        <Button className="rounded-xl" onClick={() => onAction?.("reprocess")}>Proses ulang</Button>
      </div>
    </div>
  );
}
