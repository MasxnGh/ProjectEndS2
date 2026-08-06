"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Deliberately kept out of the server-rendered layout tree's data path:
 * this only wraps children in client-side session context (fetches
 * /api/auth/session in the browser after mount) rather than calling auth()
 * server-side in the shared layout. Calling auth() there would pull in
 * headers()/cookies(), which forces every page using that layout — guides,
 * place details, the home page — out of static generation and into
 * per-request dynamic rendering, just so the nav bar can know whether to
 * show "Sign in" or an avatar. The cost is a brief render where the nav
 * shows its signed-out default before the real session resolves, which is
 * a better trade for a mostly-static, editorial content site than losing
 * static generation everywhere.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
