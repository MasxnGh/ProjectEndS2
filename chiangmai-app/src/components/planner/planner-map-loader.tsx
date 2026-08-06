"use client";

import dynamic from "next/dynamic";
import type { TripDay } from "@/components/planner/planner-map";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { MapErrorBoundary, MapErrorFallback } from "@/components/map/map-error-boundary";

const PlannerMap = dynamic(() => import("@/components/planner/planner-map").then((mod) => mod.PlannerMap), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[420px]" />,
});

export function PlannerMapLoader({
  days,
  className = "h-[420px]",
  canvasOnly,
  hoveredSlug,
  onSelectPlace,
  pickingLocation,
  onPickLocation,
  onCancelPickLocation,
}: {
  days: TripDay[];
  className?: string;
  /** Renders just the map canvas, without the per-day distance/duration cards below it — used by the sticky desktop sidebar. */
  canvasOnly?: boolean;
  hoveredSlug?: string | null;
  onSelectPlace?: (dayId: string, slug: string) => void;
  pickingLocation?: boolean;
  onPickLocation?: (lngLat: { lat: number; lng: number }) => void;
  onCancelPickLocation?: () => void;
}) {
  return (
    <MapErrorBoundary fallback={(retry) => <MapErrorFallback className={className} onRetry={retry} />}>
      <PlannerMap
        days={days}
        className={className}
        canvasOnly={canvasOnly}
        hoveredSlug={hoveredSlug}
        onSelectPlace={onSelectPlace}
        pickingLocation={pickingLocation}
        onPickLocation={onPickLocation}
        onCancelPickLocation={onCancelPickLocation}
      />
    </MapErrorBoundary>
  );
}
