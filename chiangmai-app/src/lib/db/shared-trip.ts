import "server-only";

import { getTripsCollection } from "@/lib/db/collections";
import type { TripDoc } from "@/lib/db/types";

/**
 * Looks up a trip by share token, applying the two conditions that make a
 * share link safe to serve without a session:
 *
 * 1. `visibility: "unlisted"` — a private trip stays unreachable even if its
 *    token leaks, so switching a trip back to private genuinely revokes access
 *    rather than just hiding a button.
 * 2. `deletedAt: null` — a deleted trip must not keep serving from an old link.
 *
 * The token itself is the only credential (24 random bytes, see
 * share-token.ts), so there is nothing to guess and nothing to enumerate.
 * Shared by the share page and the copy-to-my-trips endpoint so the two can
 * never disagree about what "shared" means.
 */
export async function findSharedTripByToken(token: string): Promise<TripDoc | null> {
  // A token that isn't a plausible base64url string can't match anything, so
  // reject it before spending a query on it.
  if (!token || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const trips = await getTripsCollection();
  return trips.findOne({ shareToken: token, visibility: "unlisted", deletedAt: null });
}
