/** What the header shows for the account. */
export type AccountView = "loading" | "signed-in" | "signed-out" | "unavailable";

/** next-auth's `useSession().status`. */
export type ClientSessionStatus = "loading" | "authenticated" | "unauthenticated";

/** What /api/session-state answered (see getSessionState). */
export type SessionProbe = "signed-in" | "signed-out" | "unavailable";

/** How often to ask again while the database isn't answering. */
export const ACCOUNT_RETRY_MS = 15_000;

/**
 * next-auth's "unauthenticated" covers two cases it can't tell apart: signed
 * out, and a session the database couldn't look up. The probe tells them
 * apart; until it has answered, the header shows neither a sign-in button
 * nor an account, since either might be wrong.
 */
export function accountView(status: ClientSessionStatus, probe: SessionProbe | null): AccountView {
  if (status === "authenticated") return "signed-in";
  if (status === "loading") return "loading";
  if (probe === "signed-out") return "signed-out";
  if (probe === "unavailable") return "unavailable";
  // Not answered yet, or the server sees a session that next-auth is being
  // asked to pick back up.
  return "loading";
}

/** The probe's answer, or null for a response that isn't one (an error page, a dev-server hiccup). */
export function parseSessionProbe(body: unknown): SessionProbe | null {
  const status = (body as { status?: unknown } | null)?.status;
  return status === "signed-in" || status === "signed-out" || status === "unavailable" ? status : null;
}
