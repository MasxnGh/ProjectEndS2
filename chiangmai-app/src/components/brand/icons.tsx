import {
  createLucideIcon,
  Coffee,
  Compass,
  House,
  Landmark,
  Mountain,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { PlaceCategory } from "@/data/types";
import { cx } from "./cx";

/** Line icons are 1.75px everywhere (DESIGN.md); lucide's default is 2. */
export const ICON_STROKE = 1.75;

/**
 * A Lanna temple roof, tier on tier. Lucide has no temple, so this is drawn on
 * its 24px grid and takes the same props, which lets it sit among the others.
 */
export const Temple = createLucideIcon("temple", [
  ["path", { d: "M12 2v3", key: "spire" }],
  ["path", { d: "M10 5h4l1 4H9z", key: "tier-1" }],
  ["path", { d: "M7.5 9h9l1.5 5h-12z", key: "tier-2" }],
  ["path", { d: "M5 14h14l1.5 4h-17z", key: "tier-3" }],
  ["path", { d: "M3 22h18M5 18v4M19 18v4M10 22v-3h4v3", key: "base" }],
]);

export const categoryIcon: Record<PlaceCategory, LucideIcon> = {
  temple: Temple,
  nature: Mountain,
  village: House,
  cafe: Coffee,
  restaurant: Utensils,
  market: Store,
  museum: Landmark,
  activity: Compass,
};

/** The order categories are offered in: what most visitors come for first. */
export const CATEGORY_ORDER: PlaceCategory[] = [
  "temple",
  "nature",
  "cafe",
  "restaurant",
  "village",
  "market",
  "museum",
  "activity",
];

/**
 * The board's four-point sparkle. It marks the one thing that matters on a
 * screen, so use it at most once per page (The One Sunset Rule).
 */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("size-5 flex-none fill-spark", className)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </svg>
  );
}

/** The board's single brush stroke, under a tagline. At most one per page. */
export function Brush({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 12" aria-hidden="true" className={cx("block h-3 w-24 text-spark", className)}>
      <path
        d="M3 8.5C22 4 52 2.5 93 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
