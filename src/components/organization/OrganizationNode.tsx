import type { OrganizationNode as OrganizationNodeType } from "@/lib/organizationStructure";

const levelToneMap: Record<string, string> = {
  Director: "border-slate-300 bg-slate-100 text-slate-800",
  Head: "border-slate-300 bg-slate-100 text-slate-800",
  Manager: "border-slate-200 bg-slate-50 text-slate-700",
  Supervisor: "border-slate-200 bg-slate-50 text-slate-700",
  "Senior Staff": "border-slate-200 bg-white text-slate-700",
  Staff: "border-slate-200 bg-white text-slate-700",
};

type OrganizationNodeProps = {
  node: OrganizationNodeType;
  selected: boolean;
  onSelect: (node: OrganizationNodeType) => void;
};

export default function OrganizationNode({ node, selected, onSelect }: OrganizationNodeProps) {
  const levelBadgeTone = levelToneMap[node.jobLevel] || levelToneMap.Staff;

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      title={`${node.name} - ${node.position}`}
      className={`w-[220px] min-h-[152px] rounded-lg border bg-white px-4 py-3 text-left shadow-sm transition ${
        selected
          ? "border-slate-900 ring-1 ring-slate-900/10"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="h-6 flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-900" title={node.name}>
            {node.name}
          </p>
          <span className="shrink-0 rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {node.employeeId}
          </span>
        </div>

        <div className="mt-1 h-5">
          <p className="truncate text-xs text-slate-600" title={node.position}>
            {node.position}
          </p>
        </div>

        <div className="mt-2 flex h-6 items-center gap-2 overflow-hidden">
          <span className={`inline-flex h-5 max-w-[108px] items-center truncate rounded-full border px-2 text-[10px] font-semibold ${levelBadgeTone}`} title={node.jobLevel}>
            {node.jobLevel}
          </span>
          <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-slate-200 px-2 text-[10px] font-medium text-slate-500">
            {node.children.length} bawahan
          </span>
        </div>

        <div className="mt-3 flex h-8 items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-400">Departemen</span>
          <span className="min-w-0 truncate text-right text-[11px] text-slate-700" title={node.department}>
            {node.department}
          </span>
        </div>

        <div className="flex h-8 items-center justify-between gap-2">
          <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-slate-400">Cabang</span>
          <span className="min-w-0 truncate text-right text-[11px] text-slate-700" title={node.branch}>
            {node.branch}
          </span>
        </div>
      </div>
    </button>
  );
}
