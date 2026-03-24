import { Clock3, Grid2x2, History, Home, SendHorizontal } from "lucide-react";

const navItems = [
  { key: "employee-home", label: "Home", icon: Home, route: "/karyawan/beranda" },
  { key: "employee-history", label: "Riwayat", icon: History, route: "/karyawan/riwayat-absensi" },
  { key: "employee-attendance-action", label: "Presensi", icon: Clock3, route: "/karyawan/presensi", isPrimary: true },
  { key: "employee-requests", label: "Pengajuan", icon: SendHorizontal, route: "/karyawan/pengajuan-saya" },
  { key: "employee-services", label: "Menu", icon: Grid2x2, route: "/karyawan/semua-menu" },
];

export default function MobileBottomNav({ activeKey, onNavigate }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:-mx-5 md:px-4">
      <div className="grid grid-cols-5 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold ${
                item.isPrimary
                  ? active
                    ? "bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.28)]"
                    : "bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                  : active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
