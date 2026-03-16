import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, FileText, ReceiptText, SearchCheck, Users, Wallet } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardDataFields, dashboardModuleLinks, dashboardSnapshots } from "@/data";

const emptyFilters = {
  periode: "Semua periode",
  usahaCabang: "Semua usaha / cabang",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-main)] outline-none transition focus-visible:ring-2 focus-visible:ring-[rgba(30,79,143,0.22)]"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-main)]">{value}</div>
            <div className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{note}</div>
          </div>
          <div className={`rounded-lg border border-[var(--border-soft)] p-3 ${tones[tone] || tones.slate}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConditionBlock({ title, subtitle, items, icon: Icon }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-[var(--text-muted)]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--text-main)]">{item.label}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">{item.note}</div>
                </div>
                <div className="text-2xl font-semibold text-[var(--text-main)]">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(emptyFilters);

  const filterOptions = useMemo(() => {
    const periode = ["Semua periode", ...new Set(dashboardSnapshots.map((item) => item.periode))];
    const usahaCabang = [
      "Semua usaha / cabang",
      ...new Set(
        dashboardSnapshots.flatMap((item) => [item.namaUsaha, item.namaCabang]).filter((value) => value !== "Semua usaha" && value !== "Semua cabang"),
      ),
    ];

    return { periode, usahaCabang };
  }, []);

  const activeSnapshot = useMemo(() => {
    const matched = dashboardSnapshots.find((item) => {
      const periodeMatch = filters.periode === "Semua periode" || item.periode === filters.periode;
      const usahaCabangMatch =
        filters.usahaCabang === "Semua usaha / cabang" || item.namaUsaha === filters.usahaCabang || item.namaCabang === filters.usahaCabang;

      return periodeMatch && usahaCabangMatch;
    });

    return matched || dashboardSnapshots[0];
  }, [filters]);

  const summaryCards = useMemo(
    () => [
      { label: "Karyawan aktif", value: activeSnapshot.totalKaryawanAktif, note: "Semua karyawan yang masih aktif bekerja.", icon: Users, tone: "slate" },
      { label: "Lowongan aktif", value: activeSnapshot.totalLowonganAktif, note: "Posisi yang masih dibuka saat ini.", icon: Briefcase, tone: "sky" },
      { label: "Pelamar diproses", value: activeSnapshot.totalPelamarDiproses, note: "Pelamar yang masih berjalan prosesnya.", icon: SearchCheck, tone: "sky" },
      {
        label: "Karyawan baru belum lengkap",
        value: activeSnapshot.totalKaryawanBaruBelumLengkap,
        note: "Masih ada data masuk yang perlu dirapikan.",
        icon: FileText,
        tone: "amber",
      },
      { label: "Kontrak akan habis", value: activeSnapshot.totalKontrakAkanHabis, note: "Perlu keputusan lanjutan secepatnya.", icon: FileText, tone: "rose" },
      { label: "Gaji belum selesai", value: activeSnapshot.totalGajiBelumSelesai, note: "Masih ada proses gaji yang perlu dicek.", icon: Wallet, tone: "amber" },
    ],
    [activeSnapshot],
  );

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="enterprise-panel space-y-4 rounded-xl border-[var(--border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8fc_100%)] p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Dashboard"
            subtitle="Pusat pantauan harian untuk melihat apa yang perlu dicek dan ditindaklanjuti hari ini."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <ReceiptText className="mr-2 h-4 w-4" />
              Lihat semua laporan
            </Button>
            <Button variant="outline" className="rounded-xl">
              <ArrowRight className="mr-2 h-4 w-4" />
              Buka detail
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FilterSelect value={filters.periode} onChange={(event) => handleFilterChange("periode", event.target.value)} options={filterOptions.periode} />
          <FilterSelect
            value={filters.usahaCabang}
            onChange={(event) => handleFilterChange("usahaCabang", event.target.value)}
            options={filterOptions.usahaCabang}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-[var(--text-main)]">Perlu ditindaklanjuti hari ini</div>
              <div className="mt-1 text-sm text-[var(--text-muted)]">Daftar hal penting yang paling perlu dibuka dari dashboard.</div>
            </div>
            <Button variant="outline" className="rounded-xl">
              Lihat semua
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            {activeSnapshot.daftarTindakanHariIni.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <div className="text-lg font-semibold text-[var(--text-main)]">{item.judul}</div>
                        <div className="mt-1 text-sm text-[var(--text-muted)]">{item.catatan}</div>
                      </div>
                      <StatusBadge value={item.tingkatPerhatian} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">Jumlah: {item.jumlah}</div>
                      <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">Prioritas: {item.tingkatPerhatian}</div>
                      <div className="rounded-lg border border-[var(--border-soft)] bg-white p-3 text-sm text-[var(--text-muted)]">Menu terkait: {item.menuTerkait}</div>
                    </div>
                  </div>

                  <Button variant="outline" className="rounded-xl">
                    Buka detail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <ConditionBlock
          title="Kondisi rekrutmen"
          subtitle="Pantauan lowongan dan pelamar yang sedang berjalan."
          items={activeSnapshot.kondisiRekrutmen}
          icon={Briefcase}
        />
        <ConditionBlock
          title="Kondisi administrasi"
          subtitle="Pantauan data karyawan, kontrak, surat, dan proses keluar."
          items={activeSnapshot.kondisiAdministrasi}
          icon={Users}
        />
        <ConditionBlock
          title="Kondisi penggajian"
          subtitle="Pantauan proses gaji, slip, dan kelengkapan data wajib."
          items={activeSnapshot.kondisiPenggajian}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-[var(--text-main)]">Insight singkat</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">Ringkasan cepat untuk melihat kondisi baik, hal yang perlu dicek, dan yang perlu segera ditindaklanjuti.</div>

            <div className="mt-4 grid gap-3">
              {activeSnapshot.insightItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.insightKategori === "Kondisi baik"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : item.insightKategori === "Perlu dicek"
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-rose-200 bg-rose-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="text-lg font-semibold text-[var(--text-main)]">{item.insightJudul}</div>
                    <StatusBadge value={item.insightKategori} />
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.insightIsi}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-[var(--text-main)]">Terhubung ke modul utama</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Dashboard ini mengambil ringkasan dari modul rekrutmen, karyawan, kontrak, surat, proses keluar, penggajian, dan laporan.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {dashboardModuleLinks.map((item) => (
                  <span key={item} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    {item}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-[var(--text-main)]">Struktur data dashboard</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Field ini disiapkan supaya dashboard bisa jadi pusat pantauan harian lintas modul.</div>
              <div className="mt-4 grid gap-2">
                {dashboardDataFields.map((field) => (
                  <div key={field} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-muted)]">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
