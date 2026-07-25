import type { NextRequest } from "next/server";
import { getRoutingProvider } from "@/lib/routing/providers";
import { TtlCache, matrixCacheKey } from "@/lib/routing/cache";
import type { MatrixResult, RoutePoint, RoutingMode } from "@/lib/routing/types";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 25; // keeps a single matrix call well within typical provider request-size limits
const cache = new TtlCache<MatrixResult>(CACHE_TTL_MS);

function isRoutePoint(value: unknown): value is RoutePoint {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return typeof p.lat === "number" && typeof p.lng === "number";
}

function parseMode(value: unknown): RoutingMode {
  if (value === "cycling" || value === "walking") return value;
  return "driving";
}

/**
 * POST rather than GET: an itinerary day's stop list doesn't fit cleanly (or
 * safely, re: URL length limits) into query params the way a single
 * from/to pair does.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const { points, mode: rawMode } = (body as { points?: unknown; mode?: unknown }) ?? {};
  if (!Array.isArray(points) || points.length < 2 || !points.every(isRoutePoint)) {
    return Response.json({ error: "points must be an array of at least 2 {lat, lng} objects" }, { status: 400 });
  }
  if (points.length > MAX_POINTS) {
    return Response.json({ error: `points must not exceed ${MAX_POINTS} entries` }, { status: 400 });
  }
  const mode = parseMode(rawMode);

  const key = matrixCacheKey(points, mode);
  const cached = cache.get(key);
  if (cached) return Response.json(cached);

  try {
    const result = await getRoutingProvider().getMatrix(points, mode);
    cache.set(key, result);
    return Response.json(result);
  } catch (err) {
    console.error("Matrix request failed", err);
    return Response.json({ error: "Travel-time matrix is temporarily unavailable" }, { status: 502 });
  }
}
