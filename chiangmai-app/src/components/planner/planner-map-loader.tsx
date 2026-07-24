"use client";

import dynamic from "next/dynamic";
import type { TripDay } from "@/components/planner/planner-map";
import { MapSkeleton } from "@/components/map/map-skeleton";
import { MapErrorBoundary, MapErrorFallback } from "@/components/map/map-error-boundary";

const PlannerMap = dynamic(() => import("@/components/planner/planner-map").then((mod) => mod.PlannerMap), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[420px]" />,
});

export function PlannerMapLoader({ days }: { days: TripDay[] }) {
  return (
    <MapErrorBoundary fallback={(retry) => <MapErrorFallback className="h-[420px]" onRetry={retry} />}>
      <PlannerMap days={days} className="h-[420px]" />
    </MapErrorBoundary>
  );
}
