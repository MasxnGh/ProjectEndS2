import type { ComponentProps } from "react";
import Link from "next/link";
import { cx, focusRing } from "./cx";

export type IconButtonTone = "well" | "brand" | "plain" | "on-photo";
export type IconButtonSize = "md" | "sm" | "xs";

/**
 * The board's round icon button: a line icon centred in a circle. 44px is the
 * default because it is the smallest comfortable thumb target; 40 and 36 are
 * for places where the whole surrounding card is also a target.
 */
export function iconButtonStyles({
  tone = "well",
  size = "md",
}: { tone?: IconButtonTone; size?: IconButtonSize } = {}) {
  return cx(
    "inline-grid flex-none cursor-pointer place-items-center rounded-full",
    "transition-[background-color,color,translate] duration-150 ease-brand active:translate-y-px",
    "disabled:cursor-not-allowed disabled:opacity-45",
    "aria-pressed:bg-brand aria-pressed:text-on-brand",
    focusRing,
    { md: "size-11", sm: "size-10", xs: "size-9" }[size],
    {
      well: "bg-well text-brand hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
      brand: "bg-brand text-on-brand hover:bg-brand-hover",
      plain: "bg-transparent text-brand hover:bg-well",
      "on-photo": "bg-cmj-surface/92 text-cmj-green hover:bg-cmj-surface",
    }[tone],
  );
}

type Shared = {
  /** Required: an icon alone has no name, so this becomes the accessible name. */
  label: string;
  tone?: IconButtonTone;
  size?: IconButtonSize;
};

export function IconButton({
  label,
  tone,
  size,
  pressed,
  className,
  type = "button",
  ...rest
}: Shared & { pressed?: boolean } & Omit<ComponentProps<"button">, "aria-label" | "aria-pressed">) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx(iconButtonStyles({ tone, size }), className)}
      {...rest}
    />
  );
}

export function IconButtonLink({
  label,
  tone,
  size,
  className,
  ...rest
}: Shared & Omit<ComponentProps<typeof Link>, "aria-label">) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={cx(iconButtonStyles({ tone, size }), className)}
      {...rest}
    />
  );
}
