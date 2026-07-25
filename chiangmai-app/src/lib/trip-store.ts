import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trip, TravelMode } from "@/data/types";
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
export function buildTripSnapshot(state: TripState): Trip {
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
    }),
    {
      name: "doi-delta-trip-v2",
      version: SCHEMA_VERSION,
      migrate: (persistedState) => persistedState as TripState,
    }
  )
);
