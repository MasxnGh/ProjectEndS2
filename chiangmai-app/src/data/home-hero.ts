/**
 * The home page's hero photograph.
 *
 * It has a file of its own (public/images/hero/) instead of being a place's
 * photo, so the home page gets the golden-hour light DESIGN.md asks for while
 * the place page keeps its daytime view, which shows more of the place.
 */
export const HOME_HERO = {
  /** Its key in the photo manifest and the credits. */
  photo: "home-hero",
  /** The place it shows: named in the caption and in the credits list. */
  place: "twin-royal-pagodas-inthanon",
} as const;
