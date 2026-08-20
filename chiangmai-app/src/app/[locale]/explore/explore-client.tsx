"use client";

import { InfoHint } from "@/components/ui/info-hint";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  LayoutGrid,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Wind,
  X,
} from "lucide-react";
import type { BestTime, District, Place, PlaceCategory, PriceLevel } from "@/data/types";
import { PlaceCard } from "@/components/place-card";
import { ExploreMapLoader } from "@/components/map/explore-map-loader";
import { ExploreViewUrlSync } from "./explore-view-url-sync";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import { ExploreResultsBar, type ActiveFilterChip } from "@/components/explore/explore-results-bar";
import { sortPlaces, type ExploreSort } from "@/lib/explore/sort";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { distanceBucketFrom, type DistanceBucket } from "@/lib/geo";
import { findNearby } from "@/lib/geo/nearby";
import { computeBoundingBox, boundingBoxCenter } from "@/lib/geo/bbox";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";
import type { LatLng } from "@/lib/geo/distance";
import { useAirQualityLayer } from "@/lib/weather/use-air-quality-layer";
import { AqiDot } from "@/components/weather/aqi-meter";
import { AQI_LABELS } from "@/lib/weather/aqi";
import { cn } from "@/lib/utils";

const RADIUS_STEPS_KM = [1, 3, 5, 10, 25] as const;
/** How many cards the grid renders before the visitor asks for more. */
/**
 * How many cards the grid mounts before asking for more.
 *
 * Raising this to fit more of the 193-place catalogue per page was tried and
 * reverted: on a phone each card is ~450px tall, so 36 cards meant a
 * 23-screen page. The answer to a long catalogue is a denser card and a
 * result bar that says how far through you are, not a taller page.
 */
const GRID_PAGE_SIZE = 24;

interface ProximityReference {
  source: "geolocation" | "map-click" | "district";
  coords: LatLng;
}

const categories: PlaceCategory[] = [
  "temple",
  "nature",
  "village",
  "cafe",
  "restaurant",
  "market",
  "museum",
  "activity",
];
const districts: District[] = [
  "old-city",
  "nimman",
  "santitham",
  "riverside",
  "chang-klan",
  "chiang-mai-city",
  "doi-suthep",
  "doi-inthanon",
  "mae-rim",
  "mae-kampong",
  "san-kamphaeng",
  "san-sai",
  "chiang-dao",
  "chom-thong",
  "saraphi",
  "mae-wang",
  "hang-dong",
  "samoeng",
  "mae-ai",
  "fang",
  "chai-prakan",
  "wiang-haeng",
  "phrao",
  "mae-taeng",
  "doi-saket",
  "mae-on",
  "galyani-vadhana",
  "san-pa-tong",
  "hot",
  "omkoi",
  "doi-tao",
];
const prices: PriceLevel[] = [1, 2, 3];
const times: BestTime[] = ["morning", "afternoon", "evening", "anytime"];
const distanceBuckets: DistanceBucket[] = ["walkable", "short-ride", "day-trip"];

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors duration-200",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-foreground/80 hover:border-accent hover:text-accent-text"
      )}
    >
      {label}
    </button>
  );
}

