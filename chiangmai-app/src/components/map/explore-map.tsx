"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import turfCircle from "@turf/circle";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { useTripStore } from "@/lib/trip-store";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import type { LatLng } from "@/lib/geo/distance";
import { applyBrandMapTheme } from "@/lib/map/theme";
import { MapPinIcon } from "@/components/map/map-pin-icon";
import { ExplorePopupCard } from "@/components/map/explore-popup-card";
import { AQI_COLORS } from "@/lib/weather/aqi";
import { pm25ToMarkerRadiusPx } from "@/lib/weather/aqi-layer";
import type { AirQualityResponse } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

interface PointProperties {
  slug: string;
}

interface ExploreMapProps {
  places: Place[];
  highlightSlugs?: string[];
  hoveredSlug?: string | null;
  onHoverPlace?: (slug: string | null) => void;
  reference?: LatLng | null;
  radiusKm?: number | null;
  pickingOnMap?: boolean;
  onMapPick?: (coords: LatLng) => void;
  airQualityBySlug?: Map<string, AirQualityResponse> | null;
  className?: string;
}

function isClusterFeature(
  feature: Supercluster.ClusterFeature<PointProperties> | Supercluster.PointFeature<PointProperties>
): feature is Supercluster.ClusterFeature<PointProperties> {
  return "cluster" in feature.properties && feature.properties.cluster === true;
}

