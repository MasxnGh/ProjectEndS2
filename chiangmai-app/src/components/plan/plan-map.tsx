"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import { useReducedMotion } from "motion/react";
import { House, MapPin, X } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { computeBoundingBox, boundingBoxToLngLatBounds } from "@/lib/geo/bbox";
import { sliceLineProgress } from "@/lib/geo/polyline";
import { useDayRoute } from "@/lib/routing/use-day-route";
import { applyBoardMapTheme, BOARD_MAP, mapControlLocale, MOAT_SQUARE } from "@/lib/map/board-theme";
import { BoardPin } from "@/components/map/board-pin";
import { Button } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx } from "@/components/brand/cx";
import { fill } from "@/components/brand/place-text";

export interface PlanMapProps {
  dayNumber: number;
  places: Place[];
  baseLocation: { lat: number; lng: number; label: string } | null;
  hoveredSlug: string | null;
  onSelectPlace: (slug: string) => void;
  picking: boolean;
  onPick: (lngLat: { lat: number; lng: number }) => void;
  onCancelPick: () => void;
  /** Overlays drawn over the map's corners (the day badge, the sun times, the Maps button). */
  overlay?: React.ReactNode;
  className?: string;
}

/** The day's route: the road where routing has one, straight lines where it doesn't, drawn in. */
function RouteLine({ places, colors }: { places: Place[]; colors: (typeof BOARD_MAP)["light"] | (typeof BOARD_MAP)["dark"] }) {
  const waypoints = useMemo(
    () => places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng, elevation: p.elevation })),
    [places],
  );
  const { geometry } = useDayRoute(waypoints);
  const full = useMemo(
    () => geometry ?? places.map((p) => [p.coordinates.lng, p.coordinates.lat] as [number, number]),
    [geometry, places],
  );
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [drawn, setDrawn] = useState(full);
  if (drawn !== full) {
    setDrawn(full);
    setProgress(reduced ? 1 : 0);
  }

  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [full, reduced]);

  const data = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: sliceLineProgress(full, reduced ? 1 : progress) },
    }),
    [full, progress, reduced],
  );

  return (
    <Source id="plan-route" type="geojson" data={data}>
      <Layer
        id="plan-route-casing"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": colors.casing, "line-width": 7 }}
      />
      <Layer
        id="plan-route-line"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": colors.line, "line-width": 3 }}
      />
    </Source>
  );
}

