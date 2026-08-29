import { places } from "@/data/places";
import { locateInSquare, type SquareBucket } from "@/lib/city-square";
import type { PlaceCategory } from "@/data/types";

/**
 * Reduces the catalogue to the few numbers the city-square map needs.
 *
 * Run on the server and passed down as props, so the landing page can draw
 * every place without shipping 193 place records — with their descriptions in
 * two languages — into the client bundle. What crosses the boundary is a
 * couple of hundred coordinate pairs.
 */

export interface SquarePoint {
  x: number;
  y: number;
  bucket: SquareBucket;
}

export interface SquareZoneCount {
  bucket: SquareBucket;
  count: number;
}

/** The order the zones are listed in: the walls first, then clockwise from north. */
const ZONE_ORDER: SquareBucket[] = ["inside", "wall", "north", "east", "south", "west", "beyond"];

export function buildSquareSummary(): { zones: SquareZoneCount[]; points: SquarePoint[] } {
  const counts = new Map<SquareBucket, number>();
  const points: SquarePoint[] = [];

  for (const place of places) {
    const placement = locateInSquare(place.coordinates);
    counts.set(placement.bucket, (counts.get(placement.bucket) ?? 0) + 1);
    if (placement.point) {
      points.push({
        // Rounded because the map is 300px wide; four decimals of latitude is
        // precision nobody can see and bytes everybody pays for.
        x: Math.round(placement.point.x * 1000) / 1000,
        y: Math.round(placement.point.y * 1000) / 1000,
        bucket: placement.bucket,
      });
    }
  }

  return {
    zones: ZONE_ORDER.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 })).filter(
      (zone) => zone.count > 0
    ),
    points,
  };
}

export interface CategoryCount {
  category: PlaceCategory;
  count: number;
}

/**
 * How many places of each kind the guide holds, largest first.
 *
 * The landing page used to present the categories as eight image tiles, but
 * only a handful of categories have photography, so most were gradient
 * placeholders — and the heading said "five ways into the city" above eight of
 * them. A counted index is smaller, truthful, and tells the visitor something
 * the tiles never did: how much of each kind is actually here.
 */
export function buildCategoryCounts(): CategoryCount[] {
  const counts = new Map<PlaceCategory, number>();
  for (const place of places) {
    counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}
