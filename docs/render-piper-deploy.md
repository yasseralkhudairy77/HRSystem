# Deploy Piper API ke Render

## 1. Tipe service

- pilih `Web Service`
- runtime: `Docker`

Jika memakai Blueprint, file [render.yaml](c:/Users/user/Documents/PRODUCT%20HR%20RECRUITMENT/WEBAPP%20DESIGN/render.yaml) sudah disiapkan.

## 2. Environment variables di Render

Wajib:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Disarankan:

- `SUPABASE_AUDIO_BUCKET=interview-ai-audio`
- `SUPABASE_AUDIO_FOLDER=questions`

## 3. Bucket Supabase

Buat bucket public bernama:

- `interview-ai-audio`

Folder file akan otomatis menggunakan prefix:

- `questions/`

## 4. Setelah deploy berhasil

Render akan memberi URL seperti:

- `https://hireumkm-piper-api.onrender.com`

Masukkan URL itu ke frontend sebagai:

- `VITE_PIPER_API_URL=https://hireumkm-piper-api.onrender.com`

Lalu rebuild / redeploy frontend.

## 5. Cek hasil

Endpoint health:

- `/health`

Contoh:

- `https://hireumkm-piper-api.onrender.com/health`

Kalau normal, editor `Wawancara AI` akan menampilkan status server audio aktif.
