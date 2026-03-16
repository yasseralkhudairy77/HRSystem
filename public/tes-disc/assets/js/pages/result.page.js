import { Storage } from "../core/storage.js";
import { qs, escapeHtml } from "../core/utils.js";
import { getTest } from "../tests/registry.js";
import { DiscReportProfiles } from "../tests/disc/report_profiles.js";

function fmt(n){
  if(n === null || n === undefined) return "-";
  return String(n);
}

function toNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildMiniGraphSvg(data, color){
  const dims = ["D", "I", "S", "C"];
  const values = dims.map(d => toNum(data?.[d]));
  const minV = Math.min(-8, ...values, -8);
  const maxV = Math.max(8, ...values, 8);

  const w = 250;
  const h = 320;
  const m = { top: 16, right: 14, bottom: 42, left: 28 };
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;
  const stepX = iw / (dims.length - 1);

  const x = (i) => m.left + i * stepX;
  const y = (v) => m.top + ((maxV - v) / (maxV - minV)) * ih;
  const ticks = [];
  for(let t = Math.ceil(minV); t <= Math.floor(maxV); t += 2) ticks.push(t);

  const hGrid = ticks.map(t => `
    <line x1="${m.left}" y1="${y(t)}" x2="${w - m.right}" y2="${y(t)}" stroke="${t === 0 ? "#a8b4c9" : "#e6edf7"}" stroke-width="${t === 0 ? 1.6 : 1}" />
    <text x="${m.left - 6}" y="${y(t) + 3}" text-anchor="end" font-size="9" fill="#60708a">${t}</text>
  `).join("");

  const vGrid = dims.map((d, i) => `
    <line x1="${x(i)}" y1="${m.top}" x2="${x(i)}" y2="${h - m.bottom}" stroke="#eef3fb" stroke-width="1" />
    <text x="${x(i)}" y="${h - m.bottom + 16}" text-anchor="middle" font-size="10" fill="#334155" font-weight="700">${d}</text>
  `).join("");

  const pts = dims.map((d, i) => `${x(i)},${y(toNum(data?.[d]))}`).join(" ");
  const dots = dims.map((d, i) => {
    const val = toNum(data?.[d]);
    const cx = x(i);
    const cy = y(val);
    return `
      <circle cx="${cx}" cy="${cy}" r="3.4" fill="${color}" />
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="9" fill="${color}" font-weight="700">${val}</text>
    `;
  }).join("");
  return `
      <svg class="disc-mini-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik DISC per dimensi D I S C">
        ${hGrid}
        ${vGrid}
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        ${dots}
      </svg>
  `;
}

