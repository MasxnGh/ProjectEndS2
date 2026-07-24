"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { LatLng } from "@/lib/geo/distance";
import type { AirQualityResponse } from "@/lib/weather/types";
import { groupPointsForAqiLayer } from "@/lib/weather/aqi-layer";

async function fetchAirQuality(coordinates: LatLng): Promise<AirQualityResponse | null> {
  const res = await fetch(`/api/air-quality?lat=${coordinates.lat}&lng=${coordinates.lng}`);
  if (!res.ok) return null;
  return res.json();
}

export interface AqiLayerResult {
  dataBySlug: Map<string, AirQualityResponse>;
  isLoading: boolean;
}

/**
 * Fetches one air-quality reading per distinct coordinate among `points`
 * (deduped and capped, see aqi-layer.ts) and fans the result back out to
 * every place sharing that location. Only fetches while `enabled` is true,
 * since this overlay is opt-in.
 */
export function useAirQualityLayer(points: { slug: string; coordinates: LatLng }[], enabled: boolean): AqiLayerResult {
  const groups = useMemo(
    () => groupPointsForAqiLayer(points.map((p) => ({ key: p.slug, coordinates: p.coordinates }))),
    [points]
  );

  const swrKey = enabled && groups.length > 0 ? ["aqi-layer", groups.map((g) => g.key).join("|")] : null;

  const { data, isLoading } = useSWR(
    swrKey,
    async () => {
      const results = await Promise.all(
        groups.map(async (group) => ({ group, reading: await fetchAirQuality(group.coordinates) }))
      );
      const bySlug = new Map<string, AirQualityResponse>();
      for (const { group, reading } of results) {
        if (!reading) continue;
        for (const slug of group.members) bySlug.set(slug, reading);
      }
      return bySlug;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return { dataBySlug: data ?? new Map(), isLoading: Boolean(swrKey) && isLoading };
}
