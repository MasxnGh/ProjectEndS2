import { cn } from "@/lib/utils";

/**
 * A section's kicker, title and standfirst.
 *
 * The heading level is a prop because this renders both kinds of heading: the
 * name of a page and the name of a section within one. It was fixed at h2, so
 * six pages — Explore, the planner, the guides index, privacy, terms and
 * sign-in — had no h1 at all, and a screen-reader user landing on any of them
 * got a document that never said what it was.
 */
export function SectionHeading({
  as: Tag = "h2",
  kicker,
  title,
  subtitle,
  align = "left",
  className,
}: {
  /** Use "h1" when this is the page's own title. */
  as?: "h1" | "h2" | "h3";
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {kicker ? (
        <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-accent-text">
          {align !== "center" && <span className="h-px w-8 bg-accent" aria-hidden />}
          {kicker}
        </p>
      ) : null}
      <Tag className="font-serif-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
        {title}
      </Tag>
      {subtitle ? (
        <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
