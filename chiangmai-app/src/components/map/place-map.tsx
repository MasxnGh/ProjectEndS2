"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Map, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import { Star } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import { applyBrandMapTheme, mapAccent } from "@/lib/map/theme";
import { MapPinIcon } from "@/components/map/map-pin-icon";
import { cn } from "@/lib/utils";

interface PlaceMapProps {
  mainPlace: Place;
  nearbyPlaces?: Place[];
  comparePlace?: Place | null;
  className?: string;
}

export function PlaceMap({ mainPlace, nearbyPlaces = [], comparePlace = null, className }: PlaceMapProps) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const accent = mapAccent(resolvedTheme === "dark" ? "dark" : "light");
  const mapRef = useRef<MapRef>(null);
  const [popupPlace, setPopupPlace] = useState<Place | null>(null);
  const [mapError, setMapError] = useState(false);

  const styleUrl = `/api/map/style${resolvedTheme === "dark" ? "?theme=dark" : ""}`;

  useEffect(() => {
    if (!popupPlace) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPopupPlace(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [popupPlace]);

  const bounds = useMemo(() => {
    const points = [mainPlace, ...nearbyPlaces, ...(comparePlace ? [comparePlace] : [])].map(
      (p) => p.coordinates
    );
    const box = computeBoundingBox(points);
    return box ? boundingBoxToLngLatBounds(box) : null;
  }, [mainPlace, nearbyPlaces, comparePlace]);

  const hasSpread = Boolean(bounds && (bounds[0][0] !== bounds[1][0] || bounds[0][1] !== bounds[1][1]));

  const routeGeoJson = useMemo(() => {
    if (!comparePlace) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [mainPlace.coordinates.lng, mainPlace.coordinates.lat],
          [comparePlace.coordinates.lng, comparePlace.coordinates.lat],
        ],
      },
    };
  }, [mainPlace, comparePlace]);

  if (mapError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-surface-muted p-6 text-center",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">{dict.common.mapUnavailable}</p>
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border", className)}
      role="region"
      aria-label={dict.place.mapAriaLabel.replace("{name}", mainPlace.name[locale])}
    >
      <Map
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={
          hasSpread && bounds
            ? { bounds, fitBoundsOptions: { padding: 56 } }
            : { longitude: mainPlace.coordinates.lng, latitude: mainPlace.coordinates.lat, zoom: 13.5 }
        }
        style={{ width: "100%", height: "100%" }}
        onLoad={(event) => applyBrandMapTheme(event.target, resolvedTheme)}
        onError={() => setMapError(true)}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {routeGeoJson ? (
          <Source id="compare-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="compare-route-line"
              type="line"
              layout={{ "line-cap": "round" }}
              paint={{
                "line-color": accent,
                "line-width": 2,
                "line-dasharray": [0.2, 1.6],
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {nearbyPlaces.map((place) => (
          <Marker
            key={place.slug}
            longitude={place.coordinates.lng}
            latitude={place.coordinates.lat}
            anchor="bottom"
          >
            <Link
              href={`/${locale}/place/${place.slug}`}
              aria-label={place.name[locale]}
              className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <MapPinIcon size={22} emphasized={false} />
            </Link>
          </Marker>
        ))}

        {comparePlace ? (
          <Marker longitude={comparePlace.coordinates.lng} latitude={comparePlace.coordinates.lat} anchor="bottom">
            <button
              type="button"
              onClick={() => setPopupPlace(comparePlace)}
              aria-label={comparePlace.name[locale]}
              className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <MapPinIcon size={28} emphasized />
            </button>
          </Marker>
        ) : null}

        <Marker longitude={mainPlace.coordinates.lng} latitude={mainPlace.coordinates.lat} anchor="bottom">
          <button
            type="button"
            onClick={() => setPopupPlace(mainPlace)}
            aria-label={mainPlace.name[locale]}
            className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <MapPinIcon size={32} emphasized />
          </button>
        </Marker>

        {popupPlace ? (
          <Popup
            longitude={popupPlace.coordinates.lng}
            latitude={popupPlace.coordinates.lat}
            anchor="bottom"
            offset={36}
            closeButton
            onClose={() => setPopupPlace(null)}
          >
            <div className="min-w-40 p-1 font-sans">
              <p className="font-serif-display text-sm text-foreground">{popupPlace.name[locale]}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-accent text-accent-text" />
                {popupPlace.rating}
              </p>
              {popupPlace.slug !== mainPlace.slug ? (
                <Link
                  href={`/${locale}/place/${popupPlace.slug}`}
                  className="mt-1.5 inline-block text-xs font-medium text-accent-text hover:underline"
                >
                  {dict.common.viewDetails}
                </Link>
              ) : null}
            </div>
          </Popup>
        ) : null}
      </Map>
    </div>
  );
}
