// Server-only: never import this from a "use client" module. The key itself
// must never reach the browser — every directions/matrix/isochrone request
// is proxied through this app's own /api/routing/* Route Handlers instead.
import type { RoutingMode } from "./types";

export const ORS_BASE_URL = "https://api.openrouteservice.org";

export function getOrsApiKey(): string | null {
  return process.env.OPENROUTESERVICE_API_KEY || null;
}

export function isRoutingConfigured(): boolean {
  return Boolean(getOrsApiKey());
}

const ORS_PROFILE_BY_MODE: Record<RoutingMode, string> = {
  driving: "driving-car",
  cycling: "cycling-regular",
  walking: "foot-walking",
};

export function orsProfile(mode: RoutingMode): string {
  return ORS_PROFILE_BY_MODE[mode];
}
