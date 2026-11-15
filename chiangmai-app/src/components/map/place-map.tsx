"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import { applyBoardMapTheme, BOARD_MAP, mapControlLocale, MOAT_SQUARE } from "@/lib/map/board-theme";
import { cx } from "@/components/brand/cx";
import { fill } from "@/components/brand/place-text";
import { BoardPin } from "@/components/map/board-pin";

interface PlaceMapProps {
  mainPlace: Place;
  nearbyPlaces?: Place[];
  comparePlace?: Place | null;
  className?: string;
}

/**
 * The small map on a place page: the place as the green pin, its neighbours as
 * dots that link to their own pages, and — when the reader picks one to
 * compare — that place as a sunset pin joined by a dashed line.
 */
export function PlaceMap({ mainPlace, nearbyPlaces = [], comparePlace = null, className }: PlaceMapProps) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const colors = BOARD_MAP[mode];
  const mapRef = useRef<MapRef>(null);
  const themedRef = useRef(false);
  const [mapError, setMapError] = useState(false);

  const bounds = useMemo(() => {
    const points = [mainPlace, ...nearbyPlaces, ...(comparePlace ? [comparePlace] : [])].map((p) => p.coordinates);
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

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && themedRef.current) applyBoardMapTheme(map, mode);
  }, [mode]);

  // Re-frame when a comparison is added or removed. The first frame comes from
  // initialViewState, so the mount bounds are never re-fitted; comparing with
  // what was last framed (not skipping "the first run") holds even when the
  // map isn't ready on that first run.
  const framedKey = useRef(bounds ? JSON.stringify(bounds) : null);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;
    const key = JSON.stringify(bounds);
    if (key === framedKey.current) return;
    framedKey.current = key;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map.fitBounds(bounds, { padding: 40, duration: reduced ? 0 : 600, maxZoom: 14.5 });
    } catch (err) {
      console.error("Place map fitBounds failed", err);
    }
    return () => {
      try {
        map.stop();
      } catch {
        // Already removed.
      }
    };
  }, [bounds]);

  if (mapError) {
    return (
      <div className={cx("grid place-items-center bg-well p-6 text-center", className)}>
        <p className="text-small text-ink-soft">{dict.common.mapUnavailable}</p>
      </div>
    );
  }

  return (
    <div
      className={cx("relative overflow-hidden", className)}
      role="region"
      aria-label={fill(dict.placePage.mapLabel, { name: mainPlace.name[locale] })}
    >
      <MapGL
        ref={mapRef}
        mapStyle="/api/map/style"
        locale={mapControlLocale(dict.ui.map)}
        initialViewState={
          hasSpread && bounds
            ? { bounds, fitBoundsOptions: { padding: 40, maxZoom: 14.5 } }
            : { longitude: mainPlace.coordinates.lng, latitude: mainPlace.coordinates.lat, zoom: 13.5 }
        }
        style={{ width: "100%", height: "100%" }}
        scrollZoom={false}
        dragRotate={false}
        onStyleData={(event) => {
          if (themedRef.current) return;
          try {
            if (!event.target.getStyle()?.layers?.length) return;
          } catch {
            return;
          }
          themedRef.current = true;
          applyBoardMapTheme(event.target, mode);
        }}
        onError={(event) => {
          const fromSource = "sourceId" in event || "tile" in event;
          if (!fromSource && !themedRef.current) setMapError(true);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id="moat" type="geojson" data={MOAT_SQUARE}>
          <Layer id="moat-fill" type="fill" paint={{ "fill-color": colors.forest, "fill-opacity": 0.6 }} />
          <Layer id="moat-line" type="line" paint={{ "line-color": colors.water, "line-width": 4 }} />
        </Source>

        {routeGeoJson ? (
          <Source id="compare-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="compare-route-casing"
              type="line"
              layout={{ "line-cap": "round" }}
              paint={{ "line-color": colors.casing, "line-width": 6 }}
            />
            <Layer
              id="compare-route-line"
              type="line"
              layout={{ "line-cap": "round" }}
              paint={{ "line-color": colors.line, "line-width": 2.5, "line-dasharray": [1, 1.6] }}
            />
          </Source>
        ) : null}

        {nearbyPlaces.map((place) => (
          <Marker key={place.slug} longitude={place.coordinates.lng} latitude={place.coordinates.lat} anchor="center">
            <Link
              href={`/${locale}/place/${place.slug}`}
              aria-label={place.name[locale]}
              title={place.name[locale]}
              className="grid size-7 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cmj-sunset"
            >
              <span
                aria-hidden
                className="block size-3 rounded-full border-2"
                style={{ backgroundColor: colors.dot, borderColor: colors.dotStroke }}
              />
            </Link>
          </Marker>
        ))}

        {comparePlace ? (
          <Marker longitude={comparePlace.coordinates.lng} latitude={comparePlace.coordinates.lat} anchor="bottom">
            <Link
              href={`/${locale}/place/${comparePlace.slug}`}
              aria-label={comparePlace.name[locale]}
              title={comparePlace.name[locale]}
              className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sunset"
            >
              <BoardPin tone="sunset" size={28} />
            </Link>
          </Marker>
        ) : null}

        <Marker longitude={mainPlace.coordinates.lng} latitude={mainPlace.coordinates.lat} anchor="bottom">
          <span role="img" aria-label={mainPlace.name[locale]}>
            <BoardPin />
          </span>
        </Marker>
      </MapGL>
    </div>
  );
}
