import { haversineKm, type LatLng } from "@/lib/geo/distance";

/**
 * Where a place sits relative to the old city walls.
 *
 * Chiang Mai's historic core is an actual square — a moat and wall about 1.6km
 * on each side, laid out to the compass, with gates in the middles of the sides
 * and bastions (แจ่ง) at the corners. Locals give directions by it: a place is
 * in the walls, or it is outside them in a direction. "Nimman" means west of the
 * moat; "Riverside" means east of it, by the Ping.
 *
 * The site already carries a `district` string per place, but that is a label
 * someone typed. This is derived from the coordinates we already hold, so it
 * cannot disagree with the map, and it gives the same answer for a place nobody
 * has labelled yet.
 *
 * The wall lines below were not recalled from memory — they were fitted to
 * landmarks in this catalogue whose position relative to the wall is not in
 * question, and the tests pin those cases:
 *
 *   Jaeng Si Phum (18.7950, 98.9936) is the north-east bastion, so it sets both
 *   the north and east lines. Tha Phae Gate sits at 98.9934, agreeing with the
 *   east line to within 20m. Wat Lok Molee stands just outside the north moat;
 *   Wat Sri Suphan is in Wua Lai, outside the south; Wat Suan Dok is outside the
 *   west; and Nong Buak Hard Park is inside the south-west corner. Every one of
 *   those falls on the correct side of the lines chosen here.
 */
export const CITY_SQUARE = {
  north: 18.795,
  south: 18.781,
  west: 98.976,
  east: 98.9935,
} as const;

/** Centre of the square — near Wat Chedi Luang and the city pillar, as it should be. */
export const SQUARE_CENTRE: LatLng = {
  lat: (CITY_SQUARE.north + CITY_SQUARE.south) / 2,
  lng: (CITY_SQUARE.west + CITY_SQUARE.east) / 2,
};

/**
 * How close to a wall line still counts as being on the wall rather than either
 * side of it. The gates and bastions are the wall, and calling Tha Phae Gate
 * "inside the old city" would be a technically-true answer that no one who has
 * stood there would give.
 *
 * Widened from 40m once the remaining gates and bastions were added with
 * coordinates from OpenStreetMap: at 40m, Chiang Mai Gate missed the band by
 * 40cm and Jaeng Katam by 2m, so structures that *are* the wall were being
 * filed as inside it. 67m is also the honest physical figure — the moat and the
 * ring road on either side of it are about that wide — and it moves only three
 * further catalogue entries onto the ring, all of them addresses on the moat
 * road itself.
 */
const WALL_BAND_DEG = 0.0006; // ~67m: the moat plus its ring roads

/**
 * Past this, direction is all that is left worth saying. Doi Inthanon is 60km
 * away; describing it as "west of the moat" is accurate and useless, so those
 * places are marked `beyond` and left off the mini-map rather than squashed
 * against its edge.
 */
export const BEYOND_KM = 9;

export type SquareZone =
  | "inside-nw"
  | "inside-ne"
  | "inside-sw"
  | "inside-se"
  | "wall"
  | "north"
  | "east"
  | "south"
  | "west"
  | "beyond";

/** The coarse grouping used for filtering, where four inner quarters is too fine. */
export type SquareBucket = "inside" | "wall" | "north" | "east" | "south" | "west" | "beyond";

export interface SquarePlacement {
  zone: SquareZone;
  bucket: SquareBucket;
  /** Straight-line distance from the centre of the square. */
  km: number;
  /**
   * Position on a unit square whose edges are the walls: 0,0 is the north-west
   * bastion and 1,1 the south-east. Values outside 0–1 are outside the walls,
   * so a mini-map can plot the moat and everything around it in one space.
   * `null` for `beyond` places, which have no honest position on that map.
   */
  point: { x: number; y: number } | null;
}

const near = (value: number, line: number) => Math.abs(value - line) <= WALL_BAND_DEG;

/**
 * Which side of the square a place lies on when it is not inside it.
 *
 * A place off a corner is on two sides at once, so the larger overshoot wins —
 * somewhere north-east but mostly north reads as north to anyone walking there.
 * Longitude degrees are shorter than latitude ones at this latitude, so the
 * east–west overshoot is scaled before the comparison; without that, corners
 * would be called north or south far too often.
 */
