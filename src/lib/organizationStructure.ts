import type { EmployeeProfile } from "@/types/employeeProfile";
import type { EmployeeRecord } from "@/types/employee";

export type OrganizationNode = {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  department: string;
  branch: string;
  supervisorId: string | null;
  supervisorName: string;
  jobLevel: string;
  status: string;
  source: "live" | "fallback";
  children: OrganizationNode[];
};

export type OrganizationIssue = {
  id: string;
  type: "missing-supervisor" | "supervisor-not-found" | "cycle";
  severity: "warning" | "error";
  employeeName: string;
  detail: string;
};

type OrganizationItem = Omit<OrganizationNode, "children">;

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function displayValue(value: string | null | undefined, fallback = "-") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function inferJobLevel(position: string) {
  const lower = normalizeText(position);
  if (/(owner|founder|ceo|director|direktur)/.test(lower)) return "Director";
  if (/(head|kepala|general manager|gm)/.test(lower)) return "Head";
  if (/(manager|manajer)/.test(lower)) return "Manager";
  if (/(supervisor|koordinator|coordinator|team lead|lead)/.test(lower)) return "Supervisor";
  if (/(senior|sr\.)/.test(lower)) return "Senior Staff";
  return "Staff";
}

function isActiveStatus(status: string) {
  const normalized = normalizeText(status);
  return !normalized || ["aktif", "active", "probation", "tetap", "kontrak"].includes(normalized);
}

function mapRecord(record: EmployeeRecord): OrganizationItem | null {
  if (record.org_status && normalizeText(record.org_status) !== "active") return null;
  if (!isActiveStatus(record.status_karyawan)) return null;

  return {
    id: String(record.id),
    employeeId: displayValue(record.employee_id),
    name: displayValue(record.nama_lengkap),
    position: displayValue(record.jabatan),
    department: displayValue(record.departemen),
    branch: displayValue(record.cabang),
    supervisorId: record.atasan_employee_id ? String(record.atasan_employee_id) : null,
    supervisorName: displayValue(record.atasan, ""),
    jobLevel: displayValue(record.job_level, inferJobLevel(record.jabatan)),
    status: displayValue(record.status_karyawan, "Aktif"),
    source: "live",
  };
}

function mapProfile(profile: EmployeeProfile): OrganizationItem | null {
  if (!isActiveStatus(profile.statusKaryawan)) return null;

  return {
    id: profile.id,
    employeeId: displayValue(profile.employeeId),
    name: displayValue(profile.namaLengkap),
    position: displayValue(profile.jabatan),
    department: displayValue(profile.departemen),
    branch: displayValue(profile.cabang),
    supervisorId: null,
    supervisorName: displayValue(profile.atasan, ""),
    jobLevel: inferJobLevel(profile.jabatan),
    status: displayValue(profile.statusKaryawan, "Aktif"),
    source: "fallback",
  };
}

function buildItems(records: EmployeeRecord[], profiles: EmployeeProfile[]) {
  if (records.length) {
    return records.map(mapRecord).filter(Boolean) as OrganizationItem[];
  }

  return profiles.map(mapProfile).filter(Boolean) as OrganizationItem[];
}

function findSupervisorId(item: OrganizationItem, byId: Map<string, OrganizationItem>, byName: Map<string, OrganizationItem>) {
  if (item.supervisorId && byId.has(item.supervisorId)) return item.supervisorId;

  const normalizedSupervisorName = normalizeText(item.supervisorName);
  if (normalizedSupervisorName && byName.has(normalizedSupervisorName)) {
    return byName.get(normalizedSupervisorName)?.id || null;
  }

  return null;
}

function detectCycleIds(parentById: Map<string, string | null>) {
  const cycleIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      cycleIds.add(id);
      return;
    }

    visiting.add(id);
    const parentId = parentById.get(id);
    if (parentId) {
      visit(parentId);
      if (cycleIds.has(parentId)) cycleIds.add(id);
    }
    visiting.delete(id);
    visited.add(id);
  }

  Array.from(parentById.keys()).forEach(visit);
  return cycleIds;
}

