import { MAX_UPLOAD_BYTES } from "@/lib/trip-cover";

/**
 * The planner's half of uploading a cover: shrink the photo in the browser,
 * then send it. Shrinking first keeps a phone's 8 MB photo well under the
 * server's limit, and drawing it onto a canvas already drops its EXIF (the
 * server re-encodes it again either way, so that is not the only safeguard).
 */

/** Bigger than this is refused before it is even opened: decoding it could stall a phone. */
export const MAX_PICK_BYTES = 25 * 1024 * 1024;

/** Enough for the server's 1600px copy with room to spare, and quick to send. */
const SEND_LONG_EDGE = 2400;

export type CoverUploadError = "unreadable" | "too-large" | "limit" | "signed-out" | "network";

export class CoverUploadFailure extends Error {
  constructor(readonly code: CoverUploadError) {
    super(`Cover upload failed: ${code}`);
  }
}

export type ShrunkPhoto = { blob: Blob; width: number; height: number };

/** The size to draw a photo at so its longer side is at most `longEdge`. Never enlarges. */
export function fitWithin(width: number, height: number, longEdge = SEND_LONG_EDGE): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function shrinkPhoto(file: Blob): Promise<ShrunkPhoto> {
  if (file.size > MAX_PICK_BYTES) throw new CoverUploadFailure("too-large");

  let bitmap: ImageBitmap;
  try {
    // "from-image" turns a phone photo the right way up before its
    // orientation tag is lost with the rest of the metadata.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new CoverUploadFailure("unreadable");
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new CoverUploadFailure("unreadable");
    // JPEG has no transparency: a see-through PNG would otherwise turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of [0.88, 0.76, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new CoverUploadFailure("unreadable");
      if (blob.size <= MAX_UPLOAD_BYTES) return { blob, width, height };
    }
    throw new CoverUploadFailure("too-large");
  } finally {
    bitmap.close();
  }
}

/** Sends a shrunk photo and answers the new cover's id. */
export async function uploadCover(blob: Blob): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/covers", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  } catch {
    throw new CoverUploadFailure("network");
  }
  const data: unknown = await response.json().catch(() => null);
  const body = (data ?? {}) as Record<string, unknown>;
  if (response.ok && typeof body.id === "string") return body.id;
  if (body.code === "too-large" || body.code === "unreadable" || body.code === "limit") {
    throw new CoverUploadFailure(body.code);
  }
  if (response.status === 401) throw new CoverUploadFailure("signed-out");
  throw new CoverUploadFailure("network");
}
