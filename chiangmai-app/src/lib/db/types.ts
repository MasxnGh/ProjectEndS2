import type { Binary, ObjectId } from "mongodb";
import type { TripDay, TravelMode } from "@/data/types";
import type { PackingItem } from "@/lib/trip-store";
import { cleanCover, isTripCover, type TripCover } from "@/lib/trip-cover";

export type TripVisibility = "private" | "unlisted";

/**
 * The `trips` collection. `days` reuses the planner's own canonical
 * TripDay/TripStop shape (data/types.ts) rather than the Zustand store's
 * editing-optimized dayIds/containers indirection — the store's own comment
 * on buildTripSnapshot() already establishes that shape as what downstream
 * consumers (routing, scheduling, and now persistence) should read/write,
 * keeping the in-browser editing structure free to evolve independently.
 *
 * travelers/budgetThb/accommodationThb/packingItems aren't in the phase-1
 * field list as written, but they're real planner state a guest can build
 * up — omitting them would silently drop data on the guest→account
 * migration in phase 3, which the brief treats as the single worst failure
 * mode of this feature. Flagged here for visibility, not slipped in quietly.
 */
export interface TripDoc {
  _id: ObjectId;
  ownerId: string;
  title: string;
  startDate: string | null;
  baseLocation: { lat: number; lng: number; label: string } | null;
  days: TripDay[];
  travelMode: TravelMode;
  travelers: number;
  budgetThb: number;
  accommodationThb: number;
  packingItems: PackingItem[];
  /** The picture at the top of the trip. Absent on trips saved before covers existed, which reads the same as null: the automatic cover. */
  cover?: TripCover | null;
  /** Random, unguessable — never the document's own _id (an ObjectId's timestamp/counter structure makes it enumerable). Generated with crypto.randomBytes; see lib/db/share-token.ts. */
  shareToken: string;
  visibility: TripVisibility;
  createdAt: Date;
  updatedAt: Date;
  /** Soft delete for My Trips' undo window — null while active. A trip with deletedAt set must be excluded from every read path except the undo flow itself. */
  deletedAt: Date | null;
}

/**
 * The `trip_covers` collection: a photo a signed-in traveller uploaded as a
 * trip's cover, already resized and re-encoded (lib/db/covers.ts), so the
 * camera's GPS position and other metadata never reach the database. The
 * trip refers to it by `_id` (random, never an ObjectId: see newCoverId).
 * Several of one owner's trips can share it (a duplicated trip does).
 */
export interface CoverDoc {
  _id: string;
  ownerId: string;
  data: Binary;
  contentType: "image/jpeg";
  width: number;
  height: number;
  bytes: number;
  createdAt: Date;
}

/** The `favorites` collection — one document per (user, place) pair. */
export interface FavoriteDoc {
  _id: ObjectId;
  userId: string;
  placeSlug: string;
  createdAt: Date;
}

/**
 * JSON-safe shape for sending a trip to the client (or receiving one back):
 * ObjectId → string, Date → ISO string. Every API route that returns a
 * TripDoc should return this instead, so client code never needs to know
 * about MongoDB's types at all.
 */
export interface SerializedTrip {
  id: string;
  ownerId: string;
  title: string;
  startDate: string | null;
  baseLocation: { lat: number; lng: number; label: string } | null;
  days: TripDay[];
  travelMode: TravelMode;
  travelers: number;
  budgetThb: number;
  accommodationThb: number;
  packingItems: PackingItem[];
  cover: TripCover | null;
  shareToken: string;
  visibility: TripVisibility;
  createdAt: string;
  updatedAt: string;
}

