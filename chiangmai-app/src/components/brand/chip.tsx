import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cx, focusRing } from "./cx";
import { ICON_STROKE } from "./icons";

/**
 * Chips filter or jump. Unselected they are mist pills; selected they turn
 * green with a check, so the state never rests on colour alone.
 */
export function chipStyles({ tone = "well" }: { tone?: "well" | "on-photo" } = {}) {
  return cx(
    "group/chip inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-[18px]",
    "font-brand text-label whitespace-nowrap",
    "transition-[background-color,color,border-color] duration-150 ease-brand",
    focusRing,
    tone === "well"
      ? "bg-well text-ink hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))] aria-pressed:bg-brand aria-pressed:text-on-brand"
      : "border-[1.5px] border-cmj-paper/60 bg-transparent text-cmj-paper hover:bg-cmj-paper/12",
  );
}

function Count({ value }: { value: ReactNode }) {
  return (
    <span className="font-normal text-ink-soft tabular-nums group-aria-pressed/chip:text-current group-aria-pressed/chip:opacity-80">
      {value}
    </span>
  );
}

export function Chip({
  pressed,
  icon,
  count,
  className,
  children,
  type = "button",
  ...rest
}: {
  /** Selected state. Leave undefined for a chip that acts rather than toggles. */
  pressed?: boolean;
  icon?: ReactNode;
  count?: ReactNode;
} & Omit<ComponentProps<"button">, "aria-pressed">) {
  return (
    <button type={type} aria-pressed={pressed} className={cx(chipStyles(), className)} {...rest}>
      {pressed ? <Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" /> : icon}
      {children}
      {count != null ? <Count value={count} /> : null}
    </button>
  );
}

/** A chip that navigates, e.g. the hero's "try: nature, temples, cafés". */
export function ChipLink({
  tone,
  icon,
  count,
  className,
  children,
  ...rest
}: { tone?: "well" | "on-photo"; icon?: ReactNode; count?: ReactNode } & ComponentProps<typeof Link>) {
  return (
    <Link className={cx(chipStyles({ tone }), className)} {...rest}>
      {icon}
      {children}
      {count != null ? <Count value={count} /> : null}
    </Link>
  );
}

/**
 * A row of chips. `scroll` keeps one line and scrolls sideways, which is what
 * a long category list needs on a phone; otherwise the row wraps.
 */
export function ChipRow({
  scroll = false,
  label,
  className,
  children,
}: {
  scroll?: boolean;
  /** Names the group for screen readers, e.g. "Place types". */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      className={cx(
        "flex gap-2",
        scroll ? "cmj-scroll-row min-w-0 flex-nowrap overflow-x-auto pb-0.5" : "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
}
