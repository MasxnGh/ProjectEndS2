import { getPlacePhoto } from "@/data/photo-manifest";
import type { TripDay } from "@/data/types";

/**
 * The picture at the top of a trip: in the planner, on its My Trips card, on
 * its share page and on the printout's first sheet.
 *
 * Either one of the site's own place photographs, named by the place's slug,
 * or a photo the traveller uploaded (signed in only), named by its id and
 * shown from `focusY` percent down. No cover (null, or a trip saved before
 * covers existed) means "pick one for me": the first place in the plan that
 * has a photograph.
 */
export type PlaceCover = { kind: "place"; slug: string };
export type UploadCover = { kind: "upload"; id: string; focusY: number };
export type TripCover = PlaceCover | UploadCover;

const SLUG = /^[a-z0-9-]{1,100}$/;

/** An uploaded cover's id: 16 random bytes, base64url (lib/db/covers.ts). */
export const UPLOAD_ID = /^[A-Za-z0-9_-]{22}$/;

/**
 * The most the upload route reads. The planner shrinks a photo well below it
 * first (lib/cover-upload.ts); the limit is what stops anything else, and it
 * sits under Vercel's 4.5 MB cap on a request body.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Where an uploaded cover is served from (app/api/covers/[id]). */
export function uploadedCoverUrl(id: string): string {
  return `/api/covers/${id}`;
}

/**
 * A cover from outside the app (an API body). Only the shape is checked, not
 * whether the place still has a photo: a photo taken off the site later would
 * otherwise turn every save of that trip into a 400. A cover whose photo is
 * gone falls back to the automatic one when it is drawn (coverSlug). Whether
 * an uploaded cover belongs to the caller is the server's check, not this one.
 */
export function isTripCover(value: unknown): value is TripCover {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.kind === "place") return typeof v.slug === "string" && SLUG.test(v.slug);
  if (v.kind === "upload") {
    return (
      typeof v.id === "string" &&
      UPLOAD_ID.test(v.id) &&
      typeof v.focusY === "number" &&
      Number.isFinite(v.focusY) &&
      v.focusY >= 0 &&
      v.focusY <= 100
    );
  }
  return false;
}

/** A checked cover with nothing else on it: what gets stored. */
export function cleanCover(cover: TripCover): TripCover {
  return cover.kind === "place"
    ? { kind: "place", slug: cover.slug }
    : { kind: "upload", id: cover.id, focusY: Math.round(cover.focusY) };
}

/** A saved trip's stops, day by day, in order: what its automatic cover is chosen from. */
export function tripStopSlugs(days: readonly TripDay[]): string[] {
  return days.flatMap((day) => day.stops.map((stop) => stop.placeSlug));
}

/** The first place in `planSlugs` (the plan's stops in order) that has a photo. */
export function autoCoverSlug(planSlugs: readonly string[]): string | null {
  return planSlugs.find((slug) => getPlacePhoto(slug)) ?? null;
}

/**
 * The place whose photo the cover shows: the chosen one while it has a photo,
 * otherwise the automatic one. null when nothing in the plan has a photo
 * either. For an uploaded cover this is the place to fall back to if the
 * upload cannot be shown.
 */
export function coverSlug(cover: TripCover | null | undefined, planSlugs: readonly string[]): string | null {
  if (cover?.kind === "place" && getPlacePhoto(cover.slug)) return cover.slug;
  return autoCoverSlug(planSlugs);
}

/**
 * What to draw: the uploaded photo, or a place cover that is sure to have a
 * photo (the chosen one, or the automatic one). null when there is nothing.
 */
export function shownCover(cover: TripCover | null | undefined, planSlugs: readonly string[]): TripCover | null {
  if (cover?.kind === "upload") return cover;
  const slug = coverSlug(cover, planSlugs);
  return slug ? { kind: "place", slug } : null;
}
