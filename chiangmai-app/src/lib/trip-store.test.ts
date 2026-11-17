import { describe, expect, it, vi } from "vitest";

// An in-memory `window.localStorage`, in place before the store module loads:
// zustand's persist middleware reads it from `window`, and without one it
// skips persisting altogether in Node, leaving nothing to check.
const storage = vi.hoisted(() => {
  const items = new Map<string, string>();
  const stub = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
    key: (i: number) => [...items.keys()][i] ?? null,
    get length() {
      return items.size;
    },
  };
  Object.defineProperty(globalThis, "window", { value: { localStorage: stub }, configurable: true });
  return items;
});

import { buildTripSnapshot, UNSCHEDULED, useTripStore, type TripState } from "./trip-store";
import type { SerializedTrip } from "@/lib/db/types";

function fakeState(overrides: Partial<TripState>): TripState {
  return {
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
    packingItems: [],
    ...overrides,
  } as TripState;
}

describe("buildTripSnapshot", () => {
  it("leaves every day's date null when no start date is set", () => {
    const trip = buildTripSnapshot(
      fakeState({
        dayIds: ["day-1", "day-2"],
        containers: { [UNSCHEDULED]: [], "day-1": ["wat-chedi-luang"], "day-2": [] },
      })
    );
    expect(trip.startDate).toBeNull();
    expect(trip.days.map((d) => d.date)).toEqual([null, null]);
  });

  it("computes each day's ISO date from startDate + index", () => {
    const trip = buildTripSnapshot(
      fakeState({
        dayIds: ["day-1", "day-2", "day-3"],
        containers: { [UNSCHEDULED]: [], "day-1": [], "day-2": [], "day-3": [] },
        travelDate: "2026-03-10",
      })
    );
    expect(trip.days.map((d) => d.date)).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"]);
  });

  it("maps each container's slugs into TripStop objects", () => {
    const trip = buildTripSnapshot(
      fakeState({
        dayIds: ["day-1"],
        containers: { [UNSCHEDULED]: [], "day-1": ["wat-chedi-luang", "wat-phra-singh"] },
      })
    );
    expect(trip.days[0].stops).toEqual([
      { placeSlug: "wat-chedi-luang", plannedArrival: null, userLocked: false },
      { placeSlug: "wat-phra-singh", plannedArrival: null, userLocked: false },
    ]);
  });

  it("excludes the unscheduled bucket from days", () => {
    const trip = buildTripSnapshot(
      fakeState({
        dayIds: ["day-1"],
        containers: { [UNSCHEDULED]: ["mon-cham"], "day-1": [] },
      })
    );
    expect(trip.days).toHaveLength(1);
    expect(trip.days[0].stops).toEqual([]);
  });

  it("passes through title, baseLocation, and travelMode", () => {
    const trip = buildTripSnapshot(
      fakeState({
        tripName: "Cool Season Loop",
        baseLocation: { lat: 18.79, lng: 98.99, label: "Old City" },
        travelMode: "grab",
      })
    );
    expect(trip.title).toBe("Cool Season Loop");
    expect(trip.baseLocation).toEqual({ lat: 18.79, lng: 98.99, label: "Old City" });
    expect(trip.travelMode).toBe("grab");
  });

  it("derives plannedArrival/userLocked from lockedTimes for the matching day+slug", () => {
    const trip = buildTripSnapshot(
      fakeState({
        dayIds: ["day-1", "day-2"],
        containers: { [UNSCHEDULED]: [], "day-1": ["wat-chedi-luang"], "day-2": ["wat-chedi-luang"] },
        lockedTimes: { "day-1::wat-chedi-luang": "10:30" },
      })
    );
    expect(trip.days[0].stops[0]).toEqual({ placeSlug: "wat-chedi-luang", plannedArrival: "10:30", userLocked: true });
    // Same place slug on a different day must not pick up day-1's lock.
    expect(trip.days[1].stops[0]).toEqual({ placeSlug: "wat-chedi-luang", plannedArrival: null, userLocked: false });
  });
});

describe("loadRevision", () => {
  const savedTrip: SerializedTrip = {
    id: "trip-1",
    ownerId: "u1",
    title: "วันแรกกับเชียงใหม่",
    startDate: null,
    baseLocation: null,
    days: [{ date: null, stops: [{ placeSlug: "wat-chedi-luang", plannedArrival: null, userLocked: false }] }],
    travelMode: "walk",
    travelers: 2,
    budgetThb: 0,
    accommodationThb: 0,
    packingItems: [],
    shareToken: "token",
    visibility: "private",
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
  };

  it("goes up each time a saved trip is opened, even the same one again", () => {
    const before = useTripStore.getState().loadRevision;
    useTripStore.getState().loadRemoteTrip(savedTrip);
    useTripStore.getState().loadRemoteTrip(savedTrip);
    expect(useTripStore.getState().loadRevision).toBe(before + 2);
    expect(useTripStore.getState().remoteTripId).toBe("trip-1");
  });

  it("is not written to localStorage", () => {
    useTripStore.getState().loadRemoteTrip(savedTrip);
    const written = JSON.parse(storage.get("doi-delta-trip-v2") ?? "{}") as { state?: Partial<TripState> };
    expect(written.state).toBeDefined();
    expect(written.state).not.toHaveProperty("loadRevision");
    expect(written.state).not.toHaveProperty("saveStatus");
    expect(written.state).toHaveProperty("remoteTripId", "trip-1");
  });
});
