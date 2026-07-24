"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/data/types";
import { MapSkeleton } from "@/components/map/map-skeleton";

// MapLibre needs `window`, so the real map component can only run on the
// client — but this wrapper is the only thing that needs to know that.
// Everything else on the Place Detail page keeps rendering on the server.
const PlaceMap = dynamic(() => import("@/components/map/place-map").then((mod) => mod.PlaceMap), {
  ssr: false,
  loading: () => <MapSkeleton className="h-64" />,
});

export function PlaceMapLoader(props: {
  mainPlace: Place;
  nearbyPlaces?: Place[];
  comparePlace?: Place | null;
}) {
  return <PlaceMap {...props} className="h-64" />;
}
