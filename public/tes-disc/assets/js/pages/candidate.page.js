import { Storage } from "../core/storage.js";

const err = document.getElementById("error-box");
const form = document.getElementById("candidate-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  err.textContent = "";

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const gender = document.getElementById("gender").value;
  const age = Number(document.getElementById("age").value || 0);
  const position = document.getElementById("position").value.trim();

  if(!name) { err.textContent = "Nama wajib diisi."; return; }
  if(phone && !/^0\d{9,14}$/.test(phone)) { err.textContent = "No HP harus format 08xxxxxxxxxx (9-14 digit setelah 0)."; return; }
  if(age && (age < 10 || age > 80)) { err.textContent = "Usia tidak wajar. Isi 10-80."; return; }

  const s = Storage.getSession();
  Storage.setSession({
    ...s,
    candidate: { name, phone, gender, age, position }
  });

  // langsung ke DISC dulu
  window.location.href = "test.html?test=disc";
});