"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { SignInPromptModal } from "@/components/auth/sign-in-prompt-modal";
import { cn } from "@/lib/utils";

/**
 * The heart. Signed out, it opens the same inviting sign-in modal used for
 * saving a plan rather than doing nothing or redirecting — the brief treats
 * this as an invitation, not a gate.
 */
export function FavoriteButton({
  slug,
  placeName,
  className,
  size = "default",
}: {
  slug: string;
  placeName: string;
  className?: string;
  size?: "default" | "large";
}) {
  const { dict } = useLocale();
  const t = dict.favorites;
  const { isFavorite, isSignedIn, toggle } = useFavorites();
  const [promptOpen, setPromptOpen] = useState(false);

  const active = isFavorite(slug);
  const iconSize = size === "large" ? "h-5 w-5" : "h-4 w-4";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // Hearts sit inside linked cards; without this, favouriting would
          // also navigate to the place.
          event.preventDefault();
          event.stopPropagation();
          if (!isSignedIn) {
            setPromptOpen(true);
            return;
          }
          toggle(slug);
        }}
        // aria-pressed conveys the on/off state to screen readers; the label
        // names the place so a list of hearts isn't 100 identical buttons.
        aria-pressed={active}
        aria-label={(active ? t.removeFrom : t.addTo).replace("{place}", placeName)}
        title={(active ? t.removeFrom : t.addTo).replace("{place}", placeName)}
        className={cn(
          "flex items-center justify-center rounded-full border bg-background/90 p-2 backdrop-blur-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          active
            ? "border-accent text-accent-text"
            : "border-border text-muted-foreground hover:border-accent hover:text-accent-text",
          className
        )}
      >
        <Heart className={cn(iconSize, active && "fill-current")} aria-hidden="true" />
      </button>

      <SignInPromptModal open={promptOpen} onClose={() => setPromptOpen(false)} variant="favorite" />
    </>
  );
}
