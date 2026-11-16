"use client";

import { Navigation, Share2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import { buttonStyles } from "@/components/brand/button";
import { cx } from "@/components/brand/cx";
import { FavoriteToggle } from "@/components/brand/favorite-toggle";
import { ICON_STROKE } from "@/components/brand/icons";
import { IconButton, iconButtonStyles } from "@/components/brand/icon-button";
import { PlanToggle } from "@/components/brand/plan-toggle";

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Share: the phone's own share sheet where there is one, otherwise the link is
 * copied and a toast says so.
 */
function ShareButton({ title }: { title: string }) {
  const { dict } = useLocale();
  const { showToast } = useToast();
  return (
    <IconButton
      label={dict.placePage.share}
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            // Closing the sheet is not an error worth showing.
          }
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          showToast({ message: dict.placePage.shareCopied });
        } catch {
          window.prompt(dict.placePage.share, url);
        }
      }}
    >
      <Share2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
    </IconButton>
  );
}

/** Heart, share, directions and add-to-plan, beside the title on a wide screen. */
export function PlaceActions({
  slug,
  name,
  coordinates,
}: {
  slug: string;
  name: string;
  coordinates: { lat: number; lng: number };
}) {
  const { dict } = useLocale();
  return (
    <div className="hidden flex-wrap items-center gap-2 lg:flex lg:justify-end">
      <FavoriteToggle slug={slug} placeName={name} tone="well" />
      <ShareButton title={name} />
      <a
        href={directionsUrl(coordinates.lat, coordinates.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonStyles({ variant: "secondary" })}
      >
        <Navigation aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        {dict.placePage.directions}
      </a>
      <PlanToggle slug={slug} placeName={name} variant="button" />
    </div>
  );
}

/**
 * The same actions on a phone, kept at the foot of the screen so they are
 * under the thumb however far down the page the reader is.
 */
export function PlaceDock({
  slug,
  name,
  coordinates,
}: {
  slug: string;
  name: string;
  coordinates: { lat: number; lng: number };
}) {
  const { dict } = useLocale();
  return (
    <div
      data-brand
      data-place-dock
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-line bg-panel px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] font-brand shadow-[0_-8px_24px_-16px_rgb(29_56_53/0.3)] lg:hidden"
    >
      <FavoriteToggle slug={slug} placeName={name} tone="well" />
      <a
        href={directionsUrl(coordinates.lat, coordinates.lng)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={dict.placePage.directions}
        title={dict.placePage.directions}
        className={cx(iconButtonStyles())}
      >
        <Navigation aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </a>
      <ShareButton title={name} />
      {/* flex-1 stretches the button, so its padding is only a minimum: px-4
          lets the longest label ("Add to plan", "อยู่ในแผนแล้ว") fit from
          340px. Below 360px the icon goes too; the words and the button's
          fill still tell the two states apart. */}
      <PlanToggle slug={slug} placeName={name} variant="button" className="flex-1 px-4 max-[359px]:[&>svg]:hidden" />
    </div>
  );
}
