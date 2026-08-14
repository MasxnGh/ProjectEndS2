import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getTripsCollection } from "@/lib/db/collections";
import { toSerializedTrip } from "@/lib/db/types";
import { generateShareToken } from "@/lib/db/share-token";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/** Kept short so the copy still reads as a title in a card, not a paragraph. */
const MAX_TITLE = 80;

/**
 * The copy's title comes from the client, because the "(copy)" marker has to
 * be in the reader's language and the server has no locale here. Falls back to
 * the source title when absent rather than inventing an English suffix.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const limited = rateLimitResponse(`trips:duplicate:${userId}`, { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => ({}));
  const requestedTitle = (body as Record<string, unknown> | null)?.title;

  const trips = await getTripsCollection();
  const source = await trips.findOne({ _id: new ObjectId(id), ownerId: userId, deletedAt: null });
  if (!source) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  const now = new Date();
  const copy = {
    ...source,
    _id: new ObjectId(),
    title: (typeof requestedTitle === "string" && requestedTitle.trim()
      ? requestedTitle.trim()
      : source.title
    ).slice(0, MAX_TITLE),
    ownerId: userId,
    // A copy must never inherit the original's share token: anyone holding
    // the old link would silently gain access to the new trip too, and
    // revoking one would revoke both. Same reason it starts private —
    // sharing is a decision the owner makes per trip, not something a
    // duplicate inherits.
    shareToken: generateShareToken(),
    visibility: "private" as const,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await trips.insertOne(copy);

  return Response.json({ trip: toSerializedTrip(copy) }, { status: 201 });
}
