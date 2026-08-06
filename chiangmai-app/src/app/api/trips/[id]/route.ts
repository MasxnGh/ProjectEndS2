import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getTripsCollection } from "@/lib/db/collections";
import { parseTripWritablePayload, toSerializedTrip } from "@/lib/db/types";
import { checkRateLimit } from "@/lib/rate-limit";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * PATCH body is `{ trip: TripWritablePayload, expectedUpdatedAt: string | null }`.
 * `expectedUpdatedAt` is the client's last-known `updatedAt` (ISO string, or
 * null for a trip it hasn't successfully synced yet). If the document has
 * since moved on — another tab, another device — the write still goes
 * through (last-write-wins, per the brief), but the response carries
 * `conflict: true` plus the fresh doc so the UI can tell the user instead of
 * silently discarding the other write.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const rateLimit = checkRateLimit(`trips:update:${userId}`, { max: 60, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests, please slow down" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Malformed request body" }, { status: 400 });
  }
  const { trip: tripBody, expectedUpdatedAt } = body as Record<string, unknown>;
  if (expectedUpdatedAt !== null && typeof expectedUpdatedAt !== "string") {
    return Response.json({ error: "Malformed request body" }, { status: 400 });
  }

  const payload = parseTripWritablePayload(tripBody);
  if (!payload) {
    return Response.json({ error: "Malformed trip payload" }, { status: 400 });
  }

  const trips = await getTripsCollection();
  const _id = new ObjectId(id);

  // ownerId must always be re-verified against the current session, never
  // trusted from the client — this is the IDOR check. A trip belonging to
  // someone else, or one that's been soft-deleted, is treated as not found.
  const existing = await trips.findOne({ _id, ownerId: userId, deletedAt: null });
  if (!existing) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }

  const conflict = expectedUpdatedAt !== null && existing.updatedAt.toISOString() !== expectedUpdatedAt;

  const now = new Date();
  await trips.updateOne({ _id, ownerId: userId }, { $set: { ...payload, updatedAt: now } });
  const updated = await trips.findOne({ _id, ownerId: userId });
  if (!updated) {
    return Response.json({ error: "Trip was updated but could not be reloaded" }, { status: 500 });
  }

  return Response.json({ trip: toSerializedTrip(updated), conflict });
}
