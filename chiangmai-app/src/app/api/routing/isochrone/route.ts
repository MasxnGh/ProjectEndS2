import type { NextRequest } from "next/server";
import { getRoutingProvider } from "@/lib/routing/providers";
import { TtlCache, isochroneCacheKey } from "@/lib/routing/cache";
import type { IsochroneResult, RoutePoint, RoutingMode } from "@/lib/routing/types";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const cache = new TtlCache<IsochroneResult>(CACHE_TTL_MS);

function parseMode(value: string | null): RoutingMode {
  if (value === "cycling" || value === "walking") return value;
  return "driving";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const minutesList = (params.get("minutes") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || minutesList.length === 0) {
    return Response.json(
      { error: "lat, lng, and a comma-separated minutes list are required" },
      { status: 400 }
    );
  }

  const elevationParam = params.get("elevation");
  const elevation = elevationParam ? Number(elevationParam) : null;
  const point: RoutePoint = { lat, lng, elevation: Number.isFinite(elevation) ? elevation : null };
  const mode = parseMode(params.get("mode"));

  const key = isochroneCacheKey(point, minutesList, mode);
  const cached = cache.get(key);
  if (cached) {
    return Response.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  }

  try {
    const result = await getRoutingProvider().getIsochrone(point, minutesList, mode);
    cache.set(key, result);
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    console.error("Isochrone request failed", err);
    return Response.json({ error: "Isochrone is temporarily unavailable" }, { status: 502 });
  }
}
