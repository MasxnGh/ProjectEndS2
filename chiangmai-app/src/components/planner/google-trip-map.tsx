"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { loadMapsLibrary, loadRoutesLibrary, isGoogleMapsConfigured } from "@/lib/google-maps/loader";
import { mapStyle } from "@/lib/google-maps/map-style";
import { numberedMarkerIcon } from "@/lib/google-maps/marker-icon";
import { estimateTravelMinutes } from "@/lib/trip-calculations";
import { haversineKm } from "@/lib/geo";
import { cn } from "@/lib/utils";

const CHIANGMAI_CENTER = { lat: 18.82, lng: 98.98 };
const dayColors = ["#c9a24b", "#2f4a3c", "#a6553b", "#1a1a17"];

interface TripDay {
  id: string;
  dayNumber: number;
  places: Place[];
}

interface DayRouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  isReal: boolean;
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

export function GoogleTripMap({ days, className }: { days: TripDay[]; className?: string }) {
  const { locale, dict } = useLocale();
  const reorderDay = useTripStore((s) => s.reorderDay);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const routeClassRef = useRef<typeof google.maps.routes.Route | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    isGoogleMapsConfigured ? "loading" : "error"
  );
  const [routeInfo, setRouteInfo] = useState<Record<string, DayRouteInfo>>({});
  const [optimizingDay, setOptimizingDay] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsConfigured || !containerRef.current) return;
    let cancelled = false;

    Promise.all([loadMapsLibrary(), loadRoutesLibrary()])
      .then(([{ Map, InfoWindow }, { Route }]) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new Map(containerRef.current, {
          center: CHIANGMAI_CENTER,
          zoom: 11,
          styles: mapStyle,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        infoWindowRef.current = new InfoWindow();
        routeClassRef.current = Route;
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load Google Maps", err);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((l) => l.setMap(null));
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasAny = false;

    days.forEach((day, dayIndex) => {
      const color = dayColors[dayIndex % dayColors.length];

      day.places.forEach((place, i) => {
        const position = { lat: place.coordinates.lat, lng: place.coordinates.lng };
        const marker = new google.maps.Marker({
          map,
          position,
          title: place.name[locale],
          icon: numberedMarkerIcon(color, i + 1),
          zIndex: 5,
        });
        marker.addListener("click", () => {
          if (!infoWindowRef.current) return;
          infoWindowRef.current.setContent(
            `<div style="font-family:var(--font-sans);min-width:160px">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:${color}">${dict.planner.day} ${day.dayNumber} · #${i + 1}</p>
              <p style="margin:0;font-weight:600">${place.name[locale]}</p>
            </div>`
          );
          infoWindowRef.current.open({ map, anchor: marker });
        });
        markersRef.current.push(marker);
        bounds.extend(position);
        hasAny = true;
      });

      if (day.places.length > 1) {
        fetchDayRoute(day, color);
      } else {
        setRouteInfo((prev) => {
          const { [day.id]: _removed, ...rest } = prev;
          void _removed;
          return rest;
        });
      }
    });

    async function fetchDayRoute(day: TripDay, color: string) {
      const RouteClass = routeClassRef.current;
      if (!RouteClass) {
        drawFallbackPolyline(day, color);
        return;
      }
      try {
        const { routes } = await RouteClass.computeRoutes({
          origin: day.places[0].coordinates,
          destination: day.places[day.places.length - 1].coordinates,
          intermediates: day.places.slice(1, -1).map((p) => ({ location: p.coordinates })),
          travelMode: "DRIVING",
          fields: ["distanceMeters", "durationMillis", "path", "legs"],
        });
        if (cancelled) return;
        const route = routes?.[0];
        if (!route) throw new Error("No route returned");

        const polylines = route.createPolylines({
          polylineOptions: { map, strokeColor: color, strokeOpacity: 0.85, strokeWeight: 3 },
        });
        polylinesRef.current.push(...polylines);

        setRouteInfo((prev) => ({
          ...prev,
          [day.id]: {
            distanceMeters: route.distanceMeters ?? 0,
            durationSeconds: (route.durationMillis ?? 0) / 1000,
            isReal: true,
          },
        }));
      } catch (err) {
        if (cancelled) return;
        console.warn("Route computation failed, falling back to estimate", err);
        drawFallbackPolyline(day, color);
        setUsedFallback(true);

        let travelMinutes = 0;
        let distanceKm = 0;
        for (let i = 0; i < day.places.length - 1; i++) {
          travelMinutes += estimateTravelMinutes(day.places[i], day.places[i + 1]);
          distanceKm += haversineKm(day.places[i].coordinates, day.places[i + 1].coordinates);
        }
        setRouteInfo((prev) => ({
          ...prev,
          [day.id]: { distanceMeters: distanceKm * 1000, durationSeconds: travelMinutes * 60, isReal: false },
        }));
      }
    }

    function drawFallbackPolyline(day: TripDay, color: string) {
      polylinesRef.current.push(
        new google.maps.Polyline({
          map,
          path: day.places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng })),
          strokeColor: color,
          strokeOpacity: 0.6,
          strokeWeight: 2,
        })
      );
    }

    if (!hasAny) {
      map.setCenter(CHIANGMAI_CENTER);
      map.setZoom(11);
    } else {
      map.fitBounds(bounds, 48);
    }

    return () => {
      cancelled = true;
    };
  }, [days, status, locale, dict]);

  async function handleOptimize(day: TripDay) {
    const RouteClass = routeClassRef.current;
    if (!RouteClass || day.places.length < 3) return;
    setOptimizingDay(day.id);
    try {
      const { routes } = await RouteClass.computeRoutes({
        origin: day.places[0].coordinates,
        destination: day.places[day.places.length - 1].coordinates,
        intermediates: day.places.slice(1, -1).map((p) => ({ location: p.coordinates })),
        travelMode: "DRIVING",
        optimizeWaypointOrder: true,
        fields: ["optimizedIntermediateWaypointIndices"],
      });
      const order = routes?.[0]?.optimizedIntermediateWaypointIndices;
      if (!order) return;
      const middle = day.places.slice(1, -1);
      const reordered = [day.places[0], ...order.map((i) => middle[i]), day.places[day.places.length - 1]];
      reorderDay(
        day.id,
        reordered.map((p) => p.slug)
      );
    } catch (err) {
      console.warn("Route optimization failed", err);
    } finally {
      setOptimizingDay(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className={cn("relative overflow-hidden rounded-lg border border-border bg-surface-muted", className)}>
        <div ref={containerRef} className="h-full w-full" />
        {status !== "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-muted p-6 text-center">
            {status === "loading" ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
            ) : (
              <p className="text-sm text-muted-foreground">{dict.common.mapUnavailable}</p>
            )}
          </div>
        ) : null}
      </div>

      {usedFallback ? <p className="text-xs text-muted-foreground">{dict.planner.route.fallbackNotice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((day, dayIndex) => {
          const info = routeInfo[day.id];
          const mapsUrl = googleMapsDirectionsUrl(day.places);
          return (
            <div key={day.id} className="rounded-md border border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: dayColors[dayIndex % dayColors.length] }}
                  />
                  {dict.planner.day} {day.dayNumber}
                </p>
                {day.places.length >= 3 ? (
                  <button
                    type="button"
                    onClick={() => handleOptimize(day)}
                    disabled={optimizingDay === day.id}
                    className="no-print flex items-center gap-1 text-xs font-medium text-accent-text hover:underline disabled:opacity-60"
                  >
                    <Sparkles className="h-3 w-3" />
                    {optimizingDay === day.id ? dict.planner.route.optimizing : dict.planner.route.optimize}
                  </button>
                ) : null}
              </div>

              {info ? (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {dict.planner.route.totalDistance}: {(info.distanceMeters / 1000).toFixed(1)} km
                  </span>
                  <span>
                    {dict.planner.route.totalDuration}: {Math.round(info.durationSeconds / 60)} {dict.common.minutes}
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
