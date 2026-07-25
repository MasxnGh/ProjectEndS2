import { isRoutingConfigured } from "../config";
import type { RoutingProvider } from "../types";
import { openRouteServiceProvider } from "./open-route-service";
import { fallbackRoutingProvider } from "./fallback";

export { fallbackRoutingProvider } from "./fallback";
export { openRouteServiceProvider } from "./open-route-service";

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}

/**
 * Wraps a primary provider so every method retries transient failures, then
 * falls back to `fallbackRoutingProvider`'s matching method (which never
 * throws) if the primary still fails — "Fallback เสมอ" from the spec. The
 * fallback's `isEstimate: true` on every result is what tells the UI to
 * label the value as approximate.
 */
function withFallback(primary: RoutingProvider, fallback: RoutingProvider): RoutingProvider {
  return {
    name: primary.name,
    async getDirections(from, to, mode) {
      try {
        return await withRetry(() => primary.getDirections(from, to, mode));
      } catch (err) {
        console.error(`${primary.name} getDirections failed, using fallback`, err);
        return fallback.getDirections(from, to, mode);
      }
    },
    async getMatrix(points, mode) {
      try {
        return await withRetry(() => primary.getMatrix(points, mode));
      } catch (err) {
        console.error(`${primary.name} getMatrix failed, using fallback`, err);
        return fallback.getMatrix(points, mode);
      }
    },
    async getIsochrone(point, minutesList, mode) {
      try {
        return await withRetry(() => primary.getIsochrone(point, minutesList, mode));
      } catch (err) {
        console.error(`${primary.name} getIsochrone failed, using fallback`, err);
        return fallback.getIsochrone(point, minutesList, mode);
      }
    },
  };
}

// Swap the primary provider here to change routing sources without touching
// any Route Handler or UI code — every provider implements the same
// RoutingProvider interface (see ../types.ts).
export function getRoutingProvider(): RoutingProvider {
  if (!isRoutingConfigured()) return fallbackRoutingProvider;
  return withFallback(openRouteServiceProvider, fallbackRoutingProvider);
}
