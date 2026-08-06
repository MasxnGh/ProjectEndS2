import { MongoClient } from "mongodb";

/**
 * Vercel serverless functions can reuse a "warm" instance across nearby
 * invocations, but each fresh module evaluation would otherwise open a new
 * MongoClient — with Atlas M0's low connection ceiling, a burst of cold
 * starts exhausts it in seconds. Caching the client (and, in dev, surviving
 * Next.js's module-reload-on-save via Fast Refresh) on `globalThis` means
 * the same instance — and its internal connection pool — is reused for the
 * lifetime of the warm function/process instead of opening a new one per
 * request. This is the pattern MongoDB's own Next.js integration guide
 * recommends for exactly this reason.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Returns a rejected promise instead of throwing synchronously when the URI
 * is missing. This module is imported by src/auth.ts, which the root layout
 * calls on every single page — a synchronous throw here would take down
 * guest-mode pages too, not just the auth-dependent ones. A rejected
 * promise only surfaces to whoever actually awaits it (auth(), or a
 * trips/favorites route), which is exactly where "the database isn't
 * configured" should be handled, not at import time.
 */
function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error(
        "MONGODB_URI is not set. Copy .env.local.example to .env.local and fill in your Atlas connection string — see docs/setup.md."
      )
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export const clientPromise: Promise<MongoClient> = (globalThis._mongoClientPromise ??=
  createClientPromise());

// Without this, an unconfigured MONGODB_URI produces an unhandled promise
// rejection the moment this module loads (before anything actually awaits
// clientPromise) — Node treats that as fatal. This no-op catch keeps the
// process alive; real callers still see the rejection through their own
// await/catch, since attaching one handler doesn't consume it for others.
clientPromise.catch(() => {});

/** The database named in the connection string's path segment (see MONGODB_URI in .env.local.example). */
export async function getDb() {
  const client = await clientPromise;
  return client.db();
}
