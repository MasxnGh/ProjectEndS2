"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { EASE } from "@/lib/motion";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { HeaderWeatherWidget } from "@/components/weather/header-weather-widget";
import { useLocale } from "@/components/providers/locale-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { SignOutConfirmModal } from "@/components/auth/sign-out-confirm-modal";
import { useTripStore } from "@/lib/trip-store";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export function NavBar() {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionUser = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }
    : null;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const clearAll = useTripStore((s) => s.clearAll);
  const detachRemoteTrip = useTripStore((s) => s.detachRemoteTrip);

  function handleSignOutConfirm(keepLocalPlan: boolean) {
    if (!keepLocalPlan) clearAll();
    detachRemoteTrip();
    setSignOutConfirmOpen(false);
    signOut();
  }

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  /*
   * Whether the page has been scrolled, watched with a sentinel rather than a
   * scroll listener.
   *
   * The sentinel is a 24px box pinned at the document origin; it stops
   * intersecting the viewport at the same offset the previous `scrollY > 24`
   * check used. Two reasons to prefer it: the browser reports the crossing
   * instead of us re-reading scrollY on every scroll event, and it does not
   * assume who owns scrolling — Lenis drives this site and a listener bound to
   * the native event is one library change away from going quiet.
   */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const links = [
    { href: `/${locale}/explore`, label: dict.nav.explore },
    { href: `/${locale}/guides`, label: dict.nav.guides },
  ];

  /**
   * Which primary section the current page belongs to.
   *
   * The nav previously gave no indication of where you were, on any page. A
   * place detail page lives under Explore and a saved trip under the planner,
   * so matching the path prefix marks the section rather than only the exact
   * URL — otherwise the highlight vanishes the moment you open a result.
   */
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Anchored to the document origin, so it scrolls away with the page.
          Absolute with no positioned ancestor resolves against the initial
          containing block, which is what makes that work. */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-6 w-px"
      />
      <header
      className={cn(
        "no-print sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <Container
        width="wide"
        className={cn(
          "flex items-center justify-between transition-[height] duration-300",
          // Condenses once you are reading rather than arriving, which buys back
          // 16px of viewport on every scrolled page.
          scrolled ? "h-16" : "h-20"
        )}
      >
        <Link href={`/${locale}`} className="shrink-0 rounded-sm">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const current = isCurrent(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  current
                    ? "text-accent-text"
                    : "text-foreground/80 hover:text-foreground hover:bg-surface-muted"
                )}
              >
                {link.label}
                {current ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 -bottom-0.5 h-px bg-accent"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {/* Ambient controls sit together and quietly, so the one action that
              matters is the only filled element in the bar. */}
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface/60 px-1.5 py-1">
            <HeaderWeatherWidget />
            <LocaleToggle />
            <ThemeToggle />
          </div>
          <Link
            href={`/${locale}/planner`}
            aria-current={isCurrent(`/${locale}/planner`) ? "page" : undefined}
            className="ml-1 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors duration-200 hover:bg-accent-hover"
          >
            {dict.nav.startPlanning}
          </Link>
          {sessionUser ? (
            <UserMenu
              name={sessionUser.name}
              email={sessionUser.email}
              image={sessionUser.image}
              locale={locale}
              onSignOutRequest={() => setSignOutConfirmOpen(true)}
            />
          ) : (
            <Link
              href={`/${locale}/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-accent-text"
            >
              {dict.auth.signIn}
            </Link>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? dict.nav.close : dict.nav.menu}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-border bg-background lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-6">
              {links.map((link) => {
                const current = isCurrent(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-3 text-base font-medium",
                      current
                        ? "bg-surface-muted text-accent-text"
                        : "hover:bg-surface-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href={`/${locale}/planner`}
                className="mt-2 rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-accent-foreground"
              >
                {dict.nav.startPlanning}
              </Link>
              {sessionUser ? (
                <div className="mt-2 flex items-center justify-between rounded-md border border-border px-3 py-3">
                  <span className="truncate text-sm font-medium">
                    {sessionUser.name ?? sessionUser.email ?? dict.auth.menu.fallbackName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSignOutConfirmOpen(true)}
                    className="shrink-0 text-sm font-medium text-muted-foreground hover:text-accent-text"
                  >
                    {dict.auth.menu.signOut}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${locale}/login?callbackUrl=${encodeURIComponent(pathname)}`}
                  className="mt-2 rounded-md border border-border px-3 py-3 text-center text-sm font-medium hover:border-accent hover:text-accent-text"
                >
                  {dict.auth.signIn}
                </Link>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <HeaderWeatherWidget />
                <LocaleToggle />
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

        <SignOutConfirmModal
          open={signOutConfirmOpen}
          onClose={() => setSignOutConfirmOpen(false)}
          onConfirm={handleSignOutConfirm}
        />
      </header>
    </>
  );
}
