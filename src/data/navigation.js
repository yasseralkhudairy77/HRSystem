import {
  AlertCircle,
  BadgeDollarSign,
  Banknote,
  Bot,
  Brain,
  Briefcase,
  Building2,
  DatabaseZap,
  Database,
  FileText,
  Layers3,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  ReceiptText,
  Settings,
  ShieldPlus,
  TimerReset,
  UserRound,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

export const appRoles = {
  owner: "owner",
  hr: "hr",
  agency: "agency",
  supervisor: "supervisor",
};

const allRoles = Object.values(appRoles);

export const sidebarSections = [
  {
    key: "utama",
    title: "Utama",
    roles: allRoles,
    hiddenIfEmpty: false,
    items: [
      { key: "dashboard", route: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: allRoles, enabled: true },
      { key: "alerts", route: "alerts", label: "Perlu Dicek", icon: AlertCircle, roles: allRoles, enabled: true },
    ],
  },
  {
    key: "hr-rekrutmen",
    title: "HR Rekrutmen",
    roles: [appRoles.hr, appRoles.owner, appRoles.agency, appRoles.supervisor],
    hiddenIfEmpty: false,
    items: [
      { key: "hiring-plan", route: "hiring-plan", label: "Kebutuhan Karyawan", icon: Layers3, roles: [appRoles.hr, appRoles.owner, appRoles.agency], enabled: true },
      { key: "jobs", route: "jobs", label: "Lowongan", icon: Briefcase, roles: [appRoles.hr, appRoles.owner, appRoles.agency], enabled: true },
      { key: "candidates", route: "candidates", label: "Data Pelamar", icon: Users, roles: [appRoles.hr, appRoles.agency], enabled: true },
      { key: "assessment", route: "assessment", label: "Bank Tes", icon: Brain, roles: [appRoles.hr, appRoles.agency], enabled: true },
      { key: "psychotest-results", route: "psychotest-results", label: "Hasil Psikotest", icon: FileText, roles: [appRoles.hr, appRoles.agency], enabled: true },
      { key: "interview-ai", route: "interview-ai", label: "Wawancara AI", icon: Bot, roles: [appRoles.hr, appRoles.agency, appRoles.supervisor], enabled: true },
      { key: "interview", route: "interview", label: "Wawancara HRD", icon: UserRound, roles: [appRoles.hr, appRoles.agency, appRoles.supervisor], enabled: true },
      { key: "talent", route: "talent", label: "Cadangan Kandidat", icon: Database, roles: [appRoles.hr, appRoles.agency], enabled: true },
    ],
  },
  {
    key: "hr-administrasi",
    title: "HR Administrasi",
    roles: [appRoles.hr, appRoles.owner, appRoles.agency],
    hiddenIfEmpty: false,
    items: [
      { key: "employees", route: "employees", label: "Data Karyawan", icon: Users, roles: [appRoles.hr, appRoles.owner, appRoles.agency], enabled: true },
      { key: "onboarding", route: "onboarding", label: "Karyawan Baru", icon: FileText, roles: [appRoles.hr, appRoles.agency], enabled: true },
      { key: "contracts", route: "contracts", label: "Kontrak Kerja", icon: FileText, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "letters", route: "letters", label: "Surat & Pengumuman", icon: MessageSquare, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "offboarding", route: "offboarding", label: "Karyawan Keluar", icon: UserRound, roles: [appRoles.hr, appRoles.owner], enabled: true },
    ],
  },
  {
    key: "hr-relasi",
    title: "HR Relasi",
    roles: [appRoles.hr, appRoles.owner, appRoles.supervisor],
    hiddenIfEmpty: false,
    items: [
      { key: "performance", route: "performance", label: "Penilaian Kerja", icon: LineChart, roles: [appRoles.hr, appRoles.owner, appRoles.supervisor], enabled: true },
    ],
  },
  {
    key: "hr-payroll",
    title: "Penggajian",
    roles: [appRoles.hr, appRoles.owner],
    hiddenIfEmpty: false,
    items: [
      { key: "payroll-process", route: "payroll-process", label: "Proses Gaji", icon: Wallet, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "salary-rules", route: "salary-rules", label: "Aturan Gaji", icon: BadgeDollarSign, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "attendance-overtime", route: "attendance-overtime", label: "Kehadiran & Lembur", icon: TimerReset, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "thr-bonus", route: "thr-bonus", label: "THR & Bonus", icon: Banknote, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "payslips", route: "payslips", label: "Slip Gaji", icon: ReceiptText, roles: [appRoles.hr, appRoles.owner], enabled: true },
      { key: "bpjs-tax", route: "bpjs-tax", label: "BPJS & Pajak", icon: ShieldPlus, roles: [appRoles.hr, appRoles.owner], enabled: true },
    ],
  },
  {
    key: "laporan",
    title: "Laporan",
    roles: [appRoles.owner, appRoles.hr, appRoles.agency],
    hiddenIfEmpty: false,
    items: [{ key: "reports", route: "reports", label: "Laporan", icon: LineChart, roles: [appRoles.owner, appRoles.hr, appRoles.agency], enabled: true }],
  },
  {
    key: "workspace-sistem",
    title: "Workspace / Sistem",
    roles: [appRoles.owner, appRoles.agency, appRoles.hr],
    hiddenIfEmpty: false,
    items: [
      { key: "clients", route: "clients", label: "Data Usaha", icon: Building2, roles: [appRoles.owner, appRoles.agency], enabled: true },
      { key: "billing", route: "billing", label: "Paket & Tagihan", icon: Wallet, roles: [appRoles.owner, appRoles.agency], enabled: true },
      { key: "workflow", route: "workflow", label: "Alur Kerja", icon: Workflow, roles: [appRoles.owner, appRoles.agency, appRoles.hr], enabled: true },
      { key: "test-kebutuhan-supabase", route: "test-kebutuhan-supabase", label: "Test Database", icon: DatabaseZap, roles: allRoles, enabled: true },
      { key: "settings", route: "settings", label: "Pengaturan", icon: Settings, roles: allRoles, enabled: true },
    ],
  },
];
