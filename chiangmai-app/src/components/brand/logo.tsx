import Link from "next/link";
import { cx, focusRing } from "./cx";
import { MARK_SPARKLE, MARK_STROKES, MARK_VIEWBOX } from "./mark";

/**
 * The mark from the owner's brand board: a mountain ridge drawn in one line,
 * with the orange sparkle above it. Redrawn as SVG from the board; replace the
 * paths when final artwork arrives, the component's shape stays.
 */
export function BrandMark({ className, draw = false }: { className?: string; /** Draw the ridge and light the sparkle once, on load (app/motion.css). */ draw?: boolean }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      aria-hidden="true"
      className={cx("cmj-mark h-auto w-[46px] flex-none overflow-visible", draw && "cmj-mark-draw", className)}
    >
      <path d={MARK_SPARKLE} data-sparkle className="fill-spark" />
      {MARK_STROKES.map(({ d, width }) => (
        <path
          key={d}
          d={d}
          data-stroke
          // A path length of 1 lets the stroke animation draw any path in one go.
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={width}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

/** The wordmark is always Latin, in two lines, as on the board. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span lang="en" className={cx("grid text-[1.0625rem] leading-[1.05] font-semibold", className)}>
      <span>Chiangmai</span>
      <span className="font-medium">Journey</span>
    </span>
  );
}

/**
 * Mark and wordmark together, linking home. `tone="sand"` is for the dark
 * forest band (footer), where green would disappear.
 */
export function Logo({
  href,
  label,
  tone = "brand",
  draw = false,
  compact = false,
  className,
}: {
  href: string;
  /** Accessible name, e.g. dict.ui.logoHome. */
  label: string;
  tone?: "brand" | "sand";
  /** The header's logo draws itself once per page load. */
  draw?: boolean;
  /** Below 360px, the mark alone: the phone header also holds the back button. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        // min-h-11: the mark is 36px tall, the link is the 44px thumb target.
        "group/logo inline-flex min-h-11 flex-none items-center gap-2.5 rounded-sm",
        tone === "brand" ? "text-brand" : "text-cmj-sand",
        focusRing,
        className,
      )}
    >
      <BrandMark draw={draw} />
      <Wordmark className={compact ? "max-[359px]:hidden" : undefined} />
    </Link>
  );
}
