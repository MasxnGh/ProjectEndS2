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
  openingHours: LocalizedText;
  address: LocalizedText;
  coordinates: { lat: number; lng: number };
  tags: string[];
  paletteSeed: number;
  /** Primarily an outdoor experience — used for weather-aware itinerary suggestions. */
  outdoor: boolean;
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
