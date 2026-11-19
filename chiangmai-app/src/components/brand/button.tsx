import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx, focusRing } from "./cx";
import { ICON_STROKE } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "on-photo";
export type ButtonSize = "md" | "sm";

/**
 * Pill buttons from the board. One primary per view; secondary is the mist
 * pill with a green outline; ghost is for a quiet "see all"; on-photo is the
 * light pill that sits on a photograph or the forest band.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  return cx(
    "group/btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent",
    "font-brand text-label leading-none whitespace-nowrap",
    "transition-[background-color,color,border-color,translate] duration-150 ease-brand active:translate-y-px",
    "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    // Busy is not unavailable: a button that is working (aria-busy, with
    // <RouteDots> in place of its icon) keeps its full colour and shows progress.
    "aria-busy:disabled:cursor-progress aria-busy:disabled:opacity-100",
    focusRing,
    size === "md" ? "min-h-12 px-7" : "min-h-11 px-5",
    {
      primary: "bg-brand text-on-brand hover:bg-brand-hover",
      secondary:
        "border-brand bg-well text-brand hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
      ghost: "bg-transparent px-3 text-brand hover:bg-well",
      "on-photo": "bg-cmj-surface text-cmj-green hover:bg-cmj-paper",
    }[variant],
  );
}

type Shared = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing arrow that nudges 2px on hover, as on the board's CTAs. */
  arrow?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
};

function Inner({ icon, arrow, children }: Shared & { children: ReactNode }) {
  return (
    <>
      {icon}
      {children}
      {arrow ? (
        <ArrowRight
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="size-4 transition-transform duration-150 ease-brand group-hover/btn:translate-x-0.5 motion-reduce:transition-none"
        />
      ) : null}
    </>
  );
}

export function Button({
  variant,
  size,
  arrow,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: Shared & ComponentProps<"button">) {
  return (
    <button type={type} className={cx(buttonStyles({ variant, size }), className)} {...rest}>
      <Inner icon={icon} arrow={arrow}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  arrow,
  icon,
  className,
  children,
  ...rest
}: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={cx(buttonStyles({ variant, size }), className)} {...rest}>
      <Inner icon={icon} arrow={arrow}>
        {children}
      </Inner>
    </Link>
  );
}
