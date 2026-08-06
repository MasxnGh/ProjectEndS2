"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import { ExternalLink, MapPin } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";
import { sliceLineProgress } from "@/lib/geo/polyline";
import { applyBrandMapTheme } from "@/lib/map/theme";
import { MapPinIcon } from "@/components/map/map-pin-icon";
import { dayStats, formatMinutes } from "@/lib/trip-calculations";
import { useDayRoute } from "@/lib/routing/use-day-route";
import { cn } from "@/lib/utils";

function totalDistanceKm(placesInOrder: Place[]) {
  let total = 0;
  for (let i = 0; i < placesInOrder.length - 1; i++) {
    const a = placesInOrder[i];
    const b = placesInOrder[i + 1];
    total += estimateRoadDistanceKm(a.coordinates, b.coordinates, terrainBetween(a, b));
  }
  return total;
}

export const DAY_COLORS = ["#c9a24b", "#2f4a3c", "#a6553b", "#8a6a2f", "#5a7c68", "#cb8064"];

export interface TripDay {
  id: string;
  dayNumber: number;
  places: Place[];
}

/**
 * Draws one day's route line, preferring the real routed polyline
 * (lib/routing) and falling back to the existing straight line between
 * stops when a real route isn't available for every leg. Isolated into its
 * own component so its `useDayRoute` hook call is safe inside `days.map()`.
 */
function DayRouteLayer({ day, color }: { day: TripDay; color: string }) {
  const waypoints = useMemo(
    () =>
      day.places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng, elevation: p.elevation })),
    [day.places]
  );
  const { geometry } = useDayRoute(waypoints);

  const fullCoordinates = useMemo(
    () => geometry ?? day.places.map((p) => [p.coordinates.lng, p.coordinates.lat] as [number, number]),
    [geometry, day.places]
  );

  // Draws the line in progressively rather than popping in fully-formed —
  // restarts whenever the underlying route changes (e.g. the Haversine
  // placeholder upgrading to a real routed polyline once it resolves).
  const [drawProgress, setDrawProgress] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDrawProgress(1);
      return;
    }
    setDrawProgress(0);
    const DURATION_MS = 900;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setDrawProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fullCoordinates]);

  const routeGeoJson = useMemo(() => {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: sliceLineProgress(fullCoordinates, drawProgress) },
    };
  }, [fullCoordinates, drawProgress]);

  return (
    <Source id={`route-${day.id}`} type="geojson" data={routeGeoJson}>
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

export function PlannerMap({
  days,
  className,
  canvasOnly,
  hoveredSlug,
  onSelectPlace,
  pickingLocation,
  onPickLocation,
  onCancelPickLocation,
}: {
  days: TripDay[];
  className?: string;
  /** Renders just the map canvas, without the per-day distance/duration cards below it — used by the sticky desktop sidebar. */
  canvasOnly?: boolean;
  /** Slug of a place card being hovered elsewhere on the page — the matching pin is emphasized. */
  hoveredSlug?: string | null;
  /** Called when a pin (or its popup) is clicked, so the caller can scroll/highlight the matching place card. */
  onSelectPlace?: (dayId: string, slug: string) => void;
  /** True while the "Staying near" combobox has asked the user to click the map to set a base location. */
  pickingLocation?: boolean;
  onPickLocation?: (lngLat: { lat: number; lng: number }) => void;
  onCancelPickLocation?: () => void;
}) {
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

  // initialViewState already places the camera on mount, so skip the very
  // first run here — an animated fitBounds() firing at the same moment the
  // freshly-mounted container's ResizeObserver settles its size corrupts
  // MapLibre's internal camera state (a known race in react-map-gl's
  // camera-event handling). Only animate on genuine later bounds changes.
  const isFirstBoundsRun = useRef(true);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;
    if (isFirstBoundsRun.current) {
      isFirstBoundsRun.current = false;
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map.fitBounds(bounds, { padding: 56, duration: reduced ? 0 : 800, maxZoom: 14 });
    } catch (err) {
      console.error("Planner map fitBounds failed", err);
    }
    // Cancel any in-flight camera animation before the map is torn down or
    // re-triggered — otherwise its completion callback can fire against an
    // already-removed map instance and throw inside react-map-gl's internal
    // camera-event handler.
    return () => {
      try {
        map.stop();
      } catch (err) {
        console.error("Planner map stop() failed", err);
      }
    };
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
    try {
      map.fitBounds(boundingBoxToLngLatBounds(box), { padding: 72, duration: reduced ? 0 : 800, maxZoom: 15 });
    } catch (err) {
      console.error("Planner map flyToDay failed", err);
    }
  }

  const popupDay = popup ? days.find((d) => d.id === popup.dayId) : null;
  const popupPlace = popupDay?.places.find((p) => p.slug === popup?.slug) ?? null;
  const popupColor = popupDay ? DAY_COLORS[days.indexOf(popupDay) % DAY_COLORS.length] : undefined;

  return (
    <div className={canvasOnly ? "h-full" : "space-y-6"}>
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
          className={cn("relative overflow-hidden rounded-lg border border-border", className)}
          role="region"
          aria-label={dict.planner.mapAriaLabel}
        >
          {pickingLocation ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-3">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-accent bg-background px-4 py-2 text-xs font-medium shadow-elevated">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                {dict.planner.baseLocation.pinInstructions}
                <button
                  type="button"
                  onClick={onCancelPickLocation}
                  className="rounded-full border border-border-strong px-2.5 py-1 text-[11px] hover:border-accent hover:text-accent-text"
                >
                  {dict.planner.route.cancel}
                </button>
              </div>
            </div>
          ) : null}
          <MapGL
            ref={mapRef}
            mapStyle={styleUrl}
            initialViewState={
              bounds
                ? { bounds, fitBoundsOptions: { padding: 56, maxZoom: 14 } }
                : { longitude: 98.99, latitude: 18.79, zoom: 11 }
            }
            style={{ width: "100%", height: "100%", cursor: pickingLocation ? "crosshair" : undefined }}
            onLoad={(event) => applyBrandMapTheme(event.target, resolvedTheme)}
            onError={() => setMapError(true)}
            onClick={(event) => {
              if (pickingLocation) onPickLocation?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            }}
          >
            <NavigationControl position="top-right" showCompass={false} />

            {days.map((day, dayIndex) => {
              if (day.places.length < 2) return null;
              const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
              return <DayRouteLayer key={`route-${day.id}`} day={day} color={color} />;
            })}

            {days.flatMap((day, dayIndex) => {
              const color = DAY_COLORS[dayIndex % DAY_COLORS.length];
              return day.places.map((place, i) => {
                const isHovered = hoveredSlug === place.slug;
                return (
                  <Marker
                    key={`${day.id}-${place.slug}`}
                    longitude={place.coordinates.lng}
                    latitude={place.coordinates.lat}
                    anchor="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPopup({ dayId: day.id, slug: place.slug });
                        onSelectPlace?.(day.id, place.slug);
                      }}
                      aria-label={`${dict.planner.day} ${day.dayNumber} #${i + 1} ${place.name[locale]}`}
                      className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <MapPinIcon size={isHovered ? 38 : 30} color={color} label={i + 1} />
                    </button>
                  </Marker>
                );
              });
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

      {canvasOnly ? null : (
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
      )}
    </div>
  );
}
