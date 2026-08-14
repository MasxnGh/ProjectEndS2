import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, TravelMode } from "@/data/types";
import type { SerializedTrip, TripWritablePayload } from "@/lib/db/types";
import { addDaysIso } from "@/lib/date-utils";

export const UNSCHEDULED = "unscheduled";

/**
 * Schema version for the persisted trip. Bump this and add a branch to
 * `migrate` below whenever the persisted shape changes in a way old
 * localStorage data can't just fall back to defaults for.
 *
 * v1: adds baseLocation/travelMode alongside the pre-existing
 * dayIds/containers shape — no transformation needed, since Zustand's
 * persist merge already fills in defaults for fields absent from older
 * localStorage payloads.
 */
const SCHEMA_VERSION = 1;

export interface PackingItem {
  id: string;
  labelKey?: string;
  label?: string;
  checked: boolean;
}

const DEFAULT_PACKING_ITEMS: PackingItem[] = [
  { id: "cash", labelKey: "cash", checked: false },
  { id: "weather", labelKey: "weather", checked: false },
  { id: "camera", labelKey: "camera", checked: false },
  { id: "chargePhone", labelKey: "chargePhone", checked: false },
  { id: "warmLayer", labelKey: "warmLayer", checked: false },
  { id: "openingHours", labelKey: "openingHours", checked: false },
  { id: "water", labelKey: "water", checked: false },
];

export interface TripState {
  dayIds: string[];
  containers: Record<string, string[]>;
  nextDayNumber: number;
  tripName: string;
  /** ISO "YYYY-MM-DD", or "" when the user hasn't chosen a date yet (matches <input type="date">). */
  travelDate: string;
  travelers: number;
  budgetThb: number;
  accommodationThb: number;
  baseLocation: { lat: number; lng: number; label: string } | null;
  travelMode: TravelMode;
  /** User-pinned arrival times set by dragging a stop on the Golden Hour timeline, keyed by `${dayId}::${slug}` as "HH:mm". Absent = the scheduler picks the time. */
  lockedTimes: Record<string, string>;
  packingItems: PackingItem[];
  /** The cloud trip this device is syncing to, once signed in — null while the plan only exists locally (guest, or signed-out-and-detached). Persisted so returning to the page keeps syncing the same trip instead of creating a duplicate. */
  remoteTripId: string | null;
  /** The server's `updatedAt` as of the last successful sync — sent back as `expectedUpdatedAt` on the next write so the API can detect a conflicting edit from another tab/device. */
  remoteUpdatedAt: string | null;
  /** Autosave status for the cloud-sync indicator. Deliberately NOT persisted (see partialize below) — a stale "saving"/"failed" surviving a refresh would be misleading; the next debounce cycle re-derives it within ~1.5s anyway. */
  saveStatus: "idle" | "saving" | "saved" | "failed";
  addPlace: (slug: string) => void;
  removeFromPlan: (slug: string, containerId?: string) => void;
  isPlanned: (slug: string) => boolean;
  locationOf: (slug: string) => string | undefined;
  moveToDay: (slug: string, dayId: string) => void;
  duplicateToDay: (slug: string, dayId: string) => void;
  addDay: () => void;
  removeDay: (dayId: string) => void;
  moveItem: (params: {
    slug: string;
    toContainer: string;
    toIndex: number;
  }) => void;
  reorderDay: (dayId: string, orderedSlugs: string[]) => void;
  clearAll: () => void;
  loadPlan: (data: { dayIds: string[]; containers: Record<string, string[]> }) => void;
  setTripName: (name: string) => void;
  setTravelDate: (date: string) => void;
  setTravelers: (count: number) => void;
  setBudgetThb: (amount: number) => void;
  setAccommodationThb: (amount: number) => void;
  setBaseLocation: (location: { lat: number; lng: number; label: string } | null) => void;
  setTravelMode: (mode: TravelMode) => void;
  setLockedTime: (dayId: string, slug: string, clock: string | null) => void;
  togglePackingItem: (id: string) => void;
  addPackingItem: (label: string) => void;
  /** Adds a packing item by dictionary key (e.g. from a smart suggestion) so it re-localizes on locale switch, unlike free-text items. No-op if that key is already in the list. */
  addPackingItemByKey: (labelKey: string) => void;
  removePackingItem: (id: string) => void;
  loadRemoteTrip: (trip: SerializedTrip) => void;
  setRemoteTripMeta: (id: string | null, updatedAt: string | null) => void;
  setSaveStatus: (status: TripState["saveStatus"]) => void;
  /** Detaches this device's plan from whatever cloud trip it was syncing to, without touching the local plan content — used on sign-out (so a different account signing in later doesn't sync over someone else's trip) and defensively if the server reports the remote trip no longer belongs to the current session. */
  detachRemoteTrip: () => void;
}

