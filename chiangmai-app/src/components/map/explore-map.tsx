"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import turfCircle from "@turf/circle";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import type { LatLng } from "@/lib/geo/distance";
import { applyBoardMapTheme, BOARD_MAP, mapControlLocale, MOAT_SQUARE } from "@/lib/map/board-theme";
import type { AirQualityResponse } from "@/lib/weather/types";
import { AQI_DOT } from "@/components/brand/aqi";
import { cx } from "@/components/brand/cx";
import type { PlannerDay } from "@/components/brand/plan-toggle";
import { ExplorePopupCard } from "@/components/map/explore-popup-card";

interface PointProperties {
  slug: string;
}

export interface ExploreMapProps {
  places: Place[];
  /** What the camera frames; defaults to `places`. Explore frames the city, not the whole province, until a filter is on. */
  framePlaces?: Place[];
  /** Places joined by a dashed line, in order: the compare selection. */
  highlightSlugs?: string[];
  hoveredSlug?: string | null;
  onHoverPlace?: (slug: string | null) => void;
  reference?: LatLng | null;
  radiusKm?: number | null;
  pickingOnMap?: boolean;
  onMapPick?: (coords: LatLng) => void;
  airQualityBySlug?: Map<string, AirQualityResponse> | null;
  plannerDay?: PlannerDay | null;
  className?: string;
}

function isClusterFeature(
  feature: Supercluster.ClusterFeature<PointProperties> | Supercluster.PointFeature<PointProperties>,
): feature is Supercluster.ClusterFeature<PointProperties> {
  return "cluster" in feature.properties && feature.properties.cluster === true;
}

/**
 * Explore's map in the board's dress: paper land, green dots for places, the
 * sunset for the one pointed at, green bubbles for clusters, and the moat
 * square always drawn so the city keeps its shape.
 *
 * Behaviour is the old map's: clustering, a radius ring around a chosen point,
 * picking that point by tapping the map, a dashed line through compared
 * places, air-quality rings, and a popup that can add the place to the plan.
 */
