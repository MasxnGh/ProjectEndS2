"use client";

import { cn } from "@/lib/utils";

type Edge = "top" | "bottom" | "left" | "right";

const EDGE_CLASSES: Record<Edge, string> = {
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
};

/** Which way the content fades out — the mask runs from opaque to transparent toward the edge. */
const MASK_DIRECTION: Record<Edge, string> = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
};

/**
 * Fades the edge of a scrolling container, so a row that continues past the
 * fold looks like it continues instead of looking like it ends — adapted from
 * React Bits' Gradual Blur (https://reactbits.dev/animations/gradual-blur).
 *
 * The original stacks N backdrop-filtered layers for a true progressive blur.
 * This one stacks the same way but masks each layer, because the planner uses
 * it over a scrolling list of interactive cards: a plain blur would smear text
 * the traveller is trying to read, while a masked fade only softens the last
 * few pixels. `pointer-events-none` throughout — it must never eat a click on
 * the card underneath.
 */
export function GradualBlur({
  edge = "right",
  size = "5rem",
  layers = 4,
  strength = 1.5,
  /** Fades itself out when there is nothing more to scroll to. */
  visible = true,
  className,
}: {
  edge?: Edge;
  size?: string;
  layers?: number;
  strength?: number;
  visible?: boolean;
  className?: string;
}) {
  const isVertical = edge === "top" || edge === "bottom";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 transition-opacity duration-300",
        EDGE_CLASSES[edge],
        visible ? "opacity-100" : "opacity-0",
        className
      )}
      style={isVertical ? { height: size } : { width: size }}
    >
      {Array.from({ length: layers }, (_, i) => {
        // Each layer covers a shrinking slice nearest the edge and blurs
        // harder, which is what reads as a gradient rather than a hard line.
        const slice = ((i + 1) / layers) * 100;
        const mask = `linear-gradient(${MASK_DIRECTION[edge]}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${100 - slice}%, rgba(0,0,0,0) 100%)`;
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${(i + 1) * strength}px)`,
              WebkitBackdropFilter: `blur(${(i + 1) * strength}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      {/* A wash of the page colour under the blur, so the fade resolves into
          the background instead of into a grey smudge. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${MASK_DIRECTION[edge]}, transparent, var(--color-background))`,
        }}
      />
    </div>
  );
}
