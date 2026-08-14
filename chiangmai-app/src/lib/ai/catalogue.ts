import { places } from "@/data/places";
import { SPEND_ESTIMATE_THB } from "@/lib/trip-calculations";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * One catalogue line per place, in the compact form the model reads to choose
 * from. Deliberately omits `description` and `localTip`: they are the longest
 * fields by far and describe *what a visit feels like*, which does not help the
 * model decide whether a place fits a budget, a category, or a time of day.
 */
function line(place: (typeof places)[number]): string {
  const parts = [
    place.slug,
    `${place.name.en} / ${place.name.th}`,
    place.category,
    place.district,
    "฿".repeat(place.priceLevel),
    `${place.durationMinutes}min`,
    `${place.rating}`,
    place.openingHours ? `${place.openingHours.opens}-${place.openingHours.closes}` : "hours vary",
  ];

  if (place.closedOnDays.length > 0) {
    parts.push(`closed ${place.closedOnDays.map((d) => DAY_NAMES[d]).join("/")}`);
  }
  if (place.requiresBooking) parts.push("booking required");
  if (place.outdoor) parts.push("outdoor");

  // Awards and dish names are the two things travellers ask for by name ("a
  // Michelin place", "somewhere for khao soi with beef"), so unlike
  // `description` they earn their tokens. Lapsed awards are marked rather than
  // dropped — a request for a current listing must not match a former one.
  if (place.awards?.length) {
    parts.push(
      place.awards
        .map((a) => `${a.name.en}${a.current ? " (current)" : " (no longer listed)"}`)
        .join("; ")
    );
  }
  if (place.signatureDishes?.length) {
    parts.push(`dishes: ${place.signatureDishes.map((d) => d.name.en).join(", ")}`);
  }

  parts.push(place.tags.join(", "));

  return parts.join(" | ");
}

/**
 * The place catalogue sent to the model.
 *
 * Sorted by slug so the rendered bytes are identical on every request — this
 * block sits behind a `cache_control` breakpoint, and prompt caching is a
 * prefix match, so any reordering silently turns every cache read into a
 * full-price cache write. `catalogue.test.ts` pins that stability.
 */
export function buildPlaceCatalogue(): string {
  const rows = [...places].sort((a, b) => a.slug.localeCompare(b.slug)).map(line);

  return [
    "FORMAT: slug | name EN / name TH | category | district | price | typical visit | rating | hours | [closed days] | [booking] | [outdoor] | [awards] | [dishes] | tags",
    "An award marked (no longer listed) is a past distinction — do not offer it as a current one.",
    "",
    ...rows,
    "",
    "Per-person spend estimate the planner applies, by price level:",
    `฿ = ${SPEND_ESTIMATE_THB[1]} THB, ฿฿ = ${SPEND_ESTIMATE_THB[2]} THB, ฿฿฿ = ${SPEND_ESTIMATE_THB[3]} THB.`,
    "Transport between stops is roughly 8 THB per km and is shared, not per person.",
  ].join("\n");
}
