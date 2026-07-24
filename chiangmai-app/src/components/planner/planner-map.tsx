"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import { ExternalLink } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import { haversineKm } from "@/lib/geo/distance";
import { applyBrandMapTheme } from "@/lib/map/theme";
import { dayStats, formatMinutes } from "@/lib/trip-calculations";
import { cn } from "@/lib/utils";

function totalDistanceKm(placesInOrder: Place[]) {
  let total = 0;
  for (let i = 0; i < placesInOrder.length - 1; i++) {
    total += haversineKm(placesInOrder[i].coordinates, placesInOrder[i + 1].coordinates);
  }
  return total;
}

export const DAY_COLORS = ["#c9a24b", "#2f4a3c", "#a6553b", "#8a6a2f", "#5a7c68", "#cb8064"];

export interface TripDay {
  id: string;
  dayNumber: number;
  places: Place[];
}

function googleMapsDirectionsUrl(placesInOrder: Place[]) {
  if (placesInOrder.length === 0) return "";
  const origin = placesInOrder[0].coordinates;
  const destination = placesInOrder[placesInOrder.length - 1].coordinates;
  const waypoints = placesInOrder
    .slice(1, -1)
    .map((p) => `${p.coordinates.lat},${p.coordinates.lng}`)
    .join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function PlannerMap({ days, className }: { days: TripDay[]; className?: string }) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [mapError, setMapError] = useState(false);
  const [popup, setPopup] = useState<{ dayId: string; slug: string } | null>(null);

  const styleUrl = `/api/map/style${resolvedTheme === "dark" ? "?theme=dark" : ""}`;

  const allPlaces = useMemo(() => days.flatMap((d) => d.places), [days]);
  const bounds = useMemo(() => {
    const box = computeBoundingBox(allPlaces.map((p) => p.coordinates));
    return box ? boundingBoxToLngLatBounds(box) : null;
  }, [allPlaces]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(bounds, { padding: 56, duration: reduced ? 0 : 800, maxZoom: 14 });
  }, [bounds]);

  useEffect(() => {
    if (!popup) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPopup(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [popup]);

  function flyToDay(day: TripDay) {
    const map = mapRef.current?.getMap();
    const box = computeBoundingBox(day.places.map((p) => p.coordinates));
    if (!map || !box) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.fitBounds(boundingBoxToLngLatBounds(box), { padding: 72, duration: reduced ? 0 : 800, maxZoom: 15 });
  }

  const popupDay = popup ? days.find((d) => d.id === popup.dayId) : null;
  const popupPlace = popupDay?.places.find((p) => p.slug === popup?.slug) ?? null;
  const popupColor = popupDay ? DAY_COLORS[days.indexOf(popupDay) % DAY_COLORS.length] : undefined;

  return (
    <div className="space-y-6">
      {mapError ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-lg border border-border bg-surface-muted p-6 text-center",
            className
          )}
        >
          <p className="text-sm text-muted-foreground">{dict.common.mapUnavailable}</p>
        </div>
      ) : (
        <div
          className={cn("overflow-hidden rounded-lg border border-border", className)}
          role="region"
          aria-label={dict.planner.mapAriaLabel}
        >
          <MapGL
            ref={mapRef}
            mapStyle={styleUrl}
            initialViewState={
              bounds ? { bounds, fitBoundsOptions: { padding: 56 } } : { longitude: 98.99, latitude: 18.79, zoom: 11 }
            }
            style={{ width: "100%", height: "100%" }}
            onLoad={(event) => applyBrandMapTheme(event.target, resolvedTheme)}
            onError={() => setMapError(true)}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {days.map((day, dayIndex) => {
              if (day.places.length < 2) return null;
              const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
              const routeGeoJson = {
                type: "Feature" as const,
                properties: {},
                geometry: {
                  type: "LineString" as const,
                  coordinates: day.places.map((p) => [p.coordinates.lng, p.coordinates.lat] as [number, number]),
                },
              };
              return (
                <Source key={`route-${day.id}`} id={`route-${day.id}`} type="geojson" data={routeGeoJson}>
                  <Layer
                    id={`route-line-${day.id}`}
                    type="line"
                    layout={{ "line-cap": "round", "line-join": "round" }}
                    paint={{
                      "line-color": color,
                      "line-width": 2.5,
                      "line-dasharray": [0.2, 1.4],
                      "line-opacity": 0.85,
                    }}
                  />
                </Source>
              );
            })}

            {days.flatMap((day, dayIndex) => {
              const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
              return day.places.map((place, i) => (
                <Marker
                  key={`${day.id}-${place.slug}`}
                  longitude={place.coordinates.lng}
                  latitude={place.coordinates.lat}
                  anchor="center"
                >
                  <button
                    type="button"
                    onClick={() => setPopup({ dayId: day.id, slug: place.slug })}
                    aria-label={`${dict.planner.day} ${day.dayNumber} #${i + 1} ${place.name[locale]}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: color, color: "var(--color-background)" }}
                  >
                    {i + 1}
                  </button>
                </Marker>
              ));
            })}

            {popupPlace && popupDay ? (
              <Popup
                longitude={popupPlace.coordinates.lng}
                latitude={popupPlace.coordinates.lat}
                anchor="bottom"
                offset={16}
                closeButton
                onClose={() => setPopup(null)}
              >
                <div className="p-1 font-sans">
                  <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: popupColor }}>
                    {dict.planner.day} {popupDay.dayNumber} · #
                    {popupDay.places.findIndex((p) => p.slug === popupPlace.slug) + 1}
                  </p>
                  <p className="mt-1 font-serif-display text-sm text-foreground">{popupPlace.name[locale]}</p>
                </div>
              </Popup>
            ) : null}
          </MapGL>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((day, dayIndex) => {
          const stats = dayStats(day.places);
          const mapsUrl = googleMapsDirectionsUrl(day.places);
          return (
            <div key={day.id} className="rounded-md border border-border p-4 text-sm">
              <button
                type="button"
                onClick={() => flyToDay(day)}
                disabled={day.places.length === 0}
                className="flex items-center gap-2 font-medium disabled:cursor-default"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: DAY_COLORS[dayIndex % DAY_COLORS.length] }}
                />
                {dict.planner.day} {day.dayNumber}
              </button>

              {day.places.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {dict.planner.route.totalDistance}: ~{totalDistanceKm(day.places).toFixed(1)} km
                  </span>
                  <span>
                    {dict.planner.route.totalDuration}: {formatMinutes(stats.travelMinutes)}
                  </span>
                </div>
              ) : null}

              <ul className="mt-2 space-y-1 text-muted-foreground">
                {day.places.map((place, i) => (
                  <li key={place.slug} className="truncate">
                    {i + 1}. {place.name[locale]}
                  </li>
                ))}
                {day.places.length === 0 ? <li>{dict.planner.dayEmptyBody}</li> : null}
              </ul>

              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="no-print mt-3 flex items-center gap-1.5 text-xs font-medium text-accent-text hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {dict.planner.route.openInGoogleMaps}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