export function ExploreMap({
  places,
  framePlaces,
  highlightSlugs = [],
  hoveredSlug = null,
  onHoverPlace,
  reference = null,
  radiusKm = null,
  pickingOnMap = false,
  onMapPick,
  airQualityBySlug = null,
  plannerDay = null,
  className,
}: ExploreMapProps) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const colors = BOARD_MAP[mode];
  const mapRef = useRef<MapRef>(null);
  /** Set once the style JSON is in and recoloured. Not tied to `load`, which waits for tiles that may never arrive. */
  const themedRef = useRef(false);
  const [popupSlug, setPopupSlug] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [viewport, setViewport] = useState<{ bbox: [number, number, number, number]; zoom: number } | null>(null);

  const placeBySlug = useMemo(() => new Map(places.map((p) => [p.slug, p])), [places]);

  const index = useMemo(() => {
    const supercluster = new Supercluster<PointProperties, PointProperties>({ radius: 44, maxZoom: 16 });
    supercluster.load(
      places.map((place) => ({
        type: "Feature",
        properties: { slug: place.slug },
        geometry: { type: "Point", coordinates: [place.coordinates.lng, place.coordinates.lat] },
      })),
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
    const points = (framePlaces ?? places).map((p) => p.coordinates);
    if (reference) points.push(reference);
    const box = computeBoundingBox(points);
    return box ? boundingBoxToLngLatBounds(box) : null;
  }, [framePlaces, places, reference]);

  const routeGeoJson = useMemo(() => {
    const coordinates = highlightSlugs
      .map((slug) => placeBySlug.get(slug))
      .filter((p): p is Place => Boolean(p))
      .map((p) => [p.coordinates.lng, p.coordinates.lat] as [number, number]);
    if (coordinates.length < 2) return null;
    return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates } };
  }, [highlightSlugs, placeBySlug]);

  const radiusGeoJson = useMemo(() => {
    if (!reference || !radiusKm) return null;
    return turfCircle([reference.lng, reference.lat], radiusKm, { units: "kilometers", steps: 64 });
  }, [reference, radiusKm]);

  // The theme switch recolours the base map in place; the overlays below take
  // their colours as props and follow by themselves.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && themedRef.current) applyBoardMapTheme(map, mode);
  }, [mode]);

  // initialViewState already frames the map on mount, so the mount bounds are
  // never re-fitted: an animated fitBounds() while the fresh container's
  // ResizeObserver settles corrupts MapLibre's camera state (a known
  // react-map-gl race). Comparing with what was last framed, rather than
  // skipping "the first run", also holds when the map isn't ready on that run.
  const framedKey = useRef(bounds ? JSON.stringify(bounds) : null);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;
    const key = JSON.stringify(bounds);
    if (key === framedKey.current) return;
    framedKey.current = key;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map.fitBounds(bounds, { padding: 56, duration: reduced ? 0 : 700, maxZoom: 15 });
    } catch (err) {
      console.error("Explore map fitBounds failed", err);
    }
    // Stop any camera animation before the map is torn down or re-aimed, or its
    // completion callback can fire against a removed map.
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
      <div className={cx("grid place-items-center bg-well p-6 text-center", className)}>
        <p className="text-small text-ink-soft">{dict.common.mapUnavailable}</p>
      </div>
    );
  }

  return (
    <div className={cx("relative overflow-hidden", className)} role="region" aria-label={dict.browse.mapLabel}>
      <MapGL
        ref={mapRef}
        mapStyle="/api/map/style"
        locale={mapControlLocale(dict.ui.map)}
        initialViewState={
          bounds ? { bounds, fitBoundsOptions: { padding: 48 } } : { longitude: 98.99, latitude: 18.79, zoom: 11 }
        }
        style={{ width: "100%", height: "100%" }}
        // Wheel-zoom would hijack the page scroll on a split screen; the zoom
        // buttons and pinch still work.
        scrollZoom={false}
        dragRotate={false}
        // Recolour as soon as the style is in. `load` would wait for the base
        // tiles too, and while those fail the map would sit in MapTiler's colours.
        onStyleData={(event) => {
          if (themedRef.current) return;
          try {
            if (!event.target.getStyle()?.layers?.length) return;
          } catch {
            return;
          }
          themedRef.current = true;
          applyBoardMapTheme(event.target, mode);
          updateViewportFromMap();
        }}
        onMoveEnd={updateViewportFromMap}
        onError={(event) => {
          // A tile that fails is not a broken map — the dots and the moat still
          // draw on paper — so only an error before the style loads, and not
          // from a tile source, takes the map away.
          const fromSource = "sourceId" in event || "tile" in event;
          if (!fromSource && !themedRef.current) setMapError(true);
        }}
        cursor={pickingOnMap ? "crosshair" : undefined}
        onClick={(event) => {
          if (pickingOnMap) onMapPick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id="moat" type="geojson" data={MOAT_SQUARE}>
          <Layer id="moat-fill" type="fill" paint={{ "fill-color": colors.forest, "fill-opacity": 0.6 }} />
          <Layer id="moat-line" type="line" paint={{ "line-color": colors.water, "line-width": 4 }} />
        </Source>

        {radiusGeoJson ? (
          <Source id="proximity-radius" type="geojson" data={radiusGeoJson}>
            <Layer id="proximity-radius-fill" type="fill" paint={{ "fill-color": colors.line, "fill-opacity": 0.08 }} />
            <Layer
              id="proximity-radius-outline"
              type="line"
              paint={{ "line-color": colors.line, "line-width": 1.5, "line-opacity": 0.55, "line-dasharray": [2, 2] }}
            />
          </Source>
        ) : null}

        {routeGeoJson ? (
          <Source id="compare-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="compare-route-casing"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.casing, "line-width": 6 }}
            />
            <Layer
              id="compare-route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": colors.line, "line-width": 2.5, "line-dasharray": [1, 1.6] }}
            />
          </Source>
        ) : null}

        {reference ? (
          <Marker longitude={reference.lng} latitude={reference.lat} anchor="center">
            <span
              role="img"
              aria-label={dict.explore.nearMe.referenceLabel}
              className="block size-4 rounded-full bg-cmj-sunset shadow-float ring-[3px] ring-cmj-surface"
            />
          </Marker>
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
                  onClick={(event) => {
                    event.stopPropagation();
                    const map = mapRef.current?.getMap();
                    if (!map) return;
                    try {
                      const zoom = Math.min(index.getClusterExpansionZoom(feature.properties.cluster_id), 17);
                      map.flyTo({ center: [lng, lat], zoom });
                    } catch (err) {
                      console.error("Explore map cluster flyTo failed", err);
                    }
                  }}
                  className={cx(
                    "grid cursor-pointer place-items-center rounded-full bg-brand font-brand text-small font-semibold text-on-brand tabular-nums shadow-float ring-[3px] ring-cmj-surface/90",
                    "transition-transform duration-150 ease-brand hover:scale-105 motion-reduce:transition-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sunset",
                    count >= 50 ? "size-12" : count >= 10 ? "size-10" : "size-9",
                  )}
                >
                  {count}
                </button>
              </Marker>
            );
          }

          const slug = feature.properties.slug;
          const place = placeBySlug.get(slug);
          if (!place) return null;
          const hot = hoveredSlug === slug || popupSlug === slug;
          const airQuality = airQualityBySlug?.get(slug);

          return (
            <Marker key={slug} longitude={lng} latitude={lat} anchor="center" style={{ zIndex: hot ? 2 : 1 }}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPopupSlug(slug);
                }}
                onMouseEnter={() => onHoverPlace?.(slug)}
                onMouseLeave={() => onHoverPlace?.(null)}
                onFocus={() => onHoverPlace?.(slug)}
                onBlur={() => onHoverPlace?.(null)}
                aria-label={place.name[locale]}
                // A 28px target around a small dot: dots must stay small to
                // read as a field of places, but a finger still has to hit one.
                className="grid size-7 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cmj-sunset"
              >
                <span
                  aria-hidden
                  className={cx(
                    "block rounded-full border-2 transition-[width,height,background-color] duration-150 ease-brand motion-reduce:transition-none",
                    hot ? "size-[18px]" : "size-3",
                  )}
                  style={{
                    backgroundColor: hot ? colors.active : colors.dot,
                    borderColor: colors.dotStroke,
                    boxShadow: airQuality ? `0 0 0 3px ${AQI_DOT[airQuality.level]}` : undefined,
                  }}
                />
              </button>
            </Marker>
          );
        })}

        {popupPlace ? (
          <Popup
            longitude={popupPlace.coordinates.lng}
            latitude={popupPlace.coordinates.lat}
            anchor="bottom"
            offset={16}
            closeButton={false}
            maxWidth="260px"
            onClose={() => setPopupSlug(null)}
          >
            <ExplorePopupCard
              place={popupPlace}
              locale={locale}
              dict={dict}
              airQuality={airQualityBySlug?.get(popupPlace.slug) ?? null}
              plannerDay={plannerDay}
              onClose={() => setPopupSlug(null)}
            />
          </Popup>
        ) : null}
      </MapGL>

      {pickingOnMap ? (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[1] mr-14 rounded-full bg-forest px-4 py-2 text-center font-brand text-small text-on-forest shadow-float">
          {dict.explore.nearMe.pickingHint}
        </p>
      ) : null}

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 z-[1] flex items-center gap-3 rounded-full bg-panel px-3.5 py-2 font-brand text-small text-ink-soft shadow-float"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2" style={{ backgroundColor: colors.dot, borderColor: colors.dotStroke }} />
          {dict.browse.legendPlace}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2" style={{ backgroundColor: colors.active, borderColor: colors.dotStroke }} />
          {dict.browse.legendActive}
        </span>
      </div>
    </div>
  );
}
