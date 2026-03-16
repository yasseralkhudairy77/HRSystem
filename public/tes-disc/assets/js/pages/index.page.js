import { Storage } from "../core/storage.js";

const form = document.getElementById("token-form");
const err = document.getElementById("error-box");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  err.textContent = "";

  const token = document.getElementById("token").value.trim();
  if(!token) { err.textContent = "Token wajib diisi."; return; }

  // Buat session awal (bisa kamu ganti validasi token via server nanti)
  Storage.setSession({
    token,
    candidate: null,
    assessment: null
  });

  window.location.href = "candidate.html";
});