import { useMemo, useState } from "react";
import { X } from "lucide-react";

import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function SelectField({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-10 w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-main)]"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function HiringNeedPicker({ needs, onClose, onPick }) {
  const [positionFilter, setPositionFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("");

  const filterOptions = useMemo(
    () => ({
      positions: [...new Set(needs.map((item) => item.posisi))],
      branches: [...new Set(needs.map((item) => item.cabang))],
      requesters: [...new Set(needs.map((item) => item.namaPengaju))],
    }),
    [needs],
  );

  const filteredNeeds = useMemo(
    () =>
      needs.filter((item) => {
        const matchesPosition = !positionFilter || item.posisi === positionFilter;
        const matchesBranch = !branchFilter || item.cabang === branchFilter;
        const matchesRequester = !requesterFilter || item.namaPengaju === requesterFilter;

        return matchesPosition && matchesBranch && matchesRequester;
      }),
    [branchFilter, needs, positionFilter, requesterFilter],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border-soft)] bg-white px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text-main)]">Ambil dari Kebutuhan</div>
            <div className="text-sm text-[var(--text-muted)]">Pilih kebutuhan yang sudah disetujui dan belum pernah dibuat jadi lowongan.</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-0)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField value={positionFilter} onChange={setPositionFilter} options={filterOptions.positions} placeholder="Semua posisi" />
            <SelectField value={branchFilter} onChange={setBranchFilter} options={filterOptions.branches} placeholder="Semua cabang" />
            <SelectField value={requesterFilter} onChange={setRequesterFilter} options={filterOptions.requesters} placeholder="Semua pengaju" />
          </div>

          {filteredNeeds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-0)] p-10 text-center text-sm text-[var(--text-muted)]">
              Belum ada kebutuhan yang siap dibuat jadi lowongan.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredNeeds.map((item) => (
                <Card key={item.id} className="rounded-xl">
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <div className="text-lg font-semibold text-[var(--text-main)]">{item.posisi}</div>
                        <div className="text-sm text-[var(--text-muted)]">{item.cabang}</div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">Jumlah kebutuhan: {item.jumlahKebutuhan} orang</div>
                        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">Target mulai kerja: {item.targetMulaiKerja || "-"}</div>
                        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-0)] p-3 text-sm text-[var(--text-muted)]">Pengaju: {item.namaPengaju}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <StatusBadge value={item.statusPersetujuan} />
                      <Button onClick={() => onPick(item)}>Buat Lowongan</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
