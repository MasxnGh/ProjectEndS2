import Link from "next/link";
import { cx, focusRing } from "./cx";
import { MARK_SPARKLE, MARK_STROKES, MARK_VIEWBOX } from "./mark";

/**
 * The mark from the owner's brand board: a mountain ridge drawn in one line,
 * with the orange sparkle above it. Redrawn as SVG from the board; replace the
 * paths when final artwork arrives, the component's shape stays.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={cx("h-auto w-[46px] flex-none", className)}>
      <path d={MARK_SPARKLE} className="fill-spark" />
      {MARK_STROKES.map(({ d, width }) => (
        <path
          key={d}
          d={d}
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
  className,
}: {
  href: string;
  /** Accessible name, e.g. dict.ui.logoHome. */
  label: string;
  tone?: "brand" | "sand";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        // min-h-11: the mark is 36px tall, the link is the 44px thumb target.
        "inline-flex min-h-11 flex-none items-center gap-2.5 rounded-sm",
        tone === "brand" ? "text-brand" : "text-cmj-sand",
        focusRing,
        className,
      )}
    >
      <BrandMark />
      <Wordmark />
    </Link>
  );
}
