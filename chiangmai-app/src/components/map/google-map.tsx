"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { loadMapsLibrary, isGoogleMapsConfigured } from "@/lib/google-maps/loader";
import { mapStyle } from "@/lib/google-maps/map-style";
import { categoryMarkerIcon } from "@/lib/google-maps/marker-icon";
import { cn } from "@/lib/utils";

const CHIANGMAI_CENTER = { lat: 18.82, lng: 98.98 };

interface GoogleMapProps {
  places: Place[];
  className?: string;
  showRoute?: boolean;
  routeColor?: string;
  highlightSlugs?: string[];
  linkToDetail?: boolean;
  onMarkerClick?: (place: Place) => void;
}

export function GoogleMap({
  places,
  className,
  showRoute = false,
  routeColor = "#c9a24b",
  highlightSlugs = [],
  linkToDetail = true,
  onMarkerClick,
}: GoogleMapProps) {
  const { locale, dict } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    isGoogleMapsConfigured ? "loading" : "error"
  );

  // Initialize the map once.
  useEffect(() => {
    if (!isGoogleMapsConfigured || !containerRef.current) return;
    let cancelled = false;

    loadMapsLibrary()
      .then(({ Map, InfoWindow }) => {
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

  // Sync markers + route whenever places change.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (places.length === 0) {
      map.setCenter(CHIANGMAI_CENTER);
      map.setZoom(11);
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    places.forEach((place) => {
      const position = { lat: place.coordinates.lat, lng: place.coordinates.lng };
      const emphasized = highlightSlugs.includes(place.slug);
      const marker = new google.maps.Marker({
        map,
        position,
        title: place.name[locale],
        icon: categoryMarkerIcon(place.category, { emphasized }),
        zIndex: emphasized ? 10 : 1,
      });

      marker.addListener("click", () => {
        onMarkerClick?.(place);
        if (infoWindowRef.current) {
          const detailHref = `/${locale}/place/${place.slug}`;
          infoWindowRef.current.setContent(
            `<div style="font-family:var(--font-sans);min-width:160px">
              <p style="margin:0 0 4px;font-weight:600">${place.name[locale]}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#6c6555">${dict.common.categories[place.category]}</p>
              ${
                linkToDetail
                  ? `<a href="${detailHref}" style="font-size:12px;font-weight:500;color:#8a6a2f">${dict.common.viewDetails}</a>`
                  : ""
              }
            </div>`
          );
          infoWindowRef.current.open({ map, anchor: marker });
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (showRoute && places.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        map,
        path: places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng })),
        strokeColor: routeColor,
        strokeOpacity: 0.85,
        strokeWeight: 2.5,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }],
      });
    }

    if (places.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 48);
    }
  }, [places, status, locale, showRoute, routeColor, highlightSlugs, linkToDetail, onMarkerClick, dict]);

  return (
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
  );
}
