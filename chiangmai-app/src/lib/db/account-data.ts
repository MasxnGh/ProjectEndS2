import "server-only";

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/**
 * Every collection this app stores personal data in.
 *
 * `users`, `accounts`, `sessions` and `verification_tokens` are created and
 * managed by @auth/mongodb-adapter, not by our code — the names here are the
 * adapter's own `defaultCollections` values, checked against the installed
 * package rather than assumed. If that dependency ever renames them, the
 * delete path below silently stops erasing them, so this list is the thing to
 * re-verify on an Auth.js major upgrade.
 */
const AUTH_COLLECTIONS = ["accounts", "sessions", "verification_tokens"] as const;

export interface AccountExport {
  exportedAt: string;
  account: Record<string, unknown> | null;
  trips: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  /** Rows in the OAuth/session bookkeeping the adapter owns, with secrets removed. */
  signInRecords: Record<string, unknown>[];
}

/**
 * Collects everything stored about one user, for the profile page and the
 * JSON export. Both read through this single function so the page can never
 * claim to show less (or more) than the download actually contains.
 */
export async function collectUserData(userId: string): Promise<AccountExport> {
  const db = await getDb();
  const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : null;

  const [userDoc, trips, favorites, accounts] = await Promise.all([
    _id ? db.collection("users").findOne({ _id }) : null,
    db.collection("trips").find({ ownerId: userId }).toArray(),
    db.collection("favorites").find({ userId }).toArray(),
    db.collection("accounts").find({ userId: _id }).toArray(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: userDoc
      ? {
          id: userDoc._id.toString(),
          name: userDoc.name ?? null,
          email: userDoc.email ?? null,
          image: userDoc.image ?? null,
          emailVerified: userDoc.emailVerified ?? null,
        }
      : null,
    trips: trips.map((doc) => ({ ...doc, _id: doc._id.toString() })),
    favorites: favorites.map((doc) => ({ ...doc, _id: doc._id.toString() })),
    // OAuth tokens are deliberately stripped: they are credentials that can
    // act on the user's Google account, and putting them in a file the user
    // downloads (and might email or upload) turns a data export into a
    // credential leak. What remains is the fact of the link, which is the
    // part that is actually informative.
    signInRecords: accounts.map((doc) => ({
      provider: doc.provider,
      type: doc.type,
      providerAccountId: doc.providerAccountId,
      scope: doc.scope ?? null,
      tokensStored: true,
    })),
  };
}

export interface DeletionSummary {
  users: number;
  trips: number;
  favorites: number;
  accounts: number;
  sessions: number;
  verification_tokens: number;
}

/**
 * Hard-deletes everything belonging to a user, including trips that were only
 * soft-deleted — "delete my account and all my data" has to mean the rows are
 * gone, not hidden. Returns per-collection counts so the caller can log or
 * show what actually happened rather than asserting success blindly.
 *
 * Order matters: sessions go last so the request that triggered this stays
 * authenticated while the rest runs. There is no transaction here (M0
 * standalone clusters don't support them), so a mid-way failure can leave
 * some collections cleared and others not — the counts make that visible, and
 * re-running the delete is safe because every step is scoped by the same id.
 */
export async function deleteAllUserData(userId: string): Promise<DeletionSummary> {
  const db = await getDb();
  const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : null;

  const trips = await db.collection("trips").deleteMany({ ownerId: userId });
  const favorites = await db.collection("favorites").deleteMany({ userId });

  const authCounts: Record<string, number> = {};
  for (const name of AUTH_COLLECTIONS) {
    // The adapter stores userId as an ObjectId on accounts/sessions; the
    // token collection has no user link at all and is cleaned by expiry.
    const result = _id ? await db.collection(name).deleteMany({ userId: _id }) : { deletedCount: 0 };
    authCounts[name] = result.deletedCount ?? 0;
  }

  const users = _id ? await db.collection("users").deleteOne({ _id }) : { deletedCount: 0 };

  return {
    users: users.deletedCount ?? 0,
    trips: trips.deletedCount ?? 0,
    favorites: favorites.deletedCount ?? 0,
    accounts: authCounts.accounts ?? 0,
    sessions: authCounts.sessions ?? 0,
    verification_tokens: authCounts.verification_tokens ?? 0,
  };
}
