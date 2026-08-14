import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getTripsCollection } from "@/lib/db/collections";
import { findSharedTripByToken } from "@/lib/db/shared-trip";
import { toSerializedTrip } from "@/lib/db/types";
import { generateShareToken } from "@/lib/db/share-token";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

const MAX_TITLE = 80;

/**
 * "Copy this to my trips" from a share link.
 *
 * Separate from the owner-only duplicate route because the authorisation is
 * different in kind: there, the caller must own the source; here, the caller
 * owns nothing and the share token is what grants read access. What the two
 * share is the outcome — the copy belongs to the caller, gets a fresh token,
 * and starts private.
 *
 * Signing in is required to copy (there is nowhere to put an anonymous trip),
 * but note that *viewing* the shared trip is not — that stays open, as the
 * brief requires.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`trips:copy-shared:${userId}`, { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { token } = await params;
  const source = await findSharedTripByToken(token);
  if (!source) {
    return Response.json({ error: "Shared trip not found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const requestedTitle = (body as Record<string, unknown> | null)?.title;

  const now = new Date();
  const copy = {
    ...source,
    _id: new ObjectId(),
    title: (typeof requestedTitle === "string" && requestedTitle.trim()
      ? requestedTitle.trim()
      : source.title
    ).slice(0, MAX_TITLE),
    ownerId: userId,
    shareToken: generateShareToken(),
    visibility: "private" as const,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const trips = await getTripsCollection();
  await trips.insertOne(copy);

  return Response.json({ trip: toSerializedTrip(copy) }, { status: 201 });
}
