import type { ReactNode } from "react";
import Link from "next/link";
import { cx, focusRing } from "./cx";

export type BadgeTone = "well" | "sand" | "leaf" | "warn";

/**
 * Small facts in a pill: a category, a district, opening status. Sand and warn
 * keep the same colours in both themes, like a printed label; their text is
 * green on them (8.76:1 and 12.14:1).
 */
export function Badge({
  tone = "well",
  icon,
  href,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Makes the badge a link, e.g. to a place named in a guide. */
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const styles = cx(
    "inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-3 font-brand text-small font-medium",
    {
      well: "bg-well text-ink",
      sand: "bg-cmj-sand text-cmj-green",
      leaf: "bg-leaf-fill text-brand",
      warn: "bg-[color-mix(in_oklab,var(--cmj-sunset)_28%,var(--cmj-surface))] text-cmj-green-deep",
    }[tone],
    href && cx("transition-colors duration-150 hover:underline hover:underline-offset-2", focusRing),
    className,
  );
  return href ? (
    <Link href={href} className={styles}>
      {icon}
      {children}
    </Link>
  ) : (
    <span className={styles}>
      {icon}
      {children}
    </span>
  );
}
