import type { NextRequest } from "next/server";
import { deleteAllUserData } from "@/lib/db/account-data";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/**
 * Deletes the account and everything attached to it. Irreversible by design —
 * there is no soft-delete here, because "delete my data" that quietly keeps a
 * copy is not deletion.
 *
 * The client must send `{ confirm: "DELETE" }`. That is not security (the
 * session is what authorises this); it is a guard against a stray fetch or a
 * mis-wired button erasing an account with an empty body.
 */
export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`account:delete:${userId}`, { max: 3, windowMs: 60_000 });
  if (limited) return limited;

  const body: unknown = await request.json().catch(() => null);
  if ((body as Record<string, unknown> | null)?.confirm !== "DELETE") {
    return Response.json({ error: "Confirmation required" }, { status: 400 });
  }

  const deleted = await deleteAllUserData(userId);

  // Returned so the UI can state what was actually removed rather than a bare
  // "done". The session row is gone, so the cookie the browser still holds no
  // longer resolves to anything — the client calls signOut() to clear it.
  return Response.json({ deleted });
}