export function ExploreMap({
  places,
  highlightSlugs = [],
  hoveredSlug = null,
  onHoverPlace,
  reference = null,
  radiusKm = null,
  pickingOnMap = false,
  onMapPick,
  airQualityBySlug = null,
  className,
}: ExploreMapProps) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const [popupSlug, setPopupSlug] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [viewport, setViewport] = useState<{ bbox: [number, number, number, number]; zoom: number } | null>(
    null
  );

  const isPlanned = useTripStore((s) => s.isPlanned);
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);

  const styleUrl = `/api/map/style${resolvedTheme === "dark" ? "?theme=dark" : ""}`;

  const placeBySlug = useMemo(() => new Map(places.map((p) => [p.slug, p])), [places]);

  const index = useMemo(() => {
    const supercluster = new Supercluster<PointProperties, PointProperties>({ radius: 48, maxZoom: 16 });
    supercluster.load(
      places.map((place) => ({
        type: "Feature",
        properties: { slug: place.slug },
        geometry: { type: "Point", coordinates: [place.coordinates.lng, place.coordinates.lat] },
      }))
    );
    return supercluster;
  }, [places]);

  const clusters = useMemo(() => {
    const bbox: [number, number, number, number] = viewport?.bbox ?? [-180, -85, 180, 85];
    const zoom = viewport ? Math.round(viewport.zoom) : 10;
    return index.getClusters(bbox, zoom);
  }, [index, viewport]);

  const updateViewportFromMap = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    setViewport({ bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: map.getZoom() });
  }, []);

  const bounds = useMemo(() => {
    const points = places.map((p) => p.coordinates);
    if (reference) points.push(reference);
    const box = computeBoundingBox(points);
    return box ? boundingBoxToLngLatBounds(box) : null;
  }, [places, reference]);

  const routeGeoJson = useMemo(() => {
    if (highlightSlugs.length < 2) return null;
    const coordinates = highlightSlugs
      .map((slug) => placeBySlug.get(slug))
      .filter((p): p is Place => Boolean(p))
      .map((p) => [p.coordinates.lng, p.coordinates.lat] as [number, number]);
    if (coordinates.length < 2) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates },
    };
  }, [highlightSlugs, placeBySlug]);

  const radiusGeoJson = useMemo(() => {
    if (!reference || !radiusKm) return null;
    return turfCircle([reference.lng, reference.lat], radiusKm, { units: "kilometers", steps: 64 });
  }, [reference, radiusKm]);

  // initialViewState already places the camera on mount, so skip the very
  // first run here — an animated fitBounds() firing at the same moment the
  // freshly-mounted container's ResizeObserver settles its size corrupts
  // MapLibre's internal camera state (a known race in react-map-gl's
  // camera-event handling). Only animate when the result set actually changes.
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
      map.fitBounds(bounds, { padding: 64, duration: reduced ? 0 : 800, maxZoom: 15 });
    } catch (err) {
      console.error("Explore map fitBounds failed", err);
    }
    // Cancel any in-flight camera animation before the map is torn down or
    // re-triggered — otherwise its completion callback can fire against an
    // already-removed map instance and throw inside react-map-gl's internal
    // camera-event handler.
    return () => {
      try {
        map.stop();
      } catch (err) {
        console.error("Explore map stop() failed", err);
      }
    };
  }, [bounds]);

  useEffect(() => {
    if (!popupSlug) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPopupSlug(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [popupSlug]);

  const popupPlace = popupSlug ? (placeBySlug.get(popupSlug) ?? null) : null;

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
      aria-label={dict.explore.mapAriaLabel}
    >
      <MapGL
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={
          bounds ? { bounds, fitBoundsOptions: { padding: 64 } } : { longitude: 98.99, latitude: 18.79, zoom: 11 }
        }
        style={{ width: "100%", height: "100%" }}
        onLoad={(event) => {
          applyBrandMapTheme(event.target, resolvedTheme);
          updateViewportFromMap();
        }}
        onMoveEnd={updateViewportFromMap}
        onError={() => setMapError(true)}
        cursor={pickingOnMap ? "crosshair" : undefined}
        onClick={(event) => {
          if (pickingOnMap) onMapPick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {radiusGeoJson ? (
          <Source id="proximity-radius" type="geojson" data={radiusGeoJson}>
            <Layer
              id="proximity-radius-fill"
              type="fill"
              paint={{ "fill-color": "#C9A24B", "fill-opacity": 0.12 }}
            />
            <Layer
              id="proximity-radius-outline"
              type="line"
              paint={{ "line-color": "#C9A24B", "line-width": 1.5, "line-opacity": 0.6 }}
            />
          </Source>
        ) : null}

        {reference ? (
          <Marker longitude={reference.lng} latitude={reference.lat} anchor="center">
            <div
              role="img"
              aria-label={dict.explore.nearMe.referenceLabel}
              className="h-4 w-4 rounded-full border-2 border-background bg-accent shadow-elevated"
            />
          </Marker>
        ) : null}

        {routeGeoJson ? (
          <Source id="compare-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="compare-route-line"
              type="line"
              layout={{ "line-cap": "round" }}
              paint={{
                "line-color": "#C9A24B",
                "line-width": 2,
                "line-dasharray": [0.2, 1.6],
                "line-opacity": 0.85,
              }}
            />
          </Source>
        ) : null}

        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;

          if (isClusterFeature(feature)) {
            const count = feature.properties.point_count;
            return (
              <Marker key={`cluster-${feature.properties.cluster_id}`} longitude={lng} latitude={lat} anchor="center">
                <button
                  type="button"
                  aria-label={dict.explore.mapClusterLabel.replace("{count}", String(count))}
                  onClick={() => {
                    const map = mapRef.current?.getMap();
                    if (!map) return;
                    try {
                      const zoom = Math.min(index.getClusterExpansionZoom(feature.properties.cluster_id), 17);
                      map.flyTo({ center: [lng, lat], zoom });
                    } catch (err) {
                      console.error("Explore map cluster flyTo failed", err);
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-accent bg-background/95 text-xs font-semibold text-accent-text shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {count}
                </button>
              </Marker>
            );
          }

          const slug = feature.properties.slug;
          const place = placeBySlug.get(slug);
          if (!place) return null;
          const emphasized = highlightSlugs.includes(slug) || hoveredSlug === slug;
          const airQuality = airQualityBySlug?.get(slug);

          return (
            <Marker key={slug} longitude={lng} latitude={lat} anchor="bottom">
              <div className="relative">
                {airQuality ? (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 z-10 rounded-full border-2 border-background"
                    style={{
                      width: pm25ToMarkerRadiusPx(airQuality.pm2_5) * 2,
                      height: pm25ToMarkerRadiusPx(airQuality.pm2_5) * 2,
                      backgroundColor: AQI_COLORS[airQuality.level].bg,
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setPopupSlug(slug)}
                  onMouseEnter={() => onHoverPlace?.(slug)}
                  onMouseLeave={() => onHoverPlace?.(null)}
                  onFocus={() => onHoverPlace?.(slug)}
                  onBlur={() => onHoverPlace?.(null)}
                  aria-label={place.name[locale]}
                  className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <MapPinIcon size={hoveredSlug === slug ? 34 : 26} emphasized={emphasized} />
                </button>
              </div>
            </Marker>
          );
        })}

        {popupPlace ? (
          <Popup
            longitude={popupPlace.coordinates.lng}
            latitude={popupPlace.coordinates.lat}
            anchor="bottom"
            offset={32}
            closeButton
            onClose={() => setPopupSlug(null)}
          >
            <ExplorePopupCard
              place={popupPlace}
              locale={locale}
              dict={dict}
              isPlanned={isPlanned(popupPlace.slug)}
              onAdd={() => addPlace(popupPlace.slug)}
              onRemove={() => removeFromPlan(popupPlace.slug)}
              airQuality={airQualityBySlug?.get(popupPlace.slug) ?? null}
            />
          </Popup>
        ) : null}
      </MapGL>
    </div>
  );
}
