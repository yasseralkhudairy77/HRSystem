import PresenceModalForm from "@/components/hrPresence/PresenceModalForm";

export default function MappingFormModal({ open, onClose, selectedMapping }) {
  return (
    <PresenceModalForm
      open={open}
      onClose={onClose}
      title={selectedMapping ? "Ubah Mapping Karyawan Mesin" : "Tambah Mapping Karyawan Mesin"}
      description="Modal ini menyiapkan struktur tambah dan edit mapping employee internal ke kode eksternal dari mesin atau aplikasi luar."
      sections={[
        {
          title: "Informasi mapping",
          fields: [
            { label: "Karyawan internal", value: selectedMapping?.employeeName || "Pilih karyawan" },
            { label: "Source", value: selectedMapping?.source || "Fingerprint / Mobile / Manual" },
            { label: "Kode eksternal", value: selectedMapping?.externalCode || "Contoh: 260012" },
          ],
        },
        {
          title: "Catatan",
          fields: [
            { label: "Nama eksternal", value: selectedMapping?.externalName || "Nama dari mesin" },
            { label: "Mesin", value: selectedMapping?.deviceName || "Pilih mesin terkait" },
            { label: "Status", value: selectedMapping?.status || "Aktif" },
          ],
        },
      ]}
    />
  );
}
