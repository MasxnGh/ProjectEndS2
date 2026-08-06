import { randomBytes } from "node:crypto";

/**
 * 24 random bytes, base64url-encoded (~32 chars, no padding, URL-safe as-is)
 * — far too much entropy to guess or enumerate, unlike an ObjectId (which
 * encodes a timestamp + counter and is trivially walkable).
 */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}
