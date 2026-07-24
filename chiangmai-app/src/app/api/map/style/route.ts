import type { NextRequest } from "next/server";
import { getMapTilerKey, MAPTILER_STYLE_ID, MAPTILER_STYLE_ID_DARK } from "@/lib/map/config";

interface VectorSource {
  type: string;
  url?: string;
  tiles?: string[];
  [key: string]: unknown;
}

interface MapStyle {
  sources?: Record<string, VectorSource>;
  glyphs?: string;
  sprite?: string | Array<{ id: string; url: string }>;
  [key: string]: unknown;
}

/**
 * Proxies a MapTiler style document, rewriting every reference back to this
 * app's own /api/map/* routes so the MapTiler key never reaches the
 * browser. Vector tile sources (whether given as an inline `tiles` array or
 * a TileJSON `url`) are collapsed to a single inline tile template pointing
 * at our tile proxy; `glyphs` points at our font proxy; `sprite` is dropped
 * entirely since this app draws its own SVG markers rather than using
 * MapTiler's icon sprite.
 */
export async function GET(request: NextRequest) {
  const key = getMapTilerKey();
  if (!key) {
    return Response.json({ error: "Map is not configured" }, { status: 503 });
  }

  const theme = request.nextUrl.searchParams.get("theme") === "dark" ? MAPTILER_STYLE_ID_DARK : MAPTILER_STYLE_ID;
  const origin = request.nextUrl.origin;

  let style: MapStyle;
  try {
    const upstream = await fetch(`https://api.maptiler.com/maps/${theme}/style.json?key=${key}`, {
      next: { revalidate: 3600 },
    });
    if (!upstream.ok) {
      return Response.json({ error: "Upstream style fetch failed" }, { status: 502 });
    }
    style = await upstream.json();
  } catch (err) {
    console.error("Map style proxy failed", err);
    return Response.json({ error: "Map style is temporarily unavailable" }, { status: 502 });
  }

  for (const source of Object.values(style.sources ?? {})) {
    if (source.type === "vector") {
      delete source.url;
      source.tiles = [`${origin}/api/map/tiles/{z}/{x}/{y}`];
    }
  }

  if (style.glyphs) {
    style.glyphs = `${origin}/api/map/glyphs/{fontstack}/{range}`;
  }
  delete style.sprite;

  return Response.json(style, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
