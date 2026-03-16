(function () {
  const config = window.FORM_SUPABASE_CONFIG;
  const supabaseLib = window.supabase;
  const TPLKEY = "ATS_DEMO_TEMPLATES_V1";

  if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
    console.error("Konfigurasi Supabase form pelamar belum lengkap.");
    return;
  }

  const supabaseClient = supabaseLib.createClient(config.url, config.publishableKey);
  const urlParams = new URLSearchParams(window.location.search);
  const lowonganIdParam = urlParams.get("lowongan_id");
  const parsedLowonganId = lowonganIdParam ? Number(lowonganIdParam) : null;
  const routeLowonganId = lowonganIdParam && Number.isFinite(parsedLowonganId) ? parsedLowonganId : null;
  const presetPosisi = (urlParams.get("posisi") || "").trim();
  const presetSumber = (urlParams.get("sumber") || "").trim();
  let applicantCache = [];

  const pageApplicant = document.getElementById("pageApplicant");
  const pageAdmin = document.getElementById("pageAdmin");
  const cvFile = document.getElementById("cvFile");
  const cvName = document.getElementById("cvName");
  const posisiField = document.getElementById("posisi");
  const sumberField = document.getElementById("sumber");
  const submitButton = document.querySelector('button[onclick="submitApplication()"]');
  const successBackdrop = document.getElementById("successBackdrop");
  const successTitle = document.getElementById("successTitle");
  const successLead = document.getElementById("successLead");
  const successStatusText = document.getElementById("successStatusText");
  const successMeta = document.getElementById("successMeta");
  const successCloseNow = document.getElementById("successCloseNow");
  const successStayOpen = document.getElementById("successStayOpen");
  let autoCloseTimer = null;

  const DEFAULT_TPL = {
    confirm:
`Yth. [Nama],

Terima kasih sudah melamar posisi [Posisi]. Lamaran Anda telah kami terima dan sedang kami review.

Kami akan menghubungi Anda untuk informasi tahap berikutnya.

Hormat kami,
Tim HR`,
    shortlist:
`Yth. [Nama],

Selamat! Anda masuk shortlist untuk posisi [Posisi].
Tim HR akan menghubungi Anda untuk penjadwalan interview.

Hormat kami,
Tim HR`,
    interview:
`Yth. [Nama],

Berikut detail interview untuk posisi [Posisi]:
Tanggal: [Tanggal]
Waktu: [Waktu]
Lokasi/Link: [Lokasi]
Pewawancara: [Pewawancara]

Mohon konfirmasi ketersediaan Anda.

Hormat kami,
Tim HR`,
    reject:
`Yth. [Nama],

Terima kasih atas ketertarikan Anda pada posisi [Posisi] dan waktu yang telah Anda berikan.

Setelah pertimbangan, kami memutuskan untuk melanjutkan kandidat lain yang lebih sesuai dengan kebutuhan saat ini.
Kami akan menyimpan data Anda untuk kesempatan yang relevan di masa depan.

Hormat kami,
Tim HR`,
  };

  function required(value) {
    return (value ?? "").toString().trim().length > 0;
  }

  function escapeHTML(value) {
    return (value ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      const date = new Date(value);
      return (
        date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) +
        " " +
        date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return value;
    }
  }

  function loadTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem(TPLKEY));
      return stored && stored.confirm ? stored : DEFAULT_TPL;
    } catch {
      return DEFAULT_TPL;
    }
  }

  function saveTemplatesToStorage(templates) {
    localStorage.setItem(TPLKEY, JSON.stringify(templates));
  }

  function showPage(which) {
    if (!pageApplicant || !pageAdmin) return;
    if (which === "admin") {
      pageApplicant.classList.remove("active");
      pageAdmin.classList.add("active");
    } else {
      pageAdmin.classList.remove("active");
      pageApplicant.classList.add("active");
    }
  }

  function deriveLegacyStatus(row) {
    if (row.status_tindak_lanjut === "Tidak lanjut") return "REJECTED";
    if (row.interview_datetime) return "SCHEDULED";
    if (row.status_tindak_lanjut === "Sedang diproses" || row.status_tindak_lanjut === "Masuk tahap akhir" || row.status_tindak_lanjut === "Diterima" || row.status_tindak_lanjut === "Disimpan") {
      return "SHORTLISTED";
    }
    return "PENDING";
  }

  function mapRowToApplicant(row) {
    return {
      id: String(row.id),
      createdAt: row.created_at,
      posisi: row.posisi_dilamar,
      lowonganId: row.lowongan_id,
      sumber: row.sumber_info_lowongan || "",
      nama: row.nama_lengkap,
      email: row.email,
      hp: row.no_hp,
      tglLahir: row.tanggal_lahir,
      agama: row.agama || "",
      statusNikah: row.status_pernikahan || "",
      gender: row.jenis_kelamin,
      wn: row.kewarganegaraan || "",
      alamatKtp: row.alamat_ktp,
      alamatDom: row.alamat_domisili,
      pendidikan: {
        kampus: row.institusi_pendidikan || "",
        jenjang: row.jenjang_pendidikan || "",
        jurusan: row.jurusan || "",
        thnLulus: row.tahun_lulus || "",
        ipk: row.ipk_nilai || "",
      },
      pengalaman: {
        freshGrad: row.fresh_graduate,
        tahun: row.lama_pengalaman_tahun || "",
        perusahaan: row.pengalaman_utama_perusahaan || "",
        jabatan: row.pengalaman_utama_jabatan || "",
        tglMasuk: row.pengalaman_utama_tanggal_masuk || "",
        tglKeluar: row.pengalaman_utama_tanggal_keluar || "",
        masihKerja: row.pengalaman_utama_masih_kerja || false,
        deskripsi: row.pengalaman_utama_deskripsi || "",
        alasanResign: row.pengalaman_utama_alasan_resign || "",
        list: Array.isArray(row.pengalaman_list) ? row.pengalaman_list : [],
        gaji: row.ekspektasi_gaji ? String(row.ekspektasi_gaji) : "",
        notice: row.masa_notice || "",
      },
      cvFileName: row.cv_file_name,
      status: deriveLegacyStatus(row),
      interview: row.interview_datetime || row.interview_location || row.interview_interviewer || row.interview_notes
        ? {
            datetime: formatDateTime(row.interview_datetime),
            location: row.interview_location || "",
            interviewer: row.interview_interviewer || "",
            notes: row.interview_notes || "",
          }
        : null,
      raw: row,
    };
  }

  function pengalamanText(applicant) {
    const pengalaman = applicant.pengalaman || {};
    if (pengalaman.freshGrad) return "Fresh";
    if (required(pengalaman.tahun)) return `${pengalaman.tahun} thn`;
    if (Array.isArray(pengalaman.list) && pengalaman.list.length > 0) return `${pengalaman.list.length} pengalaman`;
    return "-";
  }

  function pengalamanDetailHTML(applicant) {
    const pengalaman = applicant.pengalaman || {};
    if (pengalaman.freshGrad) return '<div class="helper">Fresh Graduate</div>';
    const list = Array.isArray(pengalaman.list) && pengalaman.list.length > 0
      ? pengalaman.list
      : [pengalaman].filter((item) =>
          required(item.perusahaan) ||
          required(item.jabatan) ||
          required(item.tglMasuk) ||
          required(item.tglKeluar) ||
          item.masihKerja ||
          required(item.deskripsi) ||
          required(item.alasanResign),
        );
    if (!list.length) return '<div class="helper">Belum ada data pengalaman.</div>';
    return list
      .map(
        (item, index) => `
      <div style="border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;">
        <div style="font-weight:900;margin-bottom:4px">Pengalaman ${index + 1}</div>
        <div class="helper">Perusahaan: <b>${escapeHTML(item.perusahaan || "-")}</b></div>
        <div class="helper">Jabatan: <b>${escapeHTML(item.jabatan || "-")}</b></div>
        <div class="helper">Periode: <b>${escapeHTML(item.tglMasuk || "-")} - ${escapeHTML(item.masihKerja ? "Sekarang" : item.tglKeluar || "-")}</b></div>
        <div class="helper">Deskripsi Pekerjaan: <b>${escapeHTML(item.deskripsi || "-")}</b></div>
        <div class="helper">Alasan Resign: <b>${escapeHTML(item.masihKerja ? "-" : item.alasanResign || "-")}</b></div>
      </div>
    `,
      )
      .join("");
  }

  function statusTag(status) {
    if (status === "PENDING") return '<span class="tag pending">PENDING</span>';
    if (status === "SHORTLISTED") return '<span class="tag shortlisted">SHORTLISTED</span>';
    if (status === "REJECTED") return '<span class="tag rejected">REJECTED</span>';
    if (status === "SCHEDULED") return '<span class="tag scheduled">SCHEDULED</span>';
    return `<span class="tag">${escapeHTML(status)}</span>`;
  }

  async function refreshApplicants() {
    const { data, error } = await supabaseClient.from("pelamar").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat data pelamar dari Supabase:", error);
      applicantCache = [];
      renderAll();
      return;
    }

    applicantCache = (data || []).map(mapRowToApplicant);
    renderAll();
  }

  function renderKPIs(list) {
    const total = list.length;
    const pending = list.filter((item) => item.status === "PENDING").length;
    const shortlisted = list.filter((item) => item.status === "SHORTLISTED").length;
    const rejected = list.filter((item) => item.status === "REJECTED").length;
    const uniquePos = new Set(list.map((item) => item.posisi)).size;

    document.getElementById("kpiTotal").textContent = total;
    document.getElementById("kpiPending").textContent = pending;
    document.getElementById("kpiShortlisted").textContent = shortlisted;
    document.getElementById("kpiRejected").textContent = rejected;
    document.getElementById("kpiUniquePos").textContent = uniquePos;
    document.getElementById("cvBankCount").textContent = list.filter((item) => item.cvFileName).length;
  }

  function rowActionsHTML(applicant) {
    return `
      <div class="rowActions">
        <button class="btn flat small" onclick="viewApplicant('${applicant.id}')">Lihat</button>
        <button class="btn flat small" onclick="openEditStatus('${applicant.id}')">Edit</button>
        <button class="btn flat small" onclick="openSchedule('${applicant.id}')">Interview</button>
        <button class="btn danger small" onclick="setStatus('${applicant.id}','REJECTED')">Reject</button>
      </div>
    `;
  }

  function renderTables() {
    const query = (document.getElementById("search")?.value || "").toLowerCase().trim();
    const filtered = query
      ? applicantCache.filter(
          (item) =>
            (item.nama || "").toLowerCase().includes(query) ||
            (item.email || "").toLowerCase().includes(query) ||
            (item.posisi || "").toLowerCase().includes(query),
        )
      : applicantCache;

    renderKPIs(applicantCache);

    const all = document.getElementById("tblAll");
    if (all) {
      all.innerHTML =
        filtered
          .map(
            (applicant) => `
        <tr>
          <td>${formatDateTime(applicant.createdAt)}</td>
          <td><b>${escapeHTML(applicant.posisi)}</b></td>
          <td>${escapeHTML(applicant.nama)}</td>
          <td>${escapeHTML(applicant.email)}</td>
          <td>${escapeHTML(applicant.hp)}</td>
          <td>${escapeHTML(pengalamanText(applicant))}</td>
          <td>${statusTag(applicant.status)}</td>
          <td>${applicant.cvFileName ? `<span class="pill">${escapeHTML(applicant.cvFileName)}</span>` : "-"}</td>
          <td>${rowActionsHTML(applicant)}</td>
        </tr>
      `,
          )
          .join("") || '<tr><td colspan="9" class="muted">Belum ada data.</td></tr>';
    }

    const shortlist = document.getElementById("tblShortlist");
    if (shortlist) {
      const rows =
        applicantCache
          .filter((item) => item.status === "SHORTLISTED")
          .map(
            (applicant) => `
          <tr>
            <td>${formatDateTime(applicant.createdAt)}</td>
            <td><b>${escapeHTML(applicant.posisi)}</b></td>
            <td>${escapeHTML(applicant.nama)}</td>
            <td>${escapeHTML(applicant.email)}</td>
            <td>${statusTag(applicant.status)}</td>
            <td>${rowActionsHTML(applicant)}</td>
          </tr>
        `,
          )
          .join("") || '<tr><td colspan="6" class="muted">Belum ada.</td></tr>';
      shortlist.innerHTML = rows;
    }

    const interviews = document.getElementById("tblInterviews");
    if (interviews) {
      const rows =
        applicantCache
          .filter((item) => item.status === "SCHEDULED" && item.interview)
          .map(
            (applicant) => `
          <tr>
            <td><b>${escapeHTML(applicant.nama)}</b></td>
            <td>${escapeHTML(applicant.posisi)}</td>
            <td>${escapeHTML(applicant.interview.datetime || "-")}</td>
            <td>${escapeHTML(applicant.interview.location || "-")}</td>
            <td>${escapeHTML(applicant.interview.interviewer || "-")}</td>
            <td>${statusTag(applicant.status)}</td>
            <td>
              <div class="rowActions">
                <button class="btn flat small" onclick="openSchedule('${applicant.id}')">Reschedule</button>
                <button class="btn danger small" onclick="setStatus('${applicant.id}','REJECTED')">Reject</button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("") || '<tr><td colspan="7" class="muted">Belum ada interview terjadwal.</td></tr>';
      interviews.innerHTML = rows;
    }

    const rejected = document.getElementById("tblRejected");
    if (rejected) {
      const rows =
        applicantCache
          .filter((item) => item.status === "REJECTED")
          .map(
            (applicant) => `
          <tr>
            <td>${formatDateTime(applicant.createdAt)}</td>
            <td><b>${escapeHTML(applicant.posisi)}</b></td>
            <td>${escapeHTML(applicant.nama)}</td>
            <td>${escapeHTML(applicant.email)}</td>
            <td>${statusTag(applicant.status)}</td>
          </tr>
        `,
          )
          .join("") || '<tr><td colspan="5" class="muted">Belum ada.</td></tr>';
      rejected.innerHTML = rows;
    }
  }

  function renderSettings() {
    const templates = loadTemplates();
    document.getElementById("tplConfirm").value = templates.confirm;
    document.getElementById("tplShortlist").value = templates.shortlist;
    document.getElementById("tplInterview").value = templates.interview;
    document.getElementById("tplReject").value = templates.reject;
  }

  function renderAll() {
    renderTables();
    renderSettings();
  }

  function clearAutoCloseTimer() {
    if (autoCloseTimer) {
      window.clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  }

  function disableApplicantForm() {
    if (!pageApplicant) return;

    pageApplicant.querySelectorAll("input, select, textarea, button").forEach((element) => {
      if (element === successCloseNow || element === successStayOpen) return;
      element.disabled = true;
    });
  }

  function showApplicationSuccessOverlay(applicantName, positionName) {
    if (!successBackdrop) return;

    disableApplicantForm();
    clearAutoCloseTimer();

    successTitle.textContent = "Terima kasih, lamaran Anda sudah kami terima";
    successLead.textContent = `${applicantName || "Lamaran Anda"} untuk posisi ${positionName || "yang dilamar"} telah masuk ke sistem kami. Tim rekrutmen akan meninjau data Anda terlebih dahulu sebelum menghubungi untuk tahap berikutnya.`;
    successStatusText.textContent = "Mencoba menutup halaman secara otomatis...";
    successMeta.textContent = "Anda dapat menunggu sebentar. Jika browser tidak menutup halaman ini secara otomatis, Anda bisa menutup tab ini dengan aman.";
    successBackdrop.classList.add("show");

    autoCloseTimer = window.setTimeout(() => {
      try {
        window.close();
      } catch (error) {
        console.warn("Menutup halaman otomatis gagal:", error);
      }

      window.setTimeout(() => {
        if (!window.closed) {
          successStatusText.textContent = "Halaman tidak bisa ditutup otomatis oleh browser";
          successMeta.textContent = "Lamaran Anda tetap sudah terkirim dengan baik. Anda dapat menutup tab ini secara manual kapan saja.";
        }
      }, 300);
    }, 1800);
  }

  if (successCloseNow) {
    successCloseNow.addEventListener("click", () => {
      clearAutoCloseTimer();

      try {
        window.close();
      } catch (error) {
        console.warn("Tutup sekarang gagal:", error);
      }

      window.setTimeout(() => {
        if (!window.closed) {
          successStatusText.textContent = "Silakan tutup tab ini secara manual";
          successMeta.textContent = "Lamaran Anda sudah tersimpan. Browser ini membatasi penutupan tab otomatis.";
        }
      }, 300);
    });
  }

  if (successStayOpen) {
    successStayOpen.addEventListener("click", () => {
      clearAutoCloseTimer();
      successStatusText.textContent = "Halaman tetap dibuka";
      successMeta.textContent = "Lamaran Anda sudah tersimpan. Anda dapat menutup tab ini kapan saja.";
    });
  }

  async function patchApplicantRecord(id, patch) {
    const { error } = await supabaseClient.from("pelamar").update(patch).eq("id", Number(id));
    if (error) {
      console.error("Gagal update pelamar di Supabase:", error);
      alert("Perubahan data pelamar gagal disimpan ke Supabase.");
      return false;
    }
    await refreshApplicants();
    return true;
  }

  function mapStatusToPatch(status, interviewPayload = null) {
    if (status === "REJECTED") {
      return {
        status_tindak_lanjut: "Tidak lanjut",
        tahap_proses: "Seleksi awal",
        interview_datetime: null,
        interview_location: null,
        interview_interviewer: null,
        interview_notes: null,
      };
    }

    if (status === "SHORTLISTED") {
      return {
        status_tindak_lanjut: "Sedang diproses",
        tahap_proses: "Seleksi awal",
        interview_datetime: null,
        interview_location: null,
        interview_interviewer: null,
        interview_notes: null,
      };
    }

    if (status === "SCHEDULED" && interviewPayload) {
      return {
        status_tindak_lanjut: "Sedang diproses",
        tahap_proses: "Wawancara",
        interview_datetime: interviewPayload.interview_datetime,
        interview_location: interviewPayload.interview_location,
        interview_interviewer: interviewPayload.interview_interviewer,
        interview_notes: interviewPayload.interview_notes,
      };
    }

    return {
      status_tindak_lanjut: "Baru masuk",
      tahap_proses: "Seleksi awal",
      interview_datetime: null,
      interview_location: null,
      interview_interviewer: null,
      interview_notes: null,
    };
  }

  async function submitApplication() {
    const posisi = posisiField.value.trim();
    const namaLengkap = document.getElementById("namaLengkap").value.trim();
    const email = document.getElementById("email").value.trim();
    const hp = document.getElementById("hp").value.trim();
    const tglLahir = document.getElementById("tglLahir").value;
    const gender = document.getElementById("gender").value;
    const alamatKtp = document.getElementById("alamatKtp").value.trim();
    const alamatDom = document.getElementById("alamatDom").value.trim();
    const file = cvFile.files?.[0];

    if (!required(posisi)) return alert("Posisi wajib diisi.");
    if (!required(namaLengkap)) return alert("Nama lengkap wajib diisi.");
    if (!required(email) || !email.includes("@")) return alert("Email wajib diisi dengan format benar.");
    if (!required(hp)) return alert("No. HP wajib diisi.");
    if (!required(tglLahir)) return alert("Tanggal lahir wajib diisi.");
    if (!required(gender)) return alert("Jenis kelamin wajib dipilih.");
    if (!required(alamatKtp) || !required(alamatDom)) return alert("Alamat KTP dan domisili wajib diisi.");
    if (!file) return alert("CV wajib diunggah (PDF).");

    const freshGrad = document.getElementById("freshGrad").checked;
    const pengalaman1 = {
      perusahaan: document.getElementById("perusahaan1").value.trim(),
      jabatan: document.getElementById("jabatan1").value.trim(),
      tglMasuk: document.getElementById("tglMasuk1").value,
      tglKeluar: document.getElementById("tglKeluar1").value,
      masihKerja: document.getElementById("masihKerja1").checked,
      deskripsi: document.getElementById("deskripsi1").value.trim(),
      alasanResign: document.getElementById("alasanResign1").value.trim(),
    };
    const pengalaman2 = {
      perusahaan: document.getElementById("perusahaan2").value.trim(),
      jabatan: document.getElementById("jabatan2").value.trim(),
      tglMasuk: document.getElementById("tglMasuk2").value,
      tglKeluar: document.getElementById("tglKeluar2").value,
      masihKerja: document.getElementById("masihKerja2").checked,
      deskripsi: document.getElementById("deskripsi2").value.trim(),
      alasanResign: document.getElementById("alasanResign2").value.trim(),
    };

    const pengalamanList = [pengalaman1, pengalaman2].filter(
      (item) =>
        required(item.perusahaan) ||
        required(item.jabatan) ||
        required(item.tglMasuk) ||
        required(item.tglKeluar) ||
        item.masihKerja ||
        required(item.deskripsi) ||
        required(item.alasanResign),
    );

    if (!freshGrad && pengalamanList.length === 0) {
      return alert("Isi minimal 1 pengalaman kerja atau centang Fresh Graduate.");
    }

    const pengalamanUtama = pengalamanList[0] || {
      perusahaan: "",
      jabatan: "",
      tglMasuk: "",
      tglKeluar: "",
      masihKerja: false,
      deskripsi: "",
      alasanResign: "",
    };

    const payload = {
      lowongan_id: routeLowonganId,
      posisi_dilamar: posisi,
      sumber_info_lowongan: sumberField.value || null,
      nama_lengkap: namaLengkap,
      email,
      no_hp: hp,
      tanggal_lahir: tglLahir,
      agama: document.getElementById("agama").value || null,
      status_pernikahan: document.getElementById("statusNikah").value || null,
      jenis_kelamin: gender,
      kewarganegaraan: document.getElementById("wn").value.trim() || null,
      alamat_ktp: alamatKtp,
      alamat_domisili: alamatDom,
      institusi_pendidikan: document.getElementById("kampus").value.trim() || null,
      jenjang_pendidikan: document.getElementById("jenjang").value || null,
      jurusan: document.getElementById("jurusan").value.trim() || null,
      tahun_lulus: document.getElementById("thnLulus").value.trim() || null,
      ipk_nilai: document.getElementById("ipk").value.trim() || null,
      fresh_graduate: freshGrad,
      lama_pengalaman_tahun: document.getElementById("tahunExp").value.trim() || null,
      pengalaman_list: pengalamanList,
      pengalaman_utama_perusahaan: pengalamanUtama.perusahaan || null,
      pengalaman_utama_jabatan: pengalamanUtama.jabatan || null,
      pengalaman_utama_tanggal_masuk: pengalamanUtama.tglMasuk || null,
      pengalaman_utama_tanggal_keluar: pengalamanUtama.tglKeluar || null,
      pengalaman_utama_masih_kerja: pengalamanUtama.masihKerja,
      pengalaman_utama_deskripsi: pengalamanUtama.deskripsi || null,
      pengalaman_utama_alasan_resign: pengalamanUtama.alasanResign || null,
      ekspektasi_gaji: Number((document.getElementById("gaji").value || "").replace(/\D/g, "")) || null,
      masa_notice: document.getElementById("notice").value || null,
      cv_file_name: file.name,
      status_tindak_lanjut: "Baru masuk",
      tahap_proses: "Seleksi awal",
      penilaian_singkat: null,
      catatan_recruiter: null,
      interview_datetime: null,
      interview_location: null,
      interview_interviewer: null,
      interview_notes: null,
      archived: false,
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Mengirim...";
      }

      const { error } = await supabaseClient.from("pelamar").insert(payload);
      if (error) throw error;

      await refreshApplicants();
      showApplicationSuccessOverlay(namaLengkap, posisi);
    } catch (error) {
      console.error("Submit lamaran ke Supabase gagal:", error);
      alert(`Lamaran gagal dikirim ke database. ${error?.message || "Silakan coba lagi."}`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Kirim Lamaran";
      }
    }
  }

  async function setStatus(id, status) {
    await patchApplicantRecord(id, mapStatusToPatch(status));
  }

  function viewApplicant(id) {
    const applicant = applicantCache.find((item) => item.id === id);
    if (!applicant) return;
    openModal(
      "Detail Pelamar",
      `
      <div class="grid two">
        <div><div class="muted" style="font-weight:900;font-size:12px">Nama</div><div style="font-weight:1000">${escapeHTML(applicant.nama)}</div></div>
        <div><div class="muted" style="font-weight:900;font-size:12px">Posisi</div><div style="font-weight:1000">${escapeHTML(applicant.posisi)}</div></div>
        <div><div class="muted" style="font-weight:900;font-size:12px">Email</div><div>${escapeHTML(applicant.email)}</div></div>
        <div><div class="muted" style="font-weight:900;font-size:12px">No. HP</div><div>${escapeHTML(applicant.hp)}</div></div>
        <div><div class="muted" style="font-weight:900;font-size:12px">Status</div><div>${statusTag(applicant.status)}</div></div>
        <div><div class="muted" style="font-weight:900;font-size:12px">CV</div><div>${applicant.cvFileName ? escapeHTML(applicant.cvFileName) : "-"}</div></div>
      </div>
      <div class="divider"></div>
      <div class="muted" style="font-weight:900;font-size:12px">Alamat KTP</div>
      <div style="margin-bottom:10px">${escapeHTML(applicant.alamatKtp || "-")}</div>
      <div class="muted" style="font-weight:900;font-size:12px">Alamat Domisili</div>
      <div style="margin-bottom:10px">${escapeHTML(applicant.alamatDom || "-")}</div>
      <div class="muted" style="font-weight:900;font-size:12px">Pengalaman Kerja</div>
      <div>${pengalamanDetailHTML(applicant)}</div>
    `,
      `
      <button class="btn flat" onclick="closeModal()">Tutup</button>
      <button class="btn success" onclick="setStatus('${applicant.id}','SHORTLISTED');closeModal()">Shortlist</button>
      <button class="btn danger" onclick="setStatus('${applicant.id}','REJECTED');closeModal()">Reject</button>
    `,
    );
  }

  function openEditStatus(id) {
    const applicant = applicantCache.find((item) => item.id === id);
    if (!applicant) return;
    openModal(
      "Edit Pelamar",
      `
      <div class="field">
        <label>Status</label>
        <select id="editStatus">
          <option value="PENDING">PENDING</option>
          <option value="SHORTLISTED">SHORTLISTED</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <div class="helper">Untuk status SCHEDULED, gunakan menu Interview agar detailnya tersimpan.</div>
      </div>
    `,
      `
      <button class="btn flat" onclick="closeModal()">Batal</button>
      <button class="btn blue" onclick="
        (function(){
          const value = document.getElementById('editStatus').value;
          setStatus('${applicant.id}', value);
          closeModal();
        })()
      ">Simpan</button>
    `,
    );
    setTimeout(() => {
      document.getElementById("editStatus").value = applicant.status;
    }, 0);
  }

  function openSchedule(id) {
    const applicant = applicantCache.find((item) => item.id === id);
    if (!applicant) return;
    const current = applicant.interview || { datetime: "", location: "", interviewer: "", notes: "" };

    openModal(
      `Jadwalkan/Reschedule Interview - ${escapeHTML(applicant.nama)}`,
      `
      <div class="grid two">
        <div class="field">
          <label>Tanggal & Waktu Interview</label>
          <input id="intDT" type="datetime-local"/>
          <div class="helper">Format 24 jam.</div>
        </div>
        <div class="field">
          <label>Lokasi / Link Meeting</label>
          <input id="intLoc" placeholder="Contoh: Zoom / Kantor pusat"/>
        </div>
      </div>
      <div class="grid two">
        <div class="field">
          <label>Nama Pewawancara</label>
          <input id="intIv" placeholder="Contoh: Budi - HR"/>
        </div>
        <div class="field">
          <label>Catatan Tambahan</label>
          <input id="intNotes" placeholder="Contoh: Mohon siapkan internet stabil"/>
        </div>
      </div>
    `,
      `
      <button class="btn flat" onclick="closeModal()">Batal</button>
      <button class="btn blue" onclick="
        (async function(){
          const dt = document.getElementById('intDT').value;
          const loc = document.getElementById('intLoc').value;
          const iv = document.getElementById('intIv').value;
          const notes = document.getElementById('intNotes').value;
          if(!dt) return alert('Tanggal & waktu wajib diisi');
          await patchApplicantRecord('${applicant.id}', mapStatusToPatch('SCHEDULED', {
            interview_datetime: new Date(dt).toISOString(),
            interview_location: loc || null,
            interview_interviewer: iv || null,
            interview_notes: notes || null
          }));
          closeModal();
        })()
      ">Simpan</button>
    `,
    );

    setTimeout(() => {
      document.getElementById("intLoc").value = current.location || "";
      document.getElementById("intIv").value = current.interviewer || "";
      document.getElementById("intNotes").value = current.notes || "";
    }, 0);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(applicantCache, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pelamar_export.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function seedDemo() {
    alert("Data demo sudah dinonaktifkan. Sumber pelamar sekarang hanya dari form kandidat dan Supabase.");
  }

  function saveTemplates() {
    const templates = {
      confirm: document.getElementById("tplConfirm").value,
      shortlist: document.getElementById("tplShortlist").value,
      interview: document.getElementById("tplInterview").value,
      reject: document.getElementById("tplReject").value,
    };
    saveTemplatesToStorage(templates);
    alert("Template disimpan.");
  }

  function resetTemplates() {
    if (window.confirm("Reset template ke default?")) {
      saveTemplatesToStorage(DEFAULT_TPL);
      renderSettings();
      alert("Template direset.");
    }
  }

  function openModal(title, bodyHTML, footerHTML) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = bodyHTML || "";
    document.getElementById("modalFooter").innerHTML = footerHTML || '<button class="btn flat" onclick="closeModal()">Tutup</button>';
    document.getElementById("modalBackdrop").classList.add("show");
  }

  function closeModal() {
    document.getElementById("modalBackdrop").classList.remove("show");
  }

  function switchAdminTab(tab) {
    document.querySelectorAll(".tab").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-admin-tab") === tab);
    });
    document.querySelectorAll(".adminPane").forEach((pane) => {
      pane.style.display = "none";
    });
    const targetPane = document.getElementById(`admin_${tab}`);
    if (targetPane) targetPane.style.display = "block";
    renderAll();
  }

  function initPrefillFromUrl() {
    if (presetPosisi && posisiField && !posisiField.value.trim()) {
      posisiField.value = presetPosisi;
    }
    if (presetSumber && sumberField && !sumberField.value) {
      const options = Array.from(sumberField.options || []);
      const exists = options.some((option) => option.value === presetSumber || option.text === presetSumber);
      if (exists) sumberField.value = presetSumber;
    }
  }

  document.getElementById("goApplicant")?.addEventListener("click", () => showPage("applicant"));
  document.getElementById("goAdmin")?.addEventListener("click", () => {
    showPage("admin");
    void refreshApplicants();
  });
  document.getElementById("resetData")?.addEventListener("click", () => {
    alert("Reset data demo sudah dinonaktifkan. Hapus data langsung dari Supabase jika diperlukan.");
  });
  document.getElementById("search")?.addEventListener("input", renderTables);

  cvFile?.addEventListener("change", () => {
    const file = cvFile.files?.[0];
    cvName.textContent = file ? `File dipilih: ${file.name}` : "";
  });

  window.submitApplication = submitApplication;
  window.switchAdminTab = switchAdminTab;
  window.setStatus = setStatus;
  window.viewApplicant = viewApplicant;
  window.openEditStatus = openEditStatus;
  window.openSchedule = openSchedule;
  window.exportJSON = exportJSON;
  window.seedDemo = seedDemo;
  window.saveTemplates = saveTemplates;
  window.resetTemplates = resetTemplates;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.mapStatusToPatch = mapStatusToPatch;
  window.patchApplicantRecord = patchApplicantRecord;

  initPrefillFromUrl();
  renderSettings();
  void refreshApplicants();
})();
