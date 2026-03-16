import { useMemo, useState } from "react";

import AppSidebar from "@/components/layout/AppSidebar";
import TopHero from "@/components/layout/TopHero";
import { sidebarSections } from "@/data";
import { pageComponents } from "@/pages/pageRegistry";

export default function App() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [search, setSearch] = useState("");

  const visibleSidebarSections = useMemo(
    () =>
      sidebarSections
        .map((section) => {
          const items = section.items.filter((item) => {
            if (item.enabled === false) {
              return false;
            }

            if (!search) {
              return true;
            }

            return item.label.toLowerCase().includes(search.toLowerCase());
          });

          if (section.hiddenIfEmpty && items.length === 0) {
            return null;
          }

          if (!search && items.length === 0) {
            return null;
          }

          if (search && items.length === 0) {
            return null;
          }

          return { ...section, items };
        })
        .filter(Boolean),
    [search],
  );

  const ActivePage = pageComponents[activeMenu] || pageComponents.dashboard;
  const activeItem = sidebarSections.flatMap((section) => section.items).find((item) => item.key === activeMenu);

  return (
    <div className="app-shell text-[var(--text-main)]">
      <div className="grid min-h-screen xl:grid-cols-[296px_minmax(0,1fr)]">
        <AppSidebar
          activeMenu={activeMenu}
          sections={visibleSidebarSections}
          onMenuSelect={setActiveMenu}
          search={search}
          onSearchChange={setSearch}
        />

        <main className="px-4 py-4 lg:px-6 lg:py-5 xl:px-7">
          <TopHero activeItem={activeItem} />
          <ActivePage />
        </main>
      </div>
    </div>
  );
}
