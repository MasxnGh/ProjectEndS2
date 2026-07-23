import { create } from "zustand";
import { persist } from "zustand/middleware";
import { places } from "@/data/places";

export const UNSCHEDULED = "unscheduled";

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
  travelDate: string;
  travelers: number;
  budgetThb: number;
  accommodationThb: number;
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
  autoArrangeDay: (dayId: string) => void;
  clearAll: () => void;
  loadPlan: (data: { dayIds: string[]; containers: Record<string, string[]> }) => void;
  setTripName: (name: string) => void;
  setTravelDate: (date: string) => void;
  setTravelers: (count: number) => void;
  setBudgetThb: (amount: number) => void;
  setAccommodationThb: (amount: number) => void;
  togglePackingItem: (id: string) => void;
  addPackingItem: (label: string) => void;
  removePackingItem: (id: string) => void;
}

function findContainer(containers: Record<string, string[]>, slug: string) {
  return Object.keys(containers).find((key) => containers[key].includes(slug));
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
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

      autoArrangeDay: (dayId) => {
        const state = get();
        const slugs = state.containers[dayId] ?? [];
        if (slugs.length < 3) return;

        const items = slugs
          .map((slug) => places.find((p) => p.slug === slug))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));

        const remaining = [...items];
        const ordered = [remaining.shift()!];
        while (remaining.length) {
          const last = ordered[ordered.length - 1];
          remaining.sort(
            (a, b) =>
              haversine(last.coordinates, a.coordinates) -
              haversine(last.coordinates, b.coordinates)
          );
          ordered.push(remaining.shift()!);
        }

        set({
          containers: {
            ...state.containers,
            [dayId]: ordered.map((p) => p.slug),
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

      removePackingItem: (id) => {
        const state = get();
        set({ packingItems: state.packingItems.filter((item) => item.id !== id) });
      },
    }),
    { name: "doi-delta-trip-v2" }
  )
);
