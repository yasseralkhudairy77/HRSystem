import { createContext, useContext, useMemo, useState } from "react";

import { hiringPlans, jobs } from "@/data";

const RecruitmentWorkspaceContext = createContext(null);

function normalizeHiringNeed(item) {
  return {
    id: item.id,
    role: item.role,
    company: item.company,
    branch: item.branch,
    qty: item.qty,
    priority: item.priority,
    status: item.status,
    targetHireDate: item.targetHireDate,
    requester: item.requester,
    needType: item.needType,
    employmentType: item.employmentType,
    tests: item.tests,
    reason: item.reason,
    vacancyCreated: item.vacancyCreated,
    tableName: "kebutuhan_karyawan",
    posisi: item.role,
    departemen: item.department || "",
    cabang: item.branch,
    jumlahKebutuhan: item.qty,
    jenisKebutuhan: item.needType,
    statusKerja: item.statusKerja || item.employmentType || "",
    tipeKerja: item.tipeKerja || "",
    durasiKontrak: item.contractDuration || "",
    gajiMin: item.salaryRange?.[0] || "",
    gajiMax: item.salaryRange?.[1] || "",
    pendidikanMinimal: item.qualificationSummary?.split(" / ")[0] || "",
    pengalaman: item.qualificationSummary?.split(" / ")[1] || "",
    skillUtama: item.mainSkills || [],
    kriteriaTambahan: item.additionalCriteria || "",
    tesDiperlukan: item.tests || [],
    alasanKebutuhan: item.reason || "",
    targetMulaiKerja: item.targetHireDate,
    namaPengaju: item.requester,
    tanggalPengajuan: item.createdAt || "2026-03-09",
    statusPersetujuan: item.status,
    approvedBy: item.approvalBy || "",
    tanggalApproval: item.approvalDate || "",
    lowonganSudahDibuat: item.vacancyCreated,
    lowonganId: item.vacancyId || item.hiringNeedId || "",
  };
}

function normalizeJob(item) {
  return {
    id: item.id,
    kebutuhanId: item.hiringNeedId || null,
    judulLowongan: item.title,
    posisi: item.positionName,
    departemen: item.department || "",
    cabang: item.branchName,
    companyName: item.companyName,
    jumlahKebutuhan: item.qtyNeeded,
    statusKerja: item.employmentType || "",
    tipeKerja: item.workType || "",
    durasiKontrak: item.contractDuration || "",
    gajiMin: item.gajiMin || "",
    gajiMax: item.gajiMax || "",
    pendidikanMin: item.pendidikanMin || "",
    pengalaman: item.pengalaman || "",
    skill: item.mustHaveCriteria || [],
    kriteriaTambahan: item.kriteriaTambahan || "",
    deskripsiPekerjaan: item.shortDescription,
    ringkasanIklan: item.ringkasanIklan || item.shortDescription || "",
    tanggungJawab: item.tanggungJawab || "",
    tentangPerusahaan: item.tentangPerusahaan || "",
    lokasiKerja: `${item.companyName} / ${item.branchName}`,
    benefit: item.benefit || "",
    caraMelamar: item.caraMelamar || "Kirim data lewat link lowongan atau WhatsApp HR.",
    jalurBagikan: item.channels || [],
    statusLowongan: item.status,
    tanggalTayang: item.postedAt,
    tanggalTutup: item.closeTargetDate,
    createdBy: item.personInCharge,
    createdAt: item.postedAt || "2026-03-09",
    updatedAt: item.postedAt || "2026-03-09",
    applicantsCount: item.applicantsCount,
    sourceType: item.sourceType,
    vacancyLink: item.vacancyLink,
    ownerPic: item.ownerPic,
    personInCharge: item.personInCharge,
    tests: item.tests || [],
    archived: item.archived || false,
  };
}

