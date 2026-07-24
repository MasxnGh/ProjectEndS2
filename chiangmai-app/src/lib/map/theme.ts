import type { Map as MapLibreMapInstance } from "maplibre-gl";

export type MapThemeMode = "light" | "dark";

const PALETTE = {
  light: { land: "#f7f4ef", water: "#e3dcc8", road: "#cbbfa4" },
  dark: { land: "#171613", water: "#2a2721", road: "#4a4438" },
};

/**
 * Recolours a MapTiler "dataviz" base style toward the site's cream/gold
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