/** Converts a DB document to the client-safe shape. Never include deletedAt — a client has no legitimate use for it, and a soft-deleted trip should never reach this function in the first place (filter it out in the query). */
export function toSerializedTrip(doc: TripDoc): SerializedTrip {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    startDate: doc.startDate,
    baseLocation: doc.baseLocation,
    days: doc.days,
    travelMode: doc.travelMode,
    travelers: doc.travelers,
    budgetThb: doc.budgetThb,
    accommodationThb: doc.accommodationThb,
    packingItems: doc.packingItems,
    cover: doc.cover ?? null,
    shareToken: doc.shareToken,
    visibility: doc.visibility,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** The subset of a trip a client is allowed to write — everything except server-managed fields (ownerId, shareToken, visibility, timestamps, soft-delete). Shared type, no runtime mongodb dependency, so it's safe to import from client code too. */
export interface TripWritablePayload {
  title: string;
  startDate: string | null;
  baseLocation: { lat: number; lng: number; label: string } | null;
  days: TripDay[];
  travelMode: TravelMode;
  travelers: number;
  budgetThb: number;
  accommodationThb: number;
  packingItems: PackingItem[];
  /** Optional so a client from before covers existed can still save: left out, the saved cover stays as it is. */
  cover?: TripCover | null;
}

const TRAVEL_MODES: TravelMode[] = ["walk", "songthaew", "grab", "rented-bike", "rented-car"];

/**
 * Deliberately manual/structural rather than a schema library — matches
 * this codebase's existing convention (see the Route Handlers under
 * lib/routing) of hand-written type guards instead of adding a validation
 * dependency. Returns null on anything malformed; callers respond 400.
 */
export function parseTripWritablePayload(body: unknown): TripWritablePayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string") return null;
  if (b.startDate !== null && typeof b.startDate !== "string") return null;
  if (
    b.baseLocation !== null &&
    (typeof b.baseLocation !== "object" ||
      typeof (b.baseLocation as Record<string, unknown>)?.lat !== "number" ||
      typeof (b.baseLocation as Record<string, unknown>)?.lng !== "number" ||
      typeof (b.baseLocation as Record<string, unknown>)?.label !== "string")
  ) {
    return null;
  }
  if (!Array.isArray(b.days)) return null;
  for (const day of b.days) {
    if (!day || typeof day !== "object") return null;
    const d = day as Record<string, unknown>;
    if (d.date !== null && typeof d.date !== "string") return null;
    if (!Array.isArray(d.stops)) return null;
    for (const stop of d.stops) {
      if (!stop || typeof stop !== "object") return null;
      const s = stop as Record<string, unknown>;
      if (typeof s.placeSlug !== "string") return null;
      if (s.plannedArrival !== null && typeof s.plannedArrival !== "string") return null;
      if (typeof s.userLocked !== "boolean") return null;
    }
  }
  if (typeof b.travelMode !== "string" || !TRAVEL_MODES.includes(b.travelMode as TravelMode)) return null;
  if (typeof b.travelers !== "number" || b.travelers < 1) return null;
  if (typeof b.budgetThb !== "number" || b.budgetThb < 0) return null;
  if (typeof b.accommodationThb !== "number" || b.accommodationThb < 0) return null;
  if (!Array.isArray(b.packingItems)) return null;
  for (const item of b.packingItems) {
    if (!item || typeof item !== "object") return null;
    const p = item as Record<string, unknown>;
    if (typeof p.id !== "string" || typeof p.checked !== "boolean") return null;
  }
  if (b.cover !== undefined && b.cover !== null && !isTripCover(b.cover)) return null;

  return {
    title: b.title,
    startDate: b.startDate as string | null,
    baseLocation: b.baseLocation as TripWritablePayload["baseLocation"],
    days: b.days as TripDay[],
    travelMode: b.travelMode as TravelMode,
    travelers: b.travelers,
    budgetThb: b.budgetThb,
    accommodationThb: b.accommodationThb,
    packingItems: b.packingItems as PackingItem[],
    // Only when sent: an `undefined` here would reach MongoDB's $set as null
    // and wipe the cover of a trip saved by an older client. Rebuilt rather
    // than passed through, so nothing else a client adds gets stored.
    ...(b.cover !== undefined ? { cover: b.cover === null ? null : cleanCover(b.cover as TripCover) } : {}),
  };
}
