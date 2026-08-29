"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import type { SquarePoint } from "@/lib/city-square-summary";
import { compressOutside, type SquareBucket } from "@/lib/city-square";
import { cn } from "@/lib/utils";

/**
 * The catalogue drawn on the plan of the old city.
 *
 * Every dot is a real place at its real coordinates, projected by
 * `locateInSquare()` onto a square whose edges are the walls. That is what
 * earns it the space: this is not an illustration of Chiang Mai, it is this
 * guide's own contents, and it shows at a glance that most of what is worth
 * visiting sits outside the moat rather than inside the tourist square.
 */

/** viewBox units. The wall sits inside the moat; the drawing extends past both. */
const VIEW = 200;
const WALL = { x: 46, size: 108 };
const MOAT_GAP = 7;

export function CitySquareMap({
  points,
  title,
  active,
  className,
}: {
  points: SquarePoint[];
  /** Accessible name — the section's own heading, so it is never invented here. */
  title: string;
  /** Zone being hovered in the legend beside the map; dims everything else. */
  active: SquareBucket | null;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();

  const wallEnd = WALL.x + WALL.size;
  const mid = WALL.x + WALL.size / 2;
  const moat = { x: WALL.x - MOAT_GAP, size: WALL.size + MOAT_GAP * 2 };

  // Drawn in wall-relative space, so a place west of the moat lands left of the
  // wall instead of on it.
  const px = (x: number) => WALL.x + compressOutside(x) * WALL.size;
  const py = (y: number) => WALL.x + compressOutside(y) * WALL.size;

  const isInner = (bucket: SquareBucket) => bucket === "inside" || bucket === "wall";

  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          variants: {
            hidden: { pathLength: 0, opacity: 0 },
            shown: {
              pathLength: 1,
              opacity: 1,
              transition: { duration: 1.1, delay, ease: EASE },
            },
          },
        };

  return (
    <motion.svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-labelledby={titleId}
      className={cn("w-full", className)}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.35 }}
    >
      <title id={titleId}>{title}</title>

      {/* Moat, then wall, then gates — the order the city was built in, and the
          order it reads best when drawn. */}
      <motion.rect
        x={moat.x}
        y={moat.x}
        width={moat.size}
        height={moat.size}
        rx="2"
        fill="none"
        stroke="var(--color-border-strong)"
        strokeWidth="1"
        {...draw(0)}
      />
      <motion.rect
        x={WALL.x}
        y={WALL.x}
        width={WALL.size}
        height={WALL.size}
        rx="1"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        {...draw(0.25)}
      />

      {/* Gates: gaps punched through the wall, painted in the page colour. */}
      <g stroke="var(--color-background)" strokeWidth="3.5">
        <path d={`M${mid - 7} ${WALL.x} H${mid + 7}`} />
        <path d={`M${mid - 7} ${wallEnd} H${mid + 7}`} />
        <path d={`M${WALL.x} ${mid - 7} V${mid + 7}`} />
        <path d={`M${wallEnd} ${mid - 7} V${mid + 7}`} />
      </g>

      {/* Bastions */}
      <g fill="var(--color-accent)">
        {[
          [WALL.x, WALL.x],
          [wallEnd, WALL.x],
          [WALL.x, wallEnd],
          [wallEnd, wallEnd],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6" />
        ))}
      </g>

      {/* Doi Suthep west, the Ping east: the two fixed points every local
          direction starts from, so the drawing names the compass. */}
      <g
        fill="var(--color-muted-foreground)"
        fontSize="7"
        fontFamily="var(--font-mono)"
        letterSpacing="1"
      >
        <text x="3" y={mid} dominantBaseline="middle">
          W
        </text>
        <text x={VIEW - 3} y={mid} textAnchor="end" dominantBaseline="middle">
          E
        </text>
        <text x={mid} y="9" textAnchor="middle">
          N
        </text>
        <text x={mid} y={VIEW - 4} textAnchor="middle">
          S
        </text>
      </g>

      <g>
        {points.map((point, i) => (
          <motion.circle
            key={i}
            cx={px(point.x)}
            cy={py(point.y)}
            r={isInner(point.bucket) ? 1.9 : 1.6}
            fill={isInner(point.bucket) ? "var(--color-accent)" : "var(--color-tertiary)"}
            className="transition-opacity duration-200"
            opacity={active !== null && active !== point.bucket ? 0.13 : 1}
            variants={
              reduce
                ? undefined
                : {
                    hidden: { scale: 0.3, opacity: 0 },
                    shown: {
                      scale: 1,
                      opacity: 1,
                      // Staggered in bands rather than one long chain, so 124
                      // dots settle in about a second instead of ninety.
                      transition: { delay: 0.9 + (i % 32) * 0.014, duration: 0.35 },
                    },
                  }
            }
          />
        ))}
      </g>
    </motion.svg>
  );
}
