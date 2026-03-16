import KebutuhanSupabaseExample from "@/components/recruitment/KebutuhanSupabaseExample";
import SectionTitle from "@/components/common/SectionTitle";

export default function KebutuhanSupabaseTestPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Test Kebutuhan Database"
        subtitle="Halaman ini khusus untuk tes insert dan load data tabel kebutuhan_karyawan sebelum integrasi penuh ke modul utama."
      />
      <KebutuhanSupabaseExample />
    </div>
  );
}
