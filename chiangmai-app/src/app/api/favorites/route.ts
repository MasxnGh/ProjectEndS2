import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getFavoritesCollection } from "@/lib/db/collections";
import { getPlaceBySlug } from "@/data/places";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/**
 * Returns just the slugs, not hydrated places: the catalogue already ships in
 * the client bundle, so sending place data back would duplicate several
 * kilobytes the browser can look up locally by slug.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const favorites = await getFavoritesCollection();
  const docs = await favorites.find({ userId }).sort({ createdAt: -1 }).toArray();

  return Response.json({ slugs: docs.map((doc) => doc.placeSlug) });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`favorites:write:${userId}`, { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => null);
  const placeSlug = (body as Record<string, unknown> | null)?.placeSlug;
  if (typeof placeSlug !== "string" || !placeSlug) {
    return Response.json({ error: "placeSlug is required" }, { status: 400 });
  }

  // Validated against the catalogue so the collection can't accumulate
  // favourites for places that don't exist — the Favorites page resolves
  // every slug through getPlaceBySlug and would silently drop them anyway.
  if (!getPlaceBySlug(placeSlug)) {
    return Response.json({ error: "Unknown place" }, { status: 400 });
  }

  const favorites = await getFavoritesCollection();
  // Upsert rather than insert: the compound unique index on
  // (userId, placeSlug) makes a duplicate insert throw, and a double-click or
  // a retried request is a normal thing to happen, not an error worth
  // surfacing. This makes favouriting idempotent.
  await favorites.updateOne(
    { userId, placeSlug },
    { $setOnInsert: { _id: new ObjectId(), userId, placeSlug, createdAt: new Date() } },
    { upsert: true }
  );

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`favorites:write:${userId}`, { max: 60, windowMs: 60_000 });
  if (limited) return limited;

  const placeSlug = new URL(request.url).searchParams.get("placeSlug");
  if (!placeSlug) {
    return Response.json({ error: "placeSlug is required" }, { status: 400 });
  }

  const favorites = await getFavoritesCollection();
  // Scoped by userId, so one user can never delete another's favourite even
  // by guessing a slug — the slug alone is not a key here.
  await favorites.deleteOne({ userId, placeSlug });

  // Deleting something already gone is success, not 404: the desired end
  // state ("not a favourite") holds either way, and an optimistic UI that
  // retries must not be punished for it.
  return Response.json({ ok: true });
}
