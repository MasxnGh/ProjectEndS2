"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${locale}/explore`, label: dict.nav.explore },
    { href: `/${locale}/guides`, label: dict.nav.guides },
  ];

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href={`/${locale}`} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium tracking-wide text-foreground/85 transition-colors hover:text-accent-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <HeaderWeatherWidget />
          <LocaleToggle />
          <ThemeToggle />
          <Link
            href={`/${locale}/planner`}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-transform duration-200 hover:scale-[1.03]"
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
              className="text-sm font-medium text-foreground/85 transition-colors hover:text-accent-text"
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
      </div>

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
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-3 text-base font-medium hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
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
  );
}
