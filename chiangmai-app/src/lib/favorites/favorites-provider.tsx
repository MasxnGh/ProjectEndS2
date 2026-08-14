"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";

interface FavoritesContextValue {
  /** Null until the first load resolves — lets a heart render neutral rather than flashing "not favourited". */
  slugs: Set<string> | null;
  isSignedIn: boolean;
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Holds the whole favourites set in one place so a grid of 100 place cards
 * costs a single request instead of one per card, and so a heart toggled on
 * the detail page is already correct when the user goes back to Explore.
 *
 * Every mutation is optimistic: the set changes first, the request follows,
 * and a failure puts the previous state back and says so. A heart that waits
 * on a round trip feels broken on a slow connection, and the cost of being
 * wrong for a moment here is one wrong icon — not lost work.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { showToast } = useToast();
  const { dict } = useLocale();
  const [slugs, setSlugs] = useState<Set<string> | null>(null);

  const isSignedIn = status === "authenticated";

  // Derived rather than cleared in the effect: signing out makes the stored
  // set irrelevant immediately, and deriving it here means there is no render
  // in which a signed-out visitor still sees the previous account's hearts.
  const visibleSlugs = isSignedIn ? slugs : null;

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok) return;
        const data = (await res.json()) as { slugs: string[] };
        if (!cancelled) setSlugs(new Set(data.slugs));
      } catch {
        // Leaving `slugs` null keeps every heart in its neutral state, which
        // is honest: we don't know yet. Toggling still works and will sync.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const toggle = useCallback(
    (slug: string) => {
      const currentlyFavorite = visibleSlugs?.has(slug) ?? false;
      const previous = slugs;

      setSlugs((current) => {
        const next = new Set(current ?? []);
        if (currentlyFavorite) next.delete(slug);
        else next.add(slug);
        return next;
      });

      (async () => {
        try {
          const res = currentlyFavorite
            ? await fetch(`/api/favorites?placeSlug=${encodeURIComponent(slug)}`, { method: "DELETE" })
            : await fetch("/api/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ placeSlug: slug }),
              });
          if (!res.ok) throw new Error(String(res.status));
        } catch {
          setSlugs(previous);
          showToast({ message: dict.favorites.saveFailed });
        }
      })();
    },
    [slugs, visibleSlugs, showToast, dict.favorites.saveFailed]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      slugs: visibleSlugs,
      isSignedIn,
      isFavorite: (slug: string) => visibleSlugs?.has(slug) ?? false,
      toggle,
    }),
    [visibleSlugs, isSignedIn, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  }
  return context;
}
