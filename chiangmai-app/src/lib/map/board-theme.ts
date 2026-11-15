import type { Map as MapLibreMapInstance } from "maplibre-gl";

export type BoardMapMode = "light" | "dark";

/**
 * The brand board's map: warm paper land, sage parks, lavender-grey water,
 * white roads, and places drawn in the board's green with the sunset for the
 * one being pointed at. Ported from the Phase 1 prototype (docs/rebuild/
 * phase-1-design/assets/map.js) so the app's map and the approved design match.
 *
 * MapLibre paints inside a canvas and cannot read CSS custom properties, so the
 * colours are literal here and mirror brand.css.
 */
export const BOARD_MAP = {
  light: {
    land: "#f4eee9",
    urban: "#efe7e1",
    forest: "#dde5d6",
    water: "#d3d3e6",
    road: "#ffffff",
    roadMinor: "#faf6f3",
    label: "#4f5a57",
    halo: "#f4eee9",
    line: "#1d3835",
    casing: "#fffcfa",
    dot: "#1d3835",
    dotStroke: "#fffcfa",
    active: "#eb9d56",
  },
  dark: {
    land: "#13231f",
    urban: "#172a26",
    forest: "#1a2e28",
    water: "#26303f",
    road: "#24392f",
    roadMinor: "#1c312b",
    label: "#b9c4c0",
    halo: "#13231f",
    line: "#efd3b1",
    casing: "#0f1c1a",
    dot: "#efd3b1",
    dotStroke: "#0f1c1a",
    active: "#eb9d56",
  },
} as const;

/**
 * The old city's moat square. Drawn on every brand map so the map keeps its
 * bearings even where the base tiles fail to load — the square is how people
 * here give directions.
 */
export const MOAT_SQUARE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [98.97824, 18.79515],
        [98.993165, 18.79515],
        [98.993165, 18.781515],
        [98.97824, 18.781515],
        [98.97824, 18.79515],
      ],
    ],
  },
};

/**
 * Recolours the MapTiler base style toward the board and hides the clutter
 * (POIs, road labels, buildings, borders). It matches layers by id and type
 * rather than knowing them in advance, so a renamed layer is skipped, not broken.
 */
export function applyBoardMapTheme(map: MapLibreMapInstance, mode: BoardMapMode) {
  const c = BOARD_MAP[mode];
  const style = map.getStyle();
  if (!style?.layers) return;

  const paint = (id: string, prop: string, value: unknown) => {
    try {
      map.setPaintProperty(id, prop, value);
    } catch {
      // The layer does not take this property; leave it as it is.
    }
  };
  const hide = (id: string) => {
    try {
      map.setLayoutProperty(id, "visibility", "none");
    } catch {
      // Already gone.
    }
  };

  for (const layer of style.layers) {
    const id = layer.id;
    const l = id.toLowerCase();
    if (layer.type === "background") paint(id, "background-color", c.land);
    else if (l === "residential") paint(id, "fill-color", c.urban);
    else if (l === "landcover" || l === "forest" || l.includes("park") || l.includes("wood") || l.includes("grass")) {
      if (layer.type === "fill") {
        paint(id, "fill-color", c.forest);
        paint(id, "fill-opacity", 0.9);
      }
    } else if (l === "river" || l.includes("waterway")) {
      if (layer.type === "line") paint(id, "line-color", c.water);
    } else if (l === "water shadow") hide(id);
    else if (l.includes("water")) {
      if (layer.type === "fill") paint(id, "fill-color", c.water);
    } else if (
      l.includes("outline") ||
      l.includes("border") ||
      l.includes("railway") ||
      l.startsWith("building") ||
      l === "stadium" ||
      l === "cemetery" ||
      l === "pier"
    )
      hide(id);
    else if (l === "aeroway" || l.startsWith("path")) {
      if (layer.type === "line") paint(id, "line-color", c.roadMinor);
    } else if (l.includes("road") || l.startsWith("tunnel") || l.includes("highway") || l.includes("street")) {
      if (layer.type === "line") paint(id, "line-color", c.road);
    }

    if (layer.type === "symbol") {
      if (l.includes("road") || l.includes("poi") || l.includes("shield")) hide(id);
      else {
        paint(id, "text-color", c.label);
        paint(id, "text-halo-color", c.halo);
        paint(id, "text-halo-width", 1.4);
      }
    }
  }
}

/** MapLibre's own control labels in the page's language (its defaults are English). */
export function mapControlLocale(labels: {
  canvas: string;
  zoomIn: string;
  zoomOut: string;
  resetBearing: string;
  credits: string;
}): Record<string, string> {
  return {
    "Map.Title": labels.canvas,
    "NavigationControl.ZoomIn": labels.zoomIn,
    "NavigationControl.ZoomOut": labels.zoomOut,
    "NavigationControl.ResetBearing": labels.resetBearing,
    "AttributionControl.ToggleAttribution": labels.credits,
  };
}
