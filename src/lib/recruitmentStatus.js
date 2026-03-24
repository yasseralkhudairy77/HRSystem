export const offeringStatusLabelMap = {
  draft: "Draft",
  waiting_response: "Menunggu respons",
  negotiation: "Negosiasi",
  accepted: "Diterima kandidat",
  rejected: "Ditolak kandidat",
  expired: "Kadaluarsa",
};

export function getOfferingStatusLabel(status) {
  return offeringStatusLabelMap[status] || "Draft";
}

export function getCandidateStageLabel(stage) {
  if (stage === "Siap masuk") return "Siap masuk kerja";
  return stage || "-";
}
