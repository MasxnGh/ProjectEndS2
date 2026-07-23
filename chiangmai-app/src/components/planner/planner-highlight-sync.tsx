"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Reads a one-shot `?highlight=day-N` param (set by the Explore "Done" CTA)
// to scroll the just-edited day into view and briefly highlight it, then
// strips the param. Isolated so only this invisible piece needs the
// useSearchParams()-requires-Suspense boundary.
export function PlannerHighlightSync({ onHighlight }: { onHighlight: (dayId: string) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const highlight = searchParams.get("highlight");
    if (!highlight) return;
    handledRef.current = true;
    onHighlight(highlight);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("highlight");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