const LNG_PER_LAT = Math.cos((SQUARE_CENTRE.lat * Math.PI) / 180);

function outsideSide(lat: number, lng: number): "north" | "east" | "south" | "west" {
  const northBy = lat - CITY_SQUARE.north;
  const southBy = CITY_SQUARE.south - lat;
  const eastBy = (lng - CITY_SQUARE.east) * LNG_PER_LAT;
  const westBy = (CITY_SQUARE.west - lng) * LNG_PER_LAT;
  const best = Math.max(northBy, southBy, eastBy, westBy);
  if (best === northBy) return "north";
  if (best === southBy) return "south";
  if (best === eastBy) return "east";
  return "west";
}

export function locateInSquare(coordinates: LatLng): SquarePlacement {
  const { lat, lng } = coordinates;
  const km = haversineKm(SQUARE_CENTRE, coordinates);

  const x = (lng - CITY_SQUARE.west) / (CITY_SQUARE.east - CITY_SQUARE.west);
  const y = (CITY_SQUARE.north - lat) / (CITY_SQUARE.north - CITY_SQUARE.south);
  const point = km > BEYOND_KM ? null : { x, y };

  if (km > BEYOND_KM) {
    return { zone: "beyond", bucket: "beyond", km, point };
  }

  const withinLat = lat <= CITY_SQUARE.north && lat >= CITY_SQUARE.south;
  const withinLng = lng >= CITY_SQUARE.west && lng <= CITY_SQUARE.east;

  // On the ring: level with one wall, and not past the ends of it.
  const onNorthOrSouth =
    (near(lat, CITY_SQUARE.north) || near(lat, CITY_SQUARE.south)) &&
    lng >= CITY_SQUARE.west - WALL_BAND_DEG &&
    lng <= CITY_SQUARE.east + WALL_BAND_DEG;
  const onEastOrWest =
    (near(lng, CITY_SQUARE.west) || near(lng, CITY_SQUARE.east)) &&
    lat <= CITY_SQUARE.north + WALL_BAND_DEG &&
    lat >= CITY_SQUARE.south - WALL_BAND_DEG;
  if (onNorthOrSouth || onEastOrWest) {
    return { zone: "wall", bucket: "wall", km, point };
  }

  if (withinLat && withinLng) {
    const northern = lat >= SQUARE_CENTRE.lat;
    const western = lng < SQUARE_CENTRE.lng;
    const zone = (
      northern ? (western ? "inside-nw" : "inside-ne") : western ? "inside-sw" : "inside-se"
    ) as SquareZone;
    return { zone, bucket: "inside", km, point };
  }

  const side = outsideSide(lat, lng);
  return { zone: side, bucket: side, km, point };
}

/** How far past the wall a plotted dot may sit, in wall-widths. */
export const OUTSIDE_REACH = 0.4;

/**
 * Squashes how far outside the walls a place is drawn, leaving direction exact.
 *
 * Wall-relative coordinates run from about -3.3 to 5.0 across the catalogue —
 * places up to 9km out — while a drawing of the square has under half a
 * wall-width of margin. Plotted raw, 60 of 124 dots landed outside the frame and
 * were silently clipped, so the map showed half the guide while appearing to
 * show all of it.
 *
 * Monotonic, so nearer places still plot nearer and the ordering along each axis
 * survives; only the scale outside the moat is non-linear. Inside the walls
 * nothing is touched, which is where exact position actually matters.
 */
export function compressOutside(t: number): number {
  if (t >= 0 && t <= 1) return t;
  const overshoot = t < 0 ? -t : t - 1;
  const squashed = OUTSIDE_REACH * (1 - Math.exp(-overshoot));
  return t < 0 ? -squashed : 1 + squashed;
}

/** True when a place is within the walls, on any of the four quarters. */
export function isInsideWalls(coordinates: LatLng): boolean {
  return locateInSquare(coordinates).bucket === "inside";
}
