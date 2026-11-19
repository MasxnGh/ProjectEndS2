import type { NextRequest } from "next/server";
import { rateLimitResponse, requireUserId, unauthorizedResponse } from "@/lib/api-auth";
import {
  MAX_COVERS_PER_USER,
  MAX_UPLOAD_BYTES,
  countCovers,
  processCoverImage,
  storeCover,
  sweepUnusedCovers,
} from "@/lib/db/covers";

/**
 * Uploads a photo to use as a trip cover. The body is the image itself (the
 * planner sends a JPEG it has already shrunk), not a form. Answers
 * `{ id, width, height }`; the trip picks the cover up on its next save.
 *
 * Errors carry a `code` the picker turns into a sentence:
 * too-large (413), unreadable (415), limit (409).
 */
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`covers:upload:${userId}`, { max: 10, windowMs: 60_000 });
  if (limited) return limited;

  // Before reading the body: at the limit, there is no point taking the photo.
  await sweepUnusedCovers(userId);
  if ((await countCovers(userId)) >= MAX_COVERS_PER_USER) {
    return Response.json({ error: "Too many uploaded covers", code: "limit" }, { status: 409 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return tooLarge();
  const body = await readAtMost(request, MAX_UPLOAD_BYTES);
  if (body === "too-large") return tooLarge();
  if (!body || body.length === 0) return unreadable();

  const image = await processCoverImage(body);
  if (!image) return unreadable();

  const id = await storeCover(userId, image);
  return Response.json({ id, width: image.width, height: image.height }, { status: 201 });
}

function tooLarge(): Response {
  return Response.json({ error: "Photo is too large", code: "too-large" }, { status: 413 });
}

function unreadable(): Response {
  return Response.json({ error: "Not a photo that can be read", code: "unreadable" }, { status: 415 });
}

/**
 * Reads the body but stops at `limit` bytes, so a sender that lies about (or
 * leaves out) Content-Length still cannot make the server hold more than that.
 */
async function readAtMost(request: Request, limit: number): Promise<Buffer | "too-large" | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return "too-large";
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks);
}
