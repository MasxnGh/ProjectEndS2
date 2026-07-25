"use client";

import useSWR from "swr";
import type { RoutingMode } from "@/lib/routing/types";

interface RouteWaypoint {
  lat: number;
  lng: number;
  elevation?: number | null;
}

interface DayRouteResult {
  /** Combined [lng, lat] geometry across every leg, in order. null when any leg fell back to an estimate — a day route is drawn as one consistent line, not part-real/part-guessed. */
  geometry: [number, number][] | null;
  isEstimate: boolean;
}

async function fetchLeg(
  from: RouteWaypoint,
  to: RouteWaypoint,
  mode: RoutingMode
): Promise<{ geometry: [number, number][] | null; isEstimate: boolean }> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
    mode,
  });
  if (from.elevation) params.set("fromElevation", String(from.elevation));
  if (to.elevation) params.set("toElevation", String(to.elevation));

  const res = await fetch(`/api/routing/directions?${params.toString()}`);
  if (!res.ok) return { geometry: null, isEstimate: true };
  const data = await res.json();
  return { geometry: data.geometry ?? null, isEstimate: Boolean(data.isEstimate) };
}

/**
 * Fetches the real routed polyline for a multi-stop day, one leg per
 * consecutive pair (the /api/routing/directions endpoint is point-to-point),
 * concatenated into a single line. Falls back to `{geometry: null}` — the
 * caller should draw its existing straight-line route instead — whenever
 * any leg couldn't get a real route, rather than mixing real and guessed
 * segments in one line.
 */
export function useDayRoute(waypoints: RouteWaypoint[], mode: RoutingMode = "driving") {
  const key =
    waypoints.length >= 2
      ? ["day-route", mode, waypoints.map((w) => `${w.lat},${w.lng}`).join("|")]
      : null;

  const { data, isLoading } = useSWR<DayRouteResult>(
    key,
    async () => {
      const legs = await Promise.all(
        waypoints.slice(0, -1).map((from, i) => fetchLeg(from, waypoints[i + 1], mode))
      );
      if (legs.some((leg) => leg.isEstimate || !leg.geometry)) {
        return { geometry: null, isEstimate: true };
      }
      const combined: [number, number][] = [];
      legs.forEach((leg, i) => {
        const coords = leg.geometry as [number, number][];
        combined.push(...(i === 0 ? coords : coords.slice(1)));
      });
      return { geometry: combined, isEstimate: false };
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    geometry: data?.geometry ?? null,
    isEstimate: data?.isEstimate ?? true,
    isLoading: Boolean(key) && isLoading,
  };
}
