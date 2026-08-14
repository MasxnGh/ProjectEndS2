import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getTripsCollection } from "@/lib/db/collections";
import { parseTripWritablePayload, toSerializedTrip } from "@/lib/db/types";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/** Reads one trip the caller owns — what "Open" in My Trips loads into the planner. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const trips = await getTripsCollection();
  const doc = await trips.findOne({ _id: new ObjectId(id), ownerId: userId, deletedAt: null });
  if (!doc) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  return Response.json({ trip: toSerializedTrip(doc) });
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
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const limited = rateLimitResponse(`trips:update:${userId}`, { max: 60, windowMs: 60_000 });
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

/**
 * Soft delete: stamps `deletedAt` so every read path (which all filter on
 * `deletedAt: null`) stops returning it, while the document itself survives
 * for the undo window in My Trips. A hard delete here would make "undo"
 * impossible to honour, and the brief asks for one.
 *
 * Deleting an already-deleted trip is treated as not found rather than as an
 * error to re-stamp — that would move the undo window and, worse, would let a
 * double-click quietly extend it.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const limited = rateLimitResponse(`trips:delete:${userId}`, { max: 30, windowMs: 60_000 });
  if (limited) return limited;

  const trips = await getTripsCollection();
  const result = await trips.updateOne(
    { _id: new ObjectId(id), ownerId: userId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
