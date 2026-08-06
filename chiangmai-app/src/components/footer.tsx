"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useLocale } from "@/components/providers/locale-provider";

export function Footer() {
  const { locale, dict } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="no-print border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{dict.footer.about}</p>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {dict.footer.explore}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href={`/${locale}/explore`} className="hover:text-accent-text">{dict.nav.explore}</Link></li>
              <li><Link href={`/${locale}/planner`} className="hover:text-accent-text">{dict.nav.planner}</Link></li>
              <li><Link href={`/${locale}/guides`} className="hover:text-accent-text">{dict.nav.guides}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {dict.footer.company}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="text-muted-foreground">{dict.footer.madeIn}</li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-accent-text">{dict.footer.privacy}</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-accent-text">{dict.footer.terms}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>&copy; {year} {dict.meta.siteName}. {dict.footer.rights}</p>
          <p>{dict.weather.attribution}</p>
        </div>
      </div>
    </footer>
  );
}
