"use client";

import Link from "next/link";
import { Check, Clock, MapPin, Plus, Star } from "lucide-react";
import type { Place } from "@/data/types";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number, locale: "en" | "th", labels: { minutes: string; hours: string }) {
  if (minutes < 60) return `${minutes} ${labels.minutes}`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${labels.hours}`;
}

export function PlaceCard({ place, className }: { place: Place; className?: string }) {
  const { locale, dict } = useLocale();
  const isPlanned = useTripStore((s) => s.isPlanned(place.slug));
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow duration-300 hover:shadow-elevated",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlaceImage
          category={place.category}
          paletteSeed={place.paletteSeed}
          label={place.name[locale]}
          photoSrc={getPlacePhoto(place.slug)}
          quality={70}
          className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground backdrop-blur-sm">
          {dict.common.categories[place.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif-display text-xl leading-snug">{place.name[locale]}</h3>
          <span className="flex shrink-0 items-center gap-1 pt-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent-text" />
            {place.rating}
          </span>
        </div>

        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
          {place.shortDescription[locale]}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {dict.common.districts[place.district]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(place.durationMinutes, locale, dict.common)}
          </span>
          <span aria-label={dict.common.price[place.priceLevel]}>
            {"฿".repeat(place.priceLevel)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => (isPlanned ? removeFromPlan(place.slug) : addPlace(place.slug))}
        className={cn(
          "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200",
          isPlanned
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border-strong bg-background/85 text-foreground hover:bg-accent hover:text-accent-foreground backdrop-blur-sm"
        )}
        aria-label={isPlanned ? dict.common.addedToPlan : dict.common.addToPlan}
        aria-pressed={isPlanned}
      >
        {isPlanned ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      <Link
        href={`/${locale}/place/${place.slug}`}
        className="absolute inset-0 z-0"
        aria-label={`${dict.common.viewDetails}: ${place.name[locale]}`}
      />
    </div>
  );
}
