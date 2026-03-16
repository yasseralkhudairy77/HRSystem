# SPM App Modular

Versi modular dari aplikasi tes Raven SPM, dipisah menjadi HTML, CSS, dan JavaScript agar lebih mudah dirawat.

## Struktur

- `index.html`: kerangka UI.
- `styles.css`: styling aplikasi.
- `app.js`: logika soal, progress, skor, dan export JSON.

## Menjalankan

1. Buka `spm_app_modular/index.html` di browser.
2. Pastikan folder gambar berada di `../webp/` relatif dari file tersebut.

## Konfigurasi penting

Ubah di `app.js` bagian `CONFIG`:

- `totalQuestions`: default `60`.
- `optionCount`: default `8`.
- `imageDir`: default `../webp/`.
- `imageExt`: default `.webp`.

## Output hasil

Klik `Selesai` untuk menghasilkan JSON hasil pengerjaan (jawaban per soal + skor).
