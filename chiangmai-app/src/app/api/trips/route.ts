import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getTripsCollection } from "@/lib/db/collections";
import { generateShareToken } from "@/lib/db/share-token";
import { parseTripWritablePayload, toSerializedTrip } from "@/lib/db/types";
import { checkRateLimit } from "@/lib/rate-limit";

// Session-derived, never client-sent — see auth.ts's callback that puts the
// adapter's user.id onto session.user.id. Every route in this file trusts
// only this value for ownerId, never anything from the request body.
async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const trips = await getTripsCollection();
  const docs = await trips
    .find({ ownerId: userId, deletedAt: null })
    .sort({ updatedAt: -1 })
    .toArray();

  return Response.json({ trips: docs.map(toSerializedTrip) });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`trips:create:${userId}`, { max: 20, windowMs: 60_000 });
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

  const payload = parseTripWritablePayload(body);
  if (!payload) {
    return Response.json({ error: "Malformed trip payload" }, { status: 400 });
  }

  const now = new Date();
  const trips = await getTripsCollection();
  // Constructed explicitly (rather than letting insertOne generate it) —
  // this driver/TS combination doesn't infer the optional-_id overload of
  // insertOne here, and building the full doc upfront also saves a
  // round-trip findOne to read back what we already know we just wrote.
  const doc = {
    _id: new ObjectId(),
    ...payload,
    ownerId: userId,
    shareToken: generateShareToken(),
    visibility: "private" as const,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await trips.insertOne(doc);

  return Response.json({ trip: toSerializedTrip(doc) }, { status: 201 });
}
