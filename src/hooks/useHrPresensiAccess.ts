import { useAuthSession } from "@/context/AuthSessionContext";

export function useHrPresensiAccess() {
  return useAuthSession().hrPresensiAccess;
}
