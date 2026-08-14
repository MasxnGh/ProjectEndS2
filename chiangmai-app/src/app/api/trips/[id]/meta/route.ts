import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getTripsCollection } from "@/lib/db/collections";
import { toSerializedTrip, type TripVisibility } from "@/lib/db/types";
import { generateShareToken } from "@/lib/db/share-token";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

const MAX_TITLE = 80;
const VISIBILITIES: TripVisibility[] = ["private", "unlisted"];

/**
 * Owner-only metadata edits, separate from the whole-trip PATCH on purpose.
 *
 * The main PATCH is the autosave path: it demands a complete, valid trip body
 * and is rate-limited for a writer that fires every couple of seconds.
 * Renaming from a card in My Trips has neither property — the page holds a
 * list, not an editing session, and sending a full itinerary back just to
 * change a title would race the planner's own autosave for the same document.
 *
 * Body: `{ title?: string, visibility?: "private" | "unlisted", regenerateShareToken?: true }`
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const limited = rateLimitResponse(`trips:meta:${userId}`, { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Malformed request body" }, { status: 400 });
  }
  const { title, visibility, regenerateShareToken } = body as Record<string, unknown>;

  const update: Partial<{ title: string; visibility: TripVisibility; shareToken: string; updatedAt: Date }> = {};

  if (title !== undefined) {
    if (typeof title !== "string") {
      return Response.json({ error: "title must be a string" }, { status: 400 });
    }
    // An all-whitespace title would render as a blank card with no way to
    // click into a rename, so it is rejected rather than trimmed to empty.
    const trimmed = title.trim();
    if (!trimmed) {
      return Response.json({ error: "title must not be empty" }, { status: 400 });
    }
    update.title = trimmed.slice(0, MAX_TITLE);
  }

  if (visibility !== undefined) {
    if (typeof visibility !== "string" || !VISIBILITIES.includes(visibility as TripVisibility)) {
      return Response.json({ error: "visibility must be 'private' or 'unlisted'" }, { status: 400 });
    }
    update.visibility = visibility as TripVisibility;
  }

  // Rotating the token is how an owner revokes a link they already sent —
  // the old URL stops resolving immediately, which is the whole point.
  if (regenerateShareToken === true) {
    update.shareToken = generateShareToken();
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }
  update.updatedAt = new Date();

  const trips = await getTripsCollection();
  const updated = await trips.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId: userId, deletedAt: null },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!updated) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  return Response.json({ trip: toSerializedTrip(updated) });
}
