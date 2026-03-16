import { DiscItems } from "./items.js";
import { scoreDisc } from "./score.js";
import { interpretDisc } from "./interpret.js";
import { escapeHtml } from "../../core/utils.js";

export const DiscTest = {
  init({ root, session }) {
    root.innerHTML = `
      <div class="card disc-intro">
        <h2>TES DISC</h2>
        <p class="small">
          Pilih <b>M</b> (Most / paling menggambarkan, setara P) dan <b>L</b> (Least / paling tidak menggambarkan, setara K) untuk tiap nomor.
          Setiap nomor wajib memilih 1 M dan 1 L, dan <b>tidak boleh sama</b>.
        </p>
      </div>
      <div id="disc-list"></div>
    `;

    const list = root.querySelector("#disc-list");
    const state = {
      responses: DiscItems.map((q) => ({ no: q.no, most: null, least: null }))
    };

    list.innerHTML = DiscItems.map(q => {
      const opts = q.options.map((t, idx) => {
        const val = idx + 1;
        return `
          <div class="sheet-row">
            <div class="sheet-cell sheet-radio"><input type="radio" name="m_${q.no}" value="${val}" aria-label="No ${q.no} opsi ${val} pilih M"></div>
            <div class="sheet-cell sheet-text">${escapeHtml(t)}</div>
            <div class="sheet-cell sheet-radio"><input type="radio" name="l_${q.no}" value="${val}" aria-label="No ${q.no} opsi ${val} pilih L"></div>
          </div>
        `;
      }).join("");

      return `
        <div class="block disc-block disc-sheet" data-q="${q.no}">
          <div class="sheet-no">${q.no}</div>
          <div class="sheet-table">
            <div class="sheet-head" role="row">
              <div class="sheet-cell">M</div><div class="sheet-cell">Pernyataan</div><div class="sheet-cell">L</div>
            </div>
            ${opts}
          </div>
          <div class="hint" id="hint_${q.no}"></div>
        </div>
      `;
    }).join("");

    DiscItems.forEach(q => {
      const block = list.querySelector(`[data-q="${q.no}"]`);
      const hint = block.querySelector(`#hint_${q.no}`);
      const res = state.responses.find(x => x.no === q.no);

      function validateRow(){
        if(res.most && res.least && res.most === res.least){
          hint.textContent = "M dan L tidak boleh sama.";
          hint.classList.add("error");
        } else {
          hint.textContent = "";
          hint.classList.remove("error");
        }
      }

      block.querySelectorAll(`input[name="m_${q.no}"]`).forEach(inp => {
        inp.addEventListener("change", () => { res.most = Number(inp.value); validateRow(); });
      });
      block.querySelectorAll(`input[name="l_${q.no}"]`).forEach(inp => {
        inp.addEventListener("change", () => { res.least = Number(inp.value); validateRow(); });
      });
    });

    return {
      submit() {
        for(const r of state.responses){
          if(!r.most || !r.least) throw new Error(`No. ${r.no} belum lengkap (M & L wajib).`);
          if(r.most === r.least) throw new Error(`No. ${r.no}: M dan L tidak boleh sama.`);
        }
        const score = scoreDisc(state.responses);
        const interpretation = interpretDisc(score);
        return { raw: { responses: state.responses }, score, interpretation, flags: score.flags || [] };
      }
    };
  }
};
