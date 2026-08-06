import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { TripDoc, FavoriteDoc } from "./types";

/**
 * `createIndex` is idempotent (a no-op if the same spec already exists), so
 * running this on first use per warm instance — rather than requiring a
 * separate migration step — is safe and keeps setup to "just add
 * MONGODB_URI". Memoized so it only actually runs once per warm instance,
 * not once per request.
 */
let indexesReady: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.collection<TripDoc>("trips").createIndex({ ownerId: 1 }),
    db.collection<TripDoc>("trips").createIndex({ shareToken: 1 }, { unique: true }),
    db.collection<FavoriteDoc>("favorites").createIndex({ userId: 1, placeSlug: 1 }, { unique: true }),
  ]);
}

function ensureIndexesOnce(): Promise<void> {
  return (indexesReady ??= ensureIndexes());
}

export async function getTripsCollection(): Promise<Collection<TripDoc>> {
  await ensureIndexesOnce();
  const db = await getDb();
  return db.collection<TripDoc>("trips");
}

export async function getFavoritesCollection(): Promise<Collection<FavoriteDoc>> {
  await ensureIndexesOnce();
  const db = await getDb();
  return db.collection<FavoriteDoc>("favorites");
}