export function RecruitmentWorkspaceProvider({ children }) {
  const [hiringNeeds, setHiringNeeds] = useState(() => hiringPlans.map(normalizeHiringNeed));
  const [jobRows, setJobRows] = useState(() => jobs.map(normalizeJob));

  const addHiringNeed = (payload, mode) => {
    const nextNeed = {
      id: `hp-${String(hiringNeeds.length + 1).padStart(3, "0")}`,
      role: payload.posisi,
      company: payload.namaUsaha || "HireUMKM Demo",
      branch: payload.cabang,
      qty: Number(payload.jumlahKebutuhan),
      priority: payload.statusPersetujuan === "Sudah disetujui" ? "Tinggi" : "Sedang",
      status: mode === "submit" ? payload.statusPersetujuan : "Belum diajukan",
      targetHireDate: payload.targetMulaiKerja,
      requester: payload.namaPengaju,
      needType: payload.jenisKebutuhan,
      employmentType: `${payload.statusKerja}${payload.tipeKerja ? ` / ${payload.tipeKerja}` : ""}`,
      tests: payload.tesDiperlukan,
      reason: payload.alasanKebutuhan,
      vacancyCreated: false,
      tableName: "kebutuhan_karyawan",
      posisi: payload.posisi,
      departemen: payload.departemen,
      cabang: payload.cabang,
      jumlahKebutuhan: Number(payload.jumlahKebutuhan),
      jenisKebutuhan: payload.jenisKebutuhan,
      statusKerja: payload.statusKerja,
      tipeKerja: payload.tipeKerja,
      durasiKontrak: payload.durasiKontrak,
      gajiMin: payload.gajiMin,
      gajiMax: payload.gajiMax,
      pendidikanMinimal: payload.pendidikanMinimal,
      pengalaman: payload.pengalaman,
      skillUtama: payload.skillUtama,
      kriteriaTambahan: payload.kriteriaTambahan,
      tesDiperlukan: payload.tesDiperlukan,
      alasanKebutuhan: payload.alasanKebutuhan,
      targetMulaiKerja: payload.targetMulaiKerja,
      namaPengaju: payload.namaPengaju,
      tanggalPengajuan: payload.tanggalPengajuan,
      statusPersetujuan: mode === "submit" ? payload.statusPersetujuan : "Belum diajukan",
      approvedBy: payload.approvedBy,
      tanggalApproval: payload.tanggalApproval,
      lowonganSudahDibuat: false,
      lowonganId: "",
    };

    setHiringNeeds((current) => [nextNeed, ...current]);
    return nextNeed;
  };

  const createJob = (payload) => {
    const nextJob = {
      id: `job-${String(jobRows.length + 1).padStart(3, "0")}`,
      kebutuhanId: payload.kebutuhanId || null,
      judulLowongan: payload.judulLowongan,
      posisi: payload.posisi,
      departemen: payload.departemen,
      cabang: payload.cabang,
      companyName: payload.companyName || "HireUMKM Demo",
      jumlahKebutuhan: Number(payload.jumlahKebutuhan),
      statusKerja: payload.statusKerja,
      tipeKerja: payload.tipeKerja,
      durasiKontrak: payload.durasiKontrak,
      gajiMin: payload.gajiMin,
      gajiMax: payload.gajiMax,
      pendidikanMin: payload.pendidikanMin,
      pengalaman: payload.pengalaman,
      skill: payload.skill,
      kriteriaTambahan: payload.kriteriaTambahan,
      deskripsiPekerjaan: payload.deskripsiPekerjaan,
      ringkasanIklan: payload.ringkasanIklan,
      tanggungJawab: payload.tanggungJawab,
      tentangPerusahaan: payload.tentangPerusahaan,
      lokasiKerja: payload.lokasiKerja,
      benefit: payload.benefit,
      caraMelamar: payload.caraMelamar,
      jalurBagikan: payload.jalurBagikan,
      statusLowongan: payload.statusLowongan,
      tanggalTayang: payload.tanggalTayang,
      tanggalTutup: payload.tanggalTutup,
      createdBy: payload.createdBy || "Nisa Purnama",
      createdAt: payload.createdAt || "2026-03-09",
      updatedAt: "2026-03-09",
      applicantsCount: payload.applicantsCount || 0,
      sourceType: payload.kebutuhanId ? "fromHiringNeed" : "manual",
      vacancyLink: `https://hireumkm.demo/lowongan/${payload.posisi.toLowerCase().replaceAll(" ", "-")}-${Date.now()}`,
      ownerPic: payload.createdBy || "Nisa Purnama",
      personInCharge: payload.createdBy || "Nisa Purnama",
      tests: payload.tesYangDiperlukan || [],
      archived: false,
    };

    setJobRows((current) => [nextJob, ...current]);

    if (payload.kebutuhanId) {
      setHiringNeeds((current) =>
        current.map((item) =>
          item.id === payload.kebutuhanId
            ? {
                ...item,
                vacancyCreated: true,
                lowonganSudahDibuat: true,
                lowonganId: nextJob.id,
                status: item.status === "Sudah disetujui" ? "Lowongan sudah dibuat" : item.status,
              }
            : item,
        ),
      );
    }

    return nextJob;
  };

  const updateJob = (jobId, payload) => {
    let updatedJob = null;

    setJobRows((current) =>
      current.map((item) => {
        if (item.id !== jobId) {
          return item;
        }

        updatedJob = {
          ...item,
          judulLowongan: payload.judulLowongan,
          posisi: payload.posisi,
          departemen: payload.departemen,
          cabang: payload.cabang,
          companyName: payload.companyName || item.companyName,
          jumlahKebutuhan: Number(payload.jumlahKebutuhan),
          statusKerja: payload.statusKerja,
          tipeKerja: payload.tipeKerja,
          durasiKontrak: payload.durasiKontrak,
          gajiMin: payload.gajiMin,
          gajiMax: payload.gajiMax,
          pendidikanMin: payload.pendidikanMin,
          pengalaman: payload.pengalaman,
          skill: payload.skill,
          skillText: payload.skillText,
          kriteriaTambahan: payload.kriteriaTambahan,
          deskripsiPekerjaan: payload.deskripsiPekerjaan,
          ringkasanIklan: payload.ringkasanIklan,
          tanggungJawab: payload.tanggungJawab,
          tentangPerusahaan: payload.tentangPerusahaan,
          lokasiKerja: payload.lokasiKerja,
          benefit: payload.benefit,
          caraMelamar: payload.caraMelamar,
          jalurBagikan: payload.jalurBagikan || item.jalurBagikan,
          statusLowongan: payload.statusLowongan,
          tanggalTayang: payload.tanggalTayang,
          tanggalTutup: payload.tanggalTutup,
          updatedAt: "2026-03-10",
          tests: payload.tesYangDiperlukan || [],
          archived: item.archived || false,
        };

        return updatedJob;
      }),
    );

    return updatedJob;
  };

  const closeJob = (jobId) => {
    let updatedJob = null;

    setJobRows((current) =>
      current.map((item) => {
        if (item.id !== jobId) {
          return item;
        }

        updatedJob = {
          ...item,
          statusLowongan: "Sudah ditutup",
          updatedAt: "2026-03-10",
        };

        return updatedJob;
      }),
    );

    return updatedJob;
  };

  const archiveJob = (jobId) => {
    let updatedJob = null;

    setJobRows((current) =>
      current.map((item) => {
        if (item.id !== jobId) {
          return item;
        }

        updatedJob = {
          ...item,
          archived: true,
          updatedAt: "2026-03-10",
        };

        return updatedJob;
      }),
    );

    return updatedJob;
  };

  const deleteArchivedJob = (jobId) => {
    let deletedJob = null;

    setJobRows((current) =>
      current.filter((item) => {
        const shouldKeep = item.id !== jobId;

        if (!shouldKeep) {
          deletedJob = item;
        }

        return shouldKeep;
      }),
    );

    return deletedJob;
  };

  const availableHiringNeeds = useMemo(
    () =>
      hiringNeeds.filter(
        (item) =>
          item.statusPersetujuan === "Sudah disetujui" &&
          item.lowonganSudahDibuat === false,
      ),
    [hiringNeeds],
  );

  const value = useMemo(
    () => ({
      hiringNeeds,
      jobRows,
      availableHiringNeeds,
      addHiringNeed,
      createJob,
      updateJob,
      closeJob,
      archiveJob,
      deleteArchivedJob,
    }),
    [availableHiringNeeds, hiringNeeds, jobRows],
  );

  return <RecruitmentWorkspaceContext.Provider value={value}>{children}</RecruitmentWorkspaceContext.Provider>;
}

export function useRecruitmentWorkspace() {
  const context = useContext(RecruitmentWorkspaceContext);

  if (!context) {
    throw new Error("useRecruitmentWorkspace must be used within RecruitmentWorkspaceProvider");
  }

  return context;
}
