"use client";

import { useMemo, useState } from "react";
import { Navigation, Route } from "lucide-react";
import type { Place } from "@/data/types";
import { places } from "@/data/places";
import { GoogleMap } from "@/components/map/google-map";
import { useLocale } from "@/components/providers/locale-provider";
import { haversineKm } from "@/lib/geo";
import { estimateTravelMinutes } from "@/lib/trip-calculations";

export function CompareMap({ place }: { place: Place }) {
  const { locale, dict } = useLocale();
  const [comparedSlug, setComparedSlug] = useState("");

  const otherPlaces = useMemo(
    () =>
      places
        .filter((p) => p.slug !== place.slug)
        .sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale)),
    [locale, place.slug]
  );

  const compared = comparedSlug ? places.find((p) => p.slug === comparedSlug) ?? null : null;
  const mapPlaces = compared ? [place, compared] : [place];
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`;

  return (
    <div>
      <GoogleMap places={mapPlaces} showRoute={Boolean(compared)} className="h-64" />

      <div className="mt-3 space-y-2">
        <label htmlFor="compare-select" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {dict.place.compareLabel}
        </label>
        <select
          id="compare-select"
          value={comparedSlug}
          onChange={(e) => setComparedSlug(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent"
        >
          <option value="">{dict.place.compareNone}</option>
          {otherPlaces.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name[locale]}
            </option>
          ))}
        </select>

        {compared ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Route className="h-3.5 w-3.5 shrink-0" />
            {haversineKm(place.coordinates, compared.coordinates).toFixed(1)} km · ~
            {estimateTravelMinutes(place, compared)} {dict.common.minutes}
          </p>
        ) : null}

        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
        >
          <Navigation className="h-3.5 w-3.5" />
          {dict.common.address}
        </a>
      </div>
    </div>
  );
}
