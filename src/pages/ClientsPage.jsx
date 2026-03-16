import { useMemo, useState } from "react";
import { Building2, FileBadge2, Palette, Search, UserCog, Users, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { businessDataFields, businessDirectory, businessModuleLinks, businessQuickTabs } from "@/data";

const emptyFilters = {
  usaha: "Semua usaha",
  cabang: "Semua cabang",
  statusAktif: "Semua status",
  penggunaPeran: "Semua peran",
};

function SummaryCard({ icon: Icon, label, value, note, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
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

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("semua");
  const [filters, setFilters] = useState(emptyFilters);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const filterOptions = useMemo(() => {
    const usaha = ["Semua usaha", ...new Set(businessDirectory.map((item) => item.namaUsaha))];
    const cabang = ["Semua cabang", ...new Set(businessDirectory.flatMap((item) => item.daftarCabang.map((branch) => branch.namaCabang)))];
    const statusAktif = ["Semua status", "Aktif", "Nonaktif"];
    const penggunaPeran = ["Semua peran", ...new Set(businessDirectory.flatMap((item) => item.daftarPengguna.map((user) => user.jabatanPeran)))];

    return { usaha, cabang, statusAktif, penggunaPeran };
  }, []);

  const summaryCards = useMemo(() => {
    const totalUsaha = businessDirectory.length;
    const totalCabang = businessDirectory.reduce((sum, item) => sum + item.daftarCabang.length, 0);
    const penggunaAktif = businessDirectory.reduce(
      (sum, item) => sum + item.daftarPengguna.filter((user) => user.statusAktif === "Aktif").length,
      0,
    );
    const hakAksesAktif = penggunaAktif;
    const templateSiap = businessDirectory.filter((item) => item.templateSurat && item.templateLaporan && item.nomorDokumenOtomatis === "Aktif").length;
    const perluDilengkapi = businessDirectory.filter((item) => item.statusData === "Belum lengkap").length;

    return [
      { label: "Total usaha", value: totalUsaha, note: "Semua usaha yang memakai sistem ada di sini.", icon: Building2, tone: "slate" },
      { label: "Total cabang", value: totalCabang, note: "Membantu owner melihat sebaran unit usaha.", icon: Building2, tone: "sky" },
      { label: "Pengguna aktif", value: penggunaAktif, note: "Semua user yang masih bisa masuk dan memakai sistem.", icon: Users, tone: "emerald" },
      { label: "Hak akses aktif", value: hakAksesAktif, note: "Hak akses yang sedang berjalan sesuai peran masing-masing.", icon: UserCog, tone: "sky" },
      { label: "Template siap pakai", value: templateSiap, note: "Usaha yang surat dan laporannya sudah siap dipakai.", icon: FileBadge2, tone: "emerald" },
      { label: "Perlu dilengkapi", value: perluDilengkapi, note: "Masih ada data usaha yang perlu dirapikan.", icon: Palette, tone: "amber" },
    ];
  }, []);

  const filteredBusinesses = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return businessDirectory.filter((item) => {
      if (activeTab === "belum-lengkap" && item.statusData !== "Belum lengkap") {
        return false;
      }

      if (filters.usaha !== "Semua usaha" && item.namaUsaha !== filters.usaha) {
        return false;
      }

      if (filters.cabang !== "Semua cabang" && !item.daftarCabang.some((branch) => branch.namaCabang === filters.cabang)) {
        return false;
      }

      if (
        filters.statusAktif !== "Semua status" &&
        item.statusUsaha !== filters.statusAktif &&
        !item.daftarCabang.some((branch) => branch.statusCabang === filters.statusAktif) &&
        !item.daftarPengguna.some((user) => user.statusAktif === filters.statusAktif || user.statusAktif === "Tidak aktif" && filters.statusAktif === "Nonaktif")
      ) {
        return false;
      }

      if (filters.penggunaPeran !== "Semua peran" && !item.daftarPengguna.some((user) => user.jabatanPeran === filters.penggunaPeran)) {
        return false;
      }

      if (!searchLower) {
        return true;
      }

      return [item.namaUsaha, item.bidangUsaha, item.picUtama, item.emailUsaha, item.noTeleponUsaha, item.alamatUsaha]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
    });
  }, [activeTab, filters, search]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <SectionTitle
            title="Data Usaha"
            subtitle="Pusat pengaturan usaha yang memakai sistem. Dari sini owner dan admin bisa atur profil usaha, cabang, pengguna, hak akses, dan tampilan dokumen."
          />

          <div className="flex flex-wrap gap-3">
            <Button className="rounded-xl">
              <Building2 className="mr-2 h-4 w-4" />
              Ubah Data Usaha
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Users className="mr-2 h-4 w-4" />
              Tambah Cabang
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama usaha, PIC, alamat, email, atau nomor kontak"
              className="rounded-xl border-slate-200 bg-white pl-9"
            />
          </div>
          <FilterSelect value={filters.usaha} onChange={(event) => handleFilterChange("usaha", event.target.value)} options={filterOptions.usaha} />
          <FilterSelect value={filters.cabang} onChange={(event) => handleFilterChange("cabang", event.target.value)} options={filterOptions.cabang} />
          <FilterSelect
            value={filters.statusAktif}
            onChange={(event) => handleFilterChange("statusAktif", event.target.value)}
            options={filterOptions.statusAktif}
          />
          <FilterSelect
            value={filters.penggunaPeran}
            onChange={(event) => handleFilterChange("penggunaPeran", event.target.value)}
            options={filterOptions.penggunaPeran}
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
          {businessQuickTabs.map((tab) => {
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

      <div className="space-y-6">
        {filteredBusinesses.map((business) => (
          <div key={business.id} className="grid gap-6 xl:grid-cols-2">
            {(activeTab === "semua" || activeTab === "profil" || activeTab === "belum-lengkap") && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Profil Usaha</div>
                      <div className="mt-1 text-sm text-slate-500">{business.namaUsaha}</div>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge value={business.statusUsaha} />
                      <StatusBadge value={business.statusData} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">Nama usaha: {business.namaUsaha}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Bidang usaha: {business.bidangUsaha}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Alamat: {business.alamatUsaha}</div>
                    <div className="rounded-xl bg-slate-50 p-3">PIC utama: {business.picUtama}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Nomor kontak: {business.noTeleponUsaha}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Email usaha: {business.emailUsaha}</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelectedDetail({ type: "usaha", data: business })}>
                      Lihat detail
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Ubah data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(activeTab === "semua" || activeTab === "cabang" || activeTab === "belum-lengkap") && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Cabang</div>
                      <div className="mt-1 text-sm text-slate-500">{business.jumlahCabang} cabang terdaftar</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {business.daftarCabang.map((branch) => (
                      <div key={branch.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-800">{branch.namaCabang}</div>
                            <div className="mt-1 text-sm text-slate-500">{branch.alamat}</div>
                            <div className="mt-2 text-sm text-slate-600">
                              PIC cabang: {branch.picCabang} • Jumlah karyawan: {branch.jumlahKaryawan}
                            </div>
                          </div>
                          <StatusBadge value={branch.statusCabang} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl">
                      Tambah cabang
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Ubah cabang
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setSelectedDetail({ type: "cabang", data: business.daftarCabang[0] })}>
                      Lihat detail
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(activeTab === "semua" || activeTab === "akses") && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Pengguna & Hak Akses</div>
                      <div className="mt-1 text-sm text-slate-500">{business.jumlahPengguna} pengguna terdaftar</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {business.daftarPengguna.map((user) => (
                      <div key={user.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-800">{user.namaPengguna}</div>
                            <div className="mt-1 text-sm text-slate-500">{user.jabatanPeran}</div>
                            <div className="mt-2 text-sm text-slate-600">Akses: {user.aksesUsahaCabang}</div>
                            <button
                              type="button"
                              onClick={() => setSelectedDetail({ type: "akses", data: user })}
                              className="mt-3 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
                            >
                              Lihat detail
                            </button>
                          </div>
                          <StatusBadge value={user.statusAktif === "Tidak aktif" ? "Tidak aktif" : user.statusAktif} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl">
                      Tambah pengguna
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Atur akses
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Nonaktifkan akses
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(activeTab === "semua" || activeTab === "dokumen") && (
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">Tampilan Dokumen</div>
                      <div className="mt-1 text-sm text-slate-500">Logo, warna usaha, template surat, dan nomor dokumen.</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">Logo usaha: {business.logoUsaha}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Warna utama: {business.warnaUtama}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Template surat: {business.templateSurat}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Tampilan laporan / slip: {business.templateLaporan}</div>
                    <div className="rounded-xl bg-slate-50 p-3">Nomor dokumen otomatis: {business.nomorDokumenOtomatis}</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl">
                      Ubah tampilan
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Ubah template
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Simpan pengaturan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Dipakai oleh modul lain</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              Data usaha ini jadi dasar untuk nama usaha, cabang, PIC, role user, dan tampilan dokumen di semua modul utama.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {businessModuleLinks.map((item) => (
                <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  {item}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900">Struktur data usaha</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Field ini disiapkan agar semua modul lain bisa mengambil data usaha yang sama.</div>
            <div className="mt-4 grid gap-2">
              {businessDataFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {field}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  {selectedDetail.type === "usaha"
                    ? selectedDetail.data.namaUsaha
                    : selectedDetail.type === "cabang"
                      ? selectedDetail.data.namaCabang
                      : selectedDetail.data.namaPengguna}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedDetail.type === "usaha"
                    ? "Detail usaha"
                    : selectedDetail.type === "cabang"
                      ? "Detail cabang"
                      : "Detail akses pengguna"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {selectedDetail.type === "usaha" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={selectedDetail.data.statusUsaha} />
                    <StatusBadge value={selectedDetail.data.statusData} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama usaha: {selectedDetail.data.namaUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Bidang usaha: {selectedDetail.data.bidangUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Alamat lengkap: {selectedDetail.data.alamatUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">PIC utama: {selectedDetail.data.picUtama}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Email: {selectedDetail.data.emailUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nomor telepon: {selectedDetail.data.noTeleponUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah cabang: {selectedDetail.data.jumlahCabang}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah pengguna: {selectedDetail.data.jumlahPengguna}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Logo usaha: {selectedDetail.data.logoUsaha}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Warna utama: {selectedDetail.data.warnaUtama}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Template yang dipakai: {selectedDetail.data.templateSurat}</div>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Catatan admin: {selectedDetail.data.catatanAdmin}</div>
                  </div>
                </>
              )}

              {selectedDetail.type === "cabang" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama cabang: {selectedDetail.data.namaCabang}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Alamat: {selectedDetail.data.alamat}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">PIC cabang: {selectedDetail.data.picCabang}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jumlah karyawan: {selectedDetail.data.jumlahKaryawan}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status cabang: {selectedDetail.data.statusCabang}</div>
                </div>
              )}

              {selectedDetail.type === "akses" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nama pengguna: {selectedDetail.data.namaPengguna}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jabatan / peran: {selectedDetail.data.jabatanPeran}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Usaha / cabang yang bisa diakses: {selectedDetail.data.aksesUsahaCabang}</div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status aktif: {selectedDetail.data.statusAktif}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
