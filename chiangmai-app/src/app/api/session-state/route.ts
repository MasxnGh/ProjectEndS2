import { getSessionState } from "@/lib/session-state";

/**
 * Whether the visitor is signed in, signed out, or carries a session the
 * database can't confirm right now (see getSessionState). The header asks
 * this when next-auth reports no session, because next-auth reports a
 * database outage the same way it reports signing out.
 *
 * Only the status goes back, never the session itself. It lives outside
 * /api/auth, which Auth.js's catch-all route owns.
 */
export async function GET() {
  const { status } = await getSessionState();
  return Response.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
}
