import { useState } from "react";
import { Brain, Clipboard, Clock3, X } from "lucide-react";

import SectionTitle from "@/components/common/SectionTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISC_BASE_URL = "/tes-disc";
const DISC_START_URL = `${DISC_BASE_URL}/test.html?test=disc`;
const DISC_RESULT_URL = `${DISC_BASE_URL}/result.html?test=disc`;
const KORAN_BASE_URL = "/tes-koran";
const KORAN_START_URL = `${KORAN_BASE_URL}/index.html`;
const SPM_BASE_URL = "/tes-spm";
const SPM_START_URL = `${SPM_BASE_URL}/spm_app_modular/index.html`;
const HOLLAND_BASE_URL = "/tes-holland";
const HOLLAND_START_URL = `${HOLLAND_BASE_URL}/index.html`;
const BIG_FIVE_BASE_URL = "/tes-big-five";
const BIG_FIVE_START_URL = `${BIG_FIVE_BASE_URL}/index.html`;

const internalAssessmentModules = [
  {
    key: "disc",
    name: "DISC Ringkas",
    status: "Siap dipakai",
    duration: "10-15 menit",
    purpose: "Melihat gaya kerja dan komunikasi pelamar untuk peran operasional UMKM.",
    bestFor: "Sales, admin, customer service",
    usage: "Bisa langsung dibuka dari webapp dan dipakai sebagai modul tes internal.",
    method: "DISC personality framework",
    founder: "William Moulton Marston",
    origin: "Konsep DISC dikenalkan oleh William Moulton Marston pada 1928 untuk memetakan kecenderungan perilaku Dominance, Influence, Steadiness, dan Compliance.",
    recruiterUse: "Paling berguna untuk membaca gaya komunikasi, cara berinteraksi, dan kecenderungan perilaku saat bekerja dengan tim atau pelanggan.",
    caution: "DISC bukan alat diagnosis klinis dan tidak sebaiknya dipakai sendirian untuk memutuskan lolos atau tidak lolos kandidat.",
    primaryAction: { label: "Mulai tes", href: DISC_START_URL },
    secondaryActions: [
      { label: "Buka hasil", href: DISC_RESULT_URL },
      { label: "Salin link", copyHref: DISC_START_URL, icon: Clipboard },
    ],
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    key: "koran",
    name: "Tes Koran / Kraepelin",
    status: "Siap dipakai",
    duration: "30 menit",
    purpose: "Mengukur fokus, stabilitas ritme kerja, kecepatan hitung, dan konsistensi performa di bawah tekanan waktu.",
    bestFor: "Admin input, finance support, kasir, operasional yang butuh ketelitian tinggi",
    usage: "Modul internal satu file yang bisa langsung dibuka dari webapp tanpa folder eksternal.",
    method: "Kraepelin / Pauli attention test",
    founder: "Emil Kraepelin, lalu banyak diadaptasi dalam format Pauli-Kraepelin",
    origin: "Metode ini berakar dari eksperimen kerja mental Emil Kraepelin pada akhir abad ke-19, lalu banyak dipakai dalam versi tes koran untuk melihat ritme, daya tahan, dan ketelitian kerja.",
    recruiterUse: "Cocok untuk recruiter yang ingin melihat kestabilan performa, daya tahan fokus, dan kecenderungan ceroboh saat tekanan waktu meningkat.",
    caution: "Tes ini lebih kuat untuk membaca konsistensi dan ketahanan kerja, bukan untuk menilai kecerdasan umum atau potensi kepemimpinan.",
    primaryAction: { label: "Mulai tes", href: KORAN_START_URL },
    secondaryActions: [{ label: "Salin link", copyHref: KORAN_START_URL, icon: Clipboard }],
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "spm",
    name: "SPM / Raven Progressive Matrices",
    status: "Siap dipakai",
    duration: "60 soal",
    purpose: "Mengukur penalaran abstrak, pola visual, dan kemampuan problem solving non-verbal secara lebih formal.",
    bestFor: "Admin, supervisor junior, analyst support, role yang butuh logika visual",
    usage: "Modul internal lengkap dengan bank gambar soal dan scoring otomatis berbasis jawaban.",
    method: "Standard Progressive Matrices",
    founder: "John C. Raven",
    origin: "SPM dikembangkan oleh John C. Raven pada 1938 sebagai alat untuk mengukur kemampuan penalaran abstrak dan pengenalan pola non-verbal.",
    recruiterUse: "Berguna untuk role yang membutuhkan logika, pemecahan masalah, membaca pola, dan belajar cepat tanpa terlalu bergantung pada kemampuan bahasa kandidat.",
    caution: "Hasil SPM sebaiknya dibaca bersama konteks jabatan, pengalaman, dan tes lain. Skor tinggi tidak otomatis berarti kandidat pasti cocok secara perilaku atau budaya kerja.",
    primaryAction: { label: "Mulai tes", href: SPM_START_URL },
    secondaryActions: [{ label: "Salin link", copyHref: SPM_START_URL, icon: Clipboard }],
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    key: "holland",
    name: "Holland Test / RIASEC",
    status: "Siap dipakai",
    duration: "108 item",
    purpose: "Memetakan kecenderungan minat kerja kandidat berdasarkan enam dimensi RIASEC untuk membantu kecocokan posisi.",
    bestFor: "Screening minat kerja, role multi-fungsi, penempatan awal kandidat",
    usage: "Modul internal single-file dengan skoring otomatis YA/TIDAK untuk profil RIASEC.",
    method: "RIASEC interest model",
    founder: "John L. Holland",
    origin: "Model Holland dikembangkan oleh John L. Holland untuk menjelaskan kecocokan antara tipe minat kerja seseorang dan lingkungan pekerjaan.",
    recruiterUse: "Paling membantu saat recruiter ingin memahami minat dominan kandidat dan melihat apakah penempatan kerja awalnya sejalan dengan kecenderungan alaminya.",
    caution: "Holland membaca minat, bukan kemampuan. Kandidat bisa tertarik pada suatu bidang tetapi belum tentu sudah kuat skill-nya di bidang tersebut.",
    primaryAction: { label: "Mulai tes", href: HOLLAND_START_URL },
    secondaryActions: [{ label: "Salin link", copyHref: HOLLAND_START_URL, icon: Clipboard }],
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    key: "big-five",
    name: "Big Five Personality",
    status: "Siap dipakai",
    duration: "25 item",
    purpose: "Memetakan lima dimensi kepribadian utama: Openness, Conscientiousness, Extraversion, Agreeableness, dan Emotional Stability.",
    bestFor: "Screening kepribadian umum, kecocokan budaya kerja, role admin, sales, operasional, dan supervisor junior",
    usage: "Modul internal single-file dengan skoring otomatis dan ringkasan trait dominan per kandidat.",
    method: "Big Five trait model",
    founder: "Berasal dari riset trait kepribadian banyak psikolog; model modern dipopulerkan antara lain oleh Costa dan McCrae",
    origin: "Big Five lahir dari riset panjang tentang lima dimensi trait kepribadian yang paling stabil dan paling sering muncul dalam studi psikologi kepribadian modern.",
    recruiterUse: "Membantu recruiter membaca kecenderungan umum seperti keteraturan kerja, keterbukaan pada perubahan, stabilitas emosi, dan gaya interaksi kandidat.",
    caution: "Big Five lebih cocok untuk memahami kecenderungan, bukan memberi label mutlak. Hasil perlu dibaca bersama konteks jabatan dan wawancara.",
    primaryAction: { label: "Mulai tes", href: BIG_FIVE_START_URL },
    secondaryActions: [{ label: "Salin link", copyHref: BIG_FIVE_START_URL, icon: Clipboard }],
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

const recruiterGuides = [
  {
    title: "Fungsi Menu Ini",
    description: "Bank Tes adalah pusat referensi recruiter untuk memahami isi tiap tes, kapan tes dipakai, lalu membuka modulnya jika memang dibutuhkan.",
  },
  {
    title: "Cara Pakai yang Tepat",
    description: "Gunakan tes setelah screening awal, lalu baca hasil bersama CV, wawancara, dan kebutuhan posisi. Tes membantu memperkuat keputusan, bukan menggantikan penilaian recruiter.",
  },
  {
    title: "Prinsip Membaca Hasil",
    description: "Jangan menyimpulkan kandidat hanya dari satu angka. Cari pola: minat, perilaku, logika, ketelitian, dan kecocokan peran harus dibaca sebagai satu paket.",
  },
];

function openInternalModule(path) {
  window.open(path, "_blank", "noopener,noreferrer");
}

export default function AssessmentPage() {
  const [feedback, setFeedback] = useState(null);

  async function copyPath(path, label) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setFeedback({ type: "success", message: `${label} berhasil disalin.` });
    } catch {
      window.prompt(`Salin link ${label} ini:`, `${window.location.origin}${path}`);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Bank Tes"
        subtitle="Pusat edukasi recruiter untuk memahami fungsi tiap tes, dasar metodenya, kapan tes dipakai, dan cara membuka modul internal yang tersedia."
      />

      {feedback ? (
        <div
          className={`rounded-xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="rounded-lg p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Bank Tes Recruiter
              </div>
              <div className="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[var(--text-main)]">
                Kenali fungsi DISC, Tes Koran, SPM, Holland, dan Big Five sebelum recruiter memakainya ke kandidat.
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                Halaman ini tidak hanya untuk membuka modul tes, tetapi juga untuk membantu recruiter memahami asal metode, tujuan penggunaannya, serta batas baca hasil tiap instrumen agar keputusan rekrutmen lebih rapi dan lebih aman.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => openInternalModule(DISC_START_URL)}>
                Mulai tes DISC
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => openInternalModule(KORAN_START_URL)}>
                Mulai tes koran
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => openInternalModule(SPM_START_URL)}>
                Mulai tes SPM
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => openInternalModule(HOLLAND_START_URL)}>
                Mulai tes Holland
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => openInternalModule(BIG_FIVE_START_URL)}>
                Mulai tes Big Five
              </Button>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-4 border-y border-[var(--border-soft)] py-5 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-soft)]">Modul aktif</div>
              <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">5 modul internal</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-soft)]">Ranah perilaku & minat</div>
              <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">DISC, Holland, dan Big Five</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-soft)]">Ranah fokus & logika</div>
              <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">Koran 30 menit, SPM 60 soal</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-[var(--text-soft)]">Fokus halaman</div>
              <div className="text-[1.05rem] font-semibold text-[var(--text-main)]">Edukasi + akses cepat modul</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white">
        <CardContent className="p-6">
          <div className="rounded-[20px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(247,249,252,0.92),rgba(255,255,255,1))] px-5 py-5">
            <div className="flex items-center gap-2 text-[var(--brand-800)]">
              <Brain className="h-4 w-4" />
              <div className="text-sm font-semibold">Panduan Singkat Recruiter</div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {recruiterGuides.map((guide, index) => (
                <div key={guide.title} className={`space-y-2 ${index > 0 ? "md:border-l md:border-[var(--border-soft)] md:pl-4" : ""}`}>
                  <div className="text-sm font-semibold text-[var(--text-main)]">{guide.title}</div>
                  <p className="text-sm leading-6 text-[var(--text-muted)]">{guide.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white">
        <CardContent className="p-0">
          <div className="border-b border-[var(--border-soft)] px-6 py-4">
            <div className="text-lg font-semibold text-[var(--text-main)]">Daftar Bank Tes</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">Setiap kartu di bawah menjelaskan fungsi tes, asal metode, dan cara recruiter membaca hasilnya sebelum tes digunakan ke kandidat.</div>
          </div>

          <div className="divide-y divide-[var(--border-soft)]">
            {internalAssessmentModules.map((item) => {
              return (
                <div key={item.key} className="space-y-4 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--text-main)]">{item.name}</div>
                        <Badge className={item.tone}>{item.status}</Badge>
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{item.purpose}</p>
                    </div>

                    <div className="flex items-center gap-2 text-[var(--text-soft)]">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.duration}</span>
                    </div>
                  </div>

                    <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Dasar metode</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.method}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Dikembangkan oleh</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.founder}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <div className="text-sm text-[var(--text-soft)]">Latar metode</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.origin}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Cocok untuk posisi</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.bestFor}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Fungsi untuk recruiter</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.recruiterUse}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Arah penggunaan</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.usage}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-[var(--text-soft)]">Catatan membaca hasil</div>
                        <div className="text-sm font-medium leading-6 text-[var(--text-main)]">{item.caution}</div>
                      </div>
                    </div>

                  <div className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-4">
                    <Button className="rounded-xl" onClick={() => openInternalModule(item.primaryAction.href)}>
                      {item.primaryAction.label}
                    </Button>
                    {item.secondaryActions.map((action) => {
                      const Icon = action.icon;

                      if (action.copyHref) {
                        return (
                          <Button key={action.label} variant="outline" className="rounded-xl" onClick={() => void copyPath(action.copyHref, action.label)}>
                            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                            {action.label}
                          </Button>
                        );
                      }

                      return (
                        <Button key={action.label} variant="outline" className="rounded-xl" onClick={() => openInternalModule(action.href)}>
                          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
