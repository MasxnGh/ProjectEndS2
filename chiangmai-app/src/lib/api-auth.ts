import "server-only";

import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * The session-derived user id, or null when signed out.
 *
 * This is the only acceptable source of `ownerId` anywhere in the API. A user
 * id read from a request body or a query string is an assertion by the caller,
 * not a fact — trusting one is how a trip belonging to someone else gets read
 * or overwritten (IDOR). Every route that touches user data starts here.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "Sign in required" }, { status: 401 });
}

/**
 * Returns a 429 Response when the caller is over the limit, or null to
 * proceed. Keyed per user rather than per IP for authenticated writes: a
 * shared office IP shouldn't throttle one person because of another.
 */
export function rateLimitResponse(
  key: string,
  options: { max: number; windowMs: number }
): Response | null {
  const result = checkRateLimit(key, options);
  if (result.allowed) return null;
  return Response.json(
    { error: "Too many requests, please slow down" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } }
  );
}
