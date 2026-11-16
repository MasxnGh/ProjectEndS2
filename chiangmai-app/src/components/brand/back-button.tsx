"use client";

import { useEffect, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { parentPath } from "@/lib/back-target";
import { ICON_STROKE } from "./icons";
import { IconButtonLink } from "./icon-button";

/*
 * How many steps back stay on this site, for browsers without the Navigation
 * API. It can only undercount: a step it misses sends you to the parent page
 * instead of back, never off the site. Module state, because the header
 * remounts when the language changes and the count must survive that.
 */
const trail = { depth: 0, path: null as string | null, popped: false, replacing: false, listening: false };

function onPopState() {
  // A step back that keeps the path (a dialog's ?add= closing) was never counted.
  if (window.location.pathname === trail.path) return;
  trail.popped = true;
  trail.depth = Math.max(0, trail.depth - 1);
}

function useTrail(pathname: string) {
  useEffect(() => {
    if (trail.listening) return;
    trail.listening = true;
    window.addEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    // A new path that came neither from a step back nor from this button
    // replacing the page is one more step on the stack.
    if (trail.path !== null && trail.path !== pathname && !trail.popped && !trail.replacing) trail.depth += 1;
    trail.popped = false;
    trail.replacing = false;
    trail.path = pathname;
  }, [pathname]);
}

function canGoBackInSite() {
  // The Navigation API lists this site's entries only, so it knows for sure.
  const known = (window as Window & { navigation?: { canGoBack?: unknown } }).navigation?.canGoBack;
  return typeof known === "boolean" ? known : trail.depth > 0;
}

/**
 * Back, for phones: an installed app has no browser back button, and the
 * menu is a long reach for one step. With an earlier page on this site it
 * goes back to it, scroll position and filters included; without one it
 * replaces this page with its parent (parentPath), so pressing it again keeps
 * climbing towards home instead of bouncing between two pages. Hidden on home.
 */
export function BackButton({ className }: { className?: string }) {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  useTrail(pathname);

  if (pathname === `/${locale}`) return null;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // A modified click opens the parent page in a new tab, as any link does.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (canGoBackInSite()) {
      event.preventDefault();
      router.back();
    } else {
      trail.replacing = true;
    }
  }

  return (
    <IconButtonLink
      href={parentPath(pathname, locale)}
      replace
      label={dict.shell.back}
      tone="plain"
      onClick={onClick}
      className={className}
    >
      <ChevronLeft aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
    </IconButtonLink>
  );
}
