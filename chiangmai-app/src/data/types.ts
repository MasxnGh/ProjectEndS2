export type PlaceCategory =
  | "temple"
  | "nature"
  | "village"
  | "cafe"
  | "market"
  | "activity";

export type District =
  | "old-city"
  | "nimman"
  | "doi-suthep"
  | "doi-inthanon"
  | "mae-rim"
  | "mae-kampong"
  | "san-kamphaeng"
  | "hang-dong"
  | "samoeng"
  | "chiang-mai-city";

export type BestTime = "morning" | "afternoon" | "evening" | "anytime";
export type PriceLevel = 1 | 2 | 3;

export interface LocalizedText {
  en: string;
  th: string;
}

/** A single day's hours, 24h "HH:mm". `closes` of "24:00" means open through midnight. */
export interface OpeningHours {
  opens: string;
  closes: string;
}

/** An ISO ("YYYY-MM-DD") date span, inclusive on both ends. */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * A window worth visiting during. `anchor: "clock"` uses `start`/`end` as
 * literal "HH:mm" strings; `anchor: "sunrise"`/`"sunset"` uses them as an
 * offset in minutes from that day's actual sunrise/sunset (negative = before,
 * positive = after) — Chiang Mai's sunrise drifts by nearly 40 minutes across
 * the year, so a clock time alone would be wrong for half of it.
 */
export interface TimeWindow {
  label: LocalizedText;
  anchor: "clock" | "sunrise" | "sunset";
  start: string | number;
  end: string | number;
  quality: "ideal" | "good" | "acceptable";
}

export type GoldenHourType = "sunrise" | "sunset" | "blue_hour" | "night";
export type Exposure = "indoor" | "covered" | "outdoor";
export type SensitivityLevel = "none" | "moderate" | "high";

/** Practical entry requirements — the canonical case is a temple requiring modest dress. */
export interface DressCode {
  coverShoulders: boolean;
  coverKnees: boolean;
  removeShoes: boolean;
  /** Anything that doesn't fit the boolean flags, e.g. a men-only interior. */
  note: LocalizedText | null;
}

export interface Place {
  slug: string;
  name: LocalizedText;
  category: PlaceCategory;
  district: District;
  bestTime: BestTime[];
  durationMinutes: number;
  priceLevel: PriceLevel;
  rating: number;
  shortDescription: LocalizedText;
  description: LocalizedText;
  localTip: LocalizedText;
  /** Free-text hours as shown to visitors (e.g. "Daily, 6:00 AM – 6:00 PM"). See `openingHours` for the structured, calculable version. */
  openingHoursText: LocalizedText;
  address: LocalizedText;
  coordinates: { lat: number; lng: number };
  /** Metres above sea level — set for hill/mountain places to flag altitude-sensitive routing and display. null where elevation isn't a meaningful distinguishing factor (ordinary city-floor sites). */
  elevation: number | null;
  tags: string[];
  paletteSeed: number;
  /** Primarily an outdoor experience — used for weather-aware itinerary suggestions. */
  outdoor: boolean;

  // ── Time dimension ──────────────────────────────────────────────
  /**
   * Structured daily hours, paired with `closedOnDays`. null when the place
   * has no single well-defined opening window (e.g. a district of
   * independently-run shops) — see PHASE0-TODO.md for which places this
   * applies to and why.
   */
  openingHours: OpeningHours | null;
  /** Days of the week (0=Sunday..6=Saturday) the place is NOT open. Empty array = open every day it has hours for. */
  closedOnDays: number[];
  /** Known date ranges the place is closed for (renovation, seasonal, etc). null = none currently known/verified. */
  seasonalClosure: DateRange[] | null;
  /** Specific windows worth timing a visit around, beyond the general `bestTime` category. Empty when no window more specific than `bestTime` is documented yet. */
  bestTimeWindows: TimeWindow[];
  goldenHourType: GoldenHourType | null;

  // ── Weather vulnerability ───────────────────────────────────────
  exposure: Exposure;
  rainSensitivity: SensitivityLevel;
  /** Sensitivity to haze-season PM2.5 — both air quality AND view-dependent experiences (fog-sea viewpoints, mountain vistas) count as sensitive here. */
  dustSensitivity: SensitivityLevel;
  /** 1 (sit and look) to 5 (strenuous hike) — feeds the Pace Meter. */
  physicalIntensity: 1 | 2 | 3 | 4 | 5;

  // ── Visitor requirements ────────────────────────────────────────
  dressCode: DressCode | null;
  requiresBooking: boolean;
  /** ISO date this place's practical details (hours, dress code, etc.) were last checked against a live source. null = not yet verified — see PHASE0-TODO.md. */
  dataLastVerified: string | null;
}

export interface GuideSection {
  heading: LocalizedText;
  body: LocalizedText;
}

export interface Guide {
  slug: string;
  title: LocalizedText;
  dek: LocalizedText;
  coverSeed: number;
  readMinutes: number;
  publishedAt: string;
  relatedPlaceSlugs: string[];
  sections: GuideSection[];
}

// ── Trip (Phase 0.2): date-anchored itinerary ──────────────────────

export type TravelMode = "walk" | "songthaew" | "grab" | "rented-bike" | "rented-car";

export interface TripStop {
  placeSlug: string;
  /** "HH:mm", 24h — computed by the scheduler unless `userLocked`. null while unscheduled. */
  plannedArrival: string | null;
  /** True once the user has manually pinned this stop's time — the scheduler must never move it. */
  userLocked: boolean;
}

export interface TripDay {
  /** ISO "YYYY-MM-DD", derived from Trip.startDate + this day's index. null when the trip has no start date yet. */
  date: string | null;
  stops: TripStop[];
}

export interface Trip {
  id: string;
  title: string;
  /** ISO "YYYY-MM-DD". null means the user hasn't chosen a date yet — every date-dependent feature must degrade gracefully in that state. */
  startDate: string | null;
  baseLocation: { lat: number; lng: number; label: string } | null;
  days: TripDay[];
  travelMode: TravelMode;
}
