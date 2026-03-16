import { updateSession } from "../core/session.js";
import { getTest } from "../tests/registry.js";
import { Storage } from "../core/storage.js";
import { qs } from "../core/utils.js";
import { DiscReportProfiles } from "../tests/disc/report_profiles.js";

function getPackageContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get("package_token"),
    packageId: params.get("package_id"),
    itemId: params.get("item_id"),
    returnUrl: params.get("return_url"),
  };
}

function createSupabaseClient() {
  const config = window.TEST_PACKAGE_SUPABASE_CONFIG;
  const supabaseLib = window.supabase;

  if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
    return null;
  }

  return supabaseLib.createClient(config.url, config.publishableKey);
}

function buildDiscSummary(result) {
  const dominantCode = result?.score?.dominant || "D";
  const profile = DiscReportProfiles[dominantCode] || DiscReportProfiles.D;
  const paragraph = String(result?.interpretation?.paragraph || "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = paragraph
    ? `${paragraph.split(". ")[0].replace(/\.+$/, "")}.`
    : "Tim rekrutmen dapat meninjau pola perilaku utama kandidat dari hasil DISC ini.";

  return {
    dominantCode,
    profile,
    summary: `Profil dominan ${profile.title}. ${firstSentence}`,
  };
}

async function syncPackageStatus(supabase, packageId) {
  const numericPackageId = Number(packageId);
  const { data: items, error } = await supabase
    .from("candidate_test_package_items")
    .select("status")
    .eq("package_id", numericPackageId);

  if (error) throw error;

  const statuses = (items || []).map((item) => item.status);
  const payload = {};

  if (statuses.length && statuses.every((status) => status === "completed")) {
    payload.status = "completed";
    payload.completed_at = new Date().toISOString();
  } else if (statuses.some((status) => status === "completed" || status === "in_progress")) {
    payload.status = "in_progress";
  } else {
    payload.status = "opened";
  }

  const { error: updateError } = await supabase
    .from("candidate_test_packages")
    .update(payload)
    .eq("id", numericPackageId);

  if (updateError) throw updateError;
}

async function saveResultToPackage(supabase, packageContext, payload) {
  const now = new Date().toISOString();
  const summary = buildDiscSummary(payload);

  const updatePayload = {
    status: "completed",
    started_at: now,
    completed_at: now,
    score_numeric: null,
    score_label: `Profil dominan: ${summary.profile.title}`,
    summary: summary.summary,
    result_json: {
      saved_at: now,
      meta: payload.meta || {},
      dominant_code: summary.dominantCode,
      dominant_profile_title: summary.profile.title,
      graph1: payload.score?.graph?.line1 || {},
      graph2: payload.score?.graph?.line2 || {},
      graph3: payload.score?.graph?.line3 || {},
      most: payload.score?.most || {},
      least: payload.score?.least || {},
      diff: payload.score?.diff || {},
      flags: payload.flags || [],
      interpretation: payload.interpretation || {},
    },
  };

  const { error } = await supabase
    .from("candidate_test_package_items")
    .update(updatePayload)
    .eq("id", Number(packageContext.itemId));

  if (error) throw error;

  await syncPackageStatus(supabase, packageContext.packageId);
}

function renderPackageSuccess(root, returnUrl) {
  root.innerHTML = `
    <section class="card">
      <div class="small" style="margin-bottom:8px;">Jawaban Terkirim</div>
      <h2 style="margin:0 0 10px;">Jawaban sudah diterima.</h2>
      <p class="small" style="line-height:1.7;">
        Hasil penilaian tidak ditampilkan di halaman kandidat. Tim rekrutmen akan mereview hasil kuesioner ini secara internal.
      </p>
      ${returnUrl ? '<p class="small" style="margin-top:12px;">Anda akan dikembalikan ke halaman paket tes.</p>' : ""}
    </section>
  `;
}

function applyCandidateFacingCopy(root) {
  document.title = "Kuesioner Gaya Kerja";
  const pageTitle = document.getElementById("title");
  if (pageTitle) {
    pageTitle.textContent = "Kuesioner Gaya Kerja";
  }

  const introTitle = root.querySelector(".disc-intro h2");
  if (introTitle) {
    introTitle.textContent = "KUESIONER GAYA KERJA";
  }

  const introText = root.querySelector(".disc-intro .small");
  if (introText) {
    introText.innerHTML = `
      Pilih <b>M</b> untuk pernyataan yang paling menggambarkan gaya kerja Anda dan <b>L</b> untuk pernyataan yang paling tidak menggambarkan gaya kerja Anda.
      Setiap nomor wajib memilih 1 M dan 1 L, dan <b>tidak boleh sama</b>.
    `;
  }
}

function renderOnboarding(target, onStart) {
  target.innerHTML = `
    <section class="onboarding-shell">
      <article class="onboarding-card">
        <div class="onboarding-eyebrow">Pengantar Kuesioner</div>
        <h2 class="onboarding-title">Kuesioner Gaya Kerja</h2>
        <p class="onboarding-lead">
          Pada kuesioner ini, Anda akan membaca beberapa kelompok pernyataan lalu memilih pernyataan yang
          <b>paling menggambarkan</b> diri Anda dan yang <b>paling tidak menggambarkan</b> diri Anda.
        </p>
      </article>
      <section class="onboarding-grid">
        <article class="onboarding-panel">
          <h3>Cara mengerjakan</h3>
          <ul class="onboarding-list">
            <li>Pilih satu pernyataan sebagai <b>M</b> = paling menggambarkan Anda.</li>
            <li>Pilih satu pernyataan sebagai <b>L</b> = paling tidak menggambarkan Anda.</li>
            <li>Untuk setiap nomor, pilihan <b>M</b> dan <b>L</b> tidak boleh sama.</li>
            <li>Jawab sesuai kondisi diri Anda saat bekerja, bukan jawaban yang menurut Anda paling ideal.</li>
          </ul>
          <p class="onboarding-note">Jawaban akan direkam saat Anda mengirim kuesioner di akhir pengisian.</p>
        </article>
        <article class="onboarding-panel">
          <h3>Contoh sederhana</h3>
          <div class="disc-example">
            <div class="disc-example-row">
              <div class="disc-example-cell"><span class="disc-example-tag">M</span></div>
              <div class="disc-example-cell disc-example-text">Saya cepat mengambil keputusan.</div>
              <div class="disc-example-cell"><span class="disc-example-tag secondary">L</span></div>
            </div>
            <div class="disc-example-row">
              <div class="disc-example-cell"><span class="disc-example-tag secondary">L</span></div>
              <div class="disc-example-cell disc-example-text">Saya lebih nyaman menunggu arahan.</div>
              <div class="disc-example-cell"><span class="disc-example-tag">M</span></div>
            </div>
          </div>
          <p class="onboarding-note">
            Dari satu kelompok pernyataan, pilih satu yang paling sesuai dan satu yang paling tidak sesuai.
            Setelah siap, lanjutkan ke kuesioner utama.
          </p>
        </article>
      </section>
      <div class="onboarding-actions">
        <button type="button" id="btn-start-disc" class="btn primary">Mulai kuesioner</button>
      </div>
    </section>
  `;

  const startButton = target.querySelector("#btn-start-disc");
  startButton?.addEventListener("click", onStart);
}

async function main(){
  const testId = qs("test");
  const { runner, manifest } = getTest(testId);
  const packageContext = getPackageContext();
  const isPackageMode = Boolean(packageContext.itemId && packageContext.packageId);
  const supabase = isPackageMode ? createSupabaseClient() : null;

  let session = Storage.getSession();

  if(!session && isPackageMode){
    session = {
      candidate: {
        name: "Kandidat Paket Tes",
        phone: "",
        gender: "",
        age: null,
        position: "",
      },
      assessment: { testId, startedAt: Date.now(), finishedAt: null },
    };
    Storage.setSession(session);
  }

  if(!session){
    window.location.href = "candidate.html";
    return;
  }

  if(!session.candidate){
    if(!isPackageMode){
      window.location.href = "candidate.html";
      return;
    }

    session = updateSession({
      candidate: {
        name: "Kandidat Paket Tes",
        phone: "",
        gender: "",
        age: null,
        position: "",
      },
    });
  }

  if(!session.assessment || session.assessment.testId !== testId){
    session = updateSession({ assessment: { testId, startedAt: Date.now(), finishedAt: null } });
  }

  document.getElementById("title").textContent = manifest.name;

  const onboardingRoot = document.getElementById("onboarding-root");
  const root = document.getElementById("test-root");
  const submitBtn = document.getElementById("btn-submit");
  const submitWrap = document.getElementById("submit-wrap");
  const errorBox = document.getElementById("error-box");

  const api = runner.init({ root, session });

  if (isPackageMode) {
    applyCandidateFacingCopy(root);
  }

  const showQuestionnaire = () => {
    if (onboardingRoot) onboardingRoot.style.display = "none";
    root.style.display = "block";
    if (submitWrap) submitWrap.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (onboardingRoot) {
    renderOnboarding(onboardingRoot, showQuestionnaire);
  } else {
    showQuestionnaire();
  }

  submitBtn.addEventListener("click", async () => {
    errorBox.textContent = "";
    try{
      const result = api.submit();
      const end = Date.now();
      const start = Storage.getSession().assessment.startedAt;
      const durationSec = Math.round((end - start)/1000);

      updateSession({ assessment: { ...Storage.getSession().assessment, finishedAt: end } });
      const payload = {
        testId,
        meta: { durationSec },
        ...result
      };

      if(isPackageMode){
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan jawaban...";
        Storage.clearResult(testId);

        if(!supabase){
          throw new Error("Koneksi paket tes belum tersedia.");
        }

        await saveResultToPackage(supabase, packageContext, payload);
        renderPackageSuccess(root, packageContext.returnUrl);
        submitBtn.style.display = "none";

        if(packageContext.returnUrl){
          window.setTimeout(() => {
            window.location.href = packageContext.returnUrl;
          }, 1200);
        }
        return;
      }

      Storage.saveResult(testId, payload);
      window.location.href = manifest.routes.result;
    }catch(err){
      errorBox.textContent = err?.message || "Terjadi kesalahan.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Selesai & Kirim";
    }
  });
}

main();
