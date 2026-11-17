import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { getMongoClient } from "@/lib/db/mongodb";

/**
 * Google is the only provider on purpose — no homegrown password system.
 * Storing/hashing/resetting passwords is a real security surface (leaked
 * DBs, weak-password reuse, reset-flow abuse) that this project doesn't
 * need to take on when OAuth covers the actual requirement.
 *
 * With an adapter present, Auth.js defaults to database-backed sessions
 * (not JWT): the cookie holds only an opaque session id, not a decodable
 * token, and the session row lives in MongoDB where signing out or an
 * account-deletion request can actually revoke it server-side.
 *
 * The adapter gets a function, not a client, so each lookup asks for the
 * shared client afresh and a failed connection is retried on the next
 * request (see getMongoClient). With no `onClose` option the adapter never
 * closes the client it is given.
 *
 * The cost of database sessions: when the database can't be reached,
 * Auth.js logs the error and answers "no session", exactly as for a signed-out
 * visitor. Pages that need an account tell the two apart with
 * getSessionState (lib/session-state.ts).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(getMongoClient),
  providers: [Google],
  trustHost: true,
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
