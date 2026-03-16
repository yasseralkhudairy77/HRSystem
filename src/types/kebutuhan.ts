export interface KebutuhanKaryawan {
  id?: number;
  posisi: string;
  departemen?: string;
  cabang?: string;
  jumlah_kebutuhan?: number;
  jenis_kebutuhan?: string;
  status_kerja?: string;
  tipe_kerja?: string;
  durasi_kontrak?: number;
  gaji_min?: number;
  gaji_max?: number;
  pendidikan_min?: string;
  pengalaman?: string;
  skill?: string[];
  kriteria_tambahan?: string;
  tes_yang_diperlukan?: string[];
  alasan_kebutuhan?: string;
  pengaju?: string;
  tanggal_pengajuan?: string;
  status_persetujuan?: string;
  approved_by?: string;
  tanggal_approval?: string;
  lowongan_sudah_dibuat?: boolean;
  lowongan_id?: number;
}

export type CreateKebutuhanPayload = Omit<KebutuhanKaryawan, "id">;
export type UpdateKebutuhanPayload = Partial<Omit<KebutuhanKaryawan, "id">>;
