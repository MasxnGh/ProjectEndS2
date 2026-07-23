"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { useLocale } from "@/components/providers/locale-provider";

export function Footer() {
  const { locale, dict } = useLocale();
  const [subscribed, setSubscribed] = useState(false);
  const year = new Date().getFullYear();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubscribed(true);
  }

  return (
    <footer className="no-print border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
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
              <li><Link href={`/${locale}/contact`} className="hover:text-accent-text">{dict.footer.contact}</Link></li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-accent-text">{dict.footer.privacy}</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-accent-text">{dict.footer.terms}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif-display text-lg">{dict.home.newsletter.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{dict.home.newsletter.body}</p>
            {subscribed ? (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-secondary">
                <Check className="h-4 w-4" /> {dict.home.newsletter.success}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 flex items-center border-b border-border-strong focus-within:border-accent">
                <label htmlFor="newsletter-email" className="sr-only">
                  {dict.home.newsletter.placeholder}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  placeholder={dict.home.newsletter.placeholder}
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-accent-text"
                  aria-label={dict.home.newsletter.cta}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
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
