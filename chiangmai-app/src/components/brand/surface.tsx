import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { Sparkle } from "./icons";

/**
 * The page column: 1280px of content, with a 16 / 24 / 32px gutter on phone,
 * tablet and desktop.
 */
export function Wrap({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("mx-auto w-full max-w-[calc(1280px+4rem)] px-4 sm:px-6 lg:px-8", className)} {...rest} />;
}

/**
 * The one card surface: 16px corners, hairline, soft green-tinted float.
 * Never nest one Box inside another (DESIGN.md); use space and hairlines.
 */
export function Box({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-lg border border-line bg-panel shadow-float", className)} {...rest} />;
}

/**
 * A local's tip on a sand ground, titled with the sparkle. It is usually the
 * page's one sparkle, so don't add another nearby.
 */
export function Tip({
  title,
  headingLevel: Heading = "h2",
  className,
  children,
}: {
  title: ReactNode;
  headingLevel?: "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside className={cx("grid gap-2 rounded-lg bg-sand-fill p-6 font-brand text-ink", className)}>
      <Heading className="flex items-center gap-2 text-title text-brand">
        <Sparkle />
        {title}
      </Heading>
      <div className="text-body text-pretty">{children}</div>
    </aside>
  );
}
