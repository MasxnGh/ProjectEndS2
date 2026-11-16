import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cx, focusRing } from "./cx";
import { ICON_STROKE } from "./icons";

/**
 * The browser's own <select> in a mist pill, with a drawn chevron so it reads
 * the same in both themes. Native, so phones open their own picker. With a
 * mouse, where the browser allows it, the open list is styled as a brand
 * dropdown too (`.cmj-select` in app/brand.css). data-lenis-prevent lets the
 * wheel scroll that open list; the site's smooth scroll would otherwise take
 * it and move the page instead.
 */
export function Select({ className, wrapperClassName, ...rest }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span className={cx("relative inline-flex min-w-0", wrapperClassName)}>
      <select
        data-lenis-prevent
        className={cx(
          "cmj-select h-11 w-full min-w-0 cursor-pointer rounded-full border-0 bg-well pr-10 pl-4 font-brand text-label text-ink",
          "transition-colors duration-150 ease-brand hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
          focusRing,
          className,
        )}
        {...rest}
      />
      <ChevronDown
        aria-hidden
        strokeWidth={ICON_STROKE}
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-soft"
      />
    </span>
  );
}
