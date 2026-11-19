import "server-only";

import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { Binary } from "mongodb";
import { getCoversCollection, getTripsCollection } from "@/lib/db/collections";
import { MAX_UPLOAD_BYTES, type TripCover } from "@/lib/trip-cover";

/**
 * Uploaded trip covers: how a photo is made safe to keep, who may see it,
 * and when it goes.
 *
 * - Every upload is decoded and re-encoded here, so what is stored is pixels
 *   only: sharp writes no EXIF, so the camera's GPS position, its make and
 *   the time it was taken are gone before anything reaches the database.
 * - A cover is visible to its owner, and to anyone holding the share link of
 *   a shared trip that uses it. Nobody else, not even with the id.
 * - It is deleted when no trip uses it any more (replaced, or never saved),
 *   and with everything else when the account is deleted.
 */

export { MAX_UPLOAD_BYTES };

/** Covers one person can keep at once. Generous: one per trip is the norm, and unused ones are cleared first. */
export const MAX_COVERS_PER_USER = 30;

/** The longest side of a stored cover: sharp at 1600px is about 240 dpi across the printout's band, and a few hundred KB. */
const STORED_LONG_EDGE = 1600;

/** An upload that no trip has picked up after this long was abandoned (a closed tab, a cover changed before autosave). */
const ORPHAN_AFTER_MS = 60 * 60 * 1000;

const READABLE_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

/**
 * Random, never an ObjectId: an ObjectId's timestamp and counter make the
 * next one guessable, and a guessed id should not even confirm a photo exists.
 */
export function newCoverId(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Turns whatever was uploaded into the JPEG that is stored, or null when it
 * is not a picture sharp can read. JPEG rather than WebP because Chrome puts
 * a JPEG into a PDF as it is, while a WebP gets re-encoded several times
 * larger (found printing the planner). `rotate()` applies the camera's
 * orientation before the metadata that carries it is dropped.
 */
export async function processCoverImage(
  input: Buffer,
): Promise<{ data: Buffer; width: number; height: number } | null> {
  try {
    // 50 megapixels covers any phone camera; the limit stops a tiny file that
    // claims to be enormous from taking the server's memory.
    const image = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" });
    const meta = await image.metadata();
    if (!meta.format || !READABLE_FORMATS.has(meta.format)) return null;
    const { data, info } = await image
      .rotate()
      .resize({ width: STORED_LONG_EDGE, height: STORED_LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** Stores a processed cover for its owner and returns its id. */
export async function storeCover(
  ownerId: string,
  image: { data: Buffer; width: number; height: number },
): Promise<string> {
  const covers = await getCoversCollection();
  const _id = newCoverId();
  await covers.insertOne({
    _id,
    ownerId,
    data: new Binary(image.data),
    contentType: "image/jpeg",
    width: image.width,
    height: image.height,
    bytes: image.data.length,
    createdAt: new Date(),
  });
  return _id;
}

/**
 * Deletes the owner's uploads that no trip uses and that are old enough to
 * have been abandoned. Deleted trips still count as using theirs: they can be
 * restored at any time.
 */
export async function sweepUnusedCovers(ownerId: string, now = new Date()): Promise<number> {
  const covers = await getCoversCollection();
  const trips = await getTripsCollection();
  const old = await covers
    .find({ ownerId, createdAt: { $lt: new Date(now.getTime() - ORPHAN_AFTER_MS) } }, { projection: { _id: 1 } })
    .toArray();
  if (old.length === 0) return 0;
  const ids = old.map((doc) => doc._id);
  const used = new Set(await trips.distinct("cover.id", { "cover.id": { $in: ids } }));
  const unused = ids.filter((id) => !used.has(id));
  if (unused.length === 0) return 0;
  const result = await covers.deleteMany({ _id: { $in: unused }, ownerId });
  return result.deletedCount ?? 0;
}

export async function countCovers(ownerId: string): Promise<number> {
  const covers = await getCoversCollection();
  return covers.countDocuments({ ownerId });
}

/** Deletes an uploaded cover once no trip (deleted ones included) uses it. */
export async function deleteCoverIfUnused(id: string): Promise<void> {
  const trips = await getTripsCollection();
  if (await trips.findOne({ "cover.id": id }, { projection: { _id: 1 } })) return;
  const covers = await getCoversCollection();
  await covers.deleteOne({ _id: id });
}

/**
 * A trip may only point at an upload its owner made. Anything else becomes
 * the automatic cover rather than an error: a plan kept on a device through a
 * sign-out still carries the previous account's cover id, and a 400 there
 * would stop that plan from ever saving.
 */
export async function vetCoverForOwner<T extends TripCover | null | undefined>(
  cover: T,
  ownerId: string,
): Promise<T | null> {
  if (!cover || cover.kind !== "upload") return cover;
  const covers = await getCoversCollection();
  const mine = await covers.findOne({ _id: cover.id, ownerId }, { projection: { _id: 1 } });
  return mine ? cover : null;
}

/**
 * Whether this caller may see an uploaded cover: its owner, or anyone, when a
 * shared trip that is still shared uses it (the share page shows it to
 * whoever holds the link).
 */
export async function findViewableCover(id: string, userId: string | null) {
  const covers = await getCoversCollection();
  const doc = await covers.findOne({ _id: id });
  if (!doc) return null;
  if (userId && doc.ownerId === userId) return doc;
  const trips = await getTripsCollection();
  const shared = await trips.findOne(
    { "cover.id": id, visibility: "unlisted", deletedAt: null },
    { projection: { _id: 1 } },
  );
  return shared ? doc : null;
}

/**
 * "Copy to my trips" from someone else's share link: the copy gets its own
 * copy of the photo, owned by the new owner, so it survives the original
 * being changed, unshared or deleted with its account. null when the source
 * is gone or the new owner is at the limit; the copy then uses the
 * automatic cover.
 */
export async function copyCoverFor(id: string, newOwnerId: string): Promise<string | null> {
  const covers = await getCoversCollection();
  const source = await covers.findOne({ _id: id });
  if (!source) return null;
  if (source.ownerId === newOwnerId) return id;
  await sweepUnusedCovers(newOwnerId);
  if ((await countCovers(newOwnerId)) >= MAX_COVERS_PER_USER) return null;
  const _id = newCoverId();
  await covers.insertOne({ ...source, _id, ownerId: newOwnerId, createdAt: new Date() });
  return _id;
}
