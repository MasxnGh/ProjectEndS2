"use client";

import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/brand/button";
import { cx } from "@/components/brand/cx";
import { ICON_STROKE } from "@/components/brand/icons";
import { MapErrorBoundary } from "@/components/map/map-error-boundary";

// MapLibre needs `window`, so the map itself runs on the client only; the rest
// of the place page stays a server component.
const PlaceMap = dynamic(() => import("@/components/map/place-map").then((mod) => mod.PlaceMap), {
  ssr: false,
  loading: () => <div aria-hidden className="size-full animate-pulse bg-[#f4eee9] dark:bg-[#13231f]" />,
});

export function PlaceMapLoader({
  className,
  ...props
}: {
  mainPlace: Place;
  nearbyPlaces?: Place[];
  comparePlace?: Place | null;
  className?: string;
}) {
  const { dict } = useLocale();
  return (
    <MapErrorBoundary
      fallback={(retry) => (
        <div className={cx("grid content-center justify-items-center gap-3 bg-well p-6 text-center", className)}>
          <p className="text-small text-ink-soft">{dict.common.mapUnavailable}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={retry}
            icon={<RotateCw aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          >
            {dict.weather.retry}
          </Button>
        </div>
      )}
    >
      <PlaceMap {...props} className={className} />
    </MapErrorBoundary>
  );
}
