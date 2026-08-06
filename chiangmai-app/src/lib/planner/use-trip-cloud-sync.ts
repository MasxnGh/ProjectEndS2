"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTripStore, buildWritableTripPayload } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";
import type { SerializedTrip, TripWritablePayload } from "@/lib/db/types";

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface MigrationPrompt {
  existingTripId: string;
  existingTripTitle: string;
  existingTripUpdatedAt: string;
}

async function postTrip(payload: TripWritablePayload): Promise<SerializedTrip> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create failed: ${res.status}`);
  const data = await res.json();
  return data.trip as SerializedTrip;
}

async function patchTrip(
  id: string,
  payload: TripWritablePayload,
  expectedUpdatedAt: string | null
): Promise<{ trip: SerializedTrip | null; conflict: boolean; notFound: boolean }> {
  const res = await fetch(`/api/trips/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip: payload, expectedUpdatedAt }),
  });
  if (res.status === 404) return { trip: null, conflict: false, notFound: true };
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  const data = await res.json();
  return { trip: data.trip as SerializedTrip, conflict: Boolean(data.conflict), notFound: false };
}

/**
 * Orchestrates guest→account migration and ongoing autosave for the Trip
 * Planner. Mounted once from PlannerBoard. This is the single most
 * failure-sensitive piece of the whole feature — a bug here can lose a plan
 * someone actually built — so every path below either writes successfully
 * or leaves the local, Zustand-persisted plan completely untouched. Nothing
 * in this hook ever deletes local data; `detachRemoteTrip` only clears the
 * *link* to a cloud trip (used on sign-out and when a remote trip 404s), and
 * `clearAll` is only ever called from the sign-out modal's explicit "clear
 * it" choice.
 */