export function buildOrganizationStructure(params: {
  records?: EmployeeRecord[];
  profiles?: EmployeeProfile[];
  branch?: string;
  department?: string;
  sourceOverride?: "live" | "fallback";
}) {
  const { records = [], profiles = [], branch = "", department = "", sourceOverride } = params;
  const items = buildItems(records, profiles);
  const branchFilter = normalizeText(branch);
  const departmentFilter = normalizeText(department);

  const allBranches = Array.from(new Set(items.map((item) => item.branch).filter((value) => value && value !== "-"))).sort();
  const allDepartments = Array.from(new Set(items.map((item) => item.department).filter((value) => value && value !== "-"))).sort();

  const filteredItems = items.filter((item) => {
    if (branchFilter && normalizeText(item.branch) !== branchFilter) return false;
    if (departmentFilter && normalizeText(item.department) !== departmentFilter) return false;
    return true;
  });

  const byId = new Map(filteredItems.map((item) => [item.id, item]));
  const byName = new Map(filteredItems.map((item) => [normalizeText(item.name), item]));
  const parentById = new Map<string, string | null>();
  const issues: OrganizationIssue[] = [];

  filteredItems.forEach((item) => {
    const resolvedParentId = findSupervisorId(item, byId, byName);
    const supervisorNameExists = normalizeText(item.supervisorName) !== "";

    if (resolvedParentId && resolvedParentId !== item.id) {
      parentById.set(item.id, resolvedParentId);
      return;
    }

    if (resolvedParentId === item.id) {
      parentById.set(item.id, null);
      issues.push({
        id: `cycle-self-${item.id}`,
        type: "cycle",
        severity: "error",
        employeeName: item.name,
        detail: "Karyawan terhubung ke dirinya sendiri sebagai atasan.",
      });
      return;
    }

    parentById.set(item.id, null);

    if (supervisorNameExists) {
      issues.push({
        id: `supervisor-not-found-${item.id}`,
        type: "supervisor-not-found",
        severity: "warning",
        employeeName: item.name,
        detail: `Atasan "${item.supervisorName}" belum ditemukan di data karyawan aktif.`,
      });
      return;
    }

    if (!["Director", "Head"].includes(item.jobLevel)) {
      issues.push({
        id: `missing-supervisor-${item.id}`,
        type: "missing-supervisor",
        severity: "warning",
        employeeName: item.name,
        detail: "Belum memiliki atasan langsung, jadi posisinya sementara diletakkan di level teratas.",
      });
    }
  });

  const cycleIds = detectCycleIds(parentById);
  cycleIds.forEach((id) => {
    const item = byId.get(id);
    if (!item) return;
    issues.push({
      id: `cycle-${id}`,
      type: "cycle",
      severity: "error",
      employeeName: item.name,
      detail: "Relasi atasan membentuk siklus dan perlu diperbaiki di Data Karyawan.",
    });
    parentById.set(id, null);
  });

  const nodeMap = new Map<string, OrganizationNode>();
  filteredItems.forEach((item) => {
    nodeMap.set(item.id, { ...item, children: [] });
  });

  nodeMap.forEach((node) => {
    const parentId = parentById.get(node.id);
    if (!parentId) return;
    const parentNode = nodeMap.get(parentId);
    if (parentNode && !cycleIds.has(node.id)) {
      parentNode.children.push(node);
    }
  });

  function sortNodes(nodes: OrganizationNode[]) {
    const levelOrder: Record<string, number> = {
      Director: 1,
      Head: 2,
      Manager: 3,
      Supervisor: 4,
      "Senior Staff": 5,
      Staff: 6,
    };

    nodes.sort((left, right) => {
      const levelDiff = (levelOrder[left.jobLevel] || 99) - (levelOrder[right.jobLevel] || 99);
      if (levelDiff !== 0) return levelDiff;
      return left.name.localeCompare(right.name, "id-ID");
    });

    nodes.forEach((node) => sortNodes(node.children));
  }

  const roots = Array.from(nodeMap.values()).filter((node) => !parentById.get(node.id));
  sortNodes(roots);

  const stats = {
    totalVisible: filteredItems.length,
    totalRoots: roots.length,
    totalIssues: issues.length,
    totalResolvedLinks: filteredItems.filter((item) => parentById.get(item.id)).length,
  };

  return {
    roots,
    issues,
    stats,
    branches: allBranches,
    departments: allDepartments,
    source: sourceOverride || (records.length ? "live" : "fallback"),
  };
}
