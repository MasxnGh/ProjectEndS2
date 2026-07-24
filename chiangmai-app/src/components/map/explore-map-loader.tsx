"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/data/types";
import type { LatLng } from "@/lib/geo/distance";
import type { AirQualityResponse } from "@/lib/weather/types";
import { MapSkeleton } from "@/components/map/map-skeleton";

const ExploreMap = dynamic(() => import("@/components/map/explore-map").then((mod) => mod.ExploreMap), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[400px] lg:h-[720px]" />,
});

export function ExploreMapLoader(props: {
  places: Place[];
  highlightSlugs?: string[];
  hoveredSlug?: string | null;
  onHoverPlace?: (slug: string | null) => void;
  reference?: LatLng | null;
  radiusKm?: number | null;
  pickingOnMap?: boolean;
  onMapPick?: (coords: LatLng) => void;
  airQualityBySlug?: Map<string, AirQualityResponse> | null;
}) {
  return <ExploreMap {...props} className="h-[400px] lg:h-[720px]" />;
}