function findContainer(containers: Record<string, string[]>, slug: string) {
  return Object.keys(containers).find((key) => containers[key].includes(slug));
}

function lockedTimeKey(dayId: string, slug: string): string {
  return `${dayId}::${slug}`;
}

/**
 * Derives the canonical, date-aware Trip shape (Phase 0.2) from the store's
 * dayIds/containers — the shape the drag-and-drop UI actually persists to
 * and reorders. Every later phase (routing, calendar, golden hour, pace
 * meter) should read trip data through this snapshot rather than reaching
 * into dayIds/containers directly, so the UI's storage shape stays free to
 * evolve independently.
 *
 * plannedArrival/userLocked are derived from `lockedTimes`, set by dragging
 * a stop on the Golden Hour timeline (Phase 3.3).
 */
type SnapshotSource = Pick<
  TripState,
  "tripName" | "travelDate" | "baseLocation" | "travelMode" | "dayIds" | "containers" | "lockedTimes"
>;

export function buildTripSnapshot(state: SnapshotSource): Trip {
  return {
    id: "local-trip",
    title: state.tripName,
    startDate: state.travelDate || null,
    baseLocation: state.baseLocation,
    travelMode: state.travelMode,
    days: state.dayIds.map((dayId, i) => ({
      date: state.travelDate ? addDaysIso(state.travelDate, i) : null,
      stops: (state.containers[dayId] ?? []).map((slug) => {
        const locked = state.lockedTimes[lockedTimeKey(dayId, slug)] ?? null;
        return { placeSlug: slug, plannedArrival: locked, userLocked: locked !== null };
      }),
    })),
  };
}

/**
 * The subset of the snapshot the cloud API accepts, built from the same
 * source of truth as buildTripSnapshot so autosave can never drift from
 * what the UI actually shows.
 *
 * Both this and buildTripSnapshot take a narrow Pick<TripState, ...> —
 * deliberately not the full TripState — so callers can build the argument
 * from individually-selected Zustand fields instead of `useTripStore(state
 * => buildWritableTripPayload(state))`. That selector form returns a brand
 * new object every call, and Zustand's useSyncExternalStore-backed hook
 * treats that as "the snapshot always changed," which is an infinite
 * render loop, not a lint nitpick — see use-trip-cloud-sync.ts.
 */
