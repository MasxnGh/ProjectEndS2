"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";
import type { SerializedTrip } from "@/lib/db/types";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { fill } from "@/components/brand/place-text";

/**
 * This device has a plan that was never saved, and the account just signed
 * into already has a trip. Closing without choosing changes nothing: the plan
 * here stays as it is, and saving again asks again.
 */
export function MigrationChoiceDialog({
  open,
  existingTripTitle,
  onClose,
  onSaveAsNew,
  onReplaceExisting,
}: {
  open: boolean;
  existingTripTitle: string;
  onClose: () => void;
  onSaveAsNew: () => void;
  onReplaceExisting: () => void;
}) {
  const { dict } = useLocale();
  const titleId = useId();
  const copy = dict.auth.migrationChoice;
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="text-title font-semibold text-pretty text-brand">
        {copy.title}
      </h2>
      <p className="mt-2 text-body text-pretty text-ink-soft">{copy.body}</p>
      <div className="mt-6 grid gap-2">
        <Button onClick={onSaveAsNew} className="w-full justify-center" data-autofocus>
          {copy.saveAsNewCta}
        </Button>
        <Button variant="secondary" onClick={onReplaceExisting} className="h-auto min-h-12 w-full justify-center py-3 text-pretty">
          {fill(copy.replaceCta, { title: existingTripTitle })}
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full justify-center">
          {copy.close}
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * Opens `?trip=<id>` (My Trips → Open) into the planner. Logic unchanged from
 * the old loader: an empty plan, or one already saved to the account, is
 * replaced at once; unsaved work here asks first, and "keep mine" keeps it.
 */
export function SavedTripLoader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const { dict } = useLocale();
  const t = dict.planner.openSaved;
  const titleId = useId();

  const loadRemoteTrip = useTripStore((s) => s.loadRemoteTrip);
  const [pending, setPending] = useState<SerializedTrip | null>(null);
  // A ref, set before any await, so a re-render mid-fetch can't start a second load.
  const handledIdRef = useRef<string | null>(null);

  const clearQuery = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  useEffect(() => {
    const tripId = searchParams.get("trip");
    if (!tripId || handledIdRef.current === tripId) return;
    // Firing while the session is still loading would 401 on a good link.
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
          ([id, slugs]) => id === UNSCHEDULED || slugs.length === 0,
        );
        const currentWorkIsSafe = boardIsEmpty || state.remoteTripId !== null;
        if (currentWorkIsSafe || state.remoteTripId === trip.id) {
          loadRemoteTrip(trip);
          showToast({ message: fill(t.opened, { title: trip.title || dict.myTrips.untitled }) });
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

  function keepMine() {
    setPending(null);
    clearQuery();
  }

  return (
    <Dialog open={pending !== null} onClose={keepMine} labelledBy={titleId}>
      {pending ? (
        <>
          <h2 id={titleId} className="text-title font-semibold text-pretty text-brand">
            {t.replaceTitle}
          </h2>
          <p className="mt-2 text-body text-pretty text-ink-soft">
            {fill(t.replaceBody, { title: pending.title || dict.myTrips.untitled })}
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={keepMine} data-autofocus>
              {t.replaceCancel}
            </Button>
            <Button
              onClick={() => {
                loadRemoteTrip(pending);
                setPending(null);
                showToast({ message: fill(t.opened, { title: pending.title || dict.myTrips.untitled }) });
                clearQuery();
              }}
            >
              {t.replaceConfirm}
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
