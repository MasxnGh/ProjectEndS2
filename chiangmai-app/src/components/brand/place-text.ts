import type { Place, PriceLevel } from "@/data/types";
import type { Dictionary } from "@/i18n";
import { locateInSquare } from "@/lib/city-square";

/*
 * The words a place card shows, built from the place's own data. Nothing here
 * is invented: no rating, no review count — the board's "4.8 (12k+)" becomes
 * category, time on site and price level, which are all real.
 */

/** Fills `{name}` slots in a dictionary string. Unknown slots are left as they are. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}

/** 90 → "1 ชม. 30 นาที" / "1 hr 30 min". */
export function formatDuration(minutes: number, dict: Dictionary): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const t = dict.ui.duration;
  if (h && m) return fill(t.both, { h, m });
  if (h) return fill(t.hours, { h });
  return fill(t.minutes, { m });
}

/** ฿, ฿฿ or ฿฿฿ — the scale is explained by dict.common.hints.priceLevel. */
export function priceSymbol(level: PriceLevel): string {
  return "฿".repeat(level);
}

/**
 * Where a place is, the way people here give directions: the district, and the
 * old-city square only where it adds something (inside the walls or on the moat).
 */
export function placeWhere(place: Place, dict: Dictionary): string {
  const { bucket } = locateInSquare(place.coordinates);
  const zones = dict.square.zones;
  const district = dict.common.districts[place.district] ?? zones[bucket];
  return bucket === "inside" || bucket === "wall" ? `${district} · ${zones[bucket]}` : district;
}

/** "วัดวาอาราม · อยู่ราว 2 ชม. · ฿" */
export function placeMeta(place: Place, dict: Dictionary): string {
  return [
    dict.common.categories[place.category],
    fill(dict.ui.stay, { duration: formatDuration(place.durationMinutes, dict) }),
    priceSymbol(place.priceLevel),
  ].join(" · ");
}

/** 0.85 → "850 ม.", 2.43 → "2.4 กม.". */
export function formatDistance(km: number, dict: Dictionary): string {
  return km < 1
    ? fill(dict.browse.meters, { m: Math.round((km * 1000) / 10) * 10 })
    : fill(dict.browse.km, { km: km < 10 ? km.toFixed(1) : Math.round(km) });
}
