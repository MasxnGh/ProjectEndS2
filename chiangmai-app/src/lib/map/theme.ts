import type { Map as MapLibreMapInstance } from "maplibre-gl";

export type MapThemeMode = "light" | "dark";

const PALETTE = {
  light: { land: "#e8eae6", water: "#c6d3d6", road: "#b2bab1", accent: "#2e6b57" },
  dark: { land: "#10171e", water: "#18262f", road: "#354550", accent: "#8fbfa8" },
};

/**
 * The accent to draw over the map — routes, pins, radius rings.
 *
 * MapLibre paint properties are evaluated inside the canvas and cannot read a
 * CSS custom property, so the colour has to be handed in. It was hardcoded as
 * #C9A24B in four places, which left gold routes and rings drawn over the new
 * palette; taking it from the same table as the base colours means the map's
 * overlay and its ground can no longer disagree.
 */
export function mapAccent(mode: MapThemeMode): string {
  return PALETTE[mode].accent;
}

/**
 * Recolours a MapTiler "dataviz" base style toward the site's indigo/celadon
 * palette and hides POI clutter, without depending on knowing the style's
 * exact layer ids ahead of time — it pattern-matches on id/type instead, so
 * it degrades gracefully (silently skipping) if MapTiler renames a layer.
 */
export function applyBrandMapTheme(map: MapLibreMapInstance, mode: MapThemeMode) {
  const colors = PALETTE[mode];
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const id = layer.id;
    const lower = id.toLowerCase();

    try {
      if (lower.includes("background")) {
        map.setPaintProperty(id, "background-color", colors.land);
      } else if (layer.type === "fill" && lower.includes("water") && !lower.includes("way")) {
        map.setPaintProperty(id, "fill-color", colors.water);
      } else if (layer.type === "line" && lower.includes("waterway")) {
        map.setPaintProperty(id, "line-color", colors.water);
      } else if (
        layer.type === "line" &&
        (lower.includes("road") || lower.includes("transportation")) &&
        !lower.includes("label")
      ) {
        map.setPaintProperty(id, "line-color", colors.road);
      } else if (lower.includes("poi") && !lower.includes("place")) {
        map.setLayoutProperty(id, "visibility", "none");
      }
    } catch {
      // This layer doesn't support the paint/layout property we tried — skip it.
    }
  }
}
