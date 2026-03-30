import { useEffect, useMemo, useState } from "react";

import AppErrorBoundary from "@/components/common/AppErrorBoundary";
import AppSidebar from "@/components/layout/AppSidebar";
import TopHero from "@/components/layout/TopHero";
import { AuthSessionProvider, useAuthSession } from "@/context/AuthSessionContext";
import { sidebarSections } from "@/data";
import { hrPresensiInternalRouteItems } from "@/data/hrPresensi";
import { pageComponents } from "@/pages/pageRegistry";
import { isHrPresensiMenuKey } from "@/services/hrPresensiAccessService";

function flattenNavigationItems(items) {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigationItems(item.children) : [])]);
}

function normalizeRoute(route) {
  if (!route) {
    return null;
  }

  return route.startsWith("/") ? route : `/${route}`;
}

function AppShell() {
  const [search, setSearch] = useState("");
  const { hrPresensiAccess } = useAuthSession();

  const allNavigationItems = useMemo(() => [...flattenNavigationItems(sidebarSections.flatMap((section) => section.items)), ...hrPresensiInternalRouteItems], []);
  const routeToMenu = useMemo(
    () =>
      allNavigationItems.reduce((accumulator, item) => {
        const route = normalizeRoute(item.route);

        if (route) {
          accumulator[route] = item.key;
        }

        return accumulator;
      }, {}),
    [allNavigationItems],
  );
  const menuToRoute = useMemo(
    () =>
      allNavigationItems.reduce((accumulator, item) => {
        const route = normalizeRoute(item.route);

        if (route) {
          accumulator[item.key] = route;
        }

        return accumulator;
      }, {}),
    [allNavigationItems],
  );
  const resolveMenuFromPath = () => {
    if (typeof window === "undefined") {
      return "dashboard";
    }

    return routeToMenu[window.location.pathname] || "dashboard";
  };
  const [activeMenu, setActiveMenu] = useState(() => resolveMenuFromPath());

  useEffect(() => {
    const matchedMenu = routeToMenu[window.location.pathname];
    if (!matchedMenu && window.location.pathname !== "/" && window.location.pathname !== "/dashboard") {
      window.history.replaceState({}, "", "/dashboard");
      setActiveMenu("dashboard");
    }
  }, [routeToMenu]);

  useEffect(() => {
    function handleNavigate(event) {
      const menu = event?.detail?.menu;
      if (typeof menu === "string" && pageComponents[menu]) {
        if (isHrPresensiMenuKey(menu) && !hrPresensiAccess.canAccessModule) {
          return;
        }
        setActiveMenu(menu);
        const route = menuToRoute[menu];

        if (route && window.location.pathname !== route) {
          window.history.pushState({}, "", route);
        }
      }
    }

    window.addEventListener("app:navigate", handleNavigate);
    return () => window.removeEventListener("app:navigate", handleNavigate);
  }, [hrPresensiAccess.canAccessModule, menuToRoute]);

  useEffect(() => {
    function handlePopState() {
      setActiveMenu(resolveMenuFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [routeToMenu]);

  const visibleSidebarSections = useMemo(
    () =>
      sidebarSections
        .map((section) => {
          if (section.key === "hr-presensi" && !hrPresensiAccess.canAccessModule) {
            return null;
          }

          const items = section.items
            .map((item) => {
              if (item.enabled === false) {
                return null;
              }

              if (item.children?.length) {
                const visibleChildren = item.children.filter((child) => {
                  if (child.enabled === false) {
                    return false;
                  }

                  if (!search) {
                    return true;
                  }

                  return child.label.toLowerCase().includes(search.toLowerCase());
                });

                if (!search) {
                  return { ...item, children: visibleChildren };
                }

                if (item.label.toLowerCase().includes(search.toLowerCase())) {
                  return { ...item, children: visibleChildren.length ? visibleChildren : item.children };
                }

                if (visibleChildren.length) {
                  return { ...item, children: visibleChildren };
                }

                return null;
              }

              if (!search) {
                return item;
              }

              return item.label.toLowerCase().includes(search.toLowerCase()) ? item : null;
            })
            .filter(Boolean);

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
    [hrPresensiAccess.canAccessModule, search],
  );

  const ActivePage = pageComponents[activeMenu] || pageComponents.dashboard;
  const activeItem = allNavigationItems.find((item) => item.key === activeMenu);

  const handleMenuSelect = (menuKey) => {
    if (isHrPresensiMenuKey(menuKey) && !hrPresensiAccess.canAccessModule) {
      return;
    }

    setActiveMenu(menuKey);

    const route = menuToRoute[menuKey];
    if (route && window.location.pathname !== route) {
      window.history.pushState({}, "", route);
    }
  };

  return (
    <div className="app-shell text-[var(--text-main)]">
      <div className="grid min-h-screen xl:grid-cols-[296px_minmax(0,1fr)]">
        <AppSidebar
          activeMenu={activeMenu}
          sections={visibleSidebarSections}
          onMenuSelect={handleMenuSelect}
          search={search}
          onSearchChange={setSearch}
        />

        <main className="px-4 py-4 lg:px-6 lg:py-5 xl:px-7">
          <TopHero activeItem={activeItem} />
          <AppErrorBoundary>
            <ActivePage />
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthSessionProvider>
      <AppShell />
    </AuthSessionProvider>
  );
}
