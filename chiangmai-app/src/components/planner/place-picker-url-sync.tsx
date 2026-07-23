"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Keeps the place-picker's open/close state in sync with the `?add=day-N`
// query param so the browser back button (and a mobile swipe-back gesture)
// closes the panel instead of leaving the page. Isolated into its own
// component (mirroring PlanImportListener) so only this invisible piece
// needs the useSearchParams()-requires-Suspense boundary — the picker panel
// itself renders from plain React state owned by PlannerBoard.
export function PlacePickerUrlSync({
  dayIds,
  openDayId,
  onOpenFromUrl,
  onCloseFromUrl,
}: {
  dayIds: string[];
  openDayId: string | null;
  onOpenFromUrl: (dayId: string) => void;
  onCloseFromUrl: () => void;
}) {
  const searchParams = useSearchParams();
  const addParam = searchParams.get("add");
  const prevAddParam = useRef<string | null>(null);

  useEffect(() => {
    if (addParam === prevAddParam.current) return;
    prevAddParam.current = addParam;

    if (addParam && dayIds.includes(addParam)) {
      if (openDayId !== addParam) onOpenFromUrl(addParam);
    } else if (!addParam && openDayId) {
      onCloseFromUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addParam]);

  return null;
}
