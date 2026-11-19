import type { NextRequest } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { findViewableCover } from "@/lib/db/covers";
import { UPLOAD_ID } from "@/lib/trip-cover";

/**
 * Serves an uploaded cover to its owner, or to anyone viewing a shared trip
 * that uses it (lib/db/covers.ts, findViewableCover). Everyone else gets the
 * same 404 as for an id that never existed, so an id alone confirms nothing.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UPLOAD_ID.test(id)) return notFound();

  // A share page is often opened signed out, and a broken session lookup
  // should not hide a photo that the share link alone is enough to see.
  let userId: string | null = null;
  try {
    userId = await requireUserId();
  } catch {
    userId = null;
  }

  const doc = await findViewableCover(id, userId);
  if (!doc) return notFound();

  // A copy, so the body is a plain ArrayBuffer-backed view of exactly the
  // photo's bytes (a Binary's buffer can run past its content).
  const bytes = new Uint8Array(doc.data.value());
  return new Response(bytes, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(bytes.byteLength),
      // An id never changes what it shows (a new photo gets a new id), so the
      // browser can keep it; "private" keeps it out of shared caches, since
      // who may see it depends on the viewer.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
