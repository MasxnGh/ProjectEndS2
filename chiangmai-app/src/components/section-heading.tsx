import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "left",
  className,
}: {
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
      <h2 className="font-serif-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
