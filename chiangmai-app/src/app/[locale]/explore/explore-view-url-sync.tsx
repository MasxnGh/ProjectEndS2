"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Keeps the Grid/Map view toggle in sync with the `?view=map` query param so
// the browser back/forward buttons restore the view the user had, and the
// URL stays shareable. Isolated into its own component (mirroring
// PlacePickerUrlSync) so only this invisible piece needs the
// useSearchParams()-requires-Suspense boundary.
export function ExploreViewUrlSync({
  view,
  onViewChangeFromUrl,
}: {
  view: "grid" | "map";
  onViewChangeFromUrl: (view: "grid" | "map") => void;
}) {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view") === "map" ? "map" : "grid";
  const prevViewParam = useRef(viewParam);

  useEffect(() => {
    if (viewParam === prevViewParam.current) return;
    prevViewParam.current = viewParam;
    if (viewParam !== view) onViewChangeFromUrl(viewParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam]);

  return null;
}
