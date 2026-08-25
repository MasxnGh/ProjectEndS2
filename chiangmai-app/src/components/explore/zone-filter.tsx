"use client";

import type { SquareBucket } from "@/lib/city-square";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/**
 * Filtering by where a place sits relative to the old city wall.
 *
 * The other filters on this page are chips and dropdowns, and a seventh one
 * would have disappeared among them. This is the control the site is built
 * around: Chiang Mai's core is a square, and "north of the moat" or "west,
 * toward Doi Suthep" is how directions are actually given here — more useful to
 * someone deciding where to spend a morning than a district name they have not
 * learnt yet.
 *
 * The regions are real <button> elements positioned over the drawing rather
 * than SVG shapes. They are rectangles, which is a simplification of the
 * geography, but it buys keyboard focus, screen-reader naming and hit targets
 * for free — and the drawing underneath still shows the true shape.
 */

/** Region insets as percentages, outside in: bands, moat ring, then the walls. */
const BAND = 22;
const RING = 30;

const REGION_STYLE: Record<Exclude<SquareBucket, "beyond">, React.CSSProperties> = {
  north: { top: 0, left: 0, right: 0, height: `${BAND}%` },
  south: { bottom: 0, left: 0, right: 0, height: `${BAND}%` },
  west: { left: 0, top: `${BAND}%`, bottom: `${BAND}%`, width: `${BAND}%` },
  east: { right: 0, top: `${BAND}%`, bottom: `${BAND}%`, width: `${BAND}%` },
  // The moat sits under the walls: clicking the gap between them hits this.
  wall: { inset: `${BAND}%` },
  inside: { inset: `${RING}%` },
};

/**
 * Paint order, and it matters.
 *
 * The moat region is a full rectangle that contains the walled one, so whichever
 * is rendered last wins the clicks in the middle. Listing `wall` first and
 * `inside` after it means the centre selects the old city and only the margin
 * between the two selects the moat — which is also how the two sit on the
 * ground. Reversed, the centre of the square selected "on the moat".
 */
const ORDER: Exclude<SquareBucket, "beyond">[] = [
  "north",
  "west",
  "wall",
  "inside",
  "east",
  "south",
];

export function ZoneFilter({
  value,
  onChange,
  counts,
  className,
}: {
  value: SquareBucket | null;
  onChange: (zone: SquareBucket | null) => void;
  /** How many results each zone would yield under the other active filters. */
  counts: Partial<Record<SquareBucket, number>>;
  className?: string;
}) {
  const { dict } = useLocale();
  const t = dict.square;

  const label = (zone: SquareBucket) => {
    const count = counts[zone] ?? 0;
    return `${t.zones[zone]} — ${count}`;
  };

  const toggle = (zone: SquareBucket) => onChange(value === zone ? null : zone);

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <div
        role="group"
        aria-label={t.title}
        className="relative aspect-square w-44 shrink-0 select-none"
      >
        {/* The drawing. Purely decorative — every label lives on the buttons. */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect
            x={BAND}
            y={BAND}
            width={100 - BAND * 2}
            height={100 - BAND * 2}
            rx="1.5"
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth="0.8"
          />
          <rect
            x={RING}
            y={RING}
            width={100 - RING * 2}
            height={100 - RING * 2}
            rx="1"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.4"
          />
          <g stroke="var(--color-background)" strokeWidth="2.4">
            <path d={`M44 ${RING} H56`} />
            <path d={`M44 ${100 - RING} H56`} />
            <path d={`M${RING} 44 V56`} />
            <path d={`M${100 - RING} 44 V56`} />
          </g>
          <g fill="var(--color-accent)">
            <circle cx={RING} cy={RING} r="1.6" />
            <circle cx={100 - RING} cy={RING} r="1.6" />
            <circle cx={RING} cy={100 - RING} r="1.6" />
            <circle cx={100 - RING} cy={100 - RING} r="1.6" />
          </g>
        </svg>

        {ORDER.map((zone) => {
          const selected = value === zone;
          const count = counts[zone] ?? 0;
          return (
            <button
              key={zone}
              type="button"
              style={REGION_STYLE[zone]}
              onClick={() => toggle(zone)}
              aria-pressed={selected}
              aria-label={label(zone)}
              disabled={count === 0 && !selected}
              className={cn(
                "absolute rounded-[3px] transition-colors",
                "hover:bg-accent/12 focus-visible:bg-accent/12",
                selected && "bg-accent/22 ring-1 ring-accent",
                count === 0 && !selected && "cursor-not-allowed opacity-40"
              )}
            />
          );
        })}

        {/* Compass letters, matching the landing-page map. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 font-mono text-[10px] text-muted-foreground"
        >
          <span className="absolute left-1/2 top-0.5 -translate-x-1/2">N</span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2">S</span>
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2">W</span>
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2">E</span>
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground text-pretty">
          {value ? t.zones[value] : t.legend}
        </p>
        <button
          type="button"
          onClick={() => toggle("beyond")}
          aria-pressed={value === "beyond"}
          disabled={(counts.beyond ?? 0) === 0 && value !== "beyond"}
          className={cn(
            "mt-3 w-full rounded-md border px-3 py-2 text-left text-sm transition-colors sm:w-auto",
            value === "beyond"
              ? "border-accent bg-accent/12 text-accent-text"
              : "border-border hover:border-border-strong",
            (counts.beyond ?? 0) === 0 && value !== "beyond" && "cursor-not-allowed opacity-40"
          )}
        >
          {t.zones.beyond}
          <span className="ml-2 font-mono tabular-nums text-muted-foreground">
            {counts.beyond ?? 0}
          </span>
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-3 block text-sm font-medium text-accent-text hover:underline"
          >
            {dict.explore.filters.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}
