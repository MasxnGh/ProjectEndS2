"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  List,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  MousePointerClick,
  Search,
  SlidersHorizontal,
  Wind,
  X,
} from "lucide-react";
import type { BestTime, District, Place, PlaceCategory, PriceLevel } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import type { SquareBucket } from "@/lib/city-square";
import type { DistanceBucket } from "@/lib/geo";
import { findNearby } from "@/lib/geo/nearby";
import { computeBoundingBox, boundingBoxCenter } from "@/lib/geo/bbox";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";
import type { LatLng } from "@/lib/geo/distance";
import { mixCategories, sortPlaces, isSortAvailable, type ExploreSort } from "@/lib/explore/sort";
import {
  EMPTY_FILTERS,
  matchesFilters,
  placeFacts,
  queryTerms,
  type ExploreFilterKey,
  type ExploreFilters,
} from "@/lib/explore/filter";
import { useAirQualityLayer } from "@/lib/weather/use-air-quality-layer";
import { useMediaQuery } from "@/lib/use-media-query";
import { ExploreMapLoader } from "@/components/map/explore-map-loader";
import { AqiNote } from "@/components/brand/aqi";
import { Button, ButtonLink } from "@/components/brand/button";
import { Chip, ChipRow } from "@/components/brand/chip";
import { cx, focusRing } from "@/components/brand/cx";
import { FavoriteToggle } from "@/components/brand/favorite-toggle";
import { CATEGORY_ORDER, categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { PlaceCardFor } from "@/components/brand/place-card";
import { fill, formatDistance, priceSymbol } from "@/components/brand/place-text";
import { PlanToggle, type PlannerDay } from "@/components/brand/plan-toggle";
import { Select } from "@/components/brand/select";
import { Box, Wrap } from "@/components/brand/surface";
import { ExploreViewUrlSync } from "./explore-view-url-sync";

const RADIUS_STEPS_KM = [1, 3, 5, 10, 25] as const;
/**
 * How many cards mount before the visitor asks for more. A taller first page
 * was tried and reverted: the answer to a long catalogue is a compact card and
 * a line that says how far through you are, not a longer page.
 */
const GRID_PAGE_SIZE = 24;

const ZONES: SquareBucket[] = ["inside", "wall", "north", "east", "south", "west", "beyond"];
const PRICES: PriceLevel[] = [1, 2, 3];
const TIMES: BestTime[] = ["morning", "afternoon", "evening", "anytime"];
const DISTANCES: DistanceBucket[] = ["walkable", "short-ride", "day-trip"];
/** "Sort by rating" is gone: the ratings were never measured, so the site no longer shows or sorts by them. */
const SORTS: ExploreSort[] = ["recommended", "nearest", "shortest"];

type Panel = "filters" | "near" | null;
type FilterGroup = "zone" | "price" | "time";

interface ProximityReference {
  source: "geolocation" | "map-click" | "district";
  coords: LatLng;
}

/** A labelled group of chips inside the filter panel. */
function Group({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2">
      <span id={id} className="text-label text-ink">
        {label}
      </span>
      <ChipRow>{children}</ChipRow>
    </div>
  );
}

/** The quick chips in the bar: outlined, and showing the value once one is chosen. */
function BarChip({
  active,
  expanded,
  icon,
  onClick,
  controls,
  children,
}: {
  active?: boolean;
  expanded?: boolean;
  icon?: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  controls?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      className={cx(
        "inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-4 font-brand text-label whitespace-nowrap",
        "transition-[background-color,color,box-shadow] duration-150 ease-brand",
        active
          ? "bg-brand text-on-brand"
          : "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--cmj-line-strong)] hover:bg-well",
        focusRing,
      )}
    >
      {icon}
      {children}
    </button>
  );
}


export function ExploreClient({
  places,
  initialCategory,
  initialZone,
  initialQuery,
  initialView,
  plannerDayNumber,
}: {
  places: Place[];
  initialCategory: PlaceCategory | null;
  initialZone: SquareBucket | null;
  initialQuery: string;
  initialView: "grid" | "map";
  plannerDayNumber: number | null;
}) {
  const { locale, dict } = useLocale();
  const t = dict.browse;
  const pathname = usePathname();
  const plannerDay: PlannerDay | null = plannerDayNumber
    ? { id: `day-${plannerDayNumber}`, number: plannerDayNumber }
    : null;
  const plannerDayCount = useTripStore((s) => (plannerDay ? (s.containers[plannerDay.id]?.length ?? 0) : 0));

  const [filters, setFilters] = useState<ExploreFilters>({
    ...EMPTY_FILTERS,
    query: initialQuery,
    category: initialCategory,
    zone: initialZone,
  });
  const set = <K extends ExploreFilterKey>(key: K, value: ExploreFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const toggle = <K extends ExploreFilterKey>(key: K, value: ExploreFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: current[key] === value ? null : value }));

  // A link to explore?category=… from the header, followed while already on
  // this page, re-renders it with new props but keeps this state; take the
  // link's values when they change. (Adjusted during render, not in an effect.)
  const incoming = `${initialQuery}|${initialCategory}|${initialZone}`;
  const [prevIncoming, setPrevIncoming] = useState(incoming);
  if (incoming !== prevIncoming) {
    setPrevIncoming(incoming);
    setFilters({ ...EMPTY_FILTERS, query: initialQuery, category: initialCategory, zone: initialZone });
  }

  const [view, setView] = useState<"grid" | "map">(initialView);
  const [panel, setPanel] = useState<Panel>(null);
  const [sort, setSort] = useState<ExploreSort>("recommended");
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  const [reference, setReference] = useState<ProximityReference | null>(null);
  const [radiusIndex, setRadiusIndex] = useState(2);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [districtRef, setDistrictRef] = useState<District | "">("");
  const radiusKm = RADIUS_STEPS_KM[radiusIndex];
  const [airQualityOn, setAirQualityOn] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // The map only mounts where it is seen: always beside the list on a wide
  // screen, and on a phone only once the visitor asks for it.
  const showMap = isDesktop || view === "map";

  // ── The URL is the state worth sharing ──────────────────────────────────
  // Search, category and zone go into the address as they change (replace, so
  // typing does not fill the history), which makes a result list linkable and
  // brings it back after visiting a place and pressing Back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const put = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    put("q", filters.query.trim() || null);
    put("category", filters.category);
    put("zone", filters.zone);
    const next = params.toString();
    const url = next ? `${pathname}?${next}` : pathname;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  }, [filters.query, filters.category, filters.zone, pathname]);

  // The phone's map view is a place you go to, so it gets a history entry: Back returns to the list.
  function handleSetView(next: "grid" | "map") {
    setView(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "map") params.set("view", "map");
    else params.delete("view");
    const query = params.toString();
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    window.scrollTo({ top: 0 });
  }

  // ── Near a point ────────────────────────────────────────────────────────
  function requestGeolocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReference({ source: "geolocation", coords: { lat: position.coords.latitude, lng: position.coords.longitude } });
        setGeoStatus("idle");
      },
      (error) => setGeoStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  function handlePickDistrict(value: District | "") {
    setDistrictRef(value);
    if (!value) return;
    const districtPlaces = places.filter((p) => p.district === value);
    const box = computeBoundingBox(districtPlaces.map((p) => p.coordinates));
    const coords = box ? boundingBoxCenter(box) : districtPlaces[0]?.coordinates;
    if (coords) setReference({ source: "district", coords });
  }

  function startPickingOnMap() {
    setPickingOnMap(true);
    if (!isDesktop && view !== "map") handleSetView("map");
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

  // Choosing a point means "what is near here", so the list follows by distance;
  // clearing it puts the editorial order back.
  const hasReference = Boolean(reference);
  const [prevHasReference, setPrevHasReference] = useState(hasReference);
  if (hasReference !== prevHasReference) {
    setPrevHasReference(hasReference);
    if (hasReference && sort === "recommended") setSort("nearest");
    if (!hasReference && !isSortAvailable(sort, null)) setSort("recommended");
  }

  // ── Filtering ───────────────────────────────────────────────────────────
  const factsBySlug = useMemo(() => new Map(places.map((p) => [p.slug, placeFacts(p, dict)])), [places, dict]);
  const terms = useMemo(() => queryTerms(filters.query), [filters.query]);

  /** Distance from the chosen point, for the places inside the radius only. */
  const nearby = useMemo(() => {
    if (!reference) return null;
    return new Map(findNearby(reference.coords, places, radiusKm, (p) => p.coordinates).map((r) => [r.item.slug, r.distanceKm]));
  }, [reference, places, radiusKm]);

  // Memoised as one unit: the map frames whatever this returns, so a fresh
  // array on every render (a hover, say) would re-aim the camera each time.
  const { filtered, categoryCounts, zoneCounts } = useMemo(() => {
    const passes = (place: Place, skip?: ExploreFilterKey) =>
      (!nearby || nearby.has(place.slug)) && matchesFilters(place, factsBySlug.get(place.slug)!, filters, terms, skip);
    /** How many results each choice would give under everything else that is on. */
    const countBy = (key: "category" | "zone", value: (place: Place) => string) => {
      const counts = new Map<string, number>();
      for (const place of places) {
        if (!passes(place, key)) continue;
        const k = value(place);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return counts;
    };
    return {
      filtered: places.filter((place) => passes(place)),
      categoryCounts: countBy("category", (p) => p.category),
      zoneCounts: countBy("zone", (p) => factsBySlug.get(p.slug)!.zone),
    };
  }, [places, nearby, factsBySlug, filters, terms]);
  const categoryTotal = [...categoryCounts.values()].reduce((a, b) => a + b, 0);

  const sorted = useMemo(() => {
    const ordered = sortPlaces(filtered, sort, reference?.coords ?? null);
    return sort === "recommended" && !filters.category ? mixCategories(ordered) : ordered;
  }, [filtered, sort, reference, filters.category]);

  // A new set of filters starts the list from the top again.
  const filterKey = JSON.stringify([filters, reference?.coords ?? null, reference ? radiusKm : null, sort]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(GRID_PAGE_SIZE);
  }
  const visible = sorted.slice(0, visibleCount);

  const comparePlaces = useMemo(
    () => compareSlugs.map((slug) => places.find((p) => p.slug === slug)).filter((p): p is Place => Boolean(p)),
    [places, compareSlugs],
  );
  const mapPlaces = compareSlugs.length > 0 ? comparePlaces : filtered;

  // With nothing chosen, frame the city rather than the province: the far
  // north would otherwise shrink the old city to one cluster.
  const hasNarrowing =
    Boolean(terms.length || filters.category || filters.zone || filters.district || filters.price || filters.time || filters.distance) ||
    Boolean(reference) ||
    compareSlugs.length > 0;
  const framePlaces = useMemo(
    () => (hasNarrowing ? mapPlaces : mapPlaces.filter((p) => factsBySlug.get(p.slug)?.zone !== "beyond")),
    [hasNarrowing, mapPlaces, factsBySlug],
  );

  const aqiPoints = useMemo(() => mapPlaces.map((p) => ({ slug: p.slug, coordinates: p.coordinates })), [mapPlaces]);
  const aqiLayer = useAirQualityLayer(aqiPoints, airQualityOn);

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    clearProximity();
  }

  function toggleCompare(slug: string) {
    setCompareSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  // ── What is on, spelled out and removable one by one ────────────────────
  const activeChips: { id: string; label: string; clear: () => void }[] = [];
  if (filters.query.trim()) activeChips.push({ id: "q", label: `“${filters.query.trim()}”`, clear: () => set("query", "") });
  if (filters.zone) activeChips.push({ id: "zone", label: dict.square.zones[filters.zone], clear: () => set("zone", null) });
  if (filters.price)
    activeChips.push({
      id: "price",
      label: `${priceSymbol(filters.price)} ${t.priceOption[filters.price]}`,
      clear: () => set("price", null),
    });
  if (filters.time) activeChips.push({ id: "time", label: dict.common.bestTime[filters.time], clear: () => set("time", null) });
  if (filters.distance)
    activeChips.push({ id: "distance", label: dict.common.distance[filters.distance], clear: () => set("distance", null) });
  if (filters.district)
    activeChips.push({ id: "district", label: dict.common.districts[filters.district], clear: () => set("district", null) });
  if (reference)
    activeChips.push({ id: "near", label: `${t.nearActive} · ${fill(t.radius, { km: radiusKm })}`, clear: clearProximity });

  // ── The sticky bar, and keeping the map clear of it ──────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    const root = rootRef.current;
    if (!bar || !root) return;
    const observer = new ResizeObserver(() => root.style.setProperty("--bar-h", `${bar.offsetHeight}px`));
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  const panelId = "explore-panel";
  const groupRefs = useRef<Partial<Record<FilterGroup, HTMLDivElement | null>>>({});
  const pendingFocus = useRef<FilterGroup | null>(null);
  /** Whatever opened the panel gets focus back when Esc closes it. */
  const openerRef = useRef<HTMLElement | null>(null);
  function openPanel(next: Panel, opener: HTMLElement, group?: FilterGroup) {
    openerRef.current = opener;
    if (group && panel === "filters") {
      // Already open: nothing will re-render, so move focus now.
      groupRefs.current[group]?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
      return;
    }
    setPanel((current) => (current === next && !group ? null : next));
    pendingFocus.current = group ?? null;
  }
  // Once the panel has rendered, take focus to the group the quick chip named.
  useEffect(() => {
    const group = pendingFocus.current;
    if (!group || panel !== "filters") return;
    pendingFocus.current = null;
    groupRefs.current[group]?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
  });

  const secondaryCount = [filters.zone, filters.price, filters.time, filters.distance, filters.district].filter(Boolean).length;
  const countLine = filters.category
    ? fill(t.countIn, { count: sorted.length, category: dict.common.categories[filters.category] })
    : fill(t.count, { count: sorted.length });

  return (
    <div ref={rootRef} data-brand className="bg-page pb-24 font-brand text-ink lg:pb-16">
      <Suspense fallback={null}>
        <ExploreViewUrlSync view={view} onViewChangeFromUrl={setView} />
      </Suspense>

      <Wrap className="grid gap-4 pt-8 pb-5 sm:pt-10">
        <h1 className="text-headline text-balance text-brand">{dict.explore.title}</h1>
        <p className="max-w-[62ch] text-body text-pretty text-ink-soft">{fill(t.lead, { count: places.length })}</p>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            // Enter on a phone should put the keyboard away and show the results.
            (event.currentTarget.querySelector("input") as HTMLInputElement | null)?.blur();
          }}
          className={cx(
            "flex h-14 max-w-[640px] min-w-0 items-center gap-3 rounded-full border border-line bg-panel pr-1.5 pl-5 text-ink",
            "transition-[box-shadow,border-color] duration-150 ease-brand dark:border-line-strong",
            "focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cmj-brand)_18%,transparent)]",
          )}
        >
          <Search aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-ink-soft" />
          <label className="flex h-full min-w-0 flex-1">
            <span className="sr-only">{dict.ui.search.label}</span>
            <input
              type="search"
              name="q"
              value={filters.query}
              onChange={(event) => set("query", event.target.value)}
              placeholder={t.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-soft placeholder:opacity-100 [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
          {filters.query ? (
            <button
              type="button"
              onClick={() => set("query", "")}
              aria-label={t.clearSearch}
              title={t.clearSearch}
              className={cx("grid size-11 flex-none cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-well", focusRing)}
            >
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </button>
          ) : null}
        </form>
      </Wrap>

      {/* ── Sticky filter bar ── */}
      <div
        ref={barRef}
        className="no-print sticky top-[72px] z-30 border-b border-line bg-page"
        onKeyDown={(event) => {
          if (event.key === "Escape" && panel) {
            openerRef.current?.focus();
            setPanel(null);
          }
        }}
      >
        <Wrap className="grid gap-3 py-3">
          {plannerDay ? (
            <div className="flex items-center gap-2 rounded-full bg-sand-fill py-1 pr-1 pl-1 sm:pl-2">
              <ButtonLink
                href={`/${locale}/planner`}
                variant="ghost"
                size="sm"
                icon={<ArrowLeft aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                className="hidden sm:inline-flex"
              >
                {t.plannerBack}
              </ButtonLink>
              <p className="min-w-0 flex-1 truncate pl-3 text-label text-brand sm:pl-0">
                {fill(t.plannerAdding, { day: plannerDay.number })}
                <span className="font-normal text-ink-soft"> · {fill(t.plannerAdded, { count: plannerDayCount })}</span>
              </p>
              <ButtonLink
                href={`/${locale}/planner?highlight=${plannerDay.id}`}
                size="sm"
                icon={<Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
              >
                {t.plannerDone}
              </ButtonLink>
            </div>
          ) : null}

          <ChipRow scroll label={dict.explore.filters.category} className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <Chip pressed={!filters.category} onClick={() => set("category", null)} count={categoryTotal}>
              {t.all}
            </Chip>
            {CATEGORY_ORDER.map((category) => {
              const Icon = categoryIcon[category];
              return (
                <Chip
                  key={category}
                  pressed={filters.category === category}
                  onClick={() => toggle("category", category)}
                  icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                  count={categoryCounts.get(category) ?? 0}
                >
                  {dict.common.categories[category]}
                </Chip>
              );
            })}
          </ChipRow>

          <ChipRow scroll className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            <BarChip
                expanded={panel === "filters"}
                controls={panelId}
                onClick={(event) => openPanel("filters", event.currentTarget)}
                icon={<SlidersHorizontal aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
              >
                {t.filters}
                {secondaryCount ? <span className="tabular-nums">({secondaryCount})</span> : null}
              </BarChip>
            <BarChip active={Boolean(filters.zone)} onClick={(event) => openPanel("filters", event.currentTarget, "zone")} controls={panelId}>
              {filters.zone ? dict.square.zones[filters.zone] : t.zone}
              <ChevronDown aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </BarChip>
            <BarChip active={Boolean(filters.price)} onClick={(event) => openPanel("filters", event.currentTarget, "price")} controls={panelId}>
              {filters.price ? `${priceSymbol(filters.price)} ${t.priceOption[filters.price]}` : t.budget}
              <ChevronDown aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </BarChip>
            <BarChip active={Boolean(filters.time)} onClick={(event) => openPanel("filters", event.currentTarget, "time")} controls={panelId}>
              {filters.time ? dict.common.bestTime[filters.time] : t.time}
              <ChevronDown aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </BarChip>
            <BarChip
                active={Boolean(reference)}
                expanded={panel === "near"}
                controls={panelId}
                onClick={(event) => openPanel("near", event.currentTarget)}
                icon={<LocateFixed aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
              >
                {dict.explore.nearMe.button}
                {nearby ? <span className="tabular-nums">({filtered.length})</span> : null}
              </BarChip>
            <button
              type="button"
              onClick={() => setAirQualityOn((on) => !on)}
              aria-pressed={airQualityOn}
              className={cx(
                "inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-4 font-brand text-label whitespace-nowrap",
                "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--cmj-line-strong)] transition-colors duration-150 ease-brand hover:bg-well",
                "aria-pressed:bg-brand aria-pressed:text-on-brand aria-pressed:shadow-none",
                focusRing,
              )}
            >
              {airQualityOn ? (
                <Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              ) : (
                <Wind aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              )}
              {dict.explore.airQuality.toggle}
            </button>
          </ChipRow>

          {panel ? (
            <div
              id={panelId}
              data-lenis-prevent
              className="max-h-[min(52vh,440px)] overflow-y-auto overscroll-contain border-t border-line pt-4 pb-1"
            >
              {panel === "filters" ? (
                <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-10">
                  <div ref={(node) => void (groupRefs.current.zone = node)} className="lg:col-span-2">
                    <Group id="g-zone" label={t.zone}>
                      {ZONES.map((zone) => (
                        <Chip
                          key={zone}
                          pressed={filters.zone === zone}
                          onClick={() => toggle("zone", zone)}
                          count={zoneCounts.get(zone) ?? 0}
                          disabled={!zoneCounts.get(zone) && filters.zone !== zone}
                          className="disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {dict.square.zones[zone]}
                        </Chip>
                      ))}
                    </Group>
                  </div>
                  <div ref={(node) => void (groupRefs.current.price = node)}>
                    <Group id="g-price" label={t.budget}>
                      {PRICES.map((price) => (
                        <Chip key={price} pressed={filters.price === price} onClick={() => toggle("price", price)}>
                          <span aria-hidden>{priceSymbol(price)}</span>
                          <span className="sr-only">{dict.common.price[price]},</span>
                          {t.priceOption[price]}
                        </Chip>
                      ))}
                    </Group>
                  </div>
                  <div ref={(node) => void (groupRefs.current.time = node)}>
                    <Group id="g-time" label={t.time}>
                      {TIMES.map((time) => (
                        <Chip key={time} pressed={filters.time === time} onClick={() => toggle("time", time)}>
                          {dict.common.bestTime[time]}
                        </Chip>
                      ))}
                    </Group>
                  </div>
                  <Group id="g-distance" label={dict.explore.filters.distance}>
                    {DISTANCES.map((distance) => (
                      <Chip key={distance} pressed={filters.distance === distance} onClick={() => toggle("distance", distance)}>
                        {dict.common.distance[distance]}
                      </Chip>
                    ))}
                  </Group>
                  <label className="grid content-start gap-2">
                    <span className="text-label">{dict.explore.filters.district}</span>
                    <Select
                      value={filters.district ?? ""}
                      onChange={(event) => set("district", (event.target.value || null) as District | null)}
                      wrapperClassName="w-full max-w-sm"
                    >
                      <option value="">{t.all}</option>
                      {(Object.keys(dict.common.districts) as District[]).map((district) => (
                        <option key={district} value={district}>
                          {dict.common.districts[district]}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <p className="text-label text-ink">{t.nearTitle}</p>
                    <p className="max-w-[70ch] text-small text-pretty text-ink-soft">{dict.explore.nearMe.explain}</p>
                  </div>
                  {!reference ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={requestGeolocation}
                        disabled={geoStatus === "loading"}
                        icon={<LocateFixed aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                      >
                        {geoStatus === "loading" ? dict.explore.nearMe.locating : dict.explore.nearMe.useMyLocation}
                      </Button>
                      <span className="px-1 text-small text-ink-soft">{dict.explore.nearMe.or}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={startPickingOnMap}
                        aria-pressed={pickingOnMap}
                        icon={<MousePointerClick aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                      >
                        {dict.explore.nearMe.pickOnMap}
                      </Button>
                      <label className="min-w-0">
                        <span className="sr-only">{dict.explore.nearMe.pickDistrict}</span>
                        <Select
                          value={districtRef}
                          onChange={(event) => handlePickDistrict(event.target.value as District | "")}
                          wrapperClassName="max-w-[16rem]"
                        >
                          <option value="">{dict.explore.nearMe.pickDistrict}</option>
                          {(Object.keys(dict.common.districts) as District[]).map((district) => (
                            <option key={district} value={district}>
                              {dict.common.districts[district]}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {pickingOnMap ? (
                        <Button size="sm" variant="ghost" onClick={() => setPickingOnMap(false)}>
                          {t.cancel}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid max-w-xl gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="radius" className="text-label">
                          {fill(t.radius, { km: radiusKm })}
                        </label>
                        <Button size="sm" variant="ghost" onClick={clearProximity} icon={<X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
                          {dict.explore.nearMe.clear}
                        </Button>
                      </div>
                      <input
                        id="radius"
                        type="range"
                        min={0}
                        max={RADIUS_STEPS_KM.length - 1}
                        step={1}
                        value={radiusIndex}
                        onChange={(event) => setRadiusIndex(Number(event.target.value))}
                        aria-valuetext={fill(t.km, { km: radiusKm })}
                        className={cx("h-11 w-full cursor-pointer accent-brand", focusRing)}
                      />
                      <div aria-hidden className="flex justify-between text-small text-ink-soft tabular-nums">
                        {RADIUS_STEPS_KM.map((km) => (
                          <span key={km}>{fill(t.km, { km })}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {geoStatus === "denied" || geoStatus === "error" ? (
                    <p role="alert" className="text-small text-ink">
                      {geoStatus === "denied" ? dict.explore.nearMe.denied : dict.explore.nearMe.error}
                    </p>
                  ) : null}
                  {pickingOnMap ? <p className="text-small text-brand">{dict.explore.nearMe.pickingHint}</p> : null}
                </div>
              )}
            </div>
          ) : null}
        </Wrap>
      </div>

      {/* ── Results and map ── */}
      <Wrap className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <section aria-labelledby="results-heading" className={cx(view === "map" && "hidden lg:block")}>
          <h2 id="results-heading" className="sr-only">
            {t.resultsHeading}
          </h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p aria-live="polite" className="text-small text-ink-soft tabular-nums">
              {countLine}
            </p>
            <label className="flex items-center gap-2 text-small text-ink-soft">
              {t.sortLabel}
              <Select value={sort} onChange={(event) => setSort(event.target.value as ExploreSort)}>
                {SORTS.map((option) => (
                  <option key={option} value={option} disabled={!isSortAvailable(option, reference?.coords ?? null)}>
                    {dict.explore.sort[option as Exclude<ExploreSort, "rating">]}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {activeChips.length ? (
            <div role="group" aria-label={t.activeFilters} className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.clear}
                  aria-label={fill(t.removeFilter, { filter: chip.label })}
                  className={cx(
                    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-leaf-fill pr-2.5 pl-3.5 text-small font-medium text-brand",
                    "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
                    "transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--cmj-leaf-fill)_80%,var(--cmj-brand))]",
                    focusRing,
                  )}
                >
                  {chip.label}
                  <X aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={clearAll}>
                {t.clearAll}
              </Button>
            </div>
          ) : null}

          {sorted.length === 0 ? (
            <Box className="grid justify-items-center gap-3 px-6 py-14 text-center">
              <span aria-hidden className="grid size-14 place-items-center rounded-full bg-well text-brand">
                <Search strokeWidth={ICON_STROKE} className="size-6" />
              </span>
              <p className="text-title text-brand">{t.emptyTitle}</p>
              <p className="max-w-[40ch] text-body text-pretty text-ink-soft">{t.emptyBody}</p>
              <Button variant="secondary" onClick={clearAll} className="mt-2">
                {t.clearAll}
              </Button>
            </Box>
          ) : (
            <ul role="list" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {visible.map((place) => {
                const name = place.name[locale];
                const km = nearby?.get(place.slug);
                const reading = airQualityOn ? aqiLayer.dataBySlug.get(place.slug) : undefined;
                const comparing = compareSlugs.includes(place.slug);
                const note =
                  km !== undefined || reading ? (
                    <span className="grid gap-0.5">
                      {km !== undefined && reference ? (
                        <span>
                          {fill(t.away, {
                            distance: formatDistance(km, dict),
                            minutes: estimateTravelMinutes(reference.coords, place.coordinates),
                          })}
                        </span>
                      ) : null}
                      {reading ? <AqiNote reading={reading} locale={locale} dict={dict} className="text-ink-soft" /> : null}
                    </span>
                  ) : null;
                return (
                  <li key={place.slug} className="min-w-0">
                    <PlaceCardFor
                      place={place}
                      locale={locale}
                      dict={dict}
                      layout="auto"
                      className="h-full"
                      active={hoveredSlug === place.slug}
                      onPointerEnter={isDesktop ? () => setHoveredSlug(place.slug) : undefined}
                      onPointerLeave={isDesktop ? () => setHoveredSlug(null) : undefined}
                      onFocus={isDesktop ? () => setHoveredSlug(place.slug) : undefined}
                      onBlur={isDesktop ? () => setHoveredSlug(null) : undefined}
                      favorite={<FavoriteToggle slug={place.slug} placeName={name} />}
                      note={note}
                      footer={
                        <>
                          <button
                            type="button"
                            onClick={() => toggleCompare(place.slug)}
                            aria-pressed={comparing}
                            aria-label={fill(comparing ? t.compareRemove : t.compareAdd, { place: name })}
                            className={cx(
                              // Not on a phone: comparing means looking at several
                              // places on one map, which needs a screen's room.
                              "mr-auto hidden min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-small font-medium sm:inline-flex",
                              "text-ink-soft shadow-[inset_0_0_0_1.5px_var(--cmj-line-strong)] transition-colors duration-150 hover:bg-well hover:text-ink",
                              "aria-pressed:bg-leaf-fill aria-pressed:text-brand aria-pressed:shadow-[inset_0_0_0_1.5px_var(--cmj-brand)]",
                              focusRing,
                            )}
                          >
                            {comparing ? (
                              <Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                            ) : (
                              <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                            )}
                            {t.compare}
                          </button>
                          <PlanToggle slug={place.slug} placeName={name} plannerDay={plannerDay} />
                        </>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {sorted.length > visible.length ? (
            <div className="mt-8 grid justify-items-center gap-3">
              <p className="text-small text-ink-soft tabular-nums">
                {fill(t.showing, { shown: visible.length, total: sorted.length })}
              </p>
              <Button variant="secondary" onClick={() => setVisibleCount((n) => n + GRID_PAGE_SIZE)}>
                {t.loadMore}
              </Button>
            </div>
          ) : null}

          {airQualityOn ? (
            <p className="mt-8 text-credit text-ink-soft">
              {aqiLayer.isLoading
                ? dict.explore.airQuality.loading
                : aqiLayer.dataBySlug.size === 0
                  ? dict.explore.airQuality.unavailable
                  : dict.explore.airQuality.explain}{" "}
              · {dict.weather.attribution}
            </p>
          ) : null}
        </section>

        <aside
          aria-label={t.mapLabel}
          className={cx(
            "no-print overflow-hidden rounded-xl shadow-float",
            "h-[calc(100dvh_-_72px_-_var(--bar-h,124px)_-_2.5rem)] min-h-[360px]",
            "lg:sticky lg:top-[calc(72px_+_var(--bar-h,124px)_+_1.25rem)] lg:h-[calc(100dvh_-_72px_-_var(--bar-h,124px)_-_2.5rem)]",
            view === "map" ? "block" : "hidden lg:block",
          )}
        >
          {showMap ? (
            <ExploreMapLoader
              className="size-full"
              places={mapPlaces}
              framePlaces={framePlaces}
              highlightSlugs={compareSlugs}
              hoveredSlug={hoveredSlug}
              onHoverPlace={setHoveredSlug}
              reference={reference?.coords ?? null}
              radiusKm={reference ? radiusKm : null}
              pickingOnMap={pickingOnMap}
              onMapPick={handleMapPick}
              airQualityBySlug={airQualityOn ? aqiLayer.dataBySlug : null}
              plannerDay={plannerDay}
            />
          ) : null}
        </aside>
      </Wrap>

      {/* ── Bottom bars ── */}
      {compareSlugs.length > 0 ? (
        <div className="no-print fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-2 rounded-full bg-forest py-1.5 pr-1.5 pl-5 text-on-forest shadow-lift dark:ring-1 dark:ring-line-strong">
            <p className="min-w-0 truncate text-label">
              {fill(t.compareBar, { count: compareSlugs.length })}
              <span className="hidden text-on-forest-soft sm:inline"> · {t.compareHint}</span>
            </p>
            <button
              type="button"
              onClick={() => handleSetView("map")}
              className="inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full bg-cmj-sand px-4 text-label text-cmj-green hover:bg-cmj-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sand lg:hidden"
            >
              <MapIcon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              {t.compareShow}
            </button>
            <button
              type="button"
              onClick={() => setCompareSlugs([])}
              className="inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full px-4 text-label text-on-forest-soft hover:bg-cmj-paper/12 hover:text-on-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sand"
            >
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              {t.compareClear}
            </button>
          </div>
        </div>
      ) : (
        <div className="no-print fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 lg:hidden">
          <Button
            onClick={() => handleSetView(view === "map" ? "grid" : "map")}
            icon={
              view === "map" ? (
                <List aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              ) : (
                <MapIcon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              )
            }
            className="shadow-lift"
          >
            {view === "map" ? t.listFab : fill(t.mapFab, { count: mapPlaces.length })}
          </Button>
        </div>
      )}
    </div>
  );
}
