# HireUMKM Blueprint Demo

Demo frontend HR system untuk UMKM berbasis `Vite + React + Tailwind`, dengan struktur refactor yang dipisah menjadi `components`, `pages`, dan `data`.

## Menjalankan project

```bash
npm install
npm run dev
```

App lokal akan tersedia di:

```text
http://127.0.0.1:5173/
```

## Build production

```bash
npm run build
npm run preview
```

## Struktur utama

```text
src/
  components/
    common/
    layout/
    ui/
  data/
  pages/
  App.jsx
  main.jsx
```

## Catatan

- Navigasi masih memakai local state agar tetap sesuai blueprint demo.
- Semua data masih mock data statis di `src/data/umkmHrSystemMockData.js`.
- Belum ada backend, API, auth, atau persistence.
- Primitive `src/components/ui/*` dibuat ringan agar kompatibel dengan pola import `shadcn/ui`.
