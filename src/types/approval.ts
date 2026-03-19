export type ApprovalSource =
  | "direct_supervisor"
  | "department_head"
  | "hr_role"
  | "director_role"
  | "custom_employee"
  | "none";

export interface ApprovalRuleStep {
  id: string;
  stepOrder: number;
  approverSource: ApprovalSource;
  approverRole?: string | null;
  approverJobLevel?: string | null;
  customEmployeeId?: number | null;
  fallbackSource?: ApprovalSource | null;
  isRequired: boolean;
  description: string;
}

export interface ApprovalRuleSet {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  transactionLabel: string;
  isActive: boolean;
  notes: string[];
  steps: ApprovalRuleStep[];
}

export interface ApprovalPreviewStep {
  stepOrder: number;
  sourceLabel: string;
  approverName: string;
  approverPosition: string;
  approverEmployeeId: string;
  status: "resolved" | "fallback" | "missing";
  fallbackLabel: string;
  note: string;
}

export interface ApprovalPreviewResult {
  steps: ApprovalPreviewStep[];
  warnings: string[];
}
