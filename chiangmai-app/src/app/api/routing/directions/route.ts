import type { NextRequest } from "next/server";
import { getRoutingProvider } from "@/lib/routing/providers";
import { TtlCache, directionsCacheKey } from "@/lib/routing/cache";
import type { DirectionsResult, RoutePoint, RoutingMode } from "@/lib/routing/types";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // routes between two fixed points barely ever change
const cache = new TtlCache<DirectionsResult>(CACHE_TTL_MS);

function parseMode(value: string | null): RoutingMode {
  if (value === "cycling" || value === "walking") return value;
  return "driving";
}

function parsePoint(request: NextRequest, prefix: "from" | "to"): RoutePoint | null {
  const lat = Number(request.nextUrl.searchParams.get(`${prefix}Lat`));
  const lng = Number(request.nextUrl.searchParams.get(`${prefix}Lng`));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const elevationParam = request.nextUrl.searchParams.get(`${prefix}Elevation`);
  const elevation = elevationParam ? Number(elevationParam) : null;
  return { lat, lng, elevation: Number.isFinite(elevation) ? elevation : null };
}

export async function GET(request: NextRequest) {
  const from = parsePoint(request, "from");
  const to = parsePoint(request, "to");
  if (!from || !to) {
    return Response.json({ error: "fromLat/fromLng and toLat/toLng query params are required" }, { status: 400 });
  }
  const mode = parseMode(request.nextUrl.searchParams.get("mode"));

  const key = directionsCacheKey(from, to, mode);
  const cached = cache.get(key);
  if (cached) {
    return Response.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  }

  try {
    const result = await getRoutingProvider().getDirections(from, to, mode);
    cache.set(key, result);
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("Directions request failed", err);
    return Response.json({ error: "Directions are temporarily unavailable" }, { status: 502 });
  }
}
