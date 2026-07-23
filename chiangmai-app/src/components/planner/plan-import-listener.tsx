"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTripStore } from "@/lib/trip-store";

// Decodes a `?plan=` share link into the trip store on first load. Isolated
// into its own component (rather than living in PlannerBoard) so only this
// invisible piece needs the useSearchParams()-requires-Suspense boundary —
// the rest of the planner shell can render on the server.
export function PlanImportListener() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loadPlan = useTripStore((s) => s.loadPlan);

  useEffect(() => {
    const encoded = searchParams.get("plan");
    if (!encoded) return;
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(encoded)));
      if (decoded && Array.isArray(decoded.dayIds) && decoded.containers) {
        loadPlan(decoded);
      }
    } catch {
      // ignore malformed share links
    }
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