function renderList(items){
  if(!items?.length) return `<div class="small">-</div>`;
  return `<ul>${items.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function main(){
  const testId = qs("test");
  const { manifest } = getTest(testId);

  const s = Storage.getSession();
  const r = Storage.getResult(testId);
  if(!s || !r){
    document.getElementById("error-box").textContent = "Hasil tidak ditemukan. Mulai tes dari awal.";
    return;
  }

  document.getElementById("title").textContent = `Hasil ${manifest.name}`;

  const cand = s.candidate || {};
  const dominant = (r.score?.dominant || "D");
  const profile = DiscReportProfiles[dominant] || DiscReportProfiles.D;

  document.getElementById("cand").innerHTML = `
    <div class="card disc-report-head">
      <div class="disc-type-banner" style="--disc-color:${profile.color};">
        <div class="disc-type-title">${escapeHtml(profile.title)}</div>
      </div>
      <div class="row2 disc-ident">
        <div><div class="small">Nama</div><b>${escapeHtml(cand.name || "-")}</b></div>
        <div><div class="small">No HP</div><b>${escapeHtml(cand.phone || "-")}</b></div>
      </div>
      <div class="row2 disc-ident-row">
        <div><div class="small">Posisi</div><b>${escapeHtml(cand.position || "-")}</b></div>
        <div><div class="small">Durasi</div><b>${fmt(r.meta?.durationSec)} detik</b></div>
      </div>
      <div class="disc-type-hero">
        <div class="disc-big-letter" style="--disc-color:${profile.color};">${escapeHtml(profile.short)}</div>
        <div>
          <h2 style="margin:0 0 4px;">Profil Dominan: ${escapeHtml(profile.title)}</h2>
          <div class="small">Dominan dihitung dari nilai tertinggi pada Grafik 3 (Mirror/Change).</div>
        </div>
      </div>
      ${r.flags?.includes("ada_kesalahan_input") ? `<div class="error" style="margin-top:10px;">ADA KESALAHAN INPUT (cek mapping/kelengkapan jawaban)</div>` : ``}
    </div>
  `;

  const sc = r.score;
  document.getElementById("scores").innerHTML = `
    <div class="card disc-score-card">
      <h2>Skor (Line)</h2>
      <table>
        <thead><tr><th>Line</th><th>D</th><th>I</th><th>S</th><th>C</th><th>*</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>1 (Most/P)</td><td>${sc.most.D}</td><td>${sc.most.I}</td><td>${sc.most.S}</td><td>${sc.most.C}</td><td>${sc.most["*"]}</td><td>${sc.most.D+sc.most.I+sc.most.S+sc.most.C+sc.most["*"]}</td></tr>
          <tr><td>2 (Least/K)</td><td>${sc.least.D}</td><td>${sc.least.I}</td><td>${sc.least.S}</td><td>${sc.least.C}</td><td>${sc.least["*"]}</td><td>${sc.least.D+sc.least.I+sc.least.S+sc.least.C+sc.least["*"]}</td></tr>
          <tr><td>3 (Diff)</td><td>${sc.diff.D}</td><td>${sc.diff.I}</td><td>${sc.diff.S}</td><td>${sc.diff.C}</td><td>-</td><td>-</td></tr>
        </tbody>
      </table>
      <div class="small" style="margin-top:8px;">Grafik di Excel dihitung via tabel konversi (VLOOKUP). Di bawah ini nilai grafik (konversi).</div>
      <table style="margin-top:10px;">
        <thead><tr><th>Grafik</th><th>D</th><th>I</th><th>S</th><th>C</th></tr></thead>
        <tbody>
          <tr><td>Grafik 1</td><td>${fmt(sc.graph.line1.D)}</td><td>${fmt(sc.graph.line1.I)}</td><td>${fmt(sc.graph.line1.S)}</td><td>${fmt(sc.graph.line1.C)}</td></tr>
          <tr><td>Grafik 2</td><td>${fmt(sc.graph.line2.D)}</td><td>${fmt(sc.graph.line2.I)}</td><td>${fmt(sc.graph.line2.S)}</td><td>${fmt(sc.graph.line2.C)}</td></tr>
          <tr><td>Grafik 3</td><td>${fmt(sc.graph.line3.D)}</td><td>${fmt(sc.graph.line3.I)}</td><td>${fmt(sc.graph.line3.S)}</td><td>${fmt(sc.graph.line3.C)}</td></tr>
        </tbody>
      </table>
      <div class="disc-graph-grid">
        <div class="disc-graph-card">
          <div class="disc-graph-title">GRAPH 1 MOST</div>
          <div class="small">Mask Public Self</div>
          ${buildMiniGraphSvg(sc.graph.line1, "#dc2626")}
        </div>
        <div class="disc-graph-card">
          <div class="disc-graph-title">GRAPH 2 LEAST</div>
          <div class="small">Core Private Self</div>
          ${buildMiniGraphSvg(sc.graph.line2, "#f59e0b")}
        </div>
        <div class="disc-graph-card">
          <div class="disc-graph-title">GRAPH 3 CHANGE</div>
          <div class="small">Mirror Perceived Self</div>
          ${buildMiniGraphSvg(sc.graph.line3, "#2563eb")}
        </div>
      </div>
    </div>
  `;

  const it = r.interpretation || {};
  document.getElementById("interp").innerHTML = `
    <div class="card">
      <div class="disc-three-col">
        <section>
          <h3>Potret Diri Anda</h3>
          ${renderList(it.potret || [])}
        </section>
        <section>
          <h3>Kelebihan</h3>
          ${renderList(profile.strengths)}
        </section>
        <section>
          <h3>Kekurangan</h3>
          ${renderList(profile.weaknesses)}
        </section>
      </div>
    </div>

    <div class="card">
      <h3 class="disc-sec-title">Tipe Kepribadian ${escapeHtml(profile.title)}</h3>
      <p>${escapeHtml(it.paragraph || "-")}</p>
      <div class="disc-two-col">
        <section>
          <h3>Kecenderungan yang Anda Miliki</h3>
          ${renderList(profile.tendencies)}
        </section>
        <section>
          <h3>Lingkungan / Posisi yang Cocok</h3>
          ${renderList(profile.suitableEnv)}
        </section>
      </div>
    </div>

    <div class="card">
      <h3 class="disc-sec-title">Perbaikan, Peningkatan, dan Pengembangan</h3>
      ${renderList(profile.development)}
      <div style="margin-top:10px;">
        <div class="small"><b>Catatan Sistem</b>: ${r.flags?.length ? escapeHtml(r.flags.join(", ")) : "-"}</div>
      </div>
    </div>
  `;
}

main();
