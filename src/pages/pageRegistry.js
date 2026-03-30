import AlertCenterPage from "@/pages/AlertCenterPage";
import ApprovalMatrixPage from "@/pages/ApprovalMatrixPage";
import AssessmentPage from "@/pages/AssessmentPage";
import BillingPage from "@/pages/BillingPage";
import CandidatesPage from "@/pages/CandidatesPage";
import ClientsPage from "@/pages/ClientsPage";
import ContractsPage from "@/pages/ContractsPage";
import DashboardPage from "@/pages/DashboardPage";
import EmployeesPage from "@/pages/EmployeesPage";
import EmployeeAttendanceActionPage from "@/pages/EmployeeAttendanceActionPage";
import EmployeeAttendanceHistoryPage from "@/pages/EmployeeAttendanceHistoryPage";
import EmployeeBreakPage from "@/pages/EmployeeBreakPage";
import EmployeeFaceIdPage from "@/pages/EmployeeFaceIdPage";
import EmployeeHomePage from "@/pages/EmployeeHomePage";
import EmployeeOvertimePage from "@/pages/EmployeeOvertimePage";
import EmployeeProfilePage from "@/pages/EmployeeProfilePage";
import EmployeeRequestFormPage from "@/pages/EmployeeRequestFormPage";
import EmployeeRequestsPage from "@/pages/EmployeeRequestsPage";
import EmployeeSchedulePage from "@/pages/EmployeeSchedulePage";
import EmployeeServicesPage from "@/pages/EmployeeServicesPage";
import EmployeeShiftSwapPage from "@/pages/EmployeeShiftSwapPage";
import HiringPlanPage from "@/pages/HiringPlanPage";
import HrPresensiApprovalPage from "@/pages/HrPresensiApprovalPage";
import HrPresensiBusinessTripPage from "@/pages/HrPresensiBusinessTripPage";
import HrPresensiDashboardPage from "@/pages/HrPresensiDashboardPage";
import HrPresensiDailyAttendancePage from "@/pages/HrPresensiDailyAttendancePage";
import HrPresensiLeavePage from "@/pages/HrPresensiLeavePage";
import HrPresensiReportsPage from "@/pages/HrPresensiReportsPage";
import HrPresensiSettingsPage from "@/pages/HrPresensiSettingsPage";
import InterviewAiPage from "@/pages/InterviewAiPage";
import InterviewPage from "@/pages/InterviewPage";
import JobsPage from "@/pages/JobsPage";
import KebutuhanSupabaseTestPage from "@/pages/KebutuhanSupabaseTestPage";
import LettersPage from "@/pages/LettersPage";
import OffboardingPage from "@/pages/OffboardingPage";
import OfferingPage from "@/pages/OfferingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import OrganizationStructurePage from "@/pages/OrganizationStructurePage";
import PerformancePage from "@/pages/PerformancePage";
import PipelinePage from "@/pages/PipelinePage";
import PsychotestResultsPage from "@/pages/PsychotestResultsPage";
import PayrollAttendancePage from "@/pages/PayrollAttendancePage";
import PayrollBpjsTaxPage from "@/pages/PayrollBpjsTaxPage";
import PayrollPayslipsPage from "@/pages/PayrollPayslipsPage";
import PayrollProcessPage from "@/pages/PayrollProcessPage";
import PayrollRulesPage from "@/pages/PayrollRulesPage";
import PayrollThrBonusPage from "@/pages/PayrollThrBonusPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TalentPoolPage from "@/pages/TalentPoolPage";
import WorkflowPage from "@/pages/WorkflowPage";

export const pageComponents = {
  dashboard: DashboardPage,
  alerts: AlertCenterPage,
  "approval-matrix": ApprovalMatrixPage,
  "hiring-plan": HiringPlanPage,
  jobs: JobsPage,
  "test-kebutuhan-supabase": KebutuhanSupabaseTestPage,
  candidates: CandidatesPage,
  assessment: AssessmentPage,
  "psychotest-results": PsychotestResultsPage,
  "interview-ai": InterviewAiPage,
  pipeline: PipelinePage,
  interview: InterviewPage,
  offering: OfferingPage,
  employees: EmployeesPage,
  "organization-structure": OrganizationStructurePage,
  onboarding: OnboardingPage,
  "employee-home": EmployeeHomePage,
  "employee-schedule": EmployeeSchedulePage,
  "employee-history": EmployeeAttendanceHistoryPage,
  "employee-requests": EmployeeRequestsPage,
  "employee-services": EmployeeServicesPage,
  "employee-profile": EmployeeProfilePage,
  "employee-attendance-action": EmployeeAttendanceActionPage,
  "employee-break": EmployeeBreakPage,
  "employee-request-form": EmployeeRequestFormPage,
  "employee-face-id": EmployeeFaceIdPage,
  "employee-overtime": EmployeeOvertimePage,
  "employee-shift-swap": EmployeeShiftSwapPage,
  "hr-presensi-dashboard": HrPresensiDashboardPage,
  "hr-presensi-absensi-harian": HrPresensiDailyAttendancePage,
  "hr-presensi-dinas-luar": HrPresensiBusinessTripPage,
  "hr-presensi-cuti-izin-sakit": HrPresensiLeavePage,
  "hr-presensi-persetujuan": HrPresensiApprovalPage,
  "hr-presensi-laporan": HrPresensiReportsPage,
  "hr-presensi-pengaturan": HrPresensiSettingsPage,
  contracts: ContractsPage,
  letters: LettersPage,
  performance: PerformancePage,
  "payroll-process": PayrollProcessPage,
  "salary-rules": PayrollRulesPage,
  "attendance-overtime": PayrollAttendancePage,
  "thr-bonus": PayrollThrBonusPage,
  payslips: PayrollPayslipsPage,
  "bpjs-tax": PayrollBpjsTaxPage,
  offboarding: OffboardingPage,
  reports: ReportsPage,
  talent: TalentPoolPage,
  clients: ClientsPage,
  billing: BillingPage,
  workflow: WorkflowPage,
  settings: SettingsPage,
};
