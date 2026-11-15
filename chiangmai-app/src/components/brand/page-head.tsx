import type { ReactNode } from "react";
import { cx } from "./cx";
import { Brush } from "./icons";

/**
 * The title block of a plain page (guides, my trips, favourites, account,
 * credits, legal): a large green title, an optional brush stroke, and one
 * short paragraph. No kicker above it (DESIGN.md).
 */
export function PageHead({
  title,
  intro,
  brush,
  className,
  children,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** The board's brush underline; at most one per page. */
  brush?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cx("grid max-w-[720px] gap-3 pt-10 pb-8 sm:pt-14 sm:pb-10", className)}>
      <h1 className="text-[clamp(2.25rem,1.7rem+2.4vw,3.5rem)] leading-[1.2] font-semibold text-balance text-brand">
        {title}
      </h1>
      {brush ? <Brush /> : null}
      {intro ? <p className="text-[1.125rem] leading-[1.6] text-pretty text-ink-soft">{intro}</p> : null}
      {children}
    </header>
  );
}