export function ExploreClient({
  places,
  initialCategory,
  initialQuery,
  initialView,
  plannerDayNumber,
}: {
  places: Place[];
  initialCategory: PlaceCategory | null;
  initialQuery: string;
  initialView: "grid" | "map";
  plannerDayNumber: number | null;
}) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const plannerDayId = plannerDayNumber ? `day-${plannerDayNumber}` : null;
  const plannerDayCount = useTripStore((s) => (plannerDayId ? (s.containers[plannerDayId]?.length ?? 0) : 0));

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<PlaceCategory | null>(initialCategory);
  const [district, setDistrict] = useState<District | null>(null);
  const [price, setPrice] = useState<PriceLevel | null>(null);
  const [time, setTime] = useState<BestTime | null>(null);
  const [distance, setDistance] = useState<DistanceBucket | null>(null);
  const [view, setView] = useState<"grid" | "map">(initialView);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<ExploreSort>("recommended");
  const reducedMotion = useReducedMotion();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE);

  const [proximityOpen, setProximityOpen] = useState(false);
  const [reference, setReference] = useState<ProximityReference | null>(null);
  const [radiusIndex, setRadiusIndex] = useState(2);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [districtRef, setDistrictRef] = useState<District | "">("");
  const radiusKm = RADIUS_STEPS_KM[radiusIndex];
  const [airQualityOn, setAirQualityOn] = useState(false);

  function handleSetView(next: "grid" | "map") {
    setView(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "map") params.set("view", "map");
    else params.delete("view");
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReference({
          source: "geolocation",
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        setGeoStatus("idle");
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  function handlePickDistrict(value: District | "") {
    setDistrictRef(value);
    if (!value) return;
    const districtPlaces = places.filter((p) => p.district === value);
    const box = computeBoundingBox(districtPlaces.map((p) => p.coordinates));
    const coords = box ? boundingBoxCenter(box) : districtPlaces[0]?.coordinates;
    if (!coords) return;
    setReference({ source: "district", coords });
  }

  function startPickingOnMap() {
    setPickingOnMap(true);
    if (view !== "map") handleSetView("map");
  }

  function handleMapPick(coords: LatLng) {
    setReference({ source: "map-click", coords });
    setPickingOnMap(false);
  }

  function clearProximity() {
    setReference(null);
    setGeoStatus("idle");
    setPickingOnMap(false);
    setDistrictRef("");
  }

  const filteredBase = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => {
      if (q) {
        // Tags carry the dish/theme words a visitor actually types ("khao soi",
        // "ข้าวซอย", "vegetarian", "waterfall") that rarely appear verbatim in
        // the editorial copy — without them, most searches miss.
        const haystack =
          `${place.name.en} ${place.name.th} ${place.shortDescription.en} ${place.shortDescription.th} ${place.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category && place.category !== category) return false;
      if (district && place.district !== district) return false;
      if (price && place.priceLevel !== price) return false;
      if (time && !place.bestTime.includes(time)) return false;
      if (distance && distanceBucketFrom(place.coordinates) !== distance) return false;
      return true;
    });
  }, [places, query, category, district, price, time, distance]);

  const proximityResults = useMemo(() => {
    if (!reference) return null;
    return findNearby(reference.coords, filteredBase, radiusKm, (p) => p.coordinates);
  }, [reference, filteredBase, radiusKm]);

  const filtered = proximityResults ? proximityResults.map((r) => r.item) : filteredBase;

  const proximityDetailsBySlug = useMemo(() => {
    if (!proximityResults || !reference) return new Map<string, { distanceKm: number; travelMinutes: number }>();
    return new Map(
      proximityResults.map((r) => [
        r.item.slug,
        { distanceKm: r.distanceKm, travelMinutes: estimateTravelMinutes(reference.coords, r.item.coordinates) },
      ])
    );
  }, [proximityResults, reference]);

  // With ~100 places an unfiltered grid would mount ~100 PlaceCards (each with
  // its own image and reveal animation) on first paint. Render a page at a time
  // and let the visitor ask for more.
  const filterKey = [
    query,
    category,
    district,
    price,
    time,
    distance,
    reference ? `${reference.coords.lat},${reference.coords.lng}` : "",
    reference ? radiusKm : "",
  ].join("|");
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    // Adjusted during render rather than in an effect, per
    // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    setPrevFilterKey(filterKey);
    setVisibleCount(GRID_PAGE_SIZE);
  }
  const sorted = useMemo(
    () => sortPlaces(filtered, sort, reference?.coords ?? null),
    [filtered, sort, reference]
  );

  const visiblePlaces = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visiblePlaces.length;

  const hasFilters = Boolean(query || category || district || price || time || distance);

  // What is actually applied, spelled out and individually removable. Before
  // this the only signal was a count badge on a collapsed panel, so you could
  // see that three filters were on without being told which three.
  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (query) chips.push({ id: "query", label: `"${query}"`, onClear: () => setQuery("") });
    if (category)
      chips.push({
        id: "category",
        label: dict.common.categories[category],
        onClear: () => setCategory(null),
      });
    if (district)
      chips.push({
        id: "district",
        label: dict.common.districts[district],
        onClear: () => setDistrict(null),
      });
    if (price)
      chips.push({ id: "price", label: "\u0e3f".repeat(price), onClear: () => setPrice(null) });
    if (time)
      chips.push({
        id: "time",
        label: dict.common.bestTime[time],
        onClear: () => setTime(null),
      });
    if (distance)
      chips.push({
        id: "distance",
        label: dict.common.distance[distance],
        onClear: () => setDistance(null),
      });
    return chips;
  }, [query, category, district, price, time, distance, dict]);

  /**
   * Re-staggers the grid when the *filters* change, but deliberately not when
   * the search box changes: re-keying on every keystroke would restart the
   * animation on each letter typed and make the grid strobe.
   */
  const filterSignature = [category, district, price, time, distance, sort].join("|");
  const secondaryActiveCount = [district, price, time, distance].filter(Boolean).length;
  const comparePlaces = useMemo(
    () => compareSlugs.map((slug) => places.find((p) => p.slug === slug)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [places, compareSlugs]
  );
  const mapPlaces = compareSlugs.length > 0 ? comparePlaces : filtered;
  const aqiPoints = useMemo(() => mapPlaces.map((p) => ({ slug: p.slug, coordinates: p.coordinates })), [mapPlaces]);
  const aqiLayer = useAirQualityLayer(aqiPoints, airQualityOn);

  function clearFilters() {
    setQuery("");
    setCategory(null);
    setDistrict(null);
    setPrice(null);
    setTime(null);
    setDistance(null);
  }

  function toggleCompare(slug: string) {
    setCompareSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <Suspense fallback={null}>
        <ExploreViewUrlSync view={view} onViewChangeFromUrl={setView} />
      </Suspense>

      {plannerDayId && plannerDayNumber ? (
        <div className="no-print sticky top-20 z-30 -mx-6 mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-md lg:-mx-10 lg:px-10">
          <Link
            href={`/${locale}/planner`}
            className="flex items-center gap-1.5 text-sm font-medium hover:text-accent-text"
          >
            <ArrowLeft className="h-4 w-4" />
            {dict.explore.plannerContext.backToPlan}
          </Link>
          <span className="text-sm font-medium text-accent-text">
            {dict.explore.plannerContext.addingToDay.replace("{day}", String(plannerDayNumber))}
          </span>
          <span className="text-xs text-muted-foreground">
            {dict.explore.plannerContext.addedCount.replace("{count}", String(plannerDayCount))}
          </span>
        </div>
      ) : null}

      <Reveal>
        <SectionHeading kicker={dict.nav.explore} title={dict.explore.title} subtitle={dict.explore.subtitle} />
      </Reveal>

      <div className="mt-10 space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.explore.search.placeholder}
            aria-label={dict.explore.search.ariaLabel}
            className="w-full rounded-full border border-border bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dict.explore.filters.category}
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <FilterPill
                key={c}
                active={category === c}
                label={dict.common.categories[c]}
                onClick={() => setCategory(category === c ? null : c)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setProximityOpen((v) => !v)}
            aria-expanded={proximityOpen}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              reference
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border hover:border-accent hover:text-accent-text"
            )}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {dict.explore.nearMe.button}
            {reference ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-background/30 px-1 text-[10px] font-semibold">
                {proximityResults?.length ?? 0}
              </span>
            ) : null}
          </button>

          {reference ? (
            <button
              type="button"
              onClick={clearProximity}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              {dict.explore.nearMe.clear}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setAirQualityOn((v) => !v)}
            aria-pressed={airQualityOn}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              airQualityOn
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border hover:border-accent hover:text-accent-text"
            )}
          >
            <Wind className="h-3.5 w-3.5" />
            {dict.explore.airQuality.toggle}
          </button>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {dict.explore.filters.moreFilters}
            {secondaryActiveCount > 0 ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                {secondaryActiveCount}
              </span>
            ) : null}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
          </button>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-accent-text"
            >
              <X className="h-3.5 w-3.5" />
              {dict.explore.filters.clear}
            </button>
          ) : null}
        </div>

        {proximityOpen ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface-muted/40 p-4">
            <p className="text-xs text-muted-foreground">{dict.explore.nearMe.explain}</p>

            {!reference ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={requestGeolocation}
                  disabled={geoStatus === "loading"}
                  className="flex items-center gap-1.5 rounded-full border border-accent bg-accent px-4 py-2 text-xs font-medium text-accent-foreground disabled:opacity-60"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  {geoStatus === "loading" ? dict.explore.nearMe.locating : dict.explore.nearMe.useMyLocation}
                </button>
                <span className="text-xs text-muted-foreground">{dict.explore.nearMe.or}</span>
                <button
                  type="button"
                  onClick={startPickingOnMap}
                  className="rounded-full border border-border-strong px-4 py-2 text-xs font-medium hover:border-accent hover:text-accent-text"
                >
                  {dict.explore.nearMe.pickOnMap}
                </button>
                <select
                  value={districtRef}
                  onChange={(e) => handlePickDistrict(e.target.value as District | "")}
                  aria-label={dict.explore.nearMe.pickDistrict}
                  className="rounded-full border border-border-strong bg-background px-3 py-2 text-xs font-medium outline-none focus-visible:border-accent"
                >
                  <option value="">{dict.explore.nearMe.pickDistrict}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {dict.common.districts[d]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {geoStatus === "denied" ? (
              <p className="text-xs text-destructive">{dict.explore.nearMe.denied}</p>
            ) : geoStatus === "error" ? (
              <p className="text-xs text-destructive">{dict.explore.nearMe.error}</p>
            ) : null}

            {pickingOnMap ? <p className="text-xs text-accent-text">{dict.explore.nearMe.pickingHint}</p> : null}

            {reference ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {dict.explore.nearMe.radius}: {radiusKm} km
                  </span>
                  <span>
                    {proximityResults?.length ?? 0} {dict.explore.filters.results}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={RADIUS_STEPS_KM.length - 1}
                  step={1}
                  value={radiusIndex}
                  onChange={(e) => setRadiusIndex(Number(e.target.value))}
                  aria-label={dict.explore.nearMe.radius}
                  aria-valuetext={`${radiusKm} km`}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {RADIUS_STEPS_KM.map((km) => (
                    <span key={km}>{km} km</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface-muted/40 p-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {dict.explore.filters.district}
              </p>
              <div className="flex flex-wrap gap-2">
                {districts.map((d) => (
                  <FilterPill
                    key={d}
                    active={district === d}
                    label={dict.common.districts[d]}
                    onClick={() => setDistrict(district === d ? null : d)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {dict.explore.filters.price}
                  <InfoHint
                    label={dict.common.hints.priceLevel.label}
                    text={dict.common.hints.priceLevel.text}
                  />
                </p>
                <div className="flex flex-wrap gap-2">
                  {prices.map((p) => (
                    <FilterPill
                      key={p}
                      active={price === p}
                      label={"฿".repeat(p)}
                      onClick={() => setPrice(price === p ? null : p)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {dict.explore.filters.time}
                </p>
                <div className="flex flex-wrap gap-2">
                  {times.map((t) => (
                    <FilterPill
                      key={t}
                      active={time === t}
                      label={dict.common.bestTime[t]}
                      onClick={() => setTime(time === t ? null : t)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {dict.explore.filters.distance}
                </p>
                <div className="flex flex-wrap gap-2">
                  {distanceBuckets.map((d) => (
                    <FilterPill
                      key={d}
                      active={distance === d}
                      label={dict.common.distance[d]}
                      onClick={() => setDistance(distance === d ? null : d)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {airQualityOn ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
            <p className="text-xs text-muted-foreground">{dict.explore.airQuality.explain}</p>
            {aqiLayer.isLoading ? (
              <p className="text-xs text-muted-foreground">{dict.explore.airQuality.loading}</p>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {mapPlaces.map((place) => {
                  const reading = aqiLayer.dataBySlug.get(place.slug);
                  if (!reading) return null;
                  return (
                    <li key={place.slug} className="flex items-center gap-1.5 text-xs">
                      <AqiDot level={reading.level} />
                      <span className="truncate">{place.name[locale]}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">
                        {AQI_LABELS[reading.level][locale]} · {Math.round(reading.pm2_5)} {dict.weather.pm25Unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {!aqiLayer.isLoading && aqiLayer.dataBySlug.size === 0 ? (
              <p className="text-xs text-muted-foreground">{dict.explore.airQuality.unavailable}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground/70">{dict.weather.attribution}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <ExploreResultsBar
          total={sorted.length}
          shown={visiblePlaces.length}
          sort={sort}
          onSortChange={setSort}
          hasReference={Boolean(reference)}
          chips={activeChips}
          viewToggle={
            <div className="flex items-center gap-1 rounded-full border border-border p-1">
              <button
                type="button"
                onClick={() => handleSetView("grid")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {dict.explore.view.grid}
              </button>
              <button
                type="button"
                onClick={() => handleSetView("map")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "map" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {dict.explore.view.map}
              </button>
            </div>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-24 text-center text-muted-foreground">{dict.explore.filters.noResults}</p>
      ) : view === "grid" ? (
        <>
        <motion.div
          // Re-keyed on the filters only, never on the query: keying on the
          // search text too would restart this animation on every keystroke
          // and make the grid strobe while someone types.
          key={filterSignature}
          // Two columns even on the narrowest phone: one column of 450px cards
          // turned 24 results into sixteen screens of scrolling.
          className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: reducedMotion ? 0 : 0.04 }}
        >
          {visiblePlaces.map((place) => {
            const selected = compareSlugs.includes(place.slug);
            const proximity = proximityDetailsBySlug.get(place.slug);
            return (
              <motion.div
                key={place.slug}
                className="relative"
                // Transform only, deliberately no opacity. An entrance that
                // starts at `opacity: 0` hides its content until the animation
                // runs, and a background tab throttles requestAnimationFrame to
                // nothing — which left every card in this grid invisible. A
                // card that has not animated yet should look slightly low, not
                // absent.
                variants={{
                  hidden: { y: reducedMotion ? 0 : 12 },
                  visible: {
                    y: 0,
                    transition: { duration: reducedMotion ? 0 : 0.45, ease: EASE },
                  },
                }}
              >
                <PlaceCard
                  // The Compare pill below is positioned against this grid
                  // cell, not the card. `h-full` makes the card fill the cell
                  // so the pill can't detach and float below a short card, and
                  // `pb-14` reserves the band it sits in so it can't cover the
                  // district/duration/price row.
                  className="h-full pb-14"
                  place={place}
                  plannerDayId={plannerDayId ?? undefined}
                  plannerDayNumber={plannerDayNumber ?? undefined}
                  distanceKm={proximity?.distanceKm}
                  travelMinutes={proximity?.travelMinutes}
                />
                <button
                  type="button"
                  onClick={() => toggleCompare(place.slug)}
                  aria-pressed={selected}
                  aria-label={selected ? dict.explore.compare.remove : dict.explore.compare.add}
                  className={cn(
                    "absolute bottom-3 left-3 z-10 flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium backdrop-blur-sm transition-colors",
                    selected
                      ? "border-secondary bg-secondary text-secondary-foreground"
                      : "border-border-strong bg-background/85 text-foreground hover:border-secondary"
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {dict.explore.compare.pill}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
        {hasMore ? (
          <div className="mt-12 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {dict.explore.filters.showing
                .replace("{shown}", String(visiblePlaces.length))
                .replace("{total}", String(filtered.length))}
            </p>
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + GRID_PAGE_SIZE)}
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
            >
              {dict.explore.filters.loadMore}
            </button>
          </div>
        ) : null}
        </>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1 lg:max-h-[720px]">
            {filtered.map((place) => {
              const selected = compareSlugs.includes(place.slug);
              return (
                <div
                  key={place.slug}
                  onMouseEnter={() => setHoveredSlug(place.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 transition-colors",
                    selected
                      ? "border-secondary bg-secondary/10"
                      : hoveredSlug === place.slug
                        ? "border-accent bg-accent/10"
                        : "border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleCompare(place.slug)}
                    aria-pressed={selected}
                    aria-label={selected ? dict.explore.compare.remove : dict.explore.compare.add}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-secondary bg-secondary text-secondary-foreground" : "border-border-strong"
                    )}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                  <a href={`/${locale}/place/${place.slug}`} className="flex flex-1 items-center gap-3">
                    <span className="font-serif-display text-base">{place.name[locale]}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dict.common.districts[place.district]}
                    </span>
                  </a>
                </div>
              );
            })}
          </div>
          <ExploreMapLoader
            places={mapPlaces}
            highlightSlugs={compareSlugs}
            hoveredSlug={hoveredSlug}
            onHoverPlace={setHoveredSlug}
            reference={reference?.coords ?? null}
            radiusKm={reference ? radiusKm : null}
            pickingOnMap={pickingOnMap}
            onMapPick={handleMapPick}
            airQualityBySlug={airQualityOn ? aqiLayer.dataBySlug : null}
          />
        </div>
      )}

      {compareSlugs.length > 0 ? (
        <div className="no-print fixed inset-x-0 bottom-6 z-40 flex justify-center px-6">
          <div className="flex items-center gap-4 rounded-full border border-border bg-background px-5 py-3 shadow-elevated">
            <span className="text-sm font-medium">
              {compareSlugs.length} {dict.explore.compare.selected}
            </span>
            <button
              type="button"
              onClick={() => handleSetView("map")}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
            >
              <MapIcon className="h-3.5 w-3.5" />
              {dict.explore.compare.viewOnMap}
            </button>
            <button
              type="button"
              onClick={() => setCompareSlugs([])}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              {dict.explore.compare.clear}
            </button>
          </div>
        </div>
      ) : null}

      {plannerDayId && plannerDayNumber && compareSlugs.length === 0 ? (
        <div className="no-print fixed inset-x-0 bottom-6 z-40 flex justify-center px-6 sm:hidden">
          <Link
            href={`/${locale}/planner?highlight=${plannerDayId}`}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-elevated"
          >
            <Check className="h-4 w-4" />
            {dict.explore.plannerContext.doneCta.replace("{count}", String(plannerDayCount))}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
