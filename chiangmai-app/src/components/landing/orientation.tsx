"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/reveal";
import { CitySquareMap } from "@/components/landing/city-square-map";
import { useLocale } from "@/components/providers/locale-provider";
import type { CategoryCount, SquarePoint, SquareZoneCount } from "@/lib/city-square-summary";
import type { SquareBucket } from "@/lib/city-square";
import { cn } from "@/lib/utils";

/**
 * Where the visitor gets their bearings.
 *
 * This one section replaces two: a heading block and eight square image tiles
 * whose photography mostly did not exist, so they rendered as gradients under a
 * heading that promised "five ways into the city" above eight of them. What
 * stands here instead is the guide's own contents plotted on the city's plan,
 * beside two counted indexes — by where a place is, and by what it is.
 *
 * Counts are computed on the server and passed in, so the catalogue does not
 * cross into the client bundle.
 */
export function Orientation({
  zones,
  points,
  categories,
}: {
  zones: SquareZoneCount[];
  points: SquarePoint[];
  categories: CategoryCount[];
}) {
  const { locale, dict } = useLocale();
  const t = dict.square;
  const [active, setActive] = useState<SquareBucket | null>(null);

  return (
    <Section width="wide" rhythm="default">
      <Reveal>
        <p className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-accent-text">
          <span className="h-px w-8 bg-accent" aria-hidden />
          {t.kicker}
        </p>
        <h2 className="max-w-2xl font-serif-display text-4xl tracking-tight text-balance sm:text-5xl">
          {t.title}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {t.body}
        </p>
      </Reveal>

      {/* Three columns on a desktop; on a tablet the map takes the full row and
          the two indexes sit side by side, which keeps this section from adding
          a third of the page's height on small screens. */}
      <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <Reveal className="mx-auto w-full max-w-[26rem] sm:col-span-2 lg:col-span-1 lg:mx-0">
          <CitySquareMap points={points} title={t.title} active={active} />
        </Reveal>

        <Reveal delay={0.1}>
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t.legend}
          </h3>
          <ul className="mt-4 border-t border-border">
            {zones.map((zone) => (
              <li key={zone.bucket} className="border-b border-border">
                <Link
                  href={`/${locale}/explore?zone=${zone.bucket}`}
                  onMouseEnter={() => setActive(zone.bucket)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(zone.bucket)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    "group flex items-baseline justify-between gap-4 px-1 py-3 transition-colors",
                    active === zone.bucket ? "bg-surface-muted" : "hover:bg-surface-muted"
                  )}
                >
                  <span className="flex items-center gap-3 text-sm group-hover:text-accent-text">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        zone.bucket === "inside" || zone.bucket === "wall"
                          ? "bg-accent"
                          : zone.bucket === "beyond"
                            ? "bg-border-strong"
                            : "bg-tertiary"
                      )}
                    />
                    {t.zones[zone.bucket]}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {zone.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t.beyondNote}</p>
        </Reveal>

        <Reveal delay={0.15}>
          <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {dict.home.categories.kicker}
          </h3>
          <ul className="mt-4 border-t border-border">
            {categories.map((entry) => (
              <li key={entry.category} className="border-b border-border">
                <Link
                  href={`/${locale}/explore?category=${entry.category}`}
                  className="group flex items-baseline justify-between gap-4 px-1 py-3 transition-colors hover:bg-surface-muted"
                >
                  <span className="flex items-center gap-1.5 text-sm group-hover:text-accent-text">
                    {dict.common.categories[entry.category]}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {entry.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/${locale}/explore`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
          >
            {dict.home.categories.viewAll}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </Section>
  );
}
