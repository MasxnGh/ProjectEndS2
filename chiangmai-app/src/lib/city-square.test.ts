import { describe, expect, it } from "vitest";
import {
  locateInSquare,
  isInsideWalls,
  compressOutside,
  CITY_SQUARE,
  BEYOND_KM,
} from "./city-square";
import { buildSquareSummary } from "./city-square-summary";
import { getPlaceBySlug } from "@/data/places";

/**
 * These use real coordinates from the catalogue, for places whose position
 * relative to the old city wall is not a matter of opinion. If someone edits
 * the wall lines and a bastion stops sitting on the wall, or Nimman drifts
 * inside the moat, that is a broken map and the test should say so.
 */
function at(slug: string) {
  const place = getPlaceBySlug(slug);
  if (!place) throw new Error(`missing fixture place: ${slug}`);
  return locateInSquare(place.coordinates);
}

describe("locateInSquare", () => {
  it("puts the corner bastion and the gates on the wall, not inside it", () => {
    // Jaeng Si Phum is the north-east bastion; Tha Phae Gate is the east gate.
    // Both are the wall. Calling either "inside the old city" is the kind of
    // technically-true answer nobody who has stood there would give.
    expect(at("jaeng-si-phum").zone).toBe("wall");
    expect(at("tha-phae-gate").zone).toBe("wall");
  });

  it("keeps the temples of the old city inside it", () => {
    for (const slug of ["wat-chedi-luang", "wat-phra-singh", "wat-chiang-man", "wat-phan-tao"]) {
      expect(at(slug).bucket, slug).toBe("inside");
    }
  });

  it("splits the walled area by quarter the way the bastions do", () => {
    // Wat Chiang Man is in the north-east of the square, Nong Buak Hard Park in
    // the south-west corner — the two furthest-apart quarters.
    expect(at("wat-chiang-man").zone).toBe("inside-ne");
    expect(at("nong-buak-hard-park").zone).toBe("inside-sw");
  });

  it("places the neighbourhoods outside on the right side", () => {
    // Nimman is west of the moat, Warorot east of it toward the Ping, Wua Lai
    // (Wat Sri Suphan) south of Chiang Mai Gate, Wat Lok Molee just outside the
    // north moat on Manee Nopparat.
    expect(at("nimmanhaemin").bucket).toBe("west");
    expect(at("warorot-market").bucket).toBe("east");
    expect(at("wat-sri-suphan").bucket).toBe("south");
    expect(at("wat-lok-molee").bucket).toBe("north");
  });

  it("stops describing distant places by their side of a moat they are nowhere near", () => {
    const inthanon = at("doi-inthanon");
    expect(inthanon.zone).toBe("beyond");
    expect(inthanon.km).toBeGreaterThan(BEYOND_KM);
    // Nothing to plot: a mini-map of the old city cannot honestly show it.
    expect(inthanon.point).toBeNull();
  });

  it("gives inside places a point within the unit square", () => {
    const { point } = at("wat-chedi-luang");
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(0);
    expect(point!.x).toBeLessThan(1);
    expect(point!.y).toBeGreaterThan(0);
    expect(point!.y).toBeLessThan(1);
  });

  it("resolves a corner by which way it overshoots furthest", () => {
    // Just off the north-east bastion, but much further north than east.
    expect(locateInSquare({ lat: CITY_SQUARE.north + 0.01, lng: CITY_SQUARE.east + 0.0005 }).bucket).toBe(
      "north"
    );
    // And the same corner, pushed mostly east instead.
    expect(locateInSquare({ lat: CITY_SQUARE.north + 0.0005, lng: CITY_SQUARE.east + 0.01 }).bucket).toBe(
      "east"
    );
  });
});

describe("compressOutside", () => {
  it("leaves everything inside the walls exactly where it is", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(compressOutside(t)).toBe(t);
    }
  });

  it("keeps every place in the catalogue inside the drawing", () => {
    // The map's own geometry: a 200-unit viewBox with the wall from 46 to 154.
    const WALL_X = 46;
    const WALL_SIZE = 108;
    const VIEW = 200;
    const DOT_R = 2;
    const { points } = buildSquareSummary();
    expect(points.length).toBeGreaterThan(100);

    for (const point of points) {
      for (const t of [point.x, point.y]) {
        const drawn = WALL_X + compressOutside(t) * WALL_SIZE;
        expect(drawn - DOT_R, `t=${t}`).toBeGreaterThan(0);
        expect(drawn + DOT_R, `t=${t}`).toBeLessThan(VIEW);
      }
    }
  });

  it("still puts a nearer place nearer than a farther one", () => {
    // Ordering has to survive the squash, or the map would be lying about
    // which of two neighbourhoods is closer to the moat.
    expect(compressOutside(-0.5)).toBeGreaterThan(compressOutside(-2));
    expect(compressOutside(1.5)).toBeLessThan(compressOutside(3));
  });
});

describe("isInsideWalls", () => {
  it("agrees with the zone it is derived from", () => {
    expect(isInsideWalls(getPlaceBySlug("wat-chedi-luang")!.coordinates)).toBe(true);
    expect(isInsideWalls(getPlaceBySlug("nimmanhaemin")!.coordinates)).toBe(false);
  });
});