export function buildWritableTripPayload(
  state: SnapshotSource & Pick<TripState, "travelers" | "budgetThb" | "accommodationThb" | "packingItems">
): TripWritablePayload {
  const snapshot = buildTripSnapshot(state);
  return {
    title: snapshot.title,
    startDate: snapshot.startDate,
    baseLocation: snapshot.baseLocation,
    days: snapshot.days,
    travelMode: snapshot.travelMode,
    travelers: state.travelers,
    budgetThb: state.budgetThb,
    accommodationThb: state.accommodationThb,
    packingItems: state.packingItems,
  };
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      dayIds: ["day-1"],
      containers: { [UNSCHEDULED]: [], "day-1": [] },
      nextDayNumber: 2,
      tripName: "",
      travelDate: "",
      travelers: 2,
      budgetThb: 0,
      accommodationThb: 0,
      baseLocation: null,
      travelMode: "walk",
      lockedTimes: {},
      packingItems: DEFAULT_PACKING_ITEMS,
      remoteTripId: null,
      remoteUpdatedAt: null,
      saveStatus: "idle",

      addPlace: (slug) => {
        const state = get();
        if (findContainer(state.containers, slug)) return;
        set({
          containers: {
            ...state.containers,
            [UNSCHEDULED]: [...state.containers[UNSCHEDULED], slug],
          },
        });
      },

      removeFromPlan: (slug, containerId) => {
        const state = get();
        if (containerId) {
          if (!state.containers[containerId]?.includes(slug)) return;
          set({
            containers: {
              ...state.containers,
              [containerId]: state.containers[containerId].filter((s) => s !== slug),
            },
          });
          return;
        }
        // No container specified: clear this place from every container
        // (a place can briefly exist in two days at once via "add duplicate").
        let changed = false;
        const next: Record<string, string[]> = {};
        for (const [key, arr] of Object.entries(state.containers)) {
          if (arr.includes(slug)) changed = true;
          next[key] = arr.filter((s) => s !== slug);
        }
        if (changed) set({ containers: next });
      },

      isPlanned: (slug) => Boolean(findContainer(get().containers, slug)),

      locationOf: (slug) => findContainer(get().containers, slug),

      moveToDay: (slug, dayId) => {
        const state = get();
        const next: Record<string, string[]> = {};
        for (const [key, arr] of Object.entries(state.containers)) {
          next[key] = arr.filter((s) => s !== slug);
        }
        next[dayId] = [...(next[dayId] ?? []), slug];
        set({ containers: next });
      },

      duplicateToDay: (slug, dayId) => {
        const state = get();
        if (state.containers[dayId]?.includes(slug)) return;
        set({
          containers: {
            ...state.containers,
            [dayId]: [...(state.containers[dayId] ?? []), slug],
          },
        });
      },

      addDay: () => {
        const state = get();
        const id = `day-${state.nextDayNumber}`;
        set({
          dayIds: [...state.dayIds, id],
          containers: { ...state.containers, [id]: [] },
          nextDayNumber: state.nextDayNumber + 1,
        });
      },

      removeDay: (dayId) => {
        const state = get();
        const orphaned = state.containers[dayId] ?? [];
        const { [dayId]: _removed, ...rest } = state.containers;
        void _removed;
        set({
          dayIds: state.dayIds.filter((id) => id !== dayId),
          containers: {
            ...rest,
            [UNSCHEDULED]: [...rest[UNSCHEDULED], ...orphaned],
          },
        });
      },

      moveItem: ({ slug, toContainer, toIndex }) => {
        const state = get();
        const fromContainer = findContainer(state.containers, slug);
        if (!fromContainer) return;

        const fromItems = [...state.containers[fromContainer]].filter((s) => s !== slug);
        const toItems =
          fromContainer === toContainer
            ? fromItems
            : [...(state.containers[toContainer] ?? [])];

        const clampedIndex = Math.max(0, Math.min(toIndex, toItems.length));
        toItems.splice(clampedIndex, 0, slug);

        set({
          containers: {
            ...state.containers,
            [fromContainer]: fromContainer === toContainer ? toItems : fromItems,
            [toContainer]: toItems,
          },
        });
      },

      reorderDay: (dayId, orderedSlugs) => {
        const state = get();
        set({
          containers: {
            ...state.containers,
            [dayId]: orderedSlugs,
          },
        });
      },

      clearAll: () =>
        set({
          dayIds: ["day-1"],
          containers: { [UNSCHEDULED]: [], "day-1": [] },
          nextDayNumber: 2,
        }),

      loadPlan: (data) =>
        set({
          dayIds: data.dayIds,
          containers: data.containers,
          nextDayNumber:
            data.dayIds.reduce((max, id) => {
              const n = Number(id.replace("day-", ""));
              return Number.isFinite(n) ? Math.max(max, n) : max;
            }, 0) + 1,
        }),

      setTripName: (tripName) => set({ tripName }),
      setTravelDate: (travelDate) => set({ travelDate }),
      setTravelers: (travelers) => set({ travelers: Math.max(1, travelers) }),
      setBudgetThb: (budgetThb) => set({ budgetThb: Math.max(0, budgetThb) }),
      setAccommodationThb: (accommodationThb) => set({ accommodationThb: Math.max(0, accommodationThb) }),
      setBaseLocation: (baseLocation) => set({ baseLocation }),
      setTravelMode: (travelMode) => set({ travelMode }),

      setLockedTime: (dayId, slug, clock) => {
        const state = get();
        const key = lockedTimeKey(dayId, slug);
        const next = { ...state.lockedTimes };
        if (clock === null) delete next[key];
        else next[key] = clock;
        set({ lockedTimes: next });
      },

      togglePackingItem: (id) => {
        const state = get();
        set({
          packingItems: state.packingItems.map((item) =>
            item.id === id ? { ...item, checked: !item.checked } : item
          ),
        });
      },

      addPackingItem: (label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const state = get();
        set({
          packingItems: [
            ...state.packingItems,
            { id: `custom-${Date.now()}`, label: trimmed, checked: false },
          ],
        });
      },

      addPackingItemByKey: (labelKey) => {
        const state = get();
        if (state.packingItems.some((item) => item.labelKey === labelKey)) return;
        set({ packingItems: [...state.packingItems, { id: labelKey, labelKey, checked: false }] });
      },

      removePackingItem: (id) => {
        const state = get();
        set({ packingItems: state.packingItems.filter((item) => item.id !== id) });
      },

      /**
       * The inverse of buildWritableTripPayload: takes a saved trip and makes
       * it the plan on screen. Lives in the store because reconstructing
       * `lockedTimes` needs lockedTimeKey's exact format — putting this in a
       * component would let the two drift and silently drop pinned times.
       *
       * Sets remoteTripId/remoteUpdatedAt in the same `set` as the itinerary
       * so autosave can never observe an in-between state where the new plan
       * is loaded but still pointed at the previously-open trip — that would
       * write this trip's contents over that one.
       */
      loadRemoteTrip: (trip) => {
        const dayIds = trip.days.map((_, i) => `day-${i + 1}`);
        const containers: Record<string, string[]> = { [UNSCHEDULED]: [] };
        const lockedTimes: Record<string, string> = {};

        trip.days.forEach((day, i) => {
          const dayId = dayIds[i];
          containers[dayId] = day.stops.map((stop) => stop.placeSlug);
          for (const stop of day.stops) {
            if (stop.userLocked && stop.plannedArrival) {
              lockedTimes[lockedTimeKey(dayId, stop.placeSlug)] = stop.plannedArrival;
            }
          }
        });

        // A saved trip always has at least one day on screen, even if it was
        // stored with none — an empty board has nowhere to drop a place.
        if (dayIds.length === 0) {
          dayIds.push("day-1");
          containers["day-1"] = [];
        }

        set({
          dayIds,
          containers,
          lockedTimes,
          nextDayNumber: dayIds.length + 1,
          tripName: trip.title,
          travelDate: trip.startDate ?? "",
          baseLocation: trip.baseLocation,
          travelMode: trip.travelMode,
          travelers: trip.travelers,
          budgetThb: trip.budgetThb,
          accommodationThb: trip.accommodationThb,
          packingItems: trip.packingItems,
          remoteTripId: trip.id,
          remoteUpdatedAt: trip.updatedAt,
          saveStatus: "saved",
        });
      },

      setRemoteTripMeta: (id, updatedAt) => set({ remoteTripId: id, remoteUpdatedAt: updatedAt }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      detachRemoteTrip: () => set({ remoteTripId: null, remoteUpdatedAt: null }),
    }),
    {
      // Keeps the pre-rename key on purpose: this is a localStorage address,
      // not a display name, and changing it would orphan the saved trip of
      // every visitor who already has one. Leave it as-is.
      name: "doi-delta-trip-v2",
      version: SCHEMA_VERSION,
      migrate: (persistedState) => persistedState as TripState,
      // saveStatus is UI-only and would be misleading if it survived a reload
      // mid-save; everything else — including remoteTripId/remoteUpdatedAt —
      // persists as normal.
      partialize: (state) => {
        const { saveStatus: _saveStatus, ...persisted } = state;
        void _saveStatus;
        return persisted;
      },
    }
  )
);

/**
 * True once zustand's persist middleware has read localStorage.
 *
 * A server render never has the saved trip, so it always draws the "not in your
 * plan" state. The persist middleware, meanwhile, rehydrates synchronously as
 * soon as the store module loads in the browser — so without this gate the very
 * first client render of any component reading planned state disagrees with the
 * HTML that was sent, React discards the whole SSR tree, and the page re-renders
 * from scratch with a hydration error.
 *
 * `useSyncExternalStore` is the right shape for it: `getServerSnapshot` pins the
 * initial client render to the server's answer (false), and React re-reads the
 * live snapshot straight after hydrating.
 */
// Hoisted so their identity is stable — useSyncExternalStore resubscribes
// whenever `subscribe` changes, which an inline arrow would do every render.
const subscribeToHydration = (onStoreChange: () => void) =>
  useTripStore.persist.onFinishHydration(onStoreChange);
const getHydrationSnapshot = () => useTripStore.persist.hasHydrated();
const getHydrationServerSnapshot = () => false;

export function useTripStoreHydrated() {
  return useSyncExternalStore(subscribeToHydration, getHydrationSnapshot, getHydrationServerSnapshot);
}
