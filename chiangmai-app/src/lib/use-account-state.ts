"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ACCOUNT_RETRY_MS,
  accountView,
  parseSessionProbe,
  type AccountView,
  type SessionProbe,
} from "./account-view";

/** null when the question couldn't be asked: offline, or an error page instead of an answer. */
async function askServer(): Promise<SessionProbe | null> {
  try {
    const res = await fetch("/api/session-state", { cache: "no-store" });
    if (!res.ok) return null;
    return parseSessionProbe(await res.json());
  } catch {
    return null;
  }
}

/**
 * The account as the header should show it.
 *
 * With database sessions, next-auth's client says "unauthenticated" both for
 * a visitor who is signed out and for one whose session the database couldn't
 * look up, and once it has said so it never asks again on its own. So when it
 * says that, this asks /api/session-state which of the two it is. While the
 * database is down it asks again every ACCOUNT_RETRY_MS (only while the page
 * is visible), and once the database answers it has next-auth fetch the
 * session again, so the header, favourites and planner sync come back without
 * a reload.
 */
export function useAccountState(): { view: AccountView; retry: () => void; retrying: boolean } {
  const { status, update } = useSession();
  const [probe, setProbe] = useState<SessionProbe | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // When next-auth was last asked to fetch the session again. If it comes
  // back still without one, the next check waits out the interval instead of
  // going straight round again.
  const reloadedSessionAt = useRef(0);

  const reloadSession = useEffectEvent(() => {
    reloadedSessionAt.current = Date.now();
    void update();
  });

  useEffect(() => {
    if (status !== "unauthenticated") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitingForPage = false;

    async function check() {
      if (document.visibilityState === "hidden") {
        waitingForPage = true;
        return;
      }
      const answer = await askServer();
      if (cancelled) return;
      setRetrying(false);
      if (answer === "signed-in") {
        // The database is back. If next-auth's own fetch fails anyway (the
        // database dropped again in between), the outage note is what should
        // show while the next check waits.
        setProbe("unavailable");
        reloadSession();
        return;
      }
      if (answer === null) {
        // Couldn't ask. Keep what was known; with nothing known, fall back
        // to what next-auth says. Ask again later either way.
        setProbe((known) => known ?? "signed-out");
        later();
        return;
      }
      setProbe(answer);
      if (answer === "unavailable") later();
    }
    function later() {
      timer = setTimeout(() => void check(), ACCOUNT_RETRY_MS);
    }
    function onVisibilityChange() {
      if (document.visibilityState !== "visible" || !waitingForPage) return;
      waitingForPage = false;
      void check();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    const sinceReload = Date.now() - reloadedSessionAt.current;
    if (sinceReload < ACCOUNT_RETRY_MS) timer = setTimeout(() => void check(), ACCOUNT_RETRY_MS - sinceReload);
    else void check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, attempt]);

  function retry() {
    reloadedSessionAt.current = 0;
    setRetrying(true);
    setAttempt((n) => n + 1);
  }

  return { view: accountView(status, probe), retry, retrying };
}
