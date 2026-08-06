/**
 * Runs once when the server starts (see Next.js's instrumentation.js
 * convention). OpenRouteService is an optional key — the Trip Planner keeps
 * working without it via the Haversine + terrain-detour-factor fallback
 * (lib/routing/providers/fallback.ts) — so this only warns, it never throws.
 * The goal is just to stop "why are all my routes estimates?" from being a
 * silent mystery.
 */
export function register() {
  if (!process.env.OPENROUTESERVICE_API_KEY) {
    console.warn(
      "[startup] OPENROUTESERVICE_API_KEY is not set — Trip Planner routing will use the " +
        "Haversine + terrain-detour-factor fallback (estimates, not real routed distances/times). " +
        "See .env.local.example to add a free key."
    );
  }
}
