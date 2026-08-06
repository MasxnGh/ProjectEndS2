import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { clientPromise } from "@/lib/db/mongodb";

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
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
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
