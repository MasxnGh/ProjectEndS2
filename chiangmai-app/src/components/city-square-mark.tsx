import { cn } from "@/lib/utils";

/**
 * The old city, drawn to scale.
 *
 * Chiang Mai's historic core is a real square: a moat, a wall inside it, a gate
 * in the middle of each side and a bastion (แจ่ง) at each corner. That is the
 * shape locals navigate by, so it is the site's mark and — with `point` — its
 * position indicator, rather than an abstract diamond that could belong to any
 * travel site.
 *
 * `point` takes the 0–1 coordinates from `locateInSquare()`, where 0,0 is the
 * north-west bastion. Values outside that range land outside the walls and are
 * clamped to the drawing's outer margin, so a place in Nimman shows west of the
 * moat instead of being pinned to the wall itself.
 */

/** The moat ring in viewBox units. The wall sits inside it, the gates cross it. */
const MOAT = { x: 1.5, size: 21 };
const WALL = { x: 4.25, size: 15.5 };

export function CitySquareMark({
  size = 20,
  point,
  showGates = true,
  showBastions = false,
  className,
}: {
  size?: number;
  /** Normalised position from locateInSquare(); null draws the mark alone. */
  point?: { x: number; y: number } | null;
  showGates?: boolean;
  /** Off by default — four corner dots turn to mud below about 28px. */
  showBastions?: boolean;
  className?: string;
}) {
  const wallEnd = WALL.x + WALL.size;
  const mid = WALL.x + WALL.size / 2;
  const gate = 2.6;

  // Places outside the walls still have to sit somewhere sensible, so the
  // drawable band runs from the moat to a little beyond it.
  const clamp = (v: number) => Math.max(-0.28, Math.min(1.28, v));
  const plotted = point ? { x: clamp(point.x), y: clamp(point.y) } : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      {/* Moat */}
      <rect
        x={MOAT.x}
        y={MOAT.x}
        width={MOAT.size}
        height={MOAT.size}
        rx="1"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
      />
      {/* Wall */}
      <rect
        x={WALL.x}
        y={WALL.x}
        width={WALL.size}
        height={WALL.size}
        rx="0.5"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
      />
      {showGates ? (
        <g stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
          <path d={`M${mid - gate / 2} ${WALL.x} H${mid + gate / 2}`} stroke="var(--color-background)" />
          <path d={`M${mid - gate / 2} ${wallEnd} H${mid + gate / 2}`} stroke="var(--color-background)" />
          <path d={`M${WALL.x} ${mid - gate / 2} V${mid + gate / 2}`} stroke="var(--color-background)" />
          <path d={`M${wallEnd} ${mid - gate / 2} V${mid + gate / 2}`} stroke="var(--color-background)" />
        </g>
      ) : null}
      {showBastions ? (
        <g fill="var(--color-accent)">
          <circle cx={WALL.x} cy={WALL.x} r="1.1" />
          <circle cx={wallEnd} cy={WALL.x} r="1.1" />
          <circle cx={WALL.x} cy={wallEnd} r="1.1" />
          <circle cx={wallEnd} cy={wallEnd} r="1.1" />
        </g>
      ) : null}
      {plotted ? (
        <circle
          cx={WALL.x + plotted.x * WALL.size}
          cy={WALL.x + plotted.y * WALL.size}
          r="1.9"
          fill="var(--color-tertiary)"
          stroke="var(--color-background)"
          strokeWidth="1"
        />
      ) : null}
    </svg>
  );
}
