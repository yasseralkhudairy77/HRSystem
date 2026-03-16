import { useState } from "react";
import { CheckCircle2, DatabaseZap, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type ConnectionState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  detail: string;
};

const initialState: ConnectionState = {
  status: "idle",
  message: "Belum dicek",
  detail: "Klik tombol untuk tes koneksi database dari UI.",
};

export default function SupabaseConnectionCard() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(initialState);

  async function handleTestConnection() {
    setConnectionState({
      status: "loading",
      message: "Sedang cek koneksi...",
      detail: "Menghubungi database dan membaca tabel kebutuhan_karyawan.",
    });

    try {
      const { count, error } = await supabase
        .from("kebutuhan_karyawan")
        .select("id", { count: "exact", head: true });

      if (error) {
        console.error("Tes koneksi database gagal:", error);
        setConnectionState({
          status: "error",
          message: "Koneksi gagal",
          detail: error.message,
        });
        return;
      }

        setConnectionState({
          status: "success",
          message: "Koneksi berhasil",
          detail: `Database terhubung. Tabel kebutuhan_karyawan bisa diakses. Jumlah data saat ini: ${count ?? 0}.`,
        });
      } catch (error) {
      console.error("Tes koneksi database error:", error);
      setConnectionState({
        status: "error",
        message: "Terjadi error saat cek koneksi",
        detail: error instanceof Error ? error.message : "Error tidak dikenal",
      });
    }
  }

  const statusTone =
    connectionState.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : connectionState.status === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : connectionState.status === "loading"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--text-muted)]";

  return (
    <Card className="rounded-xl">
      <CardHeader className="border-b border-[var(--border-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] text-[var(--brand-800)]">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Tes Koneksi Database</CardTitle>
              <div className="text-sm text-[var(--text-muted)]">Cek dari UI apakah webapp sudah bisa terhubung ke database.</div>
            </div>
          </div>

          <Button variant="outline" className="gap-2" onClick={() => void handleTestConnection()}>
            {connectionState.status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tes Koneksi
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className={`flex items-start gap-3 rounded-lg border p-4 ${statusTone}`}>
          {connectionState.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : connectionState.status === "error" ? (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          ) : connectionState.status === "loading" ? (
            <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <div>
            <div className="font-semibold">{connectionState.message}</div>
            <div className="mt-1 text-sm leading-6">{connectionState.detail}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
            Project URL dibaca dari `.env`
          </div>
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
            Publishable key dibaca dari `.env`
          </div>
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
            Query tes: `kebutuhan_karyawan`
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
