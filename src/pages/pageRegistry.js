import AlertCenterPage from "@/pages/AlertCenterPage";
import AssessmentPage from "@/pages/AssessmentPage";
import BillingPage from "@/pages/BillingPage";
import CandidatesPage from "@/pages/CandidatesPage";
import ClientsPage from "@/pages/ClientsPage";
import ContractsPage from "@/pages/ContractsPage";
import DashboardPage from "@/pages/DashboardPage";
import EmployeesPage from "@/pages/EmployeesPage";
import HiringPlanPage from "@/pages/HiringPlanPage";
import InterviewAiPage from "@/pages/InterviewAiPage";
import InterviewPage from "@/pages/InterviewPage";
import JobsPage from "@/pages/JobsPage";
import KebutuhanSupabaseTestPage from "@/pages/KebutuhanSupabaseTestPage";
import LettersPage from "@/pages/LettersPage";
import OffboardingPage from "@/pages/OffboardingPage";
import OnboardingPage from "@/pages/OnboardingPage";
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
  "hiring-plan": HiringPlanPage,
  jobs: JobsPage,
  "test-kebutuhan-supabase": KebutuhanSupabaseTestPage,
  candidates: CandidatesPage,
  assessment: AssessmentPage,
  "psychotest-results": PsychotestResultsPage,
  "interview-ai": InterviewAiPage,
  pipeline: PipelinePage,
  interview: InterviewPage,
  employees: EmployeesPage,
  onboarding: OnboardingPage,
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
