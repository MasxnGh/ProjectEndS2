export type PlaceCategory =
  | "temple"
  | "nature"
  | "village"
  | "cafe"
  | "restaurant"
  | "market"
  | "museum"
  | "activity";

export type District =
  | "old-city"
  | "nimman"
  | "santitham"
  | "riverside"
  | "chang-klan"
  | "doi-suthep"
  | "doi-inthanon"
  | "mae-rim"
  | "mae-kampong"
  | "san-kamphaeng"
  | "san-sai"
  | "chiang-dao"
  | "chom-thong"
  | "saraphi"
  | "mae-wang"
  | "hang-dong"
  | "samoeng"
  | "chiang-mai-city"
  // Outer amphoe of the province, roughly north to south. The eighteen above
  // are the ones a visitor navigates by (neighbourhoods and named mountains);
  // these are administrative districts, which is how anything more than an
  // hour out of the city is actually signposted.
  | "mae-ai"
  | "fang"
  | "chai-prakan"
  | "wiang-haeng"
  | "phrao"
  | "mae-taeng"
  | "doi-saket"
  | "mae-on"
  | "galyani-vadhana"
  | "san-pa-tong"
  | "hot"
  | "omkoi"
  | "doi-tao";

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

/**
 * A dish worth ordering by name. `priceThb` is what one portion costs, not a
 * range — a single number is what a visitor can actually budget against, and
 * `null` says honestly that we could not confirm a current price rather than
 * printing a stale one.
 */
export interface SignatureDish {
  name: LocalizedText;
  /** Why this one and not the rest of the menu. */
  note: LocalizedText;
  priceThb: number | null;
}

/**
 * An award or listing, with the years it covers.
 *
 * `current` is the field that matters: a restaurant that HELD a Michelin
 * distinction and later lost it is a different claim from one that still holds
 * it, and a site that shows both the same way is misinforming the visitor.
 * `lastYear` is null exactly when `current` is true — an ongoing run has no end
 * yet.
 */
export interface Award {
  /** e.g. "Michelin Bib Gourmand", "Michelin Selected". */
  name: LocalizedText;
  /**
   * First year of the run, or null when only the current listing could be
   * confirmed. Michelin publishes one year at a time and Thai coverage tends to
   * say "five years running" without naming the first, so a null here means
   * "we know it holds this, not since when" — which beats back-computing a year
   * from a press phrase and presenting the arithmetic as fact.
   */
  firstYear: number | null;
  /** Final year of the run; null while it is ongoing. */
  lastYear: number | null;
  current: boolean;
  /** Where this was verified — kept in the data so a future check knows what to re-check. */
  source: string;
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

  /**
   * Stock-photo search term for `npm run fetch:photos`. Set ONLY for public
   * landmarks a generic photo can honestly represent (a temple, a waterfall, a
   * market). Deliberately absent for named businesses — a stock photo of "Thai
   * coffee shop" captioned as a specific café misleads the visitor, so those
   * fall back to <PlaceImage>'s illustrated gradient instead.
   */
  photoQuery?: string;

  // ── Depth: who this place is, beyond what it sells ──────────────
  // All four are optional and researched per place rather than filled in
  // wholesale. A place with no verifiable history is left without one; an
  // invented founding year would be worse than a missing section.

  /** Founding, lineage, where the recipe came from — the part a menu cannot tell you. */
  story?: LocalizedText;
  /** Dishes worth ordering by name, in the order we'd recommend trying them. */
  signatureDishes?: SignatureDish[];
  /** Awards and listings, newest run first. */
  awards?: Award[];
  /** Short practical or insider notes: cash only, unmarked entrance, sells out early. */
  insiderNotes?: LocalizedText[];
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
