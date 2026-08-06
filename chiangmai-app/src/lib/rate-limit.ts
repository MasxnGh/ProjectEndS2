/**
 * Fixed-window in-memory rate limiter for write API routes. Like the routing
 * TtlCache, this is scoped to a single warm server instance — not a shared
 * store — so a burst spread across multiple serverless instances isn't
 * caught precisely. That's an acceptable trade at this project's scale: the
 * goal is blunting a runaway client loop or a single abusive user, not
 * defending a high-traffic API. A real multi-instance deployment would want
 * this backed by Redis/Upstash instead.
 */
const buckets = new Map<string, { count: number; windowStartedAt: number }>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now - bucket.windowStartedAt) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
