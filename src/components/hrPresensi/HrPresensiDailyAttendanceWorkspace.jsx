import { useEffect, useMemo, useState } from "react";
import { Clock3, Fingerprint, LogIn, LogOut, MapPin } from "lucide-react";

import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHrPresensiAccess } from "@/hooks/useHrPresensiAccess";
import {
  clockInHrPresensi,
  clockOutHrPresensi,
  getHrPresensiDailyAttendance,
  getHrPresensiTodayAttendance,
  validateHrPresensiLocation,
} from "@/services/hrPresensiDailyAttendanceService";
import { getHrPresensiScopeLabel } from "@/services/hrPresensiAccessService";

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDailyStatus(value) {
  return {
    hadir: "Hadir",
    telat: "Telat",
    belum_pulang: "Belum Pulang",
  }[value];
}

function statusClass(value) {
  return {
    hadir: "border-emerald-200 bg-emerald-50 text-emerald-700",
    telat: "border-amber-200 bg-amber-50 text-amber-700",
    belum_pulang: "border-sky-200 bg-sky-50 text-sky-700",
  }[value];
}

function formatLocationStatus(value) {
  return {
    dalam_area: "Dalam Area",
    di_luar_area: "Di Luar Area",
    akurasi_lemah: "Akurasi Lemah",
  }[value] || "-";
}

function locationStatusClass(value) {
  return {
    dalam_area: "border-emerald-200 bg-emerald-50 text-emerald-700",
    di_luar_area: "border-rose-200 bg-rose-50 text-rose-700",
    akurasi_lemah: "border-amber-200 bg-amber-50 text-amber-700",
  }[value] || "border-slate-200 bg-slate-100 text-slate-600";
}

function formatCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : "-";
}

