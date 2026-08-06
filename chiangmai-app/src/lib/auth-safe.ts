import { auth } from "@/auth";

/**
 * Wraps auth() so a database outage or a missing MONGODB_URI degrades the
 * whole site to "signed out" instead of crashing every page — guest mode
 * must never depend on the database being reachable. Used anywhere auth()
 * would otherwise run unconditionally on a page guests rely on (the root
 * layout, in particular).
 */
export async function safeAuth() {
  try {
    return await auth();
  } catch (err) {
    console.error("auth() failed — treating the request as signed-out", err);
    return null;
  }
}
