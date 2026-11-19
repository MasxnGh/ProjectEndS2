import { describe, expect, it } from "vitest";
import { getPlaceBySlug } from "@/data/places";
import { compareVehicleModes } from "./vehicle-comparison";
import { farthestWalkLeg, WALKABLE_LEG_KM } from "./walk-check";

const place = (slug: string) => {
  const found = getPlaceBySlug(slug);
  if (!found) throw new Error(`no place ${slug}`);
  return found;
};

// The planner's own sample day: down from Doi Suthep, then two temples a few
// hundred metres apart inside the walls.
const doiSuthep = place("wat-phra-that-doi-suthep");
const chediLuang = place("wat-chedi-luang");
const phraSingh = place("wat-phra-singh");

describe("farthestWalkLeg", () => {
  it("says nothing unless walking is the chosen mode", () => {
    for (const mode of ["songthaew", "grab", "rented-bike", "rented-car"] as const) {
      expect(farthestWalkLeg([doiSuthep, chediLuang], mode)).toBeNull();
    }
  });

  it("says nothing for a day inside the old city", () => {
    expect(farthestWalkLeg([chediLuang, phraSingh], "walk")).toBeNull();
  });

  it("says nothing for an empty day or a single stop", () => {
    expect(farthestWalkLeg([], "walk")).toBeNull();
    expect(farthestWalkLeg([doiSuthep], "walk")).toBeNull();
  });

  it("names the hop down the mountain", () => {
    const leg = farthestWalkLeg([doiSuthep, chediLuang, phraSingh], "walk");
    expect(leg?.from.slug).toBe("wat-phra-that-doi-suthep");
    expect(leg?.to.slug).toBe("wat-chedi-luang");
    expect(leg!.distanceKm).toBeGreaterThan(WALKABLE_LEG_KM);
  });

  it("picks the longest hop when more than one is too far", () => {
    const leg = farthestWalkLeg([chediLuang, doiSuthep, place("wat-umong")], "walk");
    const other = farthestWalkLeg([doiSuthep, place("wat-umong")], "walk");
    expect(leg!.distanceKm).toBeGreaterThanOrEqual(other!.distanceKm);
  });

  it("gives the walking time the transport comparison gives for the same hop", () => {
    const leg = farthestWalkLeg([doiSuthep, chediLuang], "walk")!;
    const walkRow = compareVehicleModes([{ places: [doiSuthep, chediLuang] }]).find((r) => r.mode === "walk")!;
    expect(leg.walkMinutes).toBe(walkRow.totalTravelMinutes);
  });
});
