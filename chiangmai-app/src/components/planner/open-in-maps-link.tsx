"use client";

import { ExternalLink, Map as MapIcon } from "lucide-react";
import type { Place } from "@/data/types";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from "@/lib/google-maps";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/**
 * Takes a finished day out to Google Maps.
 *
 * One component rather than the same anchor written out on each surface that
 * needs it — the board, the timeline and a shared trip. The interesting part is
 * not the anchor, it is the truncation notice: the Maps URL API accepts nine
 * waypoints between the ends, and a longer day has to lose some. That has to be
 * said in the label wherever the link appears, and saying it in three places
 * separately is how one of them ends up not saying it.
 */
export function OpenInMapsLink({
  places,
  variant = "labelled",
  className,
}: {
  places: Place[];
  /** `icon` for a crowded header row; `labelled` everywhere there is room. */
  variant?: "icon" | "labelled";
  className?: string;
}) {
  const { dict } = useLocale();
  const t = dict.planner.route;

  const directions = googleMapsDirectionsUrl(places);
  // A single stop is a place to open, not a route — the directions action needs
  // somewhere to travel from.
  const href = directions.url || (places.length === 1 ? googleMapsPlaceUrl(places[0]) : "");
  if (!href) return null;

  const label =
    directions.omitted > 0
      ? t.openInGoogleMapsTrimmed.replace("{count}", String(directions.omitted))
      : t.openInGoogleMaps;

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={label}
        className={cn(
          "no-print rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-accent-text",
          className
        )}
      >
        <MapIcon className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "no-print inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline",
        className
      )}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      {label}
    </a>
  );
}
