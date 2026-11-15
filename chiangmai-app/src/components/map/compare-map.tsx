"use client";

import { useMemo, useState } from "react";
import { Route } from "lucide-react";
import type { Place } from "@/data/types";
import { places } from "@/data/places";
import { useLocale } from "@/components/providers/locale-provider";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";
import { findNearby } from "@/lib/geo/nearby";
import { estimateTravelMinutes } from "@/lib/trip-calculations";
import { ICON_STROKE } from "@/components/brand/icons";
import { fill } from "@/components/brand/place-text";
import { Select } from "@/components/brand/select";
import { PlaceMapLoader } from "@/components/map/place-map-loader";

const NEARBY_RADIUS_KM = 5;
const MAX_NEARBY_MARKERS = 6;

/**
 * The place page's map, with "how far is it from …?" underneath: pick any other
 * place and the map draws the two with a dashed line, and the road distance and
 * travel time come from the planner's own estimates.
 */
export function CompareMap({ place }: { place: Place }) {
  const { locale, dict } = useLocale();
  const t = dict.placePage;
  const [comparedSlug, setComparedSlug] = useState("");

  const otherPlaces = useMemo(
    () =>
      places
        .filter((p) => p.slug !== place.slug)
        .sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale)),
    [locale, place.slug],
  );

  const nearbyPlaces = useMemo(
    () =>
      findNearby(place.coordinates, otherPlaces, NEARBY_RADIUS_KM, (p) => p.coordinates)
        .slice(0, MAX_NEARBY_MARKERS)
        .map((result) => result.item),
    [place.coordinates, otherPlaces],
  );

  const compared = comparedSlug ? (places.find((p) => p.slug === comparedSlug) ?? null) : null;

  return (
    <div className="grid gap-3">
      <PlaceMapLoader
        mainPlace={place}
        nearbyPlaces={nearbyPlaces}
        comparePlace={compared}
        className="h-[220px] rounded-md"
      />
      <label className="grid gap-1.5">
        <span className="text-small text-ink-soft">{t.compareTitle}</span>
        <Select value={comparedSlug} onChange={(event) => setComparedSlug(event.target.value)} wrapperClassName="w-full">
          <option value="">{t.compareNone}</option>
          {otherPlaces.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name[locale]}
            </option>
          ))}
        </Select>
      </label>
      {compared ? (
        <p aria-live="polite" className="flex items-start gap-2 text-small text-brand tabular-nums">
          <Route aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none" />
          {fill(t.compareResult, {
            km: estimateRoadDistanceKm(place.coordinates, compared.coordinates, terrainBetween(place, compared)).toFixed(1),
            minutes: estimateTravelMinutes(place, compared),
          })}
        </p>
      ) : null}
    </div>
  );
}
