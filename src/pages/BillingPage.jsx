import { useMemo, useState } from "react";
import { CreditCard, Download, Eye, Layers3, ReceiptText, Wallet, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { billingCurrentPlan, billingDataFields, billingInvoices, billingModuleLinks, billingPlans, billingQuickTabs } from "@/data";

const emptyFilters = {
  statusTagihan: "Semua status tagihan",
  periode: "Semua periode",
  jenisPaket: "Semua paket",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-300"
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
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{note}</div>
          </div>
          <div className={`rounded-2xl p-3 ${tones[tone] || tones.slate}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillingPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [activeTab, setActiveTab] = useState("semua");
  const [selectedItem, setSelectedItem] = useState(null);

  const filterOptions = useMemo(() => {
    const statusTagihan = ["Semua status tagihan", "Belum dibayar", "Menunggu pembayaran", "Sudah dibayar", "Lewat jatuh tempo"];
    const periode = ["Semua periode", ...new Set(billingInvoices.map((item) => item.periodeTagihan))];
    const jenisPaket = ["Semua paket", ...new Set(billingPlans.map((item) => item.namaPaket))];

    return { statusTagihan, periode, jenisPaket };
  }, []);

  const summaryCards = useMemo(() => {
    const tagihanAktif = billingInvoices.filter((item) => item.statusTagihan === "Belum dibayar" || item.statusTagihan === "Menunggu pembayaran").length;
    const jatuhTempo = billingInvoices.find((item) => item.statusTagihan === "Belum dibayar")?.tanggalJatuhTempo || "-";
    const sudahDibayar = billingInvoices.filter((item) => item.statusTagihan === "Sudah dibayar").length;
    const belumDibayar = billingInvoices.filter((item) => item.statusTagihan === "Belum dibayar").length;
    const totalBulanIni = billingInvoices
      .filter((item) => item.periodeTagihan === "Maret 2026" || item.periodeTagihan.includes("Maret 2026"))
      .reduce((sum, item) => sum + Number(item.jumlahTagihan.replace(/[^\d]/g, "")), 0);

    return [
      { label: "Paket yang dipakai", value: billingCurrentPlan.namaPaket, note: "Paket yang sedang dipakai sekarang.", icon: Layers3, tone: "slate" },
      { label: "Tagihan aktif", value: tagihanAktif, note: "Tagihan yang masih berjalan dan perlu dicek.", icon: ReceiptText, tone: "sky" },
      { label: "Jatuh tempo terdekat", value: jatuhTempo, note: "Tanggal terdekat yang perlu dibayar dulu.", icon: CreditCard, tone: "amber" },
      { label: "Sudah dibayar", value: sudahDibayar, note: "Tagihan yang sudah selesai dibayar.", icon: Wallet, tone: "emerald" },
      { label: "Belum dibayar", value: belumDibayar, note: "Tagihan yang masih menunggu pembayaran.", icon: CreditCard, tone: "rose" },
      { label: "Total bulan ini", value: `Rp${totalBulanIni.toLocaleString("id-ID")}`, note: "Total tagihan yang terbit untuk bulan ini.", icon: ReceiptText, tone: "amber" },
    ];
  }, []);

  const filteredInvoices = useMemo(() => {
    return billingInvoices.filter((item) => {
      if (activeTab === "aktif" && !(item.statusTagihan === "Belum dibayar" || item.statusTagihan === "Menunggu pembayaran")) {
        return false;
      }

      if (activeTab === "riwayat" && item.statusTagihan !== "Sudah dibayar") {
        return false;
      }

      if (activeTab === "belum-dibayar" && item.statusTagihan !== "Belum dibayar") {
        return false;
      }

      if (filters.statusTagihan !== "Semua status tagihan" && item.statusTagihan !== filters.statusTagihan) {
        return false;
      }

      if (filters.periode !== "Semua periode" && item.periodeTagihan !== filters.periode) {
        return false;
      }

      if (filters.jenisPaket !== "Semua paket" && item.namaPaket !== filters.jenisPaket) {
        return false;
      }

      return true;
    });
  }, [activeTab, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Paket & Tagihan"
            subtitle="Pusat untuk melihat paket yang dipakai, tagihan yang aktif, riwayat pembayaran, dan pilihan ganti paket tanpa bingung baca istilah teknis."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <Layers3 className="mr-2 h-4 w-4" />
              Ganti Paket
            </Button>
            <Button variant="outline" className="rounded-xl">
              <CreditCard className="mr-2 h-4 w-4" />
              Bayar Sekarang
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect
            value={filters.statusTagihan}
            onChange={(event) => handleFilterChange("statusTagihan", event.target.value)}
            options={filterOptions.statusTagihan}
          />
          <FilterSelect value={filters.periode} onChange={(event) => handleFilterChange("periode", event.target.value)} options={filterOptions.periode} />
          <FilterSelect
            value={filters.jenisPaket}
            onChange={(event) => handleFilterChange("jenisPaket", event.target.value)}
            options={filterOptions.jenisPaket}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {billingQuickTabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {(activeTab === "semua" || activeTab === "paket") && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Paket yang dipakai sekarang</div>
                  <div className="mt-1 text-sm text-slate-500">Ringkasan paket aktif yang sedang dipakai usaha Anda.</div>
                </div>
                <StatusBadge value={billingCurrentPlan.statusPaket} />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">Nama paket: {billingCurrentPlan.namaPaket}</div>
                <div className="rounded-xl bg-slate-50 p-3">Harga per bulan: {billingCurrentPlan.hargaBulanan}</div>
                <div className="rounded-xl bg-slate-50 p-3">Tanggal mulai: {billingCurrentPlan.tanggalMulai}</div>
                <div className="rounded-xl bg-slate-50 p-3">Status paket: {billingCurrentPlan.statusPaket}</div>
                <div className="rounded-xl bg-slate-50 p-3">Batas penggunaan utama: {billingCurrentPlan.batasLowongan} lowongan, {billingCurrentPlan.batasPengguna} pengguna</div>
                <div className="rounded-xl bg-slate-50 p-3">Masa aktif sampai: {billingCurrentPlan.tanggalBerakhir}</div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {billingCurrentPlan.fiturUtama.map((feature) => (
                  <div key={feature} className="rounded-xl border border-slate-200 p-3">
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setSelectedItem({ type: "paket", data: billingCurrentPlan })}>
                  Lihat rincian
                </Button>
                <Button variant="outline" className="rounded-xl">
                  Ganti paket
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(activeTab === "semua" || activeTab === "paket") && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Daftar paket</div>
              <div className="mt-1 text-sm text-slate-500">Pilih paket yang paling cocok dengan jumlah usaha, cabang, pengguna, dan kebutuhan HR Anda.</div>

              <div className="mt-4 space-y-3">
                {billingPlans.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{item.namaPaket}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.cocokUntuk}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{item.hargaBulanan}/bln</div>
                      </div>
                      <StatusBadge value={item.statusPaket} />
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {item.fiturUtama.map((feature) => (
                        <div key={feature} className="rounded-xl bg-slate-50 p-3">
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                      Batas penggunaan: {item.batasUsaha} usaha, {item.batasCabang} cabang, {item.batasLowongan} lowongan, {item.batasPengguna} pengguna
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={() => setSelectedItem({ type: "paket", data: item })}>
                        Lihat rincian
                      </Button>
                      <Button className="rounded-xl">Pilih Paket</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        {(activeTab === "semua" || activeTab === "aktif" || activeTab === "riwayat" || activeTab === "belum-dibayar") && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Tagihan & pembayaran</div>
              <div className="mt-1 text-sm text-slate-500">Daftar tagihan aktif dan riwayat pembayaran yang bisa langsung dicek dan dibayar.</div>

              <div className="mt-4 space-y-3">
                {filteredInvoices.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">{item.nomorTagihan}</div>
                            <div className="text-sm text-slate-500">{item.periodeTagihan}</div>
                          </div>
                          <StatusBadge value={item.statusTagihan} />
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 p-3">Jumlah tagihan: {item.jumlahTagihan}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Jatuh tempo: {item.tanggalJatuhTempo}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Metode bayar: {item.metodePembayaran}</div>
                          <div className="rounded-xl bg-slate-50 p-3">Paket: {item.namaPaket}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:max-w-[250px] xl:justify-end">
                        <Button variant="outline" className="rounded-xl" onClick={() => setSelectedItem({ type: "tagihan", data: item })}>
                          Lihat rincian
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          Bayar sekarang
                        </Button>
                        <Button variant="outline" className="rounded-xl">
                          Unduh tagihan
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Pengaruh paket ke modul lain</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Paket yang dipakai memengaruhi jumlah pemakaian dan fitur yang bisa dipakai di modul utama.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {billingModuleLinks.map((item) => (
                  <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                    {item}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Struktur data langganan</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">Field ini disiapkan supaya paket, tagihan, dan pembayaran bisa dipakai untuk monetisasi produk.</div>
              <div className="mt-4 grid gap-2">
                {billingDataFields.map((field) => (
                  <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {field}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  {selectedItem.type === "paket" ? selectedItem.data.namaPaket : selectedItem.data.nomorTagihan}
                </div>
                <div className="mt-1 text-sm text-slate-500">{selectedItem.type === "paket" ? "Rincian paket" : "Rincian tagihan"}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={selectedItem.data.statusPaket} />
                {selectedItem.data.statusTagihan && <StatusBadge value={selectedItem.data.statusTagihan} />}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama paket: {selectedItem.data.namaPaket}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Harga: {selectedItem.data.hargaBulanan}/bln</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Masa aktif: {selectedItem.data.tanggalMulai} sampai {selectedItem.data.tanggalBerakhir}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  Batas pemakaian: {selectedItem.data.batasUsaha} usaha, {selectedItem.data.batasCabang} cabang
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah lowongan: {selectedItem.data.batasLowongan}</div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah pengguna: {selectedItem.data.batasPengguna}</div>
                {selectedItem.data.nomorTagihan && (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nomor tagihan: {selectedItem.data.nomorTagihan}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Periode: {selectedItem.data.periodeTagihan}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Tanggal terbit: {selectedItem.data.tanggalTerbit}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jatuh tempo: {selectedItem.data.tanggalJatuhTempo}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status pembayaran: {selectedItem.data.statusTagihan}</div>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Fitur utama</div>
                <div className="mt-3 space-y-2">
                  {selectedItem.data.fiturUtama.map((feature) => (
                    <div key={feature} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-medium text-slate-800">Catatan admin</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{selectedItem.data.catatanAdmin}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
