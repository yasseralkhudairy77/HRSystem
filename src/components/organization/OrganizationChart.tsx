import OrganizationConnector from "@/components/organization/OrganizationConnector";
import OrganizationNode from "@/components/organization/OrganizationNode";
import type { OrganizationNode as OrganizationNodeType } from "@/lib/organizationStructure";

type BranchProps = {
  nodes: OrganizationNodeType[];
  selectedId: string;
  onSelect: (node: OrganizationNodeType) => void;
  root?: boolean;
};

function Branch({ nodes, selectedId, onSelect, root = false }: BranchProps) {
  return (
    <ul className={root ? "org-chart-children org-chart-children-root" : "org-chart-children"}>
      {nodes.map((node) => (
        <li key={node.id} className="org-chart-item">
          <OrganizationNode node={node} selected={node.id === selectedId} onSelect={onSelect} />
          {node.children.length ? (
            <div className="flex flex-col items-center">
              <OrganizationConnector />
              <Branch nodes={node.children} selectedId={selectedId} onSelect={onSelect} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type OrganizationChartProps = {
  roots: OrganizationNodeType[];
  selectedId: string;
  onSelect: (node: OrganizationNodeType) => void;
};

export default function OrganizationChart({ roots, selectedId, onSelect }: OrganizationChartProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max w-full flex justify-center">
        <div className="org-chart flex flex-col items-center px-2 py-1">
          <Branch nodes={roots} selectedId={selectedId} onSelect={onSelect} root />
        </div>
      </div>
    </div>
  );
}
