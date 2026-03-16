import { useState } from "react";
import { CheckCircle2, Database, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { createKebutuhan, getKebutuhanList } from "@/services/kebutuhanService";
import type { KebutuhanKaryawan } from "@/types/kebutuhan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedbackState = {
  tone: "idle" | "success" | "error";
  title: string;
  detail: string;
};

const initialFeedback: FeedbackState = {
  tone: "idle",
  title: "Siap dites",
  detail: "Gunakan tombol di bawah untuk insert data contoh atau load data dari database.",
};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

export default function KebutuhanSupabaseExample() {
  const [items, setItems] = useState<KebutuhanKaryawan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<KebutuhanKaryawan | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(initialFeedback);

  async function handleLoadKebutuhan() {
    setIsLoading(true);
    setFeedback({
      tone: "idle",
      title: "Memuat data...",
      detail: "Sedang mengambil daftar kebutuhan dari tabel kebutuhan_karyawan.",
    });

    try {
      const result = await getKebutuhanList();
      setItems(result);
      setFeedback({
        tone: "success",
        title: "Load data berhasil",
        detail: `Berhasil memuat ${result.length} data dari database.`,
      });
    } catch (error) {
      console.error("Load list kebutuhan gagal:", error);
      setFeedback({
        tone: "error",
        title: "Load data gagal",
        detail: error instanceof Error ? error.message : "Terjadi error saat memuat data kebutuhan.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateExample() {
    setIsCreating(true);
    setFeedback({
      tone: "idle",
      title: "Menyimpan data contoh...",
      detail: "Sedang insert data contoh ke tabel kebutuhan_karyawan.",
    });

    try {
      const created = await createKebutuhan({
        posisi: "Kasir Outlet",
        departemen: "Operasional",
        cabang: "Bandung Antapani",
        jumlah_kebutuhan: 2,
        jenis_kebutuhan: "Pengganti karyawan",
        status_kerja: "PKWT",
        tipe_kerja: "Full time",
        durasi_kontrak: 12,
        gaji_min: 3000000,
        gaji_max: 4000000,
        pendidikan_min: "SMA / SMK",
        pengalaman: "Minimal 1 tahun",
        skill: ["Komunikasi", "Ketelitian"],
        tes_yang_diperlukan: ["DISC Ringkas", "Tes Ketelitian"],
        alasan_kebutuhan: "Admin lama resign akhir bulan",
        pengaju: "Nisa Purnama",
        tanggal_pengajuan: getTodayDate(),
        status_persetujuan: "Menunggu persetujuan",
        lowongan_sudah_dibuat: false,
      });

      if (created) {
        setLastCreated(created);
        setItems((current) => [created, ...current]);
        setFeedback({
          tone: "success",
          title: "Insert berhasil",
          detail: `Data kebutuhan berhasil masuk ke database dengan id ${created.id}.`,
        });
      }
    } catch (error) {
      console.error("Create kebutuhan gagal:", error);
      setFeedback({
        tone: "error",
        title: "Insert gagal",
        detail: error instanceof Error ? error.message : "Terjadi error saat menyimpan data contoh.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  const feedbackTone =
    feedback.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : feedback.tone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)]";

  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="border-b border-[var(--border-soft)]">
          <CardTitle className="text-base">Kontrol Test Database</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 p-5">
          <Button className="gap-2" onClick={() => void handleCreateExample()} disabled={isCreating}>
            {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Insert Data Contoh
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void handleLoadKebutuhan()} disabled={isLoading}>
            {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Load Data Kebutuhan
          </Button>
        </CardContent>
      </Card>

      <div className={`rounded-xl border p-4 ${feedbackTone}`}>
        <div className="flex items-start gap-3">
          {feedback.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : feedback.tone === "error" ? (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <Database className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <div>
            <div className="font-semibold">{feedback.title}</div>
            <div className="mt-1 text-sm leading-6">{feedback.detail}</div>
          </div>
        </div>
      </div>

      {lastCreated ? (
        <Card className="rounded-xl">
          <CardHeader className="border-b border-[var(--border-soft)]">
            <CardTitle className="text-base">Hasil Insert Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              ID: <span className="font-semibold text-[var(--text-main)]">{lastCreated.id}</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Posisi: <span className="font-semibold text-[var(--text-main)]">{lastCreated.posisi}</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Cabang: <span className="font-semibold text-[var(--text-main)]">{lastCreated.cabang}</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Pengaju: <span className="font-semibold text-[var(--text-main)]">{lastCreated.pengaju}</span>
            </div>
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              Status: <span className="font-semibold text-[var(--text-main)]">{lastCreated.status_persetujuan}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-xl">
        <CardHeader className="border-b border-[var(--border-soft)]">
          <CardTitle className="text-base">List Data dari Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] p-8 text-center text-sm text-[var(--text-muted)]">
              Belum ada data yang ditampilkan. Klik `Load Data Kebutuhan` untuk ambil data dari database.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4 md:grid-cols-5">
                <div className="text-sm text-[var(--text-muted)]">
                  ID
                  <div className="mt-1 font-semibold text-[var(--text-main)]">{item.id}</div>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Posisi
                  <div className="mt-1 font-semibold text-[var(--text-main)]">{item.posisi}</div>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Cabang
                  <div className="mt-1 font-semibold text-[var(--text-main)]">{item.cabang || "-"}</div>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Pengaju
                  <div className="mt-1 font-semibold text-[var(--text-main)]">{item.pengaju || "-"}</div>
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Status persetujuan
                  <div className="mt-1 font-semibold text-[var(--text-main)]">{item.status_persetujuan || "-"}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
