import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { initialHrPresensiAccessState, resolveHrPresensiAccess } from "@/services/hrPresensiAccessService";

const AuthSessionContext = createContext({
  session: null,
  authReady: false,
  hrPresensiAccess: initialHrPresensiAccessState,
});

export function AuthSessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [hrPresensiAccess, setHrPresensiAccess] = useState(initialHrPresensiAccessState);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Supabase gagal membaca session auth:", error);
      }

      if (!isMounted) return;

      setSession(data.session || null);
      setAuthReady(true);
    }

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession || null);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveAccess() {
      if (!authReady) return;

      setHrPresensiAccess((current) => ({ ...current, status: "loading" }));

      try {
        const resolved = await resolveHrPresensiAccess(session);
        if (!cancelled) {
          setHrPresensiAccess(resolved);
        }
      } catch (error) {
        console.error("Resolver akses HR Presensi gagal:", error);
        if (!cancelled) {
          setHrPresensiAccess({
            ...initialHrPresensiAccessState,
            status: "unmapped",
            issueCode: "employee_not_found",
            issueMessage: error instanceof Error ? error.message : "Resolver akses HR Presensi belum bisa membaca profil karyawan.",
          });
        }
      }
    }

    void resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [authReady, session]);

  const value = useMemo(
    () => ({
      session,
      authReady,
      hrPresensiAccess,
    }),
    [authReady, hrPresensiAccess, session],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