export function useTripCloudSync() {
  const { status } = useSession();
  const { showToast } = useToast();
  const { dict } = useLocale();

  // Selected individually (not via `useTripStore(buildWritableTripPayload)`)
  // so each selector returns a referentially-stable value straight from the
  // store and only re-renders when its own slice actually changes — see the
  // comment on buildWritableTripPayload for why the all-in-one selector form
  // causes an infinite render loop.
  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);
  const tripName = useTripStore((s) => s.tripName);
  const travelDate = useTripStore((s) => s.travelDate);
  const baseLocation = useTripStore((s) => s.baseLocation);
  const travelMode = useTripStore((s) => s.travelMode);
  const lockedTimes = useTripStore((s) => s.lockedTimes);
  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const packingItems = useTripStore((s) => s.packingItems);
  const remoteTripId = useTripStore((s) => s.remoteTripId);
  const remoteUpdatedAt = useTripStore((s) => s.remoteUpdatedAt);
  const saveStatus = useTripStore((s) => s.saveStatus);
  const setRemoteTripMeta = useTripStore((s) => s.setRemoteTripMeta);
  const setSaveStatus = useTripStore((s) => s.setSaveStatus);

  const [migrationPrompt, setMigrationPrompt] = useState<MigrationPrompt | null>(null);
  const [migrationDeclined, setMigrationDeclined] = useState(false);
  const migrationCheckedForSessionRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);

  const isLocalPlanEmpty =
    Object.values(containers).every((slugs) => slugs.length === 0) && !tripName.trim() && !travelDate;

  const payload = useMemo(
    () =>
      buildWritableTripPayload({
        dayIds,
        containers,
        tripName,
        travelDate,
        baseLocation,
        travelMode,
        lockedTimes,
        travelers,
        budgetThb,
        accommodationThb,
        packingItems,
      }),
    [dayIds, containers, tripName, travelDate, baseLocation, travelMode, lockedTimes, travelers, budgetThb, accommodationThb, packingItems]
  );
  const payloadJson = JSON.stringify(payload);

  const performSave = useCallback(
    async (currentPayload: TripWritablePayload, tripId: string | null, expectedUpdatedAt: string | null) => {
      setSaveStatus("saving");
      try {
        if (!tripId) {
          const trip = await postTrip(currentPayload);
          setRemoteTripMeta(trip.id, trip.updatedAt);
          lastSavedJsonRef.current = JSON.stringify(currentPayload);
          setSaveStatus("saved");
          return;
        }

        const result = await patchTrip(tripId, currentPayload, expectedUpdatedAt);
        if (result.notFound) {
          // Either deleted, or this browser has a different account's trip
          // id lingering (shouldn't happen — sign-out detaches it — but
          // treat defensively). Detach so the next tick creates a fresh
          // trip instead of retrying a write that can never succeed.
          setRemoteTripMeta(null, null);
          setSaveStatus("failed");
          return;
        }
        setRemoteTripMeta(result.trip!.id, result.trip!.updatedAt);
        lastSavedJsonRef.current = JSON.stringify(currentPayload);
        setSaveStatus("saved");
        if (result.conflict) {
          showToast({ message: dict.planner.cloudSave.conflictNotice });
        }
      } catch {
        setSaveStatus("failed");
      }
    },
    [setRemoteTripMeta, setSaveStatus, showToast, dict.planner.cloudSave.conflictNotice]
  );

  const runMigrationCheck = useCallback(async () => {
    if (remoteTripId || isLocalPlanEmpty) return;
    try {
      const res = await fetch("/api/trips");
      const data: { trips?: SerializedTrip[] } = res.ok ? await res.json() : {};
      const [mostRecent] = data.trips ?? [];
      setMigrationDeclined(false);
      if (mostRecent) {
        setMigrationPrompt({
          existingTripId: mostRecent.id,
          existingTripTitle: mostRecent.title || dict.planner.details.tripNamePlaceholder,
          existingTripUpdatedAt: mostRecent.updatedAt,
        });
      }
      // No existing trips: leave migrationPrompt unset — the autosave
      // effect below will create the first one on its own next tick.
    } catch {
      // Listing failed. Leave migrationDeclined as-is; the status
      // indicator's manual "save" affordance lets the user retry.
    }
  }, [remoteTripId, isLocalPlanEmpty, dict.planner.details.tripNamePlaceholder]);

  // One-time migration check, fired only on the unauthenticated → authenticated edge.
  useEffect(() => {
    const isAuthenticated = status === "authenticated";
    if (isAuthenticated && !wasAuthenticatedRef.current && !migrationCheckedForSessionRef.current) {
      migrationCheckedForSessionRef.current = true;
      runMigrationCheck();
    }
    if (!isAuthenticated) {
      migrationCheckedForSessionRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting sync UI state to match the external auth session going away, not derivable at render time
      setMigrationDeclined(false);
      setMigrationPrompt(null);
      setSaveStatus("idle");
    }
    wasAuthenticatedRef.current = isAuthenticated;
    // runMigrationCheck intentionally excluded — it's re-created whenever
    // payload-adjacent values change, and re-running it on every one of
    // those changes would defeat the "only on the sign-in edge" intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, setSaveStatus]);

  // Debounced autosave — skipped while a migration decision is pending or
  // was explicitly deferred, so it can never silently create a duplicate
  // trip right after the user said "decide later".
  useEffect(() => {
    if (status !== "authenticated") return;
    if (migrationPrompt) return;
    if (isLocalPlanEmpty) return;
    if (!remoteTripId && migrationDeclined) return;
    if (payloadJson === lastSavedJsonRef.current) return;

    const timer = setTimeout(() => {
      performSave(payload, remoteTripId, remoteUpdatedAt);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    status,
    migrationPrompt,
    isLocalPlanEmpty,
    migrationDeclined,
    payloadJson,
    payload,
    remoteTripId,
    remoteUpdatedAt,
    performSave,
  ]);

  const requestSave = useCallback(() => {
    if (!remoteTripId && migrationDeclined) {
      runMigrationCheck();
      return;
    }
    performSave(payload, remoteTripId, remoteUpdatedAt);
  }, [remoteTripId, migrationDeclined, runMigrationCheck, performSave, payload, remoteUpdatedAt]);

  const resolveMigrationSaveAsNew = useCallback(async () => {
    if (!migrationPrompt) return;
    setMigrationPrompt(null);
    setSaveStatus("saving");
    try {
      const trip = await postTrip(payload);
      setRemoteTripMeta(trip.id, trip.updatedAt);
      lastSavedJsonRef.current = JSON.stringify(payload);
      setSaveStatus("saved");
      showToast({ message: dict.planner.cloudSave.migratedNew });
    } catch {
      setSaveStatus("failed");
    }
  }, [migrationPrompt, payload, setRemoteTripMeta, setSaveStatus, showToast, dict.planner.cloudSave.migratedNew]);

  const resolveMigrationReplaceExisting = useCallback(async () => {
    if (!migrationPrompt) return;
    const { existingTripId, existingTripUpdatedAt, existingTripTitle } = migrationPrompt;
    setMigrationPrompt(null);
    setSaveStatus("saving");
    try {
      const result = await patchTrip(existingTripId, payload, existingTripUpdatedAt);
      if (result.notFound) {
        setSaveStatus("failed");
        return;
      }
      setRemoteTripMeta(result.trip!.id, result.trip!.updatedAt);
      lastSavedJsonRef.current = JSON.stringify(payload);
      setSaveStatus("saved");
      showToast({ message: dict.planner.cloudSave.migratedReplace.replace("{title}", existingTripTitle) });
    } catch {
      setSaveStatus("failed");
    }
  }, [migrationPrompt, payload, setRemoteTripMeta, setSaveStatus, showToast, dict.planner.cloudSave.migratedReplace]);

  const dismissMigrationPrompt = useCallback(() => {
    setMigrationDeclined(true);
    setMigrationPrompt(null);
  }, []);

  return {
    isSignedIn: status === "authenticated",
    saveStatus,
    migrationDeclined: migrationDeclined && !remoteTripId,
    requestSave,
    migrationPrompt,
    resolveMigrationSaveAsNew,
    resolveMigrationReplaceExisting,
    dismissMigrationPrompt,
  };
}