export function PlanMap({
  dayNumber,
  places,
  baseLocation,
  hoveredSlug,
  onSelectPlace,
  picking,
  onPick,
  onCancelPick,
  overlay,
  className,
}: PlanMapProps) {
  const { locale, dict } = useLocale();
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  const colors = BOARD_MAP[mode];
  const mapRef = useRef<MapRef>(null);
  const themedRef = useRef(false);
  const [mapError, setMapError] = useState(false);
  const [popupSlug, setPopupSlug] = useState<string | null>(null);

  const bounds = useMemo(() => {
    const points = [...places.map((p) => p.coordinates), ...(baseLocation ? [baseLocation] : [])];
    const box = computeBoundingBox(points);
    return box ? boundingBoxToLngLatBounds(box) : null;
  }, [places, baseLocation]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && themedRef.current) applyBoardMapTheme(map, mode);
  }, [mode]);

  // Re-frame when the day (or its stops) change. Compared with what was last
  // framed rather than skipping "the first run", which the map may not be
  // ready for (the Phase 4 lesson).
  const framedKey = useRef(bounds ? JSON.stringify(bounds) : null);
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds) return;
    const key = JSON.stringify(bounds);
    if (key === framedKey.current) return;
    framedKey.current = key;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      map.fitBounds(bounds, { padding: { top: 80, bottom: 120, left: 48, right: 64 }, duration: reduced ? 0 : 700, maxZoom: 14.5 });
    } catch (err) {
      console.error("Planner map fitBounds failed", err);
    }
    return () => {
      try {
        map.stop();
      } catch {
        // Already removed.
      }
    };
  }, [bounds]);

  useEffect(() => {
    if (!popupSlug) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPopupSlug(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popupSlug]);

  const popupPlace = popupSlug ? places.find((p) => p.slug === popupSlug) : undefined;
  const popupIndex = popupPlace ? places.indexOf(popupPlace) : -1;

  if (mapError) {
    return (
      <div className={cx("grid place-items-center bg-well p-6 text-center", className)}>
        <p className="text-small text-ink-soft">{dict.common.mapUnavailable}</p>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={fill(dict.plan.map.label, { day: dayNumber })}
      className={cx("relative overflow-hidden", className)}
    >
      <MapGL
        ref={mapRef}
        mapStyle="/api/map/style"
        locale={mapControlLocale(dict.ui.map)}
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: { padding: { top: 80, bottom: 120, left: 48, right: 64 }, maxZoom: 14.5 } }
            : { longitude: 98.99, latitude: 18.79, zoom: 11.5 }
        }
        style={{ width: "100%", height: "100%" }}
        scrollZoom={false}
        dragRotate={false}
        cursor={picking ? "crosshair" : undefined}
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
        onClick={(event) => {
          if (picking) onPick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Source id="moat" type="geojson" data={MOAT_SQUARE}>
          <Layer id="moat-fill" type="fill" paint={{ "fill-color": colors.forest, "fill-opacity": 0.6 }} />
          <Layer id="moat-line" type="line" paint={{ "line-color": colors.water, "line-width": 4 }} />
        </Source>

        {places.length >= 2 ? <RouteLine places={places} colors={colors} /> : null}

        {baseLocation ? (
          <Marker longitude={baseLocation.lng} latitude={baseLocation.lat} anchor="center">
            <span
              role="img"
              aria-label={`${dict.plan.map.base}: ${baseLocation.label}`}
              title={baseLocation.label}
              className="grid size-9 place-items-center rounded-full bg-cmj-surface text-cmj-green shadow-float ring-2 ring-cmj-green"
            >
              <House aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
            </span>
          </Marker>
        ) : null}

        {places.map((place, i) => {
          const active = hoveredSlug === place.slug || popupSlug === place.slug;
          return (
            <Marker
              key={place.slug}
              longitude={place.coordinates.lng}
              latitude={place.coordinates.lat}
              anchor="bottom"
              style={{ zIndex: active ? 2 : 1 }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPopupSlug(place.slug);
                  onSelectPlace(place.slug);
                }}
                aria-label={fill(dict.plan.map.pin, { n: i + 1, place: place.name[locale] })}
                className="block cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sunset"
              >
                <BoardPin tone={active ? "sunset" : "green"} label={i + 1} size={active ? 40 : 34} />
              </button>
            </Marker>
          );
        })}

        {popupPlace ? (
          <Popup
            longitude={popupPlace.coordinates.lng}
            latitude={popupPlace.coordinates.lat}
            anchor="bottom"
            offset={44}
            closeButton={false}
            maxWidth="240px"
            onClose={() => setPopupSlug(null)}
          >
            <div className="flex items-start gap-2 p-3 pr-2">
              <p className="grid min-w-0 flex-1">
                <span className="text-credit text-ink-soft">{fill(dict.plan.days.tab, { day: dayNumber })}</span>
                <span className="text-label leading-[1.4]">
                  {popupIndex + 1}. {popupPlace.name[locale]}
                </span>
              </p>
              <button
                type="button"
                aria-label={dict.nav.close}
                onClick={() => setPopupSlug(null)}
                className="grid size-9 flex-none place-items-center rounded-full text-ink-soft hover:bg-well focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              </button>
            </div>
          </Popup>
        ) : null}
      </MapGL>

      {picking ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-full bg-panel py-2 pr-2 pl-5 text-small font-medium text-ink shadow-lift">
            <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />
            {dict.planner.baseLocation.pinInstructions}
            <Button variant="secondary" size="sm" onClick={onCancelPick}>
              {dict.planner.route.cancel}
            </Button>
          </div>
        </div>
      ) : (
        overlay
      )}
    </div>
  );
}
