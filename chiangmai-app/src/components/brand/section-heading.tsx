import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * A section title followed by a hairline, as on the board ("Visual Style ———").
 * On a phone the hairline drops and the action sits beside the title.
 */
export function SectionHeading({
  id,
  as: Tag = "h2",
  action,
  className,
  children,
}: {
  /** Give the heading an id and point the section's aria-labelledby at it. */
  id?: string;
  as?: "h2" | "h3";
  /** Usually a ghost "see all" link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-8 sm:flex-nowrap sm:gap-6",
        className,
      )}
    >
      <Tag id={id} className="max-w-full flex-1 font-brand text-headline text-balance text-brand sm:flex-none">
        {children}
      </Tag>
      <span aria-hidden className="hidden h-px min-w-6 flex-1 bg-line-strong sm:block" />
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
