"use client";

import type { RoutingMode } from "@/lib/routing/types";

interface MatrixWaypoint {
  lat: number;
  lng: number;
  elevation?: number | null;
}

interface DurationMatrixResult {
  durations: number[][] | undefined;
  isEstimate: boolean;
}

/**
 * One-shot client-side call to /api/routing/matrix — used by the day
 * route-optimization button, which needs the real travel-time matrix at the
 * moment the user clicks "Optimize route" rather than a continuously
 * reactive subscription. Returns `durations: undefined` (never throws) on
 * any failure, so the caller can fall back to optimizing on straight-line
 * distance exactly as before this feature existed.
 */
export async function fetchDurationMatrix(
  points: MatrixWaypoint[],
  mode: RoutingMode = "driving"
): Promise<DurationMatrixResult> {
  try {
    const res = await fetch("/api/routing/matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, mode }),
    });
    if (!res.ok) return { durations: undefined, isEstimate: true };
    const data = await res.json();
    return { durations: data.durations, isEstimate: Boolean(data.isEstimate) };
  } catch {
    return { durations: undefined, isEstimate: true };
  }
}
