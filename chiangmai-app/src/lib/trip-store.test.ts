import { describe, expect, it } from "vitest";
import { buildTripSnapshot, UNSCHEDULED, type TripState } from "./trip-store";

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
