import type { EmployeeRecord } from "@/types/employee";
import type { ApprovalPreviewResult, ApprovalRuleSet, ApprovalSource } from "@/types/approval";

const approvalSourceLabels: Record<ApprovalSource, string> = {
  direct_supervisor: "Atasan Langsung",
  department_head: "Kepala Departemen",
  hr_role: "Role HRD",
  director_role: "Role Direktur",
  custom_employee: "Karyawan Tertentu",
  none: "Tanpa fallback",
};

const levelRankMap: Record<string, number> = {
  Director: 1,
  Head: 2,
  Manager: 3,
  Supervisor: 4,
  "Senior Staff": 5,
  Staff: 6,
};

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
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

function getJobLevel(employee: EmployeeRecord) {
  return employee.job_level?.trim() || inferJobLevel(employee.jabatan);
}

function sortByOrgPriority(employees: EmployeeRecord[]) {
  return [...employees].sort((left, right) => {
    const levelDiff = (levelRankMap[getJobLevel(left)] || 99) - (levelRankMap[getJobLevel(right)] || 99);
    if (levelDiff !== 0) return levelDiff;
    return left.nama_lengkap.localeCompare(right.nama_lengkap, "id-ID");
  });
}

function isActiveEmployee(employee: EmployeeRecord) {
  const status = normalizeText(employee.status_karyawan);
  const orgStatus = normalizeText(employee.org_status || "active");
  return orgStatus === "active" && (!status || ["aktif", "active", "probation", "tetap", "kontrak"].includes(status));
}

function findDirectSupervisor(employee: EmployeeRecord, employees: EmployeeRecord[]) {
  if (employee.atasan_employee_id) {
    const foundById = employees.find((item) => item.id === employee.atasan_employee_id);
    if (foundById) return foundById;
  }

  const supervisorName = normalizeText(employee.atasan);
  if (!supervisorName) return null;
  return employees.find((item) => normalizeText(item.nama_lengkap) === supervisorName) || null;
}

function findDepartmentHead(employee: EmployeeRecord, employees: EmployeeRecord[]) {
  const sameDepartment = employees.filter(
    (item) => item.id !== employee.id && normalizeText(item.departemen) === normalizeText(employee.departemen) && ["Head", "Manager"].includes(getJobLevel(item)),
  );
  const sameBranch = sameDepartment.filter((item) => normalizeText(item.cabang) === normalizeText(employee.cabang));
  return sortByOrgPriority(sameBranch)[0] || sortByOrgPriority(sameDepartment)[0] || null;
}

function findHrApprover(employee: EmployeeRecord, employees: EmployeeRecord[]) {
  const hrEmployees = employees.filter(
    (item) =>
      item.id !== employee.id &&
      (normalizeText(item.departemen).includes("human resources") ||
        normalizeText(item.departemen) === "hr" ||
        normalizeText(item.jabatan).includes("hr")),
  );
  return sortByOrgPriority(hrEmployees)[0] || null;
}

function findDirector(employee: EmployeeRecord, employees: EmployeeRecord[]) {
  const directors = employees.filter((item) => item.id !== employee.id && getJobLevel(item) === "Director");
  return sortByOrgPriority(directors)[0] || null;
}

function resolveApprover(params: {
  source: ApprovalSource;
  requester: EmployeeRecord;
  employees: EmployeeRecord[];
  customEmployeeId?: number | null;
}) {
  const { source, requester, employees, customEmployeeId } = params;

  switch (source) {
    case "direct_supervisor":
      return findDirectSupervisor(requester, employees);
    case "department_head":
      return findDepartmentHead(requester, employees);
    case "hr_role":
      return findHrApprover(requester, employees);
    case "director_role":
      return findDirector(requester, employees);
    case "custom_employee":
      return employees.find((item) => item.id === customEmployeeId) || null;
    default:
      return null;
  }
}

export function getApprovalSourceLabel(source: ApprovalSource) {
  return approvalSourceLabels[source];
}

export function buildApprovalPreview(params: {
  ruleSet: ApprovalRuleSet;
  requesterId: number | null;
  employees: EmployeeRecord[];
}): ApprovalPreviewResult {
  const activeEmployees = sortByOrgPriority(params.employees.filter(isActiveEmployee));
  const requester = activeEmployees.find((item) => item.id === params.requesterId) || null;

  if (!requester) {
    return {
      steps: [],
      warnings: ["Pilih karyawan contoh agar preview approval bisa dihitung otomatis."],
    };
  }

  const warnings: string[] = [];
  const steps = params.ruleSet.steps
    .slice()
    .sort((left, right) => left.stepOrder - right.stepOrder)
    .map((step) => {
      const resolved = resolveApprover({
        source: step.approverSource,
        requester,
        employees: activeEmployees,
        customEmployeeId: step.customEmployeeId,
      });

      if (resolved) {
        return {
          stepOrder: step.stepOrder,
          sourceLabel: getApprovalSourceLabel(step.approverSource),
          approverName: resolved.nama_lengkap,
          approverPosition: resolved.jabatan,
          approverEmployeeId: resolved.employee_id,
          status: "resolved" as const,
          fallbackLabel: step.fallbackSource ? getApprovalSourceLabel(step.fallbackSource) : "-",
          note: step.description,
        };
      }

      const fallbackSource = step.fallbackSource || "none";
      const fallbackApprover =
        fallbackSource !== "none"
          ? resolveApprover({
              source: fallbackSource,
              requester,
              employees: activeEmployees,
              customEmployeeId: step.customEmployeeId,
            })
          : null;

      if (fallbackApprover) {
        warnings.push(`Step ${step.stepOrder} memakai fallback ${getApprovalSourceLabel(fallbackSource)} karena approver utama belum ditemukan.`);
        return {
          stepOrder: step.stepOrder,
          sourceLabel: getApprovalSourceLabel(step.approverSource),
          approverName: fallbackApprover.nama_lengkap,
          approverPosition: fallbackApprover.jabatan,
          approverEmployeeId: fallbackApprover.employee_id,
          status: "fallback" as const,
          fallbackLabel: getApprovalSourceLabel(fallbackSource),
          note: `${step.description} Approver utama tidak ditemukan, sehingga sistem memakai fallback.`,
        };
      }

      warnings.push(`Step ${step.stepOrder} belum bisa di-resolve. Periksa relasi atasan, departemen, atau role approver pada data karyawan.`);
      return {
        stepOrder: step.stepOrder,
        sourceLabel: getApprovalSourceLabel(step.approverSource),
        approverName: "Belum ditemukan",
        approverPosition: "Perlu dirapikan di struktur organisasi",
        approverEmployeeId: "-",
        status: "missing" as const,
        fallbackLabel: fallbackSource !== "none" ? getApprovalSourceLabel(fallbackSource) : "-",
        note: step.description,
      };
    });

  return { steps, warnings };
}
