import type { Place } from "@/data/types";
import type { LatLng } from "@/lib/geo/distance";
import { buildDayTimeline, type DayTimeline, type SunTimes } from "@/lib/planner/golden-hour";

export interface AnchorFirstSuggestion {
  /** The stop whose best-time window the day is timed around. */
  placeSlug: string;
  /** The day's order with that stop moved to the front; everything else keeps its order. */
  order: string[];
  /** When the day currently starts, in minutes after midnight — the time the traveller sees. */
  currentStartMinutes: number;
  /** Stops that would still be reached while shut after the move (0 means every stop is open). */
  closedAfter: number;
}

const closedCount = (timeline: DayTimeline) => timeline.stops.filter((s) => s.outsideOpeningHours).length;
const conflictCount = (timeline: DayTimeline) => timeline.stops.filter((s) => s.conflict).length;

/**
 * A suggestion, never a change: the timeline itself is untouched.
 *
 * `buildDayTimeline` times a day around the first stop with an ideal
 * best-time window and counts the stops before it backward from there. When
 * that stop is not first, the earlier stops can be pushed back to hours when
 * they are still shut (Wat Umong at 03:17 ahead of Wat Pha Lat's sunrise
 * window). Putting the anchor stop first lets the same engine schedule the
 * rest forward from it instead.
 *
 * Offered only when the anchor came from a window (a time the user locked is
 * theirs to keep), when some stop is reached while shut, and when the moved
 * order — built by the same engine with the same locks — has fewer shut stops
 * and no new conflicts with locked times.
 */
export function suggestAnchorFirst(params: {
  order: Place[];
  timeline: DayTimeline;
  sun: SunTimes;
  baseLocation: LatLng | null;
  lockedArrivals?: Record<string, string>;
}): AnchorFirstSuggestion | null {
  const { order, timeline, sun, baseLocation, lockedArrivals = {} } = params;
  const anchorIndex = timeline.stops.findIndex((s) => s.isAnchor);
  if (anchorIndex <= 0) return null;
  if (timeline.stops[anchorIndex].userLocked) return null;

  const closedBefore = closedCount(timeline);
  if (closedBefore === 0) return null;

  const anchor = order[anchorIndex];
  const moved = [anchor, ...order.filter((_, i) => i !== anchorIndex)];
  const candidate = buildDayTimeline({ order: moved, sun, baseLocation, lockedArrivals });

  const closedAfter = closedCount(candidate);
  if (closedAfter >= closedBefore) return null;
  if (conflictCount(candidate) > conflictCount(timeline)) return null;

  return {
    placeSlug: anchor.slug,
    order: moved.map((p) => p.slug),
    currentStartMinutes: timeline.stops[0].arrivalMinutes,
    closedAfter,
  };
}
