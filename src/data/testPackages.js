const PACKAGE_LINK_BASE = "/tes-paket/index.html";

const BASE_TESTS = {
  disc: { key: "disc", name: "DISC Ringkas", href: "/tes-disc/test.html?test=disc" },
  koran: { key: "koran", name: "Tes Koran / Kraepelin", href: "/tes-koran/index.html" },
  spm: { key: "spm", name: "SPM / Raven Progressive Matrices", href: "/tes-spm/spm_app_modular/index.html" },
  bigFive: { key: "big_five", name: "Big Five Personality", href: "/tes-kepribadian/index.html" },
  holland: { key: "holland", name: "Tes Holland / RIASEC", href: "/tes-holland/index.html" },
};

function createTests(...items) {
  return items.map((item, index) => ({
    key: item.key,
    name: item.name,
    order: index + 1,
    href: item.href,
  }));
}

export const TEST_PACKAGE_TEMPLATES = {
  regular: {
    key: "regular",
    name: "Paket Reguler",
    description: "Paket tes dasar untuk posisi operasional dan administratif umum.",
    defaultDeadlineHours: 48,
    tests: createTests(BASE_TESTS.spm, BASE_TESTS.koran, BASE_TESTS.disc),
  },
  regular_fresh_graduate: {
    key: "regular_fresh_graduate",
    name: "Paket Reguler Fresh Graduate",
    description: "Paket tes dasar dengan tambahan Holland untuk kandidat fresh graduate.",
    defaultDeadlineHours: 48,
    tests: createTests(BASE_TESTS.spm, BASE_TESTS.koran, BASE_TESTS.disc, BASE_TESTS.holland),
  },
  leadership: {
    key: "leadership",
    name: "Paket Leadership",
    description: "Paket tes untuk level mandor, supervisor, dan manager dengan tambahan Big Five.",
    defaultDeadlineHours: 72,
    tests: createTests(BASE_TESTS.spm, BASE_TESTS.koran, BASE_TESTS.disc, BASE_TESTS.bigFive),
  },
  leadership_fresh_graduate: {
    key: "leadership_fresh_graduate",
    name: "Paket Leadership Fresh Graduate",
    description: "Paket leadership dengan tambahan Big Five dan Holland untuk kandidat fresh graduate.",
    defaultDeadlineHours: 72,
    tests: createTests(BASE_TESTS.spm, BASE_TESTS.koran, BASE_TESTS.disc, BASE_TESTS.bigFive, BASE_TESTS.holland),
  },
};

const leadershipKeywords = ["mandor", "supervisor", "manager", "hrd", "koordinator", "kepala", "lead"];

export function resolveTestPackageTemplate(positionName = "", options = {}) {
  const normalizedPosition = String(positionName || "").trim().toLowerCase();
  const isLeadershipRole = leadershipKeywords.some((keyword) => normalizedPosition.includes(keyword));
  const isFreshGraduate = Boolean(options?.freshGraduate);

  if (isLeadershipRole && isFreshGraduate) return TEST_PACKAGE_TEMPLATES.leadership_fresh_graduate;
  if (isLeadershipRole) return TEST_PACKAGE_TEMPLATES.leadership;
  if (isFreshGraduate) return TEST_PACKAGE_TEMPLATES.regular_fresh_graduate;
  return TEST_PACKAGE_TEMPLATES.regular;
}

export function buildPackageItems(templateKey) {
  const template = TEST_PACKAGE_TEMPLATES[templateKey] || TEST_PACKAGE_TEMPLATES.regular;

  return template.tests.map((item) => ({
    test_key: item.key,
    test_name_snapshot: item.name,
    test_order: item.order,
    status: "pending",
    test_url: item.href,
    score_numeric: null,
    score_label: null,
    summary: null,
    result_json: {},
  }));
}

export function buildPackageLink(token) {
  return `${window.location.origin}${PACKAGE_LINK_BASE}?token=${encodeURIComponent(token)}`;
}

export function formatPackageStatusLabel(status) {
  const statusMap = {
    draft: "Belum dikirim",
    sent: "Terkirim",
    opened: "Sudah dibuka",
    in_progress: "Sedang dikerjakan",
    completed: "Selesai",
    reviewed: "Sudah direview",
    expired: "Lewat deadline",
    cancelled: "Dibatalkan",
  };

  return statusMap[status] || status || "-";
}

export function formatPackageItemStatusLabel(status) {
  const statusMap = {
    pending: "Belum mulai",
    in_progress: "Sedang dikerjakan",
    completed: "Selesai",
    incomplete: "Tidak selesai",
    skipped: "Tidak dipakai",
    expired: "Lewat deadline",
  };

  return statusMap[status] || status || "-";
}
