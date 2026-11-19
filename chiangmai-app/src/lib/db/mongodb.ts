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
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoLastFailure: { at: number; error: unknown } | undefined;
}

/**
 * How long a query waits for a reachable server before it fails. The
 * driver's default is 30 seconds, which turns a database outage into pages
 * that hang for half a minute before showing anything. Five is far more
 * than a healthy Atlas round trip needs, even from a cold start.
 */
export const SERVER_SELECTION_TIMEOUT_MS = 5_000;

/**
 * How long a failed connect stands as the answer before the next call tries
 * again. One page asks for the database more than once (the session, then
 * the check that tells "signed out" from "unreachable"); without this each
 * of those would wait out its own timeout, back to back.
 */
export const FAILURE_MEMORY_MS = 2_000;

/**
 * Rejects instead of throwing synchronously when the URI is missing, so
 * "the database isn't configured" surfaces only to whoever actually needs
 * the database (auth(), or a trips/favorites route) and never takes down
 * guest pages at import time.
 */
function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error(
        "MONGODB_URI is not set. Copy .env.local.example to .env.local and fill in your Atlas connection string — see docs/setup.md."
      )
    );
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
  return client.connect().catch(async (error: unknown) => {
    await client.close().catch(() => {});
    throw error;
  });
}

/**
 * The shared, connected client. Callers that arrive while a connection is
 * being made all wait on that one attempt.
 *
 * A failed attempt is not kept: after FAILURE_MEMORY_MS the next call tries
 * again. Keeping it would turn one bad moment — Wi-Fi switching, a laptop
 * waking up, Atlas failing over — into an outage that lasts until the server
 * is restarted, with every visitor treated as signed out the whole time.
 */
export function getMongoClient(): Promise<MongoClient> {
  const pending = globalThis._mongoClientPromise;
  if (pending) return pending;

  const failure = globalThis._mongoLastFailure;
  if (failure && Date.now() - failure.at < FAILURE_MEMORY_MS) return Promise.reject(failure.error);

  const attempt: Promise<MongoClient> = connect().then(
    (client) => {
      globalThis._mongoLastFailure = undefined;
      return client;
    },
    (error: unknown) => {
      if (globalThis._mongoClientPromise === attempt) globalThis._mongoClientPromise = undefined;
      globalThis._mongoLastFailure = { at: Date.now(), error };
      throw error;
    },
  );
  globalThis._mongoClientPromise = attempt;
  return attempt;
}

/**
 * Where everything lives when the connection string doesn't name a
 * database. Left to itself the driver falls back to `test`, and the string
 * Atlas's "Connect" dialog hands out has no database in it, which is how
 * the deployed site's favourites and trips ended up in `test`.
 */
export const DEFAULT_DATABASE = "chiangmai-journey";

/**
 * The database named in the connection string's path, or DEFAULT_DATABASE.
 * Shared by getDb() and the Auth.js adapter so accounts and the data they
 * own can't end up in different databases.
 */
export function databaseName(uri = process.env.MONGODB_URI): string {
  if (!uri) return DEFAULT_DATABASE;
  // Reserved characters in credentials or the name must be percent-encoded
  // in a valid URI, so the first "?" starts the options and the first "/"
  // after the credentials ends the host list. A trailing "/" (".../name/")
  // is dropped: the driver would keep it, and "name/" is not the database
  // anyone meant.
  const [beforeQuery] = uri.split("?");
  const afterScheme = beforeQuery.slice(beforeQuery.indexOf("://") + 3);
  const hostsEnd = afterScheme.indexOf("/", afterScheme.lastIndexOf("@") + 1);
  const path = hostsEnd === -1 ? "" : afterScheme.slice(hostsEnd + 1).replace(/\/+$/, "");
  return path ? decodeURIComponent(path) : DEFAULT_DATABASE;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(databaseName());
}

/**
 * Whether the database answers right now. Used to tell "this session is not
 * valid" apart from "the session could not be looked up", which Auth.js
 * reports the same way.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