function formatMeters(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)} m` : "-";
}

function getBrowserPosition() {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    throw new Error("Browser ini belum mendukung akses lokasi untuk transaksi absensi.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Izin akses lokasi ditolak. Izinkan GPS browser untuk check in atau check out."));
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error("Lokasi perangkat belum tersedia. Pastikan GPS aktif lalu coba lagi."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error("Pengambilan lokasi terlalu lama. Coba lagi saat sinyal GPS lebih stabil."));
          return;
        }

        reject(new Error("Gagal membaca lokasi perangkat untuk transaksi absensi."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

export default function HrPresensiDailyAttendanceWorkspace() {
  const access = useHrPresensiAccess();
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [todayContext, setTodayContext] = useState({ serverNow: "", row: null });
  const [feedback, setFeedback] = useState(null);
  const [locationPreview, setLocationPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAttendance() {
    if (access.status !== "ready") return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const [listRows, today] = await Promise.all([getHrPresensiDailyAttendance(access), getHrPresensiTodayAttendance(access)]);
      setRows(listRows);
      setTodayContext(today);
      setSelectedId((current) => current || listRows[0]?.id || "");
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Gagal memuat data Absensi Harian." });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (access.status === "ready") {
      void loadAttendance();
    }
  }, [access.status]);

  const selectedRow = useMemo(() => rows.find((item) => item.id === selectedId) || todayContext.row || null, [rows, selectedId, todayContext.row]);

  async function runAttendanceAction(actionType) {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const geoPayload = await getBrowserPosition();
      const validation = await validateHrPresensiLocation(access, geoPayload);
      setLocationPreview({
        actionType,
        ...validation,
        accuracy: geoPayload.accuracy,
        latitude: geoPayload.latitude,
        longitude: geoPayload.longitude,
      });

      if (validation.location_status !== "dalam_area") {
        throw new Error(
          validation.location_status === "akurasi_lemah"
            ? "Akurasi GPS terlalu lemah. Dekatkan perangkat ke titik kantor lalu coba lagi."
            : "Posisi Anda berada di luar area kantor aktif.",
        );
      }

      if (actionType === "checkin") {
        await clockInHrPresensi(access, geoPayload);
      } else {
        await clockOutHrPresensi(access, geoPayload);
      }

      await loadAttendance();
      setFeedback({
        type: "success",
        message: `${actionType === "checkin" ? "Check in" : "Check out"} berhasil direkam menggunakan jam server dan validasi lokasi kantor.`,
      });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Transaksi absensi belum berhasil." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canCheckIn = access.role === "karyawan" && !todayContext.row?.actual_checkin;
  const canCheckOut = access.role === "karyawan" && Boolean(todayContext.row?.actual_checkin) && !todayContext.row?.actual_checkout;
  const activeLocationStatus = todayContext.row?.actual_checkout ? todayContext.row?.checkout_location_status : todayContext.row?.checkin_location_status;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Absensi live dasar</div>
                <div className="mt-2 text-lg font-semibold text-[var(--text-main)]">Jam server dan radius kantor aktif menjadi acuan resmi transaksi</div>
                <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Scope data saat ini: <span className="font-semibold text-[var(--text-main)]">{getHrPresensiScopeLabel(access)}</span>.</div>
              </div>
              <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--text-main)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Server time</div>
                <div className="mt-2 font-semibold">{todayContext.serverNow ? formatDateTime(todayContext.serverNow) : "Memuat..."}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <Clock3 className="h-4 w-4 text-[var(--brand-800)]" />
              Status hari ini
            </div>
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${todayContext.row ? statusClass(todayContext.row.daily_status) : "border-slate-200 bg-slate-100 text-slate-600"}`}>
              {todayContext.row ? formatDailyStatus(todayContext.row.daily_status) : "Belum Check In"}
            </div>
            <div className="text-sm leading-6 text-[var(--text-muted)]">
              Check in: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(todayContext.row?.actual_checkin)}</span><br />
              Check out: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(todayContext.row?.actual_checkout)}</span>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Status lokasi transaksi</div>
              <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${locationStatusClass(locationPreview?.location_status || activeLocationStatus)}`}>
                {formatLocationStatus(locationPreview?.location_status || activeLocationStatus)}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Lokasi kantor: <span className="font-semibold text-[var(--text-main)]">{locationPreview?.location_name || selectedRow?.location_name || "-"}</span><br />
                Radius aktif: <span className="font-semibold text-[var(--text-main)]">{locationPreview?.attendance_radius_meters ? `${locationPreview.attendance_radius_meters} m` : "-"}</span>
              </div>
            </div>
            {access.role === "karyawan" ? (
              <div className="flex gap-2">
                <Button className="rounded-[10px]" disabled={!canCheckIn || isSubmitting} onClick={() => void runAttendanceAction("checkin")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Check In
                </Button>
                <Button variant="outline" className="rounded-[10px]" disabled={!canCheckOut || isSubmitting} onClick={() => void runAttendanceAction("checkout")}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Check Out
                </Button>
              </div>
            ) : (
              <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm leading-6 text-[var(--text-muted)]">
                Mode {access.role === "hr" ? "HR" : "Atasan"} hanya membaca data scope yang diizinkan pada fase ini. Aksi check in/check out live tetap dibuka untuk mode Karyawan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {feedback ? (
        <div className={`rounded-[12px] border px-4 py-3 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {feedback.message}
        </div>
      ) : null}

      {locationPreview ? (
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
            <MapPin className="h-4 w-4 text-[var(--brand-800)]" />
            Validasi lokasi transaksi terbaru
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Status</div>
              <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${locationStatusClass(locationPreview.location_status)}`}>
                {formatLocationStatus(locationPreview.location_status)}
              </div>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Koordinat</div>
              <div className="mt-2 font-semibold text-[var(--text-main)]">{formatCoordinate(locationPreview.latitude)}, {formatCoordinate(locationPreview.longitude)}</div>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Akurasi GPS</div>
              <div className="mt-2 font-semibold text-[var(--text-main)]">{formatMeters(locationPreview.accuracy)}</div>
            </div>
            <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Jarak ke kantor</div>
              <div className="mt-2 font-semibold text-[var(--text-main)]">{formatMeters(locationPreview.distance_meters)}</div>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[14px] border border-[var(--border-soft)] bg-white px-5 py-4 text-sm text-[var(--text-muted)] shadow-sm">
          Memuat transaksi Absensi Harian live dari Supabase...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Belum ada data absensi live"
          description="Transaksi Absensi Harian belum menghasilkan record pada scope data saat ini."
          actionLabel={access.role === "karyawan" ? "Check In Sekarang" : undefined}
          onAction={access.role === "karyawan" ? () => void runAttendanceAction("checkin") : undefined}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-[rgba(214,222,234,0.82)] px-5 py-4">
                <div className="text-lg font-semibold text-[var(--text-main)]">List Absensi Harian</div>
                <div className="mt-1.5 text-[13px] leading-5 text-[var(--text-muted)]">List live dasar dengan status Hadir, Telat, Belum Pulang, dan hasil validasi lokasi transaksi.</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-[var(--surface-0)] text-left">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Karyawan</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Tanggal</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Status</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Lokasi</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Masuk</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const rowLocationStatus = row.actual_checkout ? row.checkout_location_status || row.checkin_location_status : row.checkin_location_status;
                      return (
                        <tr key={row.id} onClick={() => setSelectedId(row.id)} className={`cursor-pointer border-t border-[rgba(214,222,234,0.82)] ${row.id === selectedId ? "bg-[var(--surface-0)]" : "bg-white hover:bg-[var(--surface-0)]/70"}`}>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-[var(--text-main)]">{row.employee_name}</div>
                            <div className="mt-1 text-[12px] text-[var(--text-muted)]">{row.employee_code} | {row.employee_title}</div>
                          </td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{formatDate(row.attendance_date)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(row.daily_status)}`}>{formatDailyStatus(row.daily_status)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${locationStatusClass(rowLocationStatus)}`}>{formatLocationStatus(rowLocationStatus)}</span>
                          </td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{formatDateTime(row.actual_checkin)}</td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{formatDateTime(row.actual_checkout)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[rgba(191,204,220,0.78)] bg-white shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                <Fingerprint className="h-4 w-4 text-[var(--brand-800)]" />
                Detail Absensi
              </div>
              {selectedRow ? (
                <>
                  <div className="rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                    <div className="text-sm font-semibold text-[var(--text-main)]">{selectedRow.employee_name}</div>
                    <div className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{formatDate(selectedRow.attendance_date)}</div>
                  </div>
                  <div className="space-y-2 text-sm text-[var(--text-muted)]">
                    <div>Status: <span className="font-semibold text-[var(--text-main)]">{formatDailyStatus(selectedRow.daily_status)}</span></div>
                    <div>Shift: <span className="font-semibold text-[var(--text-main)]">{selectedRow.shift_name || "-"}</span></div>
                    <div>Lokasi kantor: <span className="font-semibold text-[var(--text-main)]">{selectedRow.location_name || "-"}</span></div>
                    <div>Check in: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.actual_checkin)}</span></div>
                    <div>Status lokasi check in: <span className="font-semibold text-[var(--text-main)]">{formatLocationStatus(selectedRow.checkin_location_status)}</span></div>
                    <div>Koordinat check in: <span className="font-semibold text-[var(--text-main)]">{formatCoordinate(selectedRow.checkin_latitude)}, {formatCoordinate(selectedRow.checkin_longitude)}</span></div>
                    <div>Akurasi check in: <span className="font-semibold text-[var(--text-main)]">{formatMeters(selectedRow.checkin_accuracy_meters)}</span></div>
                    <div>Jarak check in ke kantor: <span className="font-semibold text-[var(--text-main)]">{formatMeters(selectedRow.checkin_distance_meters)}</span></div>
                    <div>Check out: <span className="font-semibold text-[var(--text-main)]">{formatDateTime(selectedRow.actual_checkout)}</span></div>
                    <div>Status lokasi check out: <span className="font-semibold text-[var(--text-main)]">{formatLocationStatus(selectedRow.checkout_location_status)}</span></div>
                    <div>Koordinat check out: <span className="font-semibold text-[var(--text-main)]">{formatCoordinate(selectedRow.checkout_latitude)}, {formatCoordinate(selectedRow.checkout_longitude)}</span></div>
                    <div>Akurasi check out: <span className="font-semibold text-[var(--text-main)]">{formatMeters(selectedRow.checkout_accuracy_meters)}</span></div>
                    <div>Jarak check out ke kantor: <span className="font-semibold text-[var(--text-main)]">{formatMeters(selectedRow.checkout_distance_meters)}</span></div>
                    <div>Terlambat: <span className="font-semibold text-[var(--text-main)]">{selectedRow.late_minutes} menit</span></div>
                    <div>Sumber: <span className="font-semibold text-[var(--text-main)]">{selectedRow.attendance_source}</span></div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--text-muted)]">Pilih satu record di list untuk melihat detail dasar.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
