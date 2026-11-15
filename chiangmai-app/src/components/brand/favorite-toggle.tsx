"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import { cx } from "./cx";
import { ICON_STROKE } from "./icons";
import { iconButtonStyles, type IconButtonTone } from "./icon-button";
import { fill } from "./place-text";
import { SignInPrompt } from "./sign-in-prompt";

/**
 * The heart, on the real favourites list.
 *
 * Favourites belong to an account, so signed out the heart asks you to sign in
 * rather than pretending to save. Signed in, it flips at once and the request
 * follows (the provider is optimistic and rolls back on failure).
 *
 * `tone="on-photo"` is for a card, where it sits on the photograph.
 */
export function FavoriteToggle({
  slug,
  placeName,
  tone = "on-photo",
  className,
}: {
  slug: string;
  placeName: string;
  tone?: IconButtonTone;
  className?: string;
}) {
  const { dict } = useLocale();
  const { isFavorite, isSignedIn, toggle } = useFavorites();
  const [promptOpen, setPromptOpen] = useState(false);
  // A list shows a heart per card, so the sign-in dialog is only built once a
  // heart is first pressed, then kept so the browser can return focus on close.
  const [promptMounted, setPromptMounted] = useState(false);
  const active = isFavorite(slug);
  const label = fill(active ? dict.favorites.removeFrom : dict.favorites.addTo, { place: placeName });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isSignedIn) return toggle(slug);
          setPromptMounted(true);
          setPromptOpen(true);
        }}
        aria-pressed={active}
        aria-label={label}
        title={label}
        className={cx(
          iconButtonStyles({ tone, size: tone === "on-photo" ? "sm" : "md" }),
          // 40px to look at, 44px to hit: the pseudo-element widens the target
          // without making the heart crowd a small photo.
          "relative before:absolute before:-inset-0.5 before:rounded-full before:content-['']",
          // Pressed: a filled heart in a deepened sunset, not a green disc — the
          // heart is the one place the board's warm accent marks a state. The
          // board's own sunset is 2.2:1 on white; #b4561c is 4.8:1.
          tone === "on-photo"
            ? "aria-pressed:bg-cmj-surface aria-pressed:text-[#b4561c]"
            : "aria-pressed:bg-well aria-pressed:text-[#b4561c] dark:aria-pressed:text-cmj-sunset",
          className,
        )}
      >
        <Heart
          aria-hidden
          strokeWidth={ICON_STROKE}
          className={cx("size-5 transition-transform duration-200 ease-brand", active && "scale-110 fill-current")}
        />
      </button>
      {promptMounted ? (
        <SignInPrompt open={promptOpen} onClose={() => setPromptOpen(false)} variant="favorite" />
      ) : null}
    </>
  );
}
