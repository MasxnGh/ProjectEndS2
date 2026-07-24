// Server-only: never import this from a "use client" module. The key itself
// must never reach the browser — every tile/style/glyph request is proxied
// through this app's own /api/map/* Route Handlers instead.

export const MAPTILER_STYLE_ID = "dataviz";
export const MAPTILER_STYLE_ID_DARK = "dataviz-dark";
export const MAPTILER_TILE_URL = "https://api.maptiler.com/tiles/v3";
export const MAPTILER_FONTS_URL = "https://api.maptiler.com/fonts";

export function getMapTilerKey(): string | null {
  return process.env.MAPTILER_API_KEY || null;
}

export function isMapConfigured(): boolean {
  return Boolean(getMapTilerKey());
}
