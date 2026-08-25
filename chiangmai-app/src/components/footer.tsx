"use client";

import Link from "next/link";
import { CitySquareMark } from "@/components/city-square-mark";
import { Section } from "@/components/ui/section";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/**
 * The site footer.
 *
 * It was three thin link columns, which is what a small site looks like from
 * the bottom. The destinations here were always reachable — favourites, saved
 * trips, the account page — they just were not listed, so the footer implied
 * the site was smaller than it is.
 *
 * The closing band carries the data attributions. OpenStreetMap's ODbL and the
 * CC BY-SA photos both require credit to be reachable from anywhere the work is
 * used, so this is a licence obligation with a permanent home, not decoration.
 */
export function Footer() {
  const { locale, dict } = useLocale();
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: dict.footer.explore,
      links: [
        { href: `/${locale}/explore`, label: dict.nav.explore },
        { href: `/${locale}/guides`, label: dict.nav.guides },
        { href: `/${locale}/planner`, label: dict.nav.planner },
      ],
    },
    {
      heading: dict.footer.yours,
      links: [
        { href: `/${locale}/my-trips`, label: dict.myTrips.navLabel },
        { href: `/${locale}/favorites`, label: dict.favorites.navLabel },
        { href: `/${locale}/account`, label: dict.account.navLabel },
      ],
    },
    {
      heading: dict.footer.company,
      links: [
        { href: `/${locale}/credits`, label: dict.credits.navLabel },
        { href: `/${locale}/privacy`, label: dict.footer.privacy },
        { href: `/${locale}/terms`, label: dict.footer.terms },
      ],
    },
  ];

  return (
    <footer className="no-print border-t border-border bg-surface">
      <Section width="wide" rhythm="tight" className="lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.6fr))] lg:gap-16">
          <div className="max-w-sm">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-3 font-serif-display text-2xl tracking-tight"
            >
              <CitySquareMark size={34} showBastions />
              Chiangmai Journey
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground text-pretty">
              {dict.footer.about}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{dict.footer.madeIn}</p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {column.heading}
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-foreground/85 transition-colors hover:text-accent-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Moat and wall: the divider motif, a hairline above a heavier rule.
            Used only where a real boundary is being drawn. */}
        <div className={cn("mt-16 border-t border-border", "shadow-[0_3px_0_-2px_var(--color-border-strong)]")} />

        <div className="mt-8 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {dict.meta.siteName}. {dict.footer.rights}
          </p>
          <p className="text-pretty">{dict.weather.attribution}</p>
        </div>
      </Section>
    </footer>
  );
}
