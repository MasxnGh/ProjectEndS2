"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { ConfirmDialog } from "@/components/trips/confirm-dialog";
import type { SerializedTrip } from "@/lib/db/types";

/**
 * Loads `?trip=<id>` — what "Open" in My Trips links to — into the planner.
 *
 * The whole subtlety is what to do with whatever is already on the board.
 * Replacing it silently would break the one promise phase 3 makes: a plan
 * someone built must never disappear. So:
 *
 *   - board empty                → load straight away, nothing to lose
 *   - board already saved to the cloud (has remoteTripId) → load straight
 *     away; the current work is safe in the account and reachable from My Trips
 *   - board has unsaved guest work → ask first, and keep the local plan on
 *     "keep mine"
 *
 * Isolated into its own component for the same reason as PlanImportListener:
 * only this invisible piece needs the useSearchParams() Suspense boundary.
 */
export function SavedTripLoader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const { dict } = useLocale();
  const t = dict.planner.openSaved;

  const loadRemoteTrip = useTripStore((s) => s.loadRemoteTrip);
  const [pending, setPending] = useState<SerializedTrip | null>(null);
  // A ref, not state: this must not re-trigger the effect, and it has to be
  // set before any await so a re-render mid-fetch can't start a second one.
  const handledIdRef = useRef<string | null>(null);

  const clearQuery = useCallback(() => {
    // Strips ?trip= so a refresh doesn't re-open (and re-prompt for) a trip
    // the user may have since navigated away from.
    router.replace(pathname);
  }, [router, pathname]);

  useEffect(() => {
    const tripId = searchParams.get("trip");
    if (!tripId || handledIdRef.current === tripId) return;
    // Wait for the session to resolve — firing while "loading" would 401 and
    // show a spurious failure on a perfectly valid link.
    if (status === "loading") return;

    handledIdRef.current = tripId;

    if (status !== "authenticated") {
      clearQuery();
      showToast({ message: t.signInRequired });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (!res.ok) {
          showToast({ message: t.notFound });
          clearQuery();
          return;
        }
        const { trip } = (await res.json()) as { trip: SerializedTrip };

        const state = useTripStore.getState();
        const boardIsEmpty = Object.entries(state.containers).every(
          ([id, slugs]) => id === UNSCHEDULED || slugs.length === 0
        );
        const currentWorkIsSafe = boardIsEmpty || state.remoteTripId !== null;

        if (currentWorkIsSafe || state.remoteTripId === trip.id) {
          loadRemoteTrip(trip);
          showToast({ message: t.opened.replace("{title}", trip.title || dict.myTrips.untitled) });
          clearQuery();
          return;
        }

        setPending(trip);
      } catch {
        showToast({ message: t.notFound });
        clearQuery();
      }
    })();
  }, [searchParams, status, clearQuery, loadRemoteTrip, showToast, t, dict.myTrips.untitled]);

  if (!pending) return null;

  return (
    <ConfirmDialog
      title={t.replaceTitle}
      body={t.replaceBody.replace("{title}", pending.title || dict.myTrips.untitled)}
      confirmLabel={t.replaceConfirm}
      cancelLabel={t.replaceCancel}
      onConfirm={() => {
        loadRemoteTrip(pending);
        setPending(null);
        showToast({ message: t.opened.replace("{title}", pending.title || dict.myTrips.untitled) });
        clearQuery();
      }}
      onCancel={() => {
        setPending(null);
        clearQuery();
      }}
    />
  );
}
