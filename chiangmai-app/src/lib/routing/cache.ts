import type { RoutePoint, RoutingMode } from "./types";

/**
 * A tiny TTL cache for routing results. This is scoped to a single warm
 * server instance's memory, not a shared/persistent store — there's no
 * database or KV provisioned in this project. It still meaningfully cuts
 * duplicate upstream calls within a warm instance (repeated views of the
 * same day plan, multiple users querying the same popular pair of places).
 * If this becomes a bottleneck, Next's `'use cache: remote'` (this
 * project's Next.js version supports it) or a real KV store would give
 * genuine cross-instance persistence — deliberately not reached for here
 * since enabling Cache Components project-wide is a much bigger, riskier
 * change than this feature needs.
 */
export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private ttlMs: number,
    private now: () => number = Date.now
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}

/** ~11m precision — groups near-identical coordinates onto the same cache entry without materially changing the result. */
function roundCoord(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function pointKey(p: RoutePoint): string {
  return `${roundCoord(p.lat)},${roundCoord(p.lng)}`;
}

export function directionsCacheKey(from: RoutePoint, to: RoutePoint, mode: RoutingMode): string {
  return `${mode}:${pointKey(from)}->${pointKey(to)}`;
}

export function matrixCacheKey(points: RoutePoint[], mode: RoutingMode): string {
  return `${mode}:matrix:${points.map(pointKey).join("|")}`;
}

export function isochroneCacheKey(point: RoutePoint, minutesList: number[], mode: RoutingMode): string {
  return `${mode}:isochrone:${pointKey(point)}:${[...minutesList].sort((a, b) => a - b).join(",")}`;
}
