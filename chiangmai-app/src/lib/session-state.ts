import "server-only";

import { cookies } from "next/headers";
import type { Session } from "next-auth";
import { safeAuth } from "@/lib/auth-safe";
import { isDatabaseReachable } from "@/lib/db/mongodb";

export type SessionState =
  | { status: "signed-in"; userId: string; session: Session }
  | { status: "signed-out" }
  /** There is a session cookie, but the database that would confirm it isn't answering. */
  | { status: "unavailable" };

/**
 * Auth.js's session cookie: plain over http, `__Secure-` over https, and
 * split into `.0`, `.1`… chunks when large.
 */
const SESSION_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/;

/**
 * For pages that need an account (My Trips, Favourites, Account).
 *
 * With database sessions, Auth.js answers "no session" both when the visitor
 * is signed out and when the database can't be reached to look the session
 * up — it logs the second and moves on. Treating both as signed out is what
 * sent people to the sign-in page whenever the database had a bad moment,
 * although they were signed in all along.
 *
 * So when there is no session but the request carries a session cookie, this
 * asks the database directly. If it answers, the cookie really is stale
 * (expired, signed out elsewhere): signed out. If it doesn't, the page should
 * say so and offer a retry, not ask for a sign-in that would fail anyway.
 */
export async function getSessionState(): Promise<SessionState> {
  const session = await safeAuth();
  const userId = session?.user?.id;
  if (session && userId) return { status: "signed-in", userId, session };

  const jar = await cookies();
  const carriesSession = jar.getAll().some((cookie) => SESSION_COOKIE.test(cookie.name));
  if (!carriesSession) return { status: "signed-out" };

  return (await isDatabaseReachable()) ? { status: "signed-out" } : { status: "unavailable" };
}
