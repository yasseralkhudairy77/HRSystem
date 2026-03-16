import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clipboard, LoaderCircle, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { discProfiles } from "@/data/discProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createStageHistory } from "@/services/recruitmentWorkflowService";
import { formatPackageItemStatusLabel, formatPackageStatusLabel } from "@/data";
import { updatePelamar } from "@/services/pelamarService";
import {
  getCandidateTestPackageFeatureUnavailableMessage,
  getCandidateTestPackageList,
  isCandidateTestPackageFeatureUnavailable,
  markCandidateTestPackageReviewed,
} from "@/services/candidateTestPackageService";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationFromSeconds(totalSeconds) {
  if (typeof totalSeconds !== "number" || Number.isNaN(totalSeconds) || totalSeconds <= 0) return "-";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}j ${minutes}m ${seconds}d`;
  if (minutes > 0) return `${minutes}m ${seconds}d`;
  return `${seconds}d`;
}

function normalizeWhatsappNumber(rawNumber) {
  const digits = String(rawNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function buildWhatsAppLink(rawNumber, message) {
  const normalizedNumber = normalizeWhatsappNumber(rawNumber);
  if (!normalizedNumber) return "";
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

function appendRecruiterNote(previousNote, nextNote) {
  const note = String(nextNote || "").trim();
  if (!note) return previousNote || null;
  const stampedNote = `[${formatDateTime(new Date().toISOString())}] ${note}`;
  return previousNote ? `${previousNote}\n\n${stampedNote}` : stampedNote;
}

function getPackageStatusClass(status) {
  const map = {
    sent: "border-slate-200 bg-slate-50 text-slate-700",
    opened: "border-sky-200 bg-sky-50 text-sky-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    reviewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
    expired: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return map[status] || "border-slate-200 bg-slate-50 text-slate-700";
}

function getItemStatusClass(status) {
  if (status === "completed") return getPackageStatusClass("completed");
  if (status === "in_progress") return getPackageStatusClass("in_progress");
  if (status === "incomplete") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "expired") return getPackageStatusClass("expired");
  return getPackageStatusClass("sent");
}

function getResultPreview(items) {
  return items.find((entry) => entry.summary)?.summary || "";
}

function getPackageItems(packageRow) {
  return (packageRow.candidate_test_package_items || []).sort((left, right) => left.test_order - right.test_order);
}

function getPackageMetrics(packageRow) {
  const items = getPackageItems(packageRow);
  const completed = items.filter((item) => item.status === "completed").length;
  const inProgress = items.filter((item) => item.status === "in_progress").length;
  const incomplete = items.filter((item) => item.status === "incomplete").length;
  const notStarted = items.filter((item) => item.status === "pending").length;

  return {
    items,
    total: items.length,
    completed,
    inProgress,
    incomplete,
    notStarted,
  };
}

function getPackageAssessment(packageRow) {
  const metrics = getPackageMetrics(packageRow);
  const hasIncomplete = metrics.incomplete > 0;
  const isFullyCompleted = metrics.total > 0 && metrics.completed === metrics.total;
  const isStillRunning = metrics.inProgress > 0 || metrics.notStarted > 0;

  if (hasIncomplete) {
    return {
      tone: "border-orange-200 bg-orange-50 text-orange-700",
      label: "Perlu review manual",
      note: "Ada tes yang tidak diselesaikan. Kandidat perlu ditinjau sebelum lanjut ke tahap berikutnya.",
      icon: AlertTriangle,
    };
  }

  if (isFullyCompleted) {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Siap direview",
      note: "Semua instrumen sudah selesai. Recruiter bisa membaca hasil dan memutuskan langkah berikutnya.",
      icon: CheckCircle2,
    };
  }

  if (isStillRunning) {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      label: "Masih berjalan",
      note: "Paket tes masih dikerjakan atau belum dimulai seluruhnya.",
      icon: LoaderCircle,
    };
  }

  return {
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    label: "Menunggu progres",
    note: "Belum ada hasil yang cukup untuk dibaca recruiter.",
    icon: AlertTriangle,
  };
}

function getItemInsight(item) {
  if (item.test_key === "disc" && item.summary) {
    return {
      heading: "Sorotan DISC",
      values: [
        item.score_label || "Profil terbaca",
        item.result_json?.graph3 ? "Grafik 3 tersedia" : null,
      ].filter(Boolean),
    };
  }

  if (item.test_key === "spm" && item.result_json?.score) {
    return {
      heading: "Sorotan Penalaran",
      values: [
        `Benar ${item.result_json.score.correct ?? 0}/${item.result_json.total_questions ?? 60}`,
        item.score_label || null,
      ].filter(Boolean),
    };
  }

  if (item.test_key === "koran" && item.result_json?.score) {
    return {
      heading: "Sorotan Ketelitian",
      values: [
        `Respons ${item.result_json.score.total_attempts ?? 0}`,
        `Akurasi ${item.result_json.score.accuracy_percent ?? 0}%`,
        item.result_json.performance?.peak_total ? `Puncak ${item.result_json.performance.peak_total}/menit` : null,
      ].filter(Boolean),
    };
  }

  if (item.test_key === "big_five" && Array.isArray(item.result_json?.traits)) {
    const topTrait = [...item.result_json.traits].sort((left, right) => (right.score || 0) - (left.score || 0))[0];
    return {
      heading: "Sorotan Kepribadian",
      values: [
        topTrait ? `${topTrait.label} ${topTrait.score}/100` : null,
        item.score_label || null,
      ].filter(Boolean),
    };
  }

  if (item.test_key === "holland" && Array.isArray(item.result_json?.traits)) {
    const topTrait = [...item.result_json.traits].sort((left, right) => (right.score || 0) - (left.score || 0))[0];
    return {
      heading: "Sorotan Minat Kerja",
      values: [
        item.result_json?.top3 ? `Top 3 ${item.result_json.top3}` : null,
        topTrait ? `${topTrait.label} ${topTrait.score}` : null,
      ].filter(Boolean),
    };
  }

  return null;
}

const DISC_DIMENSIONS = ["D", "I", "S", "C"];

const DISC_GRAPH_META = [
  { key: "graph1", title: "GRAPH 1 MOST", subtitle: "Mask Public Self", color: "#dc2626" },
  { key: "graph2", title: "GRAPH 2 LEAST", subtitle: "Core Private Self", color: "#f59e0b" },
  { key: "graph3", title: "GRAPH 3 CHANGE", subtitle: "Mirror Perceived Self", color: "#2563eb" },
];

const BIG_FIVE_TRAIT_META = [
  { canonical: "E", defaultLabel: "Extraversion", shortLabel: "E", aliases: ["e", "extraversion", "ekstraversion", "extroversion"] },
  { canonical: "A", defaultLabel: "Agreeableness", shortLabel: "A", aliases: ["a", "agreeableness"] },
  { canonical: "C", defaultLabel: "Conscientiousness", shortLabel: "C", aliases: ["c", "conscientiousness"] },
  { canonical: "N", defaultLabel: "Emotional Stability", shortLabel: "ES", aliases: ["n", "neuroticism", "emotionalstability", "stability"] },
  { canonical: "O", defaultLabel: "Openness", shortLabel: "O", aliases: ["o", "openness"] },
];

const BIG_FIVE_RAW_MAX = {
  E: 40,
  A: 45,
  C: 45,
  N: 40,
  O: 50,
};

const HOLLAND_ORDER = ["R", "I", "A", "S", "E", "C"];

const HOLLAND_REF = {
  R: {
    name: "Realistic",
    desc: "Profil ini menyukai pekerjaan yang mencakup masalah dan jawaban praktis dan langsung. Menyukai kegiatan yang melibatkan keterampilan motorik, peralatan, mesin. Seringkali orang dengan minat Realistis tidak menyukai karier yang melibatkan dokumen atau bekerja sama dengan orang lain.",
    jobs: "Mekanik, Insinyur, pengawas bangunan, Petani/Peternak Modern, Atlet, Operator, Polisi, Pemadam Kebakaran, Koki",
  },
  I: {
    name: "Investigative",
    desc: "Profil ini menyukai pekerjaan yang berkaitan dengan ide dan pemikiran. Memilih kegiatan penyelidikan yang observasional, simbolis, sistematis dan kreatif untuk memahami fenomena fisik, biologis dan kultural. Biasanya berprestasi dalam bidang akademik/ilmiah, serta kurang menyukai aktivitas fisik atau memimpin orang.",
    jobs: "Antropologi, Astronomi, Biologi, Botani, Kimia, Editor ilmiah, Geologi, Riset, dan sejenisnya",
  },
  A: {
    name: "Artistic",
    desc: "Profil ini menyukai pekerjaan atau aktivitas yang bebas, tidak sistematis, dan berorientasi penciptaan bentuk atau produk seni. Umumnya kuat pada kompetensi artistik, bahasa, musik, drama, mengarang; namun cenderung kurang menyukai tugas klerikal atau bisnis yang rutin.",
    jobs: "Desainer, Penulis, Musisi, Arsitek, Wartawan, Penari, Translator, Artis, dan sejenisnya",
  },
  S: {
    name: "Social",
    desc: "Profil ini menyukai aktivitas yang melibatkan relasi, komunikasi, dan mengajar orang. Menonjol pada keterampilan sosial dan kebutuhan interaksi. Pekerjaan sering melibatkan membantu atau layanan pada orang lain; namun biasanya kurang tertarik pada tugas teknis atau manual.",
    jobs: "Guru, Terapis, Tour Guide, Perawat, Konselor, Psikolog, Pekerja Sosial, dan sejenisnya",
  },
  E: {
    name: "Enterprising",
    desc: "Profil ini menyukai aktivitas memengaruhi atau mengarahkan orang lain untuk mencapai tujuan organisasi atau keuntungan ekonomi. Cenderung kuat pada kepemimpinan, persuasi, dan komunikasi; namun biasanya kurang menyukai aktivitas ilmiah murni.",
    jobs: "Pengacara, Politikus, Humas, Manajer penjualan, Sales, Perwakilan dagang, dan sejenisnya",
  },
  C: {
    name: "Conventional",
    desc: "Profil ini menyukai aktivitas teratur dan sistematis seperti mengarsipkan, mencatat data, mengolah data, serta mengikuti prosedur dan rutinitas. Umumnya kuat pada kompetensi klerikal atau operasional bisnis; namun cenderung kurang menyukai pekerjaan artistik yang bebas.",
    jobs: "Akuntan, Aktuaris, Statistik, Analis Keuangan, Operator komputer, Pustakawan, Programmer bisnis, Pengarsip, Administrasi",
  },
};

const HOLLAND_CONSISTENCY = {
  RI: "Tinggi",
  RC: "Tinggi",
  IR: "Tinggi",
  IA: "Tinggi",
  AI: "Tinggi",
  AS: "Tinggi",
  SA: "Tinggi",
  SE: "Tinggi",
  ES: "Tinggi",
  CE: "Tinggi",
  EC: "Tinggi",
  RE: "Sedang",
  RA: "Sedang",
  RS: "Sedang",
  SR: "Sedang",
  SC: "Sedang",
  CS: "Sedang",
  IC: "Sedang",
  CI: "Sedang",
  IE: "Sedang",
  EI: "Rendah",
  CA: "Rendah",
  AC: "Rendah",
  AE: "Sedang",
  EA: "Sedang",
  SI: "Sedang",
  IS: "Sedang",
  CR: "Sedang",
  AR: "Sedang",
  ER: "Sedang",
};

const HOLLAND_TOP2_COMBO = {
  AC: { jobs: "Graphic Designer, Proofreader, Web or Mobile Design, UI Designer dan Visual Designer", desc: "Pendekatan kreatif dan berorientasi proses. Membutuhkan cara kerja terstruktur dan andal, sekaligus ide kreatif." },
  AS: { jobs: "Guru, Translator, Nanny, Career Advisor dan Interpreter", desc: "Pendekatan kreatif dan berorientasi manusia. Membutuhkan sisi artistik dan sosial." },
  EC: { jobs: "General Manager, Air Traffic Controller, Branch Manager, Fundraiser, Recruiter dan Shop Assistant", desc: "Pendekatan giat berbasis proses. Butuh tanggung jawab pribadi dan cara kerja terstruktur." },
  IA: { jobs: "Architect, Technical Writer, Animator dan Desktop Publisher", desc: "Berorientasi riset dan kreatif. Menggabungkan analitis atau ilmiah dengan artistik." },
  IC: { jobs: "Pengembang perangkat lunak, UX Designer, Paralegal, Data Analyst dan Quality Controller", desc: "Pendekatan riset dan berbasis proses. Analitis dengan struktur kerja yang rapi." },
  IE: { jobs: "Consultant, Detektif, Solicitor, Market Researcher, Business Controller dan Online Marketer", desc: "Riset plus giat. Analitis, inisiatif, kepemimpinan, dan tanggung jawab." },
  IS: { jobs: "Dokter, Physics Teacher, Nurse, Physiotherapist dan Coach", desc: "Riset plus human-oriented. Analitis sekaligus empatik dan membantu." },
  RA: { jobs: "Photographer, Tailor, Artist, Pastry Chef dan Furniture Designer", desc: "Fisik plus kreatif. Manual skill sekaligus imajinatif." },
  RE: { jobs: "Koki, Engineering Manager, Police Officer, Process Operator dan Taxi Driver", desc: "Fisik plus giat. Manual skill, inisiatif, dan tanggung jawab." },
  AE: { jobs: "Interior Designer, Illustrator, Entrepreneur, Journalist, Producer, Art Director, Copywriter dan Actor", desc: "Kreatif plus giat. Artistik dengan unsur kepemimpinan dan tanggung jawab." },
  RI: { jobs: "Network, Mechanical, Automotive, Electronic Engineer, Building Installer, Pilot, Lab Technician, Product Assembler", desc: "Manual, outdoor, mesin plus analitis. Praktis dan teliti." },
  RS: { jobs: "Asisten perawatan, Firefighter, Masseur, Sports Coach dan Veterinary Assistant", desc: "Fisik plus manusia. Manual skill dan membantu orang lain." },
  SC: { jobs: "Librarian, Telephone Operator, Medical Assistant dan Teaching Assistant", desc: "Orang plus proses. Membantu orang lain dengan kerja terstruktur." },
  RC: { jobs: "Lorry Driver, Machine Operator, Security Guard, Plumber, Cleaner, Warehouse Operative dan Service Technician", desc: "Fisik, manual, outdoor plus teratur dan terstruktur." },
  SE: { jobs: "HR Manager, Account Manager, Customer Service Advisor dan Waiter atau Waitress", desc: "Orang plus giat. Membantu orang sekaligus leadership dan tanggung jawab." },
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asObject(value) {
  return isObject(value) ? value : {};
}

function coerceNumber(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function normalizeTraitToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function getBigFiveTraitMeta(value) {
  const token = normalizeTraitToken(value);
  return BIG_FIVE_TRAIT_META.find((entry) => entry.aliases.includes(token)) || null;
}

function getBigFivePercentFromRaw(canonical, rawScore) {
  const maxScore = BIG_FIVE_RAW_MAX[canonical];
  if (typeof rawScore !== "number" || typeof maxScore !== "number" || maxScore <= 0) return null;
  return Math.round((rawScore / maxScore) * 100);
}

function deriveBigFiveLevel(percent) {
  if (typeof percent !== "number") return "Belum terbaca";
  if (percent <= 33) return "Rendah";
  if (percent <= 66) return "Sedang";
  return "Tinggi";
}

function getBigFiveLevelTone(level) {
  if (level === "Tinggi") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (level === "Sedang") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "Rendah") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getBigFiveResultData(item) {
  const resultJson = asObject(item?.result_json);
  const score = asObject(resultJson.score);
  const percentMap = asObject(score.percent);
  const rawMap = asObject(score.raw);
  const levelMap = asObject(score.level);
  const meta = asObject(resultJson.meta);
  const interpretation = asObject(resultJson.interpretation);
  const inputTraits = Array.isArray(resultJson.traits) ? resultJson.traits : [];

  const traitMap = new Map(
    BIG_FIVE_TRAIT_META.map((entry) => [
      entry.canonical,
      {
        key: entry.canonical,
        label: entry.defaultLabel,
        shortLabel: entry.shortLabel,
        raw: null,
        percent: null,
        level: null,
      },
    ]),
  );

  inputTraits.forEach((trait) => {
    const metaMatch = getBigFiveTraitMeta(trait?.key) || getBigFiveTraitMeta(trait?.label);
    if (!metaMatch) return;

    const rawScore = coerceNumber(trait?.raw) ?? coerceNumber(rawMap[metaMatch.canonical]);
    const percentScore =
      coerceNumber(trait?.percent) ??
      coerceNumber(trait?.score) ??
      coerceNumber(trait?.value) ??
      coerceNumber(percentMap[metaMatch.canonical]) ??
      getBigFivePercentFromRaw(metaMatch.canonical, rawScore);
    const label = typeof trait?.label === "string" && trait.label.trim() ? trait.label.trim() : metaMatch.defaultLabel;
    const useNeuroticismLabel = normalizeTraitToken(label) === "neuroticism";

    traitMap.set(metaMatch.canonical, {
      key: metaMatch.canonical,
      label,
      shortLabel: useNeuroticismLabel ? "N" : metaMatch.shortLabel,
      raw: rawScore,
      percent: percentScore,
      level:
        (typeof trait?.level === "string" && trait.level.trim()) ||
        (typeof levelMap[metaMatch.canonical] === "string" && levelMap[metaMatch.canonical]) ||
        deriveBigFiveLevel(percentScore),
    });
  });

  BIG_FIVE_TRAIT_META.forEach((entry) => {
    const current = traitMap.get(entry.canonical);
    const rawScore = current.raw ?? coerceNumber(rawMap[entry.canonical]);
    const percentScore = current.percent ?? coerceNumber(percentMap[entry.canonical]) ?? getBigFivePercentFromRaw(entry.canonical, rawScore);
    const shouldUseNeuroticismLabel = normalizeTraitToken(current.label) === "neuroticism" || normalizeTraitToken(score.dominantName) === "neuroticism";

    traitMap.set(entry.canonical, {
      ...current,
      label: current.label || (shouldUseNeuroticismLabel ? "Neuroticism" : entry.defaultLabel),
      shortLabel: current.shortLabel || (shouldUseNeuroticismLabel ? "N" : entry.shortLabel),
      raw: rawScore,
      percent: percentScore,
      level: current.level || (typeof levelMap[entry.canonical] === "string" ? levelMap[entry.canonical] : deriveBigFiveLevel(percentScore)),
    });
  });

  const traits = BIG_FIVE_TRAIT_META.map((entry) => traitMap.get(entry.canonical));
  const rankedTraits = [...traits].filter((trait) => typeof trait.percent === "number").sort((left, right) => right.percent - left.percent);
  const dominantCode = String(score.dominant || interpretation.dominant || rankedTraits[0]?.key || "E").toUpperCase();
  const dominantTrait = traits.find((trait) => trait.key === dominantCode) || rankedTraits[0] || traits[0];
  const lowestTrait = rankedTraits.length ? rankedTraits[rankedTraits.length - 1] : null;
  const interpretationLines = Array.isArray(interpretation.lines)
    ? interpretation.lines
        .map((line) => {
          const lineMeta = getBigFiveTraitMeta(line?.trait) || getBigFiveTraitMeta(line?.traitName);
          const fallbackTrait = lineMeta ? traits.find((trait) => trait.key === lineMeta.canonical) : null;
          const text = typeof line?.text === "string" ? line.text.replace(/^\-\s*/, "").trim() : "";
          return {
            traitName: typeof line?.traitName === "string" && line.traitName.trim() ? line.traitName.trim() : fallbackTrait?.label || "-",
            text,
          };
        })
        .filter((line) => line.text)
    : traits
        .filter((trait) => typeof trait.percent === "number")
        .map((trait) => ({
          traitName: trait.label,
          text: `${trait.label} berada pada kategori ${String(trait.level || "").toLowerCase()} dengan skor ${trait.percent}/100.`,
        }));

  return {
    traits,
    dominantTrait,
    lowestTrait,
    interpretationLines,
    durationSec: coerceNumber(meta.durationSec) ?? coerceNumber(resultJson.durationSec),
    summary: typeof item?.summary === "string" ? item.summary : "",
  };
}

function getHollandResultData(item) {
  const resultJson = asObject(item?.result_json);
  const scoresSource = asObject(resultJson.scores);
  const rankedFromJson = Array.isArray(resultJson.rank) ? resultJson.rank : [];
  const traitsFromJson = Array.isArray(resultJson.traits) ? resultJson.traits : [];

  const scores = HOLLAND_ORDER.reduce((accumulator, key) => {
    const directScore = coerceNumber(scoresSource[key]);
    const traitScore =
      directScore ??
      coerceNumber(
        traitsFromJson.find((entry) => String(entry?.key || "").toUpperCase() === key)?.score,
      );
    accumulator[key] = traitScore ?? 0;
    return accumulator;
  }, {});

  const ranked =
    rankedFromJson.length > 0
      ? rankedFromJson
          .map((entry) => ({
            key: String(entry?.k || entry?.key || "").toUpperCase(),
            score: coerceNumber(entry?.v ?? entry?.score) ?? 0,
          }))
          .filter((entry) => HOLLAND_ORDER.includes(entry.key))
          .sort((left, right) => right.score - left.score || HOLLAND_ORDER.indexOf(left.key) - HOLLAND_ORDER.indexOf(right.key))
      : HOLLAND_ORDER.map((key) => ({ key, score: scores[key] ?? 0 })).sort(
          (left, right) => right.score - left.score || HOLLAND_ORDER.indexOf(left.key) - HOLLAND_ORDER.indexOf(right.key),
        );

  const enrichedRanked = ranked.map((entry) => ({
    ...entry,
    label: HOLLAND_REF[entry.key]?.name || entry.key,
    desc: HOLLAND_REF[entry.key]?.desc || "",
    jobs: HOLLAND_REF[entry.key]?.jobs || "",
  }));

  const top3Entries = enrichedRanked.slice(0, 3);
  const top2Code = String(resultJson.top2 || top3Entries.slice(0, 2).map((entry) => entry.key).join("")).toUpperCase();
  const top3Code = String(resultJson.top3 || top3Entries.map((entry) => entry.key).join("")).toUpperCase();
  const reverseTop2Code = top2Code.split("").reverse().join("");
  const consistency = resultJson.consistency || HOLLAND_CONSISTENCY[top2Code] || HOLLAND_CONSISTENCY[reverseTop2Code] || "-";
  const comboInsight = HOLLAND_TOP2_COMBO[top2Code] || HOLLAND_TOP2_COMBO[reverseTop2Code] || null;
  const answered = coerceNumber(resultJson.answered);
  const total = coerceNumber(resultJson.total);
  const completionPercent = typeof answered === "number" && typeof total === "number" && total > 0 ? Math.round((answered / total) * 100) : null;

  return {
    scores,
    ranked: enrichedRanked,
    top3Entries,
    top3Code,
    top2Code,
    consistency,
    comboInsight,
    dominantEntry: top3Entries[0] || null,
    answered,
    total,
    completionPercent,
    summary: typeof item?.summary === "string" ? item.summary : "",
  };
}

function getDurationBetween(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const startDate = new Date(startedAt);
  const endDate = new Date(endedAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const diff = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
  return diff;
}

function getSpmNarrative(percent, classification) {
  if (typeof percent === "number") {
    if (percent >= 80) return "Kemampuan penalaran abstrak terlihat sangat kuat, dengan akurasi tinggi pada sebagian besar pola visual.";
    if (percent >= 65) return "Kemampuan penalaran abstrak berada di level baik dan menunjukkan konsistensi yang solid dalam mengenali pola.";
    if (percent >= 50) return "Kemampuan penalaran abstrak terbaca cukup baik, namun masih ada ruang peningkatan pada ketepatan membaca pola kompleks.";
    return "Hasil menunjukkan kandidat masih perlu penguatan dalam ketelitian membaca pola dan menyusun logika visual secara konsisten.";
  }

  if (classification) return `Estimasi kemampuan berada pada klasifikasi ${classification}.`;
  return "Hasil SPM sudah terbaca dan siap direview recruiter.";
}

function getSpmRoleInsight(percent, classification) {
  if (typeof percent === "number" && percent >= 75) {
    return "Cocok dipertimbangkan untuk peran yang membutuhkan problem solving cepat, analisis pola, dan pemrosesan informasi non-verbal.";
  }
  if (typeof percent === "number" && percent >= 55) {
    return "Cocok untuk peran operasional dan administratif yang membutuhkan logika kerja rapi, dengan dukungan briefing dan struktur yang jelas.";
  }
  if (classification && ["Superior", "High Average", "Average"].includes(classification)) {
    return "Layak dipadukan dengan hasil tes lain dan wawancara untuk melihat kestabilan kemampuan analitis di konteks kerja nyata.";
  }
  return "Perlu dibaca bersama hasil tes lain agar recruiter mendapat gambaran yang lebih utuh tentang kemampuan kognitif kandidat.";
}

function getSpmResultData(item) {
  const resultJson = asObject(item?.result_json);
  const score = asObject(resultJson.score);
  const iqResult = asObject(resultJson.iq_result);
  const correct = coerceNumber(score.correct) ?? 0;
  const wrong = coerceNumber(score.wrong) ?? 0;
  const unanswered = coerceNumber(score.unanswered) ?? 0;
  const total = coerceNumber(score.total) ?? coerceNumber(resultJson.total_questions) ?? correct + wrong + unanswered;
  const percent = coerceNumber(score.percent) ?? (total > 0 ? Math.round((correct / total) * 100) : null);
  const iqScore = coerceNumber(iqResult.iq) ?? coerceNumber(item?.score_numeric);
  const classification =
    (typeof iqResult.classification === "string" && iqResult.classification.trim()) ||
    (typeof item?.score_label === "string" && item.score_label.trim()) ||
    "Belum terklasifikasi";
  const startedAt = resultJson.started_at || item?.started_at || null;
  const endedAt = resultJson.ended_at || item?.completed_at || null;
  const durationSec = getDurationBetween(startedAt, endedAt);
  const completionPercent = total > 0 ? Math.round(((correct + wrong + unanswered) / total) * 100) : null;

  return {
    correct,
    wrong,
    unanswered,
    total,
    percent,
    iqScore,
    classification,
    startedAt,
    endedAt,
    durationSec,
    completionPercent,
    summary: typeof item?.summary === "string" ? item.summary : "",
    narrative: getSpmNarrative(percent, iqResult.classification),
    roleInsight: getSpmRoleInsight(percent, iqResult.classification),
  };
}

function getDiscValue(source, key) {
  const value = source?.[key];
  return typeof value === "number" ? value : null;
}

function formatDiscValue(value) {
  return typeof value === "number" ? value : "-";
}

function getDiscTotal(source) {
  return ["D", "I", "S", "C", "*"].reduce((total, key) => total + (typeof source?.[key] === "number" ? source[key] : 0), 0);
}

function getDiscResultData(item) {
  const resultJson = asObject(item?.result_json);
  const score = asObject(resultJson.score);
  const graph = asObject(score.graph);
  const meta = asObject(resultJson.meta);
  const interpretation = asObject(resultJson.interpretation);
  const flags = Array.isArray(resultJson.flags) ? resultJson.flags : Array.isArray(item?.flags) ? item.flags : [];
  const dominantCode = String(resultJson.dominant_code || score.dominant || "D").toUpperCase();
  const profile = discProfiles[dominantCode] || discProfiles.D;

  return {
    profile,
    dominantCode,
    most: asObject(resultJson.most || score.most),
    least: asObject(resultJson.least || score.least),
    diff: asObject(resultJson.diff || score.diff),
    graph1: asObject(resultJson.graph1 || graph.line1),
    graph2: asObject(resultJson.graph2 || graph.line2),
    graph3: asObject(resultJson.graph3 || graph.line3),
    interpretation,
    flags,
    durationSec: typeof meta.durationSec === "number" ? meta.durationSec : null,
  };
}

function DiscMiniChart({ data, color }) {
  const values = DISC_DIMENSIONS.map((dimension) => {
    const value = getDiscValue(data, dimension);
    return value === null ? 0 : value;
  });
  const minValue = Math.min(-8, ...values);
  const maxValue = Math.max(8, ...values);
  const width = 250;
  const height = 320;
  const margin = { top: 16, right: 14, bottom: 42, left: 28 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const stepX = innerWidth / Math.max(DISC_DIMENSIONS.length - 1, 1);
  const ticks = [];

  for (let tick = Math.ceil(minValue); tick <= Math.floor(maxValue); tick += 2) {
    ticks.push(tick);
  }

  const getX = (index) => margin.left + index * stepX;
  const getY = (value) => margin.top + ((maxValue - value) / Math.max(maxValue - minValue, 1)) * innerHeight;
  const points = DISC_DIMENSIONS.map((dimension, index) => `${getX(index)},${getY(getDiscValue(data, dimension) ?? 0)}`).join(" ");

  return (
    <svg className="mt-2 h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik DISC per dimensi D I S C">
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={margin.left}
            y1={getY(tick)}
            x2={width - margin.right}
            y2={getY(tick)}
            stroke={tick === 0 ? "#a8b4c9" : "#e6edf7"}
            strokeWidth={tick === 0 ? 1.6 : 1}
          />
          <text x={margin.left - 6} y={getY(tick) + 3} textAnchor="end" fontSize="9" fill="#60708a">
            {tick}
          </text>
        </g>
      ))}
      {DISC_DIMENSIONS.map((dimension, index) => (
        <g key={dimension}>
          <line x1={getX(index)} y1={margin.top} x2={getX(index)} y2={height - margin.bottom} stroke="#eef3fb" strokeWidth="1" />
          <text x={getX(index)} y={height - margin.bottom + 16} textAnchor="middle" fontSize="10" fill="#334155" fontWeight="700">
            {dimension}
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      {DISC_DIMENSIONS.map((dimension, index) => {
        const value = getDiscValue(data, dimension) ?? 0;
        const x = getX(index);
        const y = getY(value);

        return (
          <g key={dimension}>
            <circle cx={x} cy={y} r="3.4" fill={color} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
              {formatDiscValue(getDiscValue(data, dimension))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DiscListCard({ title, items, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-800 bg-white ${className}`}>
      <div className="bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">{title}</div>
      <ul className="space-y-2 px-5 py-4 text-sm leading-6 text-[var(--text-main)]">
        {(items?.length ? items : ["-"]).map((entry) => (
          <li key={entry} className="list-disc">
            {entry}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BigFiveRadarChart({ traits }) {
  const size = 360;
  const center = size / 2;
  const radius = 112;
  const levels = [20, 40, 60, 80, 100];

  const getAngle = (index) => -90 + (index * 360) / Math.max(traits.length, 1);
  const getPoint = (value, index, extraRadius = 0) => {
    const angle = (getAngle(index) * Math.PI) / 180;
    const pointRadius = (radius + extraRadius) * (value / 100);
    return {
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius,
    };
  };
  const polygonPoints = traits
    .map((trait, index) => {
      const percent = typeof trait.percent === "number" ? trait.percent : 0;
      const point = getPoint(percent, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[360px]" role="img" aria-label="Radar chart Big Five">
      {levels.map((level) => {
        const points = traits
          .map((_, index) => {
            const point = getPoint(level, index);
            return `${point.x},${point.y}`;
          })
          .join(" ");

        return <polygon key={level} points={points} fill={level === 100 ? "#f8fafc" : "none"} stroke="#d8e2ef" strokeWidth="1" />;
      })}

      {traits.map((trait, index) => {
        const endPoint = getPoint(100, index);
        const labelPoint = getPoint(100, index, 24);
        const anchor = labelPoint.x > center + 8 ? "start" : labelPoint.x < center - 8 ? "end" : "middle";

        return (
          <g key={trait.key}>
            <line x1={center} y1={center} x2={endPoint.x} y2={endPoint.y} stroke="#d8e2ef" strokeWidth="1" />
            <text x={labelPoint.x} y={labelPoint.y} textAnchor={anchor} dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#334155">
              {trait.shortLabel}
            </text>
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="rgba(30, 79, 143, 0.14)" stroke="#1e4f8f" strokeWidth="2.5" />

      {traits.map((trait, index) => {
        const point = getPoint(typeof trait.percent === "number" ? trait.percent : 0, index);
        return (
          <g key={`${trait.key}-point`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#1e4f8f" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e3a5f">
              {typeof trait.percent === "number" ? trait.percent : "-"}
            </text>
          </g>
        );
      })}

      <circle cx={center} cy={center} r="3" fill="#1e4f8f" />
    </svg>
  );
}

function HollandRadarChart({ ranked, maxScore }) {
  const size = 320;
  const center = size / 2;
  const radius = 104;
  const levels = [25, 50, 75, 100];
  const safeMax = Math.max(maxScore || 1, 1);
  const traits = HOLLAND_ORDER.map((key) => ranked.find((entry) => entry.key === key) || { key, label: HOLLAND_REF[key]?.name || key, score: 0 });

  const getAngle = (index) => -90 + (index * 360) / Math.max(traits.length, 1);
  const getPoint = (ratio, index, extraRadius = 0) => {
    const angle = (getAngle(index) * Math.PI) / 180;
    const pointRadius = (radius + extraRadius) * ratio;
    return {
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius,
    };
  };

  const polygonPoints = traits
    .map((trait, index) => {
      const point = getPoint((trait.score || 0) / safeMax, index);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[320px]" role="img" aria-label="Radar chart Holland RIASEC">
      {levels.map((level) => {
        const points = traits
          .map((_, index) => {
            const point = getPoint(level / 100, index);
            return `${point.x},${point.y}`;
          })
          .join(" ");

        return <polygon key={level} points={points} fill={level === 100 ? "#f8fbff" : "none"} stroke="#d6deea" strokeWidth="1" />;
      })}

      {traits.map((trait, index) => {
        const endPoint = getPoint(1, index);
        const labelPoint = getPoint(1, index, 20);
        const anchor = labelPoint.x > center + 8 ? "start" : labelPoint.x < center - 8 ? "end" : "middle";

        return (
          <g key={trait.key}>
            <line x1={center} y1={center} x2={endPoint.x} y2={endPoint.y} stroke="#d6deea" strokeWidth="1" />
            <text x={labelPoint.x} y={labelPoint.y} textAnchor={anchor} dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#5e7088">
              {trait.key}
            </text>
          </g>
        );
      })}

      <polygon points={polygonPoints} fill="rgba(74,127,197,0.14)" stroke="#4a7fc5" strokeWidth="2.5" />

      {traits.map((trait, index) => {
        const point = getPoint((trait.score || 0) / safeMax, index);
        return (
          <g key={`${trait.key}-point`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#4a7fc5" />
            <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#163d70">
              {trait.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SpmGauge({ percent }) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safePercent / 100) * circumference;

  return (
    <svg viewBox="0 0 160 160" className="h-36 w-36" role="img" aria-label="Gauge performa SPM">
      <defs>
        <linearGradient id="spmGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a7fc5" />
          <stop offset="100%" stopColor="#59a9b2" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="80"
        cy="80"
        r={radius}
        fill="none"
        stroke="url(#spmGaugeGradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 80 80)"
      />
      <text x="80" y="74" textAnchor="middle" fontSize="28" fontWeight="800" fill="#10233f">
        {safePercent}%
      </text>
      <text x="80" y="96" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5e7088">
        Akurasi
      </text>
    </svg>
  );
}

function BigFiveDetailedResult({ item, candidate, packageName }) {
  const bigFive = getBigFiveResultData(item);
  const radarLegend = bigFive.traits.map((trait) => `${trait.shortLabel}=${trait.label}`).join(", ");

  return (
    <div className="mt-4 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-white">
        <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(135deg,rgba(16,44,82,0.06),rgba(30,79,143,0.02))] px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Hasil Big Five</div>
              <div className="mt-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">Ringkasan skor dan interpretasi</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">Format hasil disusun mengikuti tampilan aplikasi Big Five referensi.</div>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Trait dominan</div>
              <div className="mt-1 text-lg font-semibold text-[var(--text-main)]">{bigFive.dominantTrait?.label || "-"}</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">
                {typeof bigFive.dominantTrait?.percent === "number" ? `${bigFive.dominantTrait.percent}/100` : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 text-sm text-[var(--text-main)] sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-xs text-[var(--text-soft)]">Nama</div>
            <div className="font-semibold">{candidate?.nama_lengkap || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">Posisi</div>
            <div className="font-semibold">{candidate?.posisi_dilamar || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">Paket Tes</div>
            <div className="font-semibold">{packageName || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">Durasi</div>
            <div className="font-semibold">{bigFive.durationSec !== null ? `${bigFive.durationSec} detik` : "-"}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
          <div className="text-base font-semibold text-[var(--text-main)]">Radar Chart (0-100)</div>
          <div className="mt-4">
            <BigFiveRadarChart traits={bigFive.traits} />
          </div>
          <div className="mt-4 text-xs leading-5 text-[var(--text-muted)]">Label radar: {radarLegend}</div>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
          <div className="text-base font-semibold text-[var(--text-main)]">Skor</div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--surface-0)] text-[var(--text-main)]">
                  <th className="border border-[var(--border-soft)] px-3 py-2 text-left font-semibold">Trait</th>
                  <th className="border border-[var(--border-soft)] px-3 py-2 text-center font-semibold">Skor</th>
                  <th className="border border-[var(--border-soft)] px-3 py-2 text-center font-semibold">%</th>
                  <th className="border border-[var(--border-soft)] px-3 py-2 text-center font-semibold">Tingkat</th>
                </tr>
              </thead>
              <tbody>
                {bigFive.traits.map((trait) => (
                  <tr key={trait.key}>
                    <td className="border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">
                      <div className="font-semibold">{trait.label}</div>
                      <div className="text-xs text-[var(--text-soft)]">{trait.shortLabel}</div>
                    </td>
                    <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{typeof trait.raw === "number" ? trait.raw : typeof trait.percent === "number" ? `${trait.percent}/100` : "-"}</td>
                    <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{typeof trait.percent === "number" ? `${trait.percent}%` : "-"}</td>
                    <td className="border border-[var(--border-soft)] px-3 py-2 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getBigFiveLevelTone(trait.level)}`}>
                        {trait.level || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Trait Dominan</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                {bigFive.dominantTrait?.label || "-"}
                {typeof bigFive.dominantTrait?.percent === "number" ? ` (${bigFive.dominantTrait.percent}/100)` : ""}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Trait Relatif Rendah</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">
                {bigFive.lowestTrait?.label || "-"}
                {typeof bigFive.lowestTrait?.percent === "number" ? ` (${bigFive.lowestTrait.percent}/100)` : ""}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-base font-semibold text-[var(--text-main)]">Interpretasi</div>
        {bigFive.summary ? <p className="mt-3 text-sm leading-7 text-[var(--text-main)]">{bigFive.summary}</p> : null}
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-main)]">
          {bigFive.interpretationLines.map((line) => (
            <li key={`${line.traitName}-${line.text}`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
              <span className="font-semibold">{line.traitName}:</span> {line.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {bigFive.traits.map((trait) => (
          <div key={`${trait.key}-card`} className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{trait.label}</div>
            <div className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
              {typeof trait.percent === "number" ? `${trait.percent}/100` : "-"}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[var(--brand-700)]" style={{ width: `${Math.max(0, Math.min(100, trait.percent || 0))}%` }} />
            </div>
            <div className="mt-3">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getBigFiveLevelTone(trait.level)}`}>
                {trait.level || "-"}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function HollandDetailedResult({ item, candidate, packageName }) {
  const holland = getHollandResultData(item);
  const maxScore = Math.max(...Object.values(holland.scores), 1);

  return (
    <div className="mt-4 space-y-4">
      <section className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(135deg,rgba(30,79,143,0.08),rgba(110,168,223,0.04))] px-5 py-4">
          <div className="text-[1.15rem] font-semibold tracking-[-0.02em] text-[var(--text-main)]">Hasil & Interpretasi</div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Struktur hasil mengikuti tampilan aplikasi Holland referensi: KPI, skor per dimensi, tag top 3, dan insight kombinasi.
          </div>
        </div>

        <div className="grid gap-4 border-b border-[var(--border-soft)] px-5 py-5 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Nama</div>
            <div className="mt-1 font-semibold text-[var(--text-main)]">{candidate?.nama_lengkap || "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Posisi</div>
            <div className="mt-1 font-semibold text-[var(--text-main)]">{candidate?.posisi_dilamar || "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Paket Tes</div>
            <div className="mt-1 font-semibold text-[var(--text-main)]">{packageName || "-"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Dominan</div>
            <div className="mt-1 font-semibold text-[var(--text-main)]">
              {holland.dominantEntry ? `${holland.dominantEntry.key} (${holland.dominantEntry.label})` : "-"}
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
            <div className="text-sm font-semibold text-[var(--text-main)]">Kode Utama (Top 3)</div>
            <div className="mt-2 text-[2rem] font-black tracking-[0.08em] text-[var(--brand-900)]">{holland.top3Code || "-"}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {holland.dominantEntry ? `Dominan: ${holland.dominantEntry.key} (${holland.dominantEntry.label})` : "Belum ada hasil dominan."}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
            <div className="text-sm font-semibold text-[var(--text-main)]">Pasangan Teratas</div>
            <div className="mt-2 text-[2rem] font-black tracking-[0.08em] text-[var(--brand-900)]">{holland.top2Code || "-"}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">Konsistensi: {holland.consistency}</div>
          </div>
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
            <div className="text-sm font-semibold text-[var(--text-main)]">Status Pengisian</div>
            <div className="mt-2 text-[2rem] font-black tracking-[-0.03em] text-[var(--brand-900)]">
              {typeof holland.completionPercent === "number" ? `${holland.completionPercent}%` : "100%"}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              {typeof holland.answered === "number" && typeof holland.total === "number" ? `${holland.answered} dari ${holland.total} terjawab` : "Hasil sudah tersimpan di sistem"}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">Skor per dimensi</div>
            <div className="mt-3 space-y-3">
              {HOLLAND_ORDER.map((key) => {
                const score = holland.scores[key] ?? 0;
                const fillWidth = Math.round((score / maxScore) * 100);
                return (
                  <div key={key} className="grid grid-cols-[30px_minmax(0,1fr)_44px] items-center gap-3">
                    <div className="text-sm font-extrabold text-[var(--brand-900)]">{key}</div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${fillWidth}%`,
                          background: "linear-gradient(90deg, rgba(74,127,197,0.92), rgba(85,169,178,0.88))",
                        }}
                      />
                    </div>
                    <div className="text-right text-sm font-extrabold text-[var(--text-main)]">{score}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">Top 3 Tags</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {holland.top3Entries.map((entry) => (
                <span key={entry.key} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-extrabold text-[var(--text-main)]">
                  <strong>{entry.key}</strong>
                  <span className="font-semibold text-[var(--text-muted)]">{entry.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-base font-semibold text-[var(--text-main)]">Interpretasi Top 3 RIASEC</div>
        {holland.summary ? <p className="mt-3 text-sm leading-7 text-[var(--text-main)]">{holland.summary}</p> : null}
        <div className="mt-4 space-y-3">
          {holland.top3Entries.map((entry) => (
            <div key={`${entry.key}-interpretation`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--text-main)]">
                {entry.key} - {entry.label}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{entry.desc}</p>
              <div className="mt-2 text-sm leading-6 text-[var(--text-main)]">
                <span className="font-semibold">Contoh pekerjaan:</span> {entry.jobs}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-base font-semibold text-[var(--text-main)]">Insight Pasangan {holland.top2Code || "-"}</div>
        <div className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
          {holland.comboInsight ? (
            <>
              <p className="text-sm leading-6 text-[var(--text-main)]">{holland.comboInsight.desc}</p>
              <div className="mt-2 text-sm leading-6 text-[var(--text-main)]">
                <span className="font-semibold">Contoh profesi:</span> {holland.comboInsight.jobs}
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              Referensi pasangan ini belum tersedia di tabel kombinasi. Top 3 tetap bisa dipakai sebagai arah minat dominan kandidat.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {holland.ranked.map((entry) => (
          <div key={`${entry.key}-trait`} className="rounded-xl border border-[var(--border-soft)] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{entry.label}</div>
                <div className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{entry.score}</div>
              </div>
              <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1 text-xs font-extrabold text-[var(--text-main)]">
                {entry.key}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((entry.score / maxScore) * 100)}%`,
                  background: "linear-gradient(90deg, rgba(74,127,197,0.92), rgba(85,169,178,0.88))",
                }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-base font-semibold text-[var(--text-main)]">Radar Chart RIASEC</div>
        <div className="mt-1 text-sm text-[var(--text-muted)]">Visual pelengkap untuk melihat sebaran minat pada enam dimensi Holland.</div>
        <div className="mt-5">
          <HollandRadarChart ranked={holland.ranked} maxScore={maxScore} />
        </div>
      </section>
    </div>
  );
}

function SpmDetailedResult({ item, candidate, packageName }) {
  const spm = getSpmResultData(item);
  const answeredTotal = spm.correct + spm.wrong + spm.unanswered;
  const safeTotal = Math.max(spm.total || answeredTotal, 1);
  const correctWidth = Math.round((spm.correct / safeTotal) * 100);
  const wrongWidth = Math.round((spm.wrong / safeTotal) * 100);
  const unansweredWidth = Math.max(0, 100 - correctWidth - wrongWidth);

  return (
    <div className="mt-4 space-y-4">
      <section className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(135deg,rgba(30,79,143,0.08),rgba(110,168,223,0.04))] px-5 py-4">
          <div className="text-[1.15rem] font-semibold tracking-[-0.02em] text-[var(--text-main)]">Hasil SPM</div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            Ringkasan kemampuan penalaran abstrak kandidat dengan fokus pada akurasi, estimasi IQ, dan kesiapan dibaca recruiter.
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.25fr)_220px] lg:items-center">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Nama</div>
                <div className="mt-1 font-semibold text-[var(--text-main)]">{candidate?.nama_lengkap || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Posisi</div>
                <div className="mt-1 font-semibold text-[var(--text-main)]">{candidate?.posisi_dilamar || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Paket Tes</div>
                <div className="mt-1 font-semibold text-[var(--text-main)]">{packageName || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-soft)]">Durasi</div>
                <div className="mt-1 font-semibold text-[var(--text-main)]">{formatDurationFromSeconds(spm.durationSec)}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))]">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Skor Utama</div>
                <div className="mt-2 text-[2.2rem] font-black tracking-[-0.04em] text-[var(--brand-900)]">
                  {spm.correct}/{spm.total || "-"}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{spm.narrative}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Estimasi IQ</div>
                <div className="mt-2 text-[2rem] font-black tracking-[-0.03em] text-[var(--brand-900)]">{spm.iqScore ?? "-"}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{spm.classification}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Status Pengerjaan</div>
                <div className="mt-2 text-[2rem] font-black tracking-[-0.03em] text-[var(--brand-900)]">
                  {typeof spm.completionPercent === "number" ? `${spm.completionPercent}%` : "100%"}
                </div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{answeredTotal} respons terekam</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <SpmGauge percent={spm.percent || 0} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-base font-semibold text-[var(--text-main)]">Breakdown Jawaban</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Benar", spm.correct, "bg-emerald-50 text-emerald-700 border-emerald-200"],
            ["Salah", spm.wrong, "bg-rose-50 text-rose-700 border-rose-200"],
            ["Kosong", spm.unanswered, "bg-slate-50 text-slate-700 border-slate-200"],
          ].map(([label, value, tone]) => (
            <div key={label} className={`rounded-xl border px-4 py-4 ${tone}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</div>
              <div className="mt-2 text-[1.8rem] font-bold tracking-[-0.03em]">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full bg-emerald-500" style={{ width: `${correctWidth}%` }} />
            <div className="h-full bg-rose-400" style={{ width: `${wrongWidth}%` }} />
            <div className="h-full bg-slate-300" style={{ width: `${unansweredWidth}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
            <span>Hijau = benar</span>
            <span>Merah = salah</span>
            <span>Abu = kosong</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
          <div className="text-base font-semibold text-[var(--text-main)]">Interpretasi</div>
          {spm.summary ? <p className="mt-3 text-sm leading-7 text-[var(--text-main)]">{spm.summary}</p> : null}
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{spm.narrative}</p>
          <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Catatan Recruiter</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">{spm.roleInsight}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
          <div className="text-base font-semibold text-[var(--text-main)]">Sorotan Hasil</div>
          <div className="mt-4 grid gap-3">
            {[
              ["Akurasi", typeof spm.percent === "number" ? `${spm.percent}%` : "-", "Ketepatan jawaban dari total soal."],
              ["Klasifikasi", spm.classification, "Estimasi level kemampuan berdasarkan konversi skor mentah."],
              ["Waktu pengerjaan", formatDurationFromSeconds(spm.durationSec), "Dihitung dari waktu mulai dan selesai yang tersimpan."],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</div>
                <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">{value}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function normalizePdfText(value) {
  return String(value ?? "-")
    .replace(/[•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCaseLabel(value) {
  return normalizePdfText(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncatePdfText(value, maxLength = 150) {
  const safeText = normalizePdfText(value);
  if (safeText.length <= maxLength) return safeText;
  return `${safeText.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function getShortReportTestSummary(item) {
  const startedText = formatDateTime(item.started_at);
  const completedText = formatDateTime(item.completed_at);
  const base = {
    title: `${item.test_order}. ${item.test_name_snapshot}`,
    status: formatPackageItemStatusLabel(item.status),
    score: item.score_label || (item.score_numeric !== null ? `Skor ${item.score_numeric}` : "-"),
    time: `Mulai ${startedText} | Selesai ${completedText}`,
    summary: truncatePdfText(item.summary || "Hasil tes sudah masuk ke sistem.", 145),
  };

  if (item.test_key === "spm") {
    const spm = getSpmResultData(item);
    return {
      ...base,
      score: spm.iqScore ? `IQ ${spm.iqScore} - ${spm.classification}` : base.score,
      summary: truncatePdfText(
        `Benar ${spm.correct}/${spm.total}, akurasi ${spm.percent ?? "-"}%, durasi ${formatDurationFromSeconds(spm.durationSec)}. ${spm.narrative}`,
        145,
      ),
    };
  }

  if (item.test_key === "disc") {
    const disc = getDiscResultData(item);
    return {
      ...base,
      score: `Dominan ${disc.profile.title}`,
      summary: truncatePdfText(
        `${item.summary || ""} Kelebihan utama: ${(disc.profile.strengths || []).slice(0, 2).join(", ")}.`,
        145,
      ),
    };
  }

  if (item.test_key === "big_five") {
    const bigFive = getBigFiveResultData(item);
    return {
      ...base,
      score: `${bigFive.dominantTrait?.label || "-"} / ${bigFive.dominantTrait?.percent ?? "-"} `,
      summary: truncatePdfText(
        `Trait dominan ${bigFive.dominantTrait?.label || "-"} (${bigFive.dominantTrait?.percent ?? "-"}/100), trait relatif rendah ${bigFive.lowestTrait?.label || "-"}. ${item.summary || ""}`,
        145,
      ),
    };
  }

  if (item.test_key === "holland") {
    const holland = getHollandResultData(item);
    return {
      ...base,
      score: `Top 3 ${holland.top3Code || "-"}`,
      summary: truncatePdfText(
        `Dominan ${holland.dominantEntry?.label || "-"}, pasangan ${holland.top2Code || "-"}, konsistensi ${holland.consistency || "-"}. ${item.summary || ""}`,
        145,
      ),
    };
  }

  if (item.test_key === "koran") {
    const score = asObject(item.result_json?.score);
    const peak = asObject(item.result_json?.performance)?.peak_total;
    return {
      ...base,
      score: `Akurasi ${score.accuracy_percent ?? "-"}%`,
      summary: truncatePdfText(
        `Respons ${score.total_attempts ?? "-"}, benar ${score.correct ?? "-"}, salah ${score.wrong ?? "-"}, rata-rata ${score.average_per_minute ?? "-"}/menit${peak ? `, puncak ${peak}/menit` : ""}.`,
        145,
      ),
    };
  }

  return base;
}

async function downloadPsychotestReport(packageRow) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;
  const pageBottom = pageHeight - margin;
  const packageMetrics = getPackageMetrics(packageRow);
  const packageAssessment = getPackageAssessment(packageRow);
  const candidate = packageRow?.pelamar || {};
  let y = margin;

  function ensureSpace(minHeight = 24) {
    if (y + minHeight > pageBottom) {
      doc.addPage();
      y = margin;
    }
  }

  function setBodyStyle() {
    doc.setTextColor(16, 35, 63);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
  }

  function addWrappedText(text, options = {}) {
    const {
      x = margin,
      width = contentWidth,
      size = 10.5,
      color = [16, 35, 63],
      style = "normal",
      lineHeight = 15,
      spacingAfter = 8,
    } = options;
    const safeText = normalizePdfText(text || "-");
    const lines = doc.splitTextToSize(safeText, width);
    ensureSpace(lines.length * lineHeight + spacingAfter);
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(lines, x, y);
    y += lines.length * lineHeight + spacingAfter;
  }

  function addSectionTitle(title) {
    ensureSpace(36);
    doc.setFillColor(16, 44, 82);
    doc.roundedRect(margin, y, contentWidth, 22, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(normalizePdfText(title), margin + 12, y + 15);
    y += 34;
  }

  function addDivider() {
    ensureSpace(12);
    doc.setDrawColor(214, 222, 234);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  }

  function addInfoGrid(rows) {
    const colGap = 22;
    const colWidth = (contentWidth - colGap) / 2;
    rows.forEach((row) => {
      ensureSpace(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(123, 138, 161);
      doc.text(normalizePdfText(row[0][0]), margin, y);
      doc.text(normalizePdfText(row[1][0]), margin + colWidth + colGap, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(16, 35, 63);
      const leftLines = doc.splitTextToSize(normalizePdfText(row[0][1]), colWidth);
      const rightLines = doc.splitTextToSize(normalizePdfText(row[1][1]), colWidth);
      const maxLines = Math.max(leftLines.length, rightLines.length);
      doc.text(leftLines, margin, y + 14);
      doc.text(rightLines, margin + colWidth + colGap, y + 14);
      y += maxLines * 14 + 16;
    });
  }

  function addBulletList(title, items) {
    const safeItems = (items || []).filter(Boolean);
    if (!safeItems.length) return;
    addWrappedText(title, { style: "bold", spacingAfter: 6 });
    safeItems.forEach((entry) => {
      addWrappedText(`- ${entry}`, { x: margin + 8, width: contentWidth - 8, spacingAfter: 4 });
    });
    y += 4;
  }

  function addKeyValueRow(label, value) {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 35, 63);
    doc.text(`${normalizePdfText(label)}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(normalizePdfText(value), margin + 120, y);
    y += 16;
  }

  doc.setFillColor(247, 249, 252);
  doc.roundedRect(margin, y, contentWidth, 92, 14, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(16, 44, 82);
  doc.text("LAPORAN HASIL PSIKOTEST KANDIDAT", margin + 18, y + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(94, 112, 136);
  doc.text(`Nama Kandidat: ${normalizePdfText(candidate?.nama_lengkap || "-")}`, margin + 18, y + 50);
  doc.text(`Posisi Dilamar: ${normalizePdfText(candidate?.posisi_dilamar || "-")}`, margin + 18, y + 66);
  doc.text(`Paket Tes: ${normalizePdfText(packageRow?.template_name || "-")}`, margin + 18, y + 82);
  doc.text(`Tanggal Laporan: ${normalizePdfText(formatDateTime(new Date().toISOString()))}`, pageWidth - margin - 180, y + 50);
  doc.text(`Status Paket: ${normalizePdfText(formatPackageStatusLabel(packageRow?.status || "-"))}`, pageWidth - margin - 180, y + 66);
  doc.text(`Direview: ${normalizePdfText(formatDateTime(packageRow?.reviewed_at))}`, pageWidth - margin - 180, y + 82);
  y += 112;

  addSectionTitle("Ringkasan Paket");
  addInfoGrid([
    [
      ["Nama paket", packageRow?.template_name || "-"],
      ["Status", formatPackageStatusLabel(packageRow?.status || "-")],
    ],
    [
      ["Dikirim pada", formatDateTime(packageRow?.sent_at)],
      ["Deadline", formatDateTime(packageRow?.deadline_at)],
    ],
    [
      ["Dibuka", formatDateTime(packageRow?.opened_at)],
      ["Selesai", formatDateTime(packageRow?.completed_at)],
    ],
    [
      ["Direview", formatDateTime(packageRow?.reviewed_at)],
      ["Dikirim oleh", packageRow?.created_by || "-"],
    ],
  ]);
  addWrappedText(
    `Paket ini berisi ${packageMetrics.total} instrumen. Tercatat ${packageMetrics.completed} selesai, ${packageMetrics.inProgress} masih berjalan, dan ${packageMetrics.incomplete} tidak selesai.`,
    { spacingAfter: 6 },
  );
  addWrappedText(packageAssessment.note, { color: [94, 112, 136], spacingAfter: 10 });
  addDivider();

  addSectionTitle("Ringkasan Eksekutif");
  addWrappedText(
    "Dokumen ini disusun untuk membantu recruiter membaca hasil tes kandidat secara sistematis. Setiap instrumen tetap perlu dibaca bersama CV, hasil wawancara, dan kebutuhan jabatan agar keputusan rekrutmen tetap kontekstual.",
  );

  getPackageItems(packageRow).forEach((item) => {
    addSectionTitle(`${item.test_order}. ${item.test_name_snapshot}`);
    addKeyValueRow("Status", formatPackageItemStatusLabel(item.status));
    addKeyValueRow("Mulai", formatDateTime(item.started_at));
    addKeyValueRow("Selesai", formatDateTime(item.completed_at));
    if (item.score_label) addKeyValueRow("Label skor", item.score_label);
    if (item.score_numeric !== null) addKeyValueRow("Skor numerik", String(item.score_numeric));
    if (item.summary) addWrappedText(item.summary, { color: [94, 112, 136], spacingAfter: 10 });

    if (item.test_key === "spm") {
      const spm = getSpmResultData(item);
      addWrappedText("Sorotan hasil", { style: "bold", spacingAfter: 6 });
      addKeyValueRow("Jawaban benar", `${spm.correct}/${spm.total}`);
      addKeyValueRow("Jawaban salah", String(spm.wrong));
      addKeyValueRow("Tidak terjawab", String(spm.unanswered));
      addKeyValueRow("Akurasi", typeof spm.percent === "number" ? `${spm.percent}%` : "-");
      addKeyValueRow("Estimasi IQ", spm.iqScore ?? "-");
      addKeyValueRow("Klasifikasi", spm.classification);
      addKeyValueRow("Durasi", formatDurationFromSeconds(spm.durationSec));
      addWrappedText(spm.narrative, { spacingAfter: 6 });
      addWrappedText(`Catatan recruiter: ${spm.roleInsight}`, { color: [94, 112, 136] });
    } else if (item.test_key === "disc") {
      const disc = getDiscResultData(item);
      addKeyValueRow("Profil dominan", disc.profile.title);
      addKeyValueRow("Kode dominan", disc.dominantCode);
      addKeyValueRow("Durasi", disc.durationSec !== null ? `${disc.durationSec} detik` : "-");
      if (disc.interpretation?.paragraph) addWrappedText(disc.interpretation.paragraph, { spacingAfter: 8 });
      addBulletList("Potret diri", Array.isArray(disc.interpretation?.potret) ? disc.interpretation.potret : []);
      addBulletList("Kelebihan", disc.profile?.strengths || []);
      addBulletList("Kekurangan", disc.profile?.weaknesses || []);
      addBulletList("Kecenderungan kerja", disc.profile?.tendencies || []);
      addBulletList("Lingkungan yang cocok", disc.profile?.suitableEnv || []);
      addBulletList("Area pengembangan", disc.profile?.development || []);
    } else if (item.test_key === "big_five") {
      const bigFive = getBigFiveResultData(item);
      addKeyValueRow("Trait dominan", bigFive.dominantTrait?.label || "-");
      addKeyValueRow("Trait relatif rendah", bigFive.lowestTrait?.label || "-");
      addKeyValueRow("Durasi", bigFive.durationSec !== null ? `${bigFive.durationSec} detik` : "-");
      addWrappedText("Skor per trait", { style: "bold", spacingAfter: 6 });
      bigFive.traits.forEach((trait) => {
        addKeyValueRow(`${trait.label}`, `${trait.percent ?? "-"} / 100 (${trait.level || "-"})`);
      });
      if (bigFive.summary) addWrappedText(bigFive.summary, { spacingAfter: 8 });
      addBulletList(
        "Interpretasi",
        bigFive.interpretationLines.map((line) => `${line.traitName}: ${line.text}`),
      );
    } else if (item.test_key === "holland") {
      const holland = getHollandResultData(item);
      addKeyValueRow("Top 3", holland.top3Code || "-");
      addKeyValueRow("Pasangan teratas", holland.top2Code || "-");
      addKeyValueRow("Konsistensi", holland.consistency || "-");
      addWrappedText("Skor RIASEC", { style: "bold", spacingAfter: 6 });
      holland.ranked.forEach((entry) => {
        addKeyValueRow(`${entry.key} - ${entry.label}`, String(entry.score));
      });
      addBulletList(
        "Interpretasi top 3",
        holland.top3Entries.map((entry) => `${entry.key} - ${entry.label}: ${entry.desc}`),
      );
      if (holland.comboInsight) {
        addWrappedText(`Insight pasangan ${holland.top2Code}: ${holland.comboInsight.desc}`, { spacingAfter: 6 });
        addWrappedText(`Contoh profesi: ${holland.comboInsight.jobs}`, { color: [94, 112, 136] });
      }
    } else if (item.test_key === "koran") {
      const score = asObject(item.result_json?.score);
      addKeyValueRow("Total respons", score.total_attempts ?? "-");
      addKeyValueRow("Benar", score.correct ?? "-");
      addKeyValueRow("Salah", score.wrong ?? "-");
      addKeyValueRow("Akurasi", score.accuracy_percent ? `${score.accuracy_percent}%` : "-");
      addKeyValueRow("Rata-rata per menit", score.average_per_minute ?? "-");
      addWrappedText(item.summary || "Hasil ketelitian dan ritme kerja sudah terekam.", { color: [94, 112, 136] });
    } else {
      if (item.summary) addWrappedText(item.summary);
      const insight = getItemInsight(item);
      if (insight?.values?.length) addBulletList(insight.heading, insight.values);
    }

    addDivider();
  });

  const totalPages = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
    doc.setPage(pageIndex);
    doc.setDrawColor(214, 222, 234);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(123, 138, 161);
    doc.text(`Laporan Hasil Psikotest - ${normalizePdfText(candidate?.nama_lengkap || "Kandidat")}`, margin, pageHeight - 14);
    doc.text(`Halaman ${pageIndex} / ${totalPages}`, pageWidth - margin - 64, pageHeight - 14);
  }

  const candidateSlug = normalizePdfText(candidate?.nama_lengkap || "kandidat").replace(/[^a-zA-Z0-9]+/g, "_");
  doc.save(`laporan_psikotest_${candidateSlug}.pdf`);
}

async function downloadPsychotestBriefReport(packageRow) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 34;
  const contentWidth = pageWidth - margin * 2;
  const candidate = packageRow?.pelamar || {};
  const packageMetrics = getPackageMetrics(packageRow);
  const packageAssessment = getPackageAssessment(packageRow);
  const testSummaries = getPackageItems(packageRow).map(getShortReportTestSummary);

  doc.setFillColor(247, 249, 252);
  doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 16, 16, "F");

  doc.setFillColor(16, 44, 82);
  doc.roundedRect(margin, margin, contentWidth, 66, 16, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("LAPORAN SINGKAT HASIL PSIKOTEST", margin + 18, margin + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(226, 237, 247);
  doc.text("Ringkasan satu lembar untuk kebutuhan review recruiter", margin + 18, margin + 46);
  doc.text(`Direview pada ${normalizePdfText(formatDateTime(packageRow?.reviewed_at))}`, pageWidth - margin - 170, margin + 28);
  doc.text(`Status paket: ${normalizePdfText(formatPackageStatusLabel(packageRow?.status || "-"))}`, pageWidth - margin - 170, margin + 46);

  const infoY = margin + 82;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(123, 138, 161);
  const infoRows = [
    ["Nama kandidat", candidate?.nama_lengkap || "-"],
    ["Posisi dilamar", candidate?.posisi_dilamar || "-"],
    ["Paket tes", packageRow?.template_name || "-"],
    ["Dikirim oleh", packageRow?.created_by || "-"],
  ];
  infoRows.forEach(([label, value], index) => {
    const x = margin + 18 + index * 190;
    doc.text(normalizePdfText(label), x, infoY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 35, 63);
    doc.text(truncatePdfText(value, 28), x, infoY + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(123, 138, 161);
  });

  const metricY = infoY + 38;
  const metricWidth = (contentWidth - 18) / 4;
  [
    ["Total tes", packageMetrics.total],
    ["Selesai", packageMetrics.completed],
    ["Berjalan", packageMetrics.inProgress],
    ["Tidak selesai", packageMetrics.incomplete],
  ].forEach(([label, value], index) => {
    const x = margin + index * (metricWidth + 6);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 222, 234);
    doc.roundedRect(x, metricY, metricWidth, 58, 12, 12, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(123, 138, 161);
    doc.text(normalizePdfText(label), x + 14, metricY + 17);
    doc.setFontSize(20);
    doc.setTextColor(16, 44, 82);
    doc.text(String(value), x + 14, metricY + 40);
  });

  const noteY = metricY + 72;
  doc.setFillColor(240, 244, 248);
  doc.setDrawColor(214, 222, 234);
  doc.roundedRect(margin, noteY, contentWidth, 48, 12, 12, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 35, 63);
  doc.text("Ringkasan recruiter", margin + 14, noteY + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(94, 112, 136);
  const noteLines = doc.splitTextToSize(
    normalizePdfText(packageAssessment.note || "Seluruh hasil tes sudah tersusun dan siap dibaca recruiter."),
    contentWidth - 28,
  );
  doc.text(noteLines, margin + 14, noteY + 33);

  const cardsY = noteY + 62;
  const columns = 3;
  const gap = 10;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = 124;

  testSummaries.forEach((entry, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * (cardWidth + gap);
    const y = cardsY + row * (cardHeight + 10);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(214, 222, 234);
    doc.roundedRect(x, y, cardWidth, cardHeight, 12, 12, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 35, 63);
    const titleLines = doc.splitTextToSize(normalizePdfText(entry.title), cardWidth - 28);
    doc.text(titleLines, x + 12, y + 18);

    doc.setFillColor(247, 249, 252);
    doc.setDrawColor(214, 222, 234);
    doc.roundedRect(x + cardWidth - 110, y + 10, 98, 20, 10, 10, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 44, 82);
    doc.text(truncatePdfText(entry.status, 18), x + cardWidth - 102, y + 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(123, 138, 161);
    doc.text("Sorotan", x + 12, y + 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 35, 63);
    doc.text(truncatePdfText(entry.score, 38), x + 12, y + 57);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(94, 112, 136);
    const summaryLines = doc.splitTextToSize(truncatePdfText(entry.summary, 150), cardWidth - 24);
    doc.text(summaryLines.slice(0, 4), x + 12, y + 76);

    doc.setDrawColor(232, 238, 245);
    doc.line(x + 12, y + cardHeight - 26, x + cardWidth - 12, y + cardHeight - 26);
    doc.setFontSize(7.8);
    doc.setTextColor(123, 138, 161);
    const timeLines = doc.splitTextToSize(truncatePdfText(entry.time, 54), cardWidth - 24);
    doc.text(timeLines.slice(0, 2), x + 12, y + cardHeight - 12);
  });

  doc.setDrawColor(214, 222, 234);
  doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(123, 138, 161);
  doc.text(
    `Catatan: Laporan singkat ini adalah executive summary satu lembar. Detail lengkap tetap tersedia pada laporan PDF lengkap dan tampilan hasil per tes di sistem.`,
    margin,
    pageHeight - 14,
  );

  const candidateSlug = normalizePdfText(candidate?.nama_lengkap || "kandidat").replace(/[^a-zA-Z0-9]+/g, "_");
  doc.save(`laporan_singkat_psikotest_${candidateSlug}.pdf`);
}

function DiscDetailedResult({ item, candidate }) {
  const disc = getDiscResultData(item);
  const potret = Array.isArray(disc.interpretation.potret) ? disc.interpretation.potret : [];
  const paragraph = typeof disc.interpretation.paragraph === "string" ? disc.interpretation.paragraph : "";

  return (
    <div className="mt-4 space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-white">
        <div className="px-5 py-4" style={{ backgroundColor: disc.profile.color }}>
          <div className="text-[2rem] font-black tracking-[-0.04em] text-slate-950 sm:text-[2.5rem]">{disc.profile.title}</div>
        </div>
        <div className="grid gap-4 px-5 py-4 text-sm text-[var(--text-main)] sm:grid-cols-2">
          <div>
            <div className="text-xs text-[var(--text-soft)]">Nama</div>
            <div className="font-semibold">{candidate?.nama_lengkap || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">No HP</div>
            <div className="font-semibold">{candidate?.no_hp || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">Posisi</div>
            <div className="font-semibold">{candidate?.posisi_dilamar || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--text-soft)]">Durasi</div>
            <div className="font-semibold">{disc.durationSec !== null ? `${disc.durationSec} detik` : "-"}</div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-[var(--border-soft)] px-5 py-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 text-5xl font-black text-slate-950"
            style={{ backgroundColor: disc.profile.color, borderColor: "rgba(15, 23, 42, 0.18)" }}
          >
            {disc.profile.short}
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Profil Dominan: {disc.profile.title}</div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              Dominan dihitung dari nilai tertinggi pada Grafik 3 (Mirror/Change).
            </div>
            {item.summary ? <div className="mt-3 text-sm leading-6 text-[var(--text-main)]">{item.summary}</div> : null}
          </div>
        </div>
        {disc.flags.length ? (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            Catatan sistem: {disc.flags.join(", ")}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="text-sm font-semibold text-[var(--text-main)]">Skor (Line)</div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--surface-0)] text-[var(--text-main)]">
                <th className="border border-[var(--border-soft)] px-3 py-2 text-left font-semibold">Line</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">D</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">I</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">S</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">C</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">*</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1 (Most/P)", disc.most, formatDiscValue(getDiscTotal(disc.most))],
                ["2 (Least/K)", disc.least, formatDiscValue(getDiscTotal(disc.least))],
                ["3 (Diff)", disc.diff, "-"],
              ].map(([label, values, total]) => (
                <tr key={label}>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">{label}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{formatDiscValue(getDiscValue(values, "D"))}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{formatDiscValue(getDiscValue(values, "I"))}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{formatDiscValue(getDiscValue(values, "S"))}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{formatDiscValue(getDiscValue(values, "C"))}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{label === "3 (Diff)" ? "-" : formatDiscValue(getDiscValue(values, "*"))}</td>
                  <td className="border border-[var(--border-soft)] px-3 py-2 text-center">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
          Grafik di bawah ini mengikuti nilai konversi pada hasil DISC referensi.
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--surface-0)] text-[var(--text-main)]">
                <th className="border border-[var(--border-soft)] px-3 py-2 text-left font-semibold">Grafik</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">D</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">I</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">S</th>
                <th className="border border-[var(--border-soft)] px-3 py-2 font-semibold">C</th>
              </tr>
            </thead>
            <tbody>
              {DISC_GRAPH_META.map((graph) => {
                const values = disc[graph.key];
                return (
                  <tr key={graph.key}>
                    <td className="border border-[var(--border-soft)] px-3 py-2 text-[var(--text-main)]">{graph.title.replace("GRAPH ", "Grafik ")}</td>
                    {DISC_DIMENSIONS.map((dimension) => (
                      <td key={dimension} className="border border-[var(--border-soft)] px-3 py-2 text-center">
                        {formatDiscValue(getDiscValue(values, dimension))}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          {DISC_GRAPH_META.map((graph) => (
            <div key={graph.key} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-center">
              <div className="text-xs font-extrabold tracking-[0.08em] text-[var(--text-main)]">{graph.title}</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">{graph.subtitle}</div>
              <DiscMiniChart data={disc[graph.key]} color={graph.color} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr]">
        <DiscListCard title="Potret Diri Anda" items={potret} />
        <DiscListCard title="Kelebihan" items={disc.profile.strengths} />
        <DiscListCard title="Kekurangan" items={disc.profile.weaknesses} />
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Tipe Kepribadian {disc.profile.title}</div>
        <p className="mt-4 text-sm leading-7 text-[var(--text-main)]">{paragraph || "-"}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <DiscListCard title="Kecenderungan yang Anda Miliki" items={disc.profile.tendencies} className="border-[var(--border-soft)]" />
          <DiscListCard title="Lingkungan / Posisi yang Cocok" items={disc.profile.suitableEnv} className="border-[var(--border-soft)]" />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-white p-5">
        <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Perbaikan, Peningkatan, dan Pengembangan</div>
        <ul className="mt-4 space-y-2 px-5 text-sm leading-6 text-[var(--text-main)]">
          {disc.profile.development.map((entry) => (
            <li key={entry} className="list-disc">
              {entry}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function PsychotestResultsPage() {
  const [packageRows, setPackageRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [expandedTestItemId, setExpandedTestItemId] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingBriefReport, setIsGeneratingBriefReport] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  useEffect(() => {
    void loadPackages();
  }, []);

  async function loadPackages() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const rows = await getCandidateTestPackageList();
      setPackageRows(rows);
    } catch (error) {
      console.error("Load hasil psikotest gagal:", error);
      setErrorMessage(
        isCandidateTestPackageFeatureUnavailable(error)
          ? getCandidateTestPackageFeatureUnavailableMessage()
          : error instanceof Error
            ? error.message
            : "Gagal memuat hasil psikotest.",
      );
      setPackageRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyLink(linkUrl) {
    if (!linkUrl) return;

    try {
      await navigator.clipboard.writeText(linkUrl);
    } catch {
      window.prompt("Salin link paket ini:", linkUrl);
    }
  }

  async function handleMarkReviewed(packageId) {
    try {
      await markCandidateTestPackageReviewed(packageId);
      await loadPackages();
      setSelectedPackage((current) => (current?.id === packageId ? { ...current, status: "reviewed", reviewed_at: new Date().toISOString() } : current));
    } catch (error) {
      console.error("Gagal tandai hasil direview:", error);
      setErrorMessage(
        isCandidateTestPackageFeatureUnavailable(error)
          ? getCandidateTestPackageFeatureUnavailableMessage()
          : "Status review belum berhasil diperbarui.",
      );
    }
  }

  async function handleProceedToInterview(packageRow) {
    if (!packageRow?.id || !packageRow?.pelamar?.id) return;

    try {
      setIsSubmittingDecision(true);

      await Promise.all([
        markCandidateTestPackageReviewed(packageRow.id),
        updatePelamar(packageRow.pelamar.id, {
          tahap_proses: "Wawancara AI",
          status_tindak_lanjut: "Sedang diproses",
          catatan_recruiter: appendRecruiterNote(
            packageRow.pelamar?.catatan_recruiter,
            "Hasil psikotest direview dan kandidat dilanjutkan ke tahap Wawancara AI.",
          ),
        }),
      ]);

      createStageHistory({
        pelamar_id: packageRow.pelamar.id,
        dari_tahap: packageRow.pelamar?.tahap_proses || "Tes kerja",
        ke_tahap: "Wawancara AI",
        catatan: "Lolos review psikotest dan lanjut ke Wawancara AI.",
      }).catch((error) => {
        console.warn("Riwayat tahap Wawancara AI belum tersimpan:", error);
      });

      await loadPackages();
      setSelectedPackage((current) =>
        current?.id === packageRow.id
          ? {
              ...current,
              status: "reviewed",
              reviewed_at: new Date().toISOString(),
              pelamar: {
                ...current.pelamar,
                tahap_proses: "Wawancara AI",
                status_tindak_lanjut: "Sedang diproses",
              },
            }
          : current,
      );
    } catch (error) {
      console.error("Gagal lanjutkan kandidat ke Wawancara AI:", error);
      setErrorMessage(error instanceof Error ? error.message : "Status kandidat belum berhasil dilanjutkan ke Wawancara AI.");
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleRejectCandidate(packageRow) {
    if (!packageRow?.id || !packageRow?.pelamar?.id) return;

    const candidateName = packageRow.pelamar?.nama_lengkap || "Kandidat";
    const positionName = packageRow.pelamar?.posisi_dilamar || "posisi yang dilamar";
    const rejectionMessage = [
      `Halo ${candidateName},`,
      "",
      `Terima kasih sudah meluangkan waktu untuk mengikuti proses rekrutmen kami untuk posisi ${positionName}.`,
      "",
      "Setelah kami meninjau keseluruhan hasil seleksi yang berjalan saat ini, kami memutuskan untuk belum melanjutkan proses Anda ke tahap berikutnya.",
      "",
      "Keputusan ini kami ambil berdasarkan kecocokan kebutuhan posisi pada tahap rekrutmen saat ini, dan bukan berarti mengurangi nilai ataupun potensi yang Anda miliki.",
      "",
      "Kami menghargai waktu, usaha, dan partisipasi Anda selama proses berlangsung. Semoga Anda segera mendapatkan kesempatan kerja yang paling sesuai dan berkembang dengan baik ke depannya.",
      "",
      "Terima kasih atas perhatian dan pengertiannya.",
      "",
      "Salam hormat,",
      "Tim Rekrutmen HireUMKM",
    ].join("\n");
    const whatsappUrl = buildWhatsAppLink(packageRow.pelamar?.no_hp, rejectionMessage);

    try {
      setIsSubmittingDecision(true);

      await Promise.all([
        markCandidateTestPackageReviewed(packageRow.id),
        updatePelamar(packageRow.pelamar.id, {
          tahap_proses: "Tidak lanjut",
          status_tindak_lanjut: "Tidak lanjut",
          alasan_tidak_lanjut: "Belum sesuai dengan kebutuhan posisi pada tahap rekrutmen saat ini.",
          catatan_recruiter: appendRecruiterNote(
            packageRow.pelamar?.catatan_recruiter,
            "Hasil psikotest direview dan kandidat dinyatakan tidak lanjut.",
          ),
        }),
      ]);

      if (whatsappUrl) {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      } else {
        setErrorMessage(`Nomor WhatsApp ${candidateName} belum valid. Status kandidat tetap sudah diubah menjadi tidak lanjut.`);
      }

      await loadPackages();
      setSelectedPackage((current) =>
        current?.id === packageRow.id
          ? {
              ...current,
              status: "reviewed",
              reviewed_at: new Date().toISOString(),
              pelamar: {
                ...current.pelamar,
                tahap_proses: "Tidak lanjut",
                status_tindak_lanjut: "Tidak lanjut",
              },
            }
          : current,
      );
    } catch (error) {
      console.error("Gagal menolak kandidat dari hasil psikotest:", error);
      setErrorMessage(error instanceof Error ? error.message : "Kandidat belum berhasil ditandai tidak lanjut.");
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleDownloadReport(packageRow) {
    if (!packageRow) return;

    try {
      setIsGeneratingReport(true);
      await downloadPsychotestReport(packageRow);
    } catch (error) {
      console.error("Gagal membuat laporan PDF:", error);
      setErrorMessage(error instanceof Error ? error.message : "Laporan PDF belum berhasil dibuat.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleDownloadBriefReport(packageRow) {
    if (!packageRow) return;

    try {
      setIsGeneratingBriefReport(true);
      await downloadPsychotestBriefReport(packageRow);
    } catch (error) {
      console.error("Gagal membuat laporan singkat PDF:", error);
      setErrorMessage(error instanceof Error ? error.message : "Laporan singkat PDF belum berhasil dibuat.");
    } finally {
      setIsGeneratingBriefReport(false);
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return packageRows.filter((item) => {
      if (!term) return true;

      return [item.pelamar?.nama_lengkap, item.pelamar?.posisi_dilamar, item.template_name, item.status]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [packageRows, search]);

  const summary = useMemo(() => {
    return {
      total: packageRows.length,
      sent: packageRows.filter((item) => ["sent", "opened", "in_progress"].includes(item.status)).length,
      completed: packageRows.filter((item) => item.status === "completed").length,
      reviewed: packageRows.filter((item) => item.status === "reviewed").length,
      incomplete: packageRows.filter((item) => getPackageMetrics(item).incomplete > 0).length,
    };
  }, [packageRows]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Hasil Psikotest"
        subtitle="Pantau paket tes yang sudah dikirim, progres kandidat, dan status review hasil tes dari satu halaman."
      />

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}

      <Card className="overflow-hidden rounded-[24px] border-[var(--border-soft)] bg-white">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 sm:grid-cols-5">
              {[
                ["Total paket", summary.total],
                ["Sedang berjalan", summary.sent],
                ["Selesai", summary.completed],
                ["Direview", summary.reviewed],
                ["Tidak selesai", summary.incomplete],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</div>
                  <div className="mt-2 text-[1.6rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex w-full max-w-[360px] items-center gap-2">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kandidat, posisi, atau paket..." />
              <Button variant="outline" className="rounded-xl" onClick={() => void loadPackages()}>
                Muat ulang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border-[var(--border-soft)] bg-white">
        {isLoading ? (
          <CardContent className="flex items-center gap-3 p-5 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Memuat hasil psikotest...
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[2fr_1.2fr_1.1fr_1.1fr_160px_170px] border-b border-[var(--border-soft)] bg-[var(--surface-0)] px-5 py-4 text-[13px] font-semibold text-[var(--text-main)]">
                <div>Kandidat</div>
                <div>Paket</div>
                <div>Status</div>
                <div>Progress</div>
                <div>Deadline</div>
                <div>Aksi</div>
              </div>

              {filteredRows.map((item, index) => {
                const metrics = getPackageMetrics(item);
                const assessment = getPackageAssessment(item);
                const AssessmentIcon = assessment.icon;
                const progressLabel = `${metrics.completed}/${metrics.total}`;
                const resultPreview = getResultPreview(metrics.items);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedPackage(item);
                      setExpandedTestItemId(null);
                    }}
                    className={`grid cursor-pointer grid-cols-[2fr_1.2fr_1.1fr_1.1fr_160px_170px] items-center border-b border-[var(--border-soft)] px-5 py-4 text-sm transition hover:bg-[var(--surface-0)] ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <div className="pr-4">
                      <div className="font-semibold text-[var(--text-main)]">{item.pelamar?.nama_lengkap || "-"}</div>
                      <div className="mt-1 text-[var(--text-muted)]">{item.pelamar?.posisi_dilamar || "-"}</div>
                    </div>
                    <div className="pr-4">
                      <div className="font-medium text-[var(--text-main)]">{item.template_name}</div>
                      <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${assessment.tone}`}>
                        <AssessmentIcon className="h-3.5 w-3.5" />
                        {assessment.label}
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{resultPreview || assessment.note}</div>
                    </div>
                    <div className="pr-4">
                      <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${getPackageStatusClass(item.status)}`}>
                        {formatPackageStatusLabel(item.status)}
                      </div>
                    </div>
                    <div className="pr-4">
                      <div className="font-medium text-[var(--text-main)]">{progressLabel}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {metrics.incomplete > 0
                          ? `${metrics.incomplete} tes tidak selesai`
                          : metrics.inProgress > 0
                            ? `${metrics.inProgress} tes sedang berjalan`
                            : metrics.notStarted > 0
                              ? `${metrics.notStarted} tes belum dimulai`
                              : "Semua tes sudah masuk hasil"}
                      </div>
                    </div>
                    <div className="pr-4 text-[var(--text-main)]">{formatDateTime(item.deadline_at)}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyLink(item.link_url);
                        }}
                      >
                        <Clipboard className="mr-2 h-4 w-4" />
                        Link
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && filteredRows.length === 0 ? (
          <CardContent className="p-8 text-center">
            <div className="text-base font-semibold text-[var(--text-main)]">Belum ada paket tes kandidat</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Kirim paket tes dari menu Data Pelamar agar progres dan hasil muncul di halaman ini.</p>
          </CardContent>
        ) : null}
      </Card>

      {selectedPackage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          {(() => {
            const packageMetrics = getPackageMetrics(selectedPackage);
            const packageAssessment = getPackageAssessment(selectedPackage);
            const PackageAssessmentIcon = packageAssessment.icon;

            return (
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[24px] border border-[var(--border-soft)] bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-[var(--border-soft)] bg-white px-6 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Detail Paket Tes</div>
                <div className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-[var(--text-main)]">{selectedPackage.pelamar?.nama_lengkap || "-"}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{selectedPackage.pelamar?.posisi_dilamar || "-"} / {selectedPackage.template_name}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedPackage(null);
                  setExpandedTestItemId(null);
                }}
                className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-soft)] pb-5">
                <StatusBadge value={selectedPackage.pelamar?.status_tindak_lanjut || "Sedang diproses"} className="rounded-full px-3 py-1.5" />
                <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${getPackageStatusClass(selectedPackage.status)}`}>
                  {formatPackageStatusLabel(selectedPackage.status)}
                </div>
              </div>

              <section className={`rounded-2xl border px-4 py-4 ${packageAssessment.tone}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white/80 p-2">
                    <PackageAssessmentIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{packageAssessment.label}</div>
                    <p className="text-sm leading-6">{packageAssessment.note}</p>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-4">
                {[
                  ["Total tes", packageMetrics.total],
                  ["Selesai", packageMetrics.completed],
                  ["Berjalan", packageMetrics.inProgress],
                  ["Tidak selesai", packageMetrics.incomplete],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{label}</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-main)]">{value}</div>
                  </div>
                ))}
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Ringkasan Paket</div>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[
                    ["Nama paket", selectedPackage.template_name],
                    ["Status", formatPackageStatusLabel(selectedPackage.status)],
                    ["Dikirim pada", formatDateTime(selectedPackage.sent_at)],
                    ["Deadline", formatDateTime(selectedPackage.deadline_at)],
                    ["Dibuka", formatDateTime(selectedPackage.opened_at)],
                    ["Selesai", formatDateTime(selectedPackage.completed_at)],
                    ["Direview", formatDateTime(selectedPackage.reviewed_at)],
                    ["Dikirim oleh", selectedPackage.created_by || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-sm text-[var(--text-soft)]">{label}</div>
                      <div className="mt-1 text-sm font-medium leading-6 text-[var(--text-main)]">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="border-b border-[var(--border-soft)] pb-2 text-sm font-semibold text-[var(--text-main)]">Progress per Tes</div>
                <div className="grid gap-3">
                  {packageMetrics.items
                    .map((item) => {
                      const insight = getItemInsight(item);
                      const traitRows = Array.isArray(item.result_json?.traits) ? item.result_json.traits : [];
                      const discGraph3 = item.result_json?.graph3 && typeof item.result_json.graph3 === "object" ? item.result_json.graph3 : null;
                      const minuteStats = Array.isArray(item.result_json?.minute_stats) ? item.result_json.minute_stats : [];
                      const maxMinuteTotal = minuteStats.length ? Math.max(...minuteStats.map((entry) => entry.total || 0), 1) : 1;
                      const isSpm = item.test_key === "spm";
                      const isDisc = item.test_key === "disc";
                      const isBigFive = item.test_key === "big_five";
                      const isHolland = item.test_key === "holland";
                      const isExpanded = expandedTestItemId === item.id;

                      return (
                      <div key={item.id} className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white">
                        <button
                          type="button"
                          onClick={() => setExpandedTestItemId((current) => (current === item.id ? null : item.id))}
                          className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-[var(--surface-0)]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="font-semibold text-[var(--text-main)]">{item.test_order}. {item.test_name_snapshot}</div>
                              <div className="mt-1 text-sm text-[var(--text-muted)]">
                                Mulai: {formatDateTime(item.started_at)} / Selesai: {formatDateTime(item.completed_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${getItemStatusClass(item.status)}`}>
                                {formatPackageItemStatusLabel(item.status)}
                              </div>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-soft)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>

                          {item.score_label || item.score_numeric !== null ? (
                            <div className="flex flex-wrap gap-2">
                              {item.score_label ? <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]">{item.score_label}</div> : null}
                              {item.score_numeric !== null ? <div className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]">Skor {item.score_numeric}</div> : null}
                            </div>
                          ) : null}
                        </button>

                        {isExpanded ? (
                          <div className="border-t border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-4">
                            {isSpm ? <SpmDetailedResult item={item} candidate={selectedPackage.pelamar} packageName={selectedPackage.template_name} /> : null}
                            {isDisc ? <DiscDetailedResult item={item} candidate={selectedPackage.pelamar} /> : null}
                            {isBigFive ? <BigFiveDetailedResult item={item} candidate={selectedPackage.pelamar} packageName={selectedPackage.template_name} /> : null}
                            {isHolland ? <HollandDetailedResult item={item} candidate={selectedPackage.pelamar} packageName={selectedPackage.template_name} /> : null}
                            {!isSpm && !isDisc && !isBigFive && !isHolland && insight ? (
                              <div className="rounded-xl border border-[var(--border-soft)] bg-white px-3 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{insight.heading}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {insight.values.map((value) => (
                                    <div key={value} className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)]">
                                      {value}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {!isSpm && !isDisc && !isBigFive && !isHolland && item.summary ? <div className="mt-3 text-sm leading-6 text-[var(--text-main)]">{item.summary}</div> : null}
                            {!isSpm && !isDisc && !isBigFive && !isHolland && traitRows.length ? (
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {traitRows.map((trait) => (
                                  <div key={trait.key || trait.label} className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-3">
                                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{trait.label || trait.key}</div>
                                    <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{trait.score}/100</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {!isSpm && !isDisc && !isBigFive && !isHolland && discGraph3 ? (
                              <div className="mt-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Grafik 3 DISC</div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                                  {Object.entries(discGraph3).map(([key, value]) => (
                                    <div key={key} className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-3">
                                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">{key}</div>
                                      <div className="mt-1 text-sm font-semibold text-[var(--text-main)]">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {!isSpm && !isDisc && !isBigFive && !isHolland && minuteStats.length ? (
                              <div className="mt-4">
                                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-soft)]">Grafik Kinerja Per Menit</div>
                                <div className="mt-3 flex items-end gap-1 overflow-x-auto rounded-lg border border-[var(--border-soft)] bg-white px-3 py-4">
                                  {minuteStats.map((entry) => {
                                    const total = entry.total || 0;
                                    const correct = entry.correct || 0;
                                    const wrong = entry.wrong || 0;
                                    const goodHeight = total ? Math.max(6, Math.round((correct / maxMinuteTotal) * 80)) : 6;
                                    const badHeight = wrong ? Math.max(6, Math.round((wrong / maxMinuteTotal) * 80)) : 0;

                                    return (
                                      <div key={entry.minute} className="flex min-w-[18px] flex-col items-center gap-1">
                                        <div className="relative h-24 w-4 rounded bg-slate-100">
                                          <div className="absolute bottom-0 left-0 w-full rounded bg-emerald-500" style={{ height: `${goodHeight}px` }} />
                                          {badHeight ? (
                                            <div className="absolute left-0 w-full rounded bg-rose-500" style={{ bottom: `${goodHeight}px`, height: `${badHeight}px` }} />
                                          ) : null}
                                        </div>
                                        <div className="text-[10px] text-[var(--text-soft)]">{entry.minute}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-2 text-xs text-[var(--text-muted)]">Hijau = benar, merah = salah.</div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )})}
                </div>
              </section>

              <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-5">
                {selectedPackage.status === "reviewed" ? (
                  <>
                    <Button
                      className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => void handleDownloadBriefReport(selectedPackage)}
                      disabled={isGeneratingBriefReport}
                    >
                      {isGeneratingBriefReport ? "Menyiapkan laporan singkat..." : "Download laporan singkat"}
                    </Button>
                    <Button
                      className="rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-500"
                      onClick={() => void handleDownloadReport(selectedPackage)}
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? "Menyiapkan laporan detail..." : "Download Laporan Detail"}
                    </Button>
                  </>
                ) : null}
                {selectedPackage.status !== "reviewed" ? (
                  <>
                    <Button className="rounded-xl" onClick={() => void handleProceedToInterview(selectedPackage)} disabled={isSubmittingDecision}>
                      {isSubmittingDecision ? "Memproses..." : "Lanjut ke Wawancara AI"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      onClick={() => void handleRejectCandidate(selectedPackage)}
                      disabled={isSubmittingDecision}
                    >
                      {isSubmittingDecision ? "Memproses..." : "Ditolak"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      ) : null}
    </div>
  );
}
