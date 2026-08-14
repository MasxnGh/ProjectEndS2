import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getTripsCollection } from "@/lib/db/collections";
import { toSerializedTrip } from "@/lib/db/types";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/**
 * The other half of the soft delete — what the undo button in My Trips calls.
 *
 * Deliberately has no expiry check: the undo window is a UI affordance (the
 * toast is on screen for a few seconds), not a server-enforced deadline. If a
 * user gets back to it late, restoring still works, which is the friendlier
 * failure direction for something as unrecoverable as a deleted trip.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const limited = rateLimitResponse(`trips:restore:${userId}`, { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const trips = await getTripsCollection();
  const _id = new ObjectId(id);

  // ownerId is re-checked here exactly as on every other path: knowing an id
  // must never be enough to act on someone else's trip.
  const result = await trips.findOneAndUpdate(
    { _id, ownerId: userId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { returnDocument: "after" }
  );

  if (!result) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  return Response.json({ trip: toSerializedTrip(result) });
}
