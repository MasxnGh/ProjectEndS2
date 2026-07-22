"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, LayoutGrid, Map as MapIcon, MapPin, SlidersHorizontal, X } from "lucide-react";
import { places } from "@/data/places";
import type { BestTime, District, PlaceCategory, PriceLevel } from "@/data/types";
import { PlaceCard } from "@/components/place-card";
import { GoogleMap } from "@/components/map/google-map";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { useLocale } from "@/components/providers/locale-provider";
import { distanceBucketFrom, type DistanceBucket } from "@/lib/geo";
import { cn } from "@/lib/utils";

const categories: PlaceCategory[] = ["temple", "nature", "village", "cafe", "market", "activity"];
const districts: District[] = [
  "old-city",
  "nimman",
  "doi-suthep",
  "doi-inthanon",
  "mae-rim",
  "mae-kampong",
  "san-kamphaeng",
  "hang-dong",
  "samoeng",
  "chiang-mai-city",
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

export function ExploreClient() {
  const { locale, dict } = useLocale();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<PlaceCategory | null>(
    (searchParams.get("category") as PlaceCategory) || null
  );
  const [district, setDistrict] = useState<District | null>(null);
  const [price, setPrice] = useState<PriceLevel | null>(null);
  const [time, setTime] = useState<BestTime | null>(null);
  const [distance, setDistance] = useState<DistanceBucket | null>(null);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    return places.filter((place) => {
      if (category && place.category !== category) return false;
      if (district && place.district !== district) return false;
      if (price && place.priceLevel !== price) return false;
      if (time && !place.bestTime.includes(time)) return false;
      if (distance && distanceBucketFrom(place.coordinates) !== distance) return false;
      return true;
    });
  }, [category, district, price, time, distance]);

  const hasFilters = Boolean(category || district || price || time || distance);
  const secondaryActiveCount = [district, price, time, distance].filter(Boolean).length;
  const comparePlaces = useMemo(
    () => compareSlugs.map((slug) => places.find((p) => p.slug === slug)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [compareSlugs]
  );
  const mapPlaces = compareSlugs.length > 0 ? comparePlaces : filtered;

  function clearFilters() {
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
      <Reveal>
        <SectionHeading kicker={dict.nav.explore} title={dict.explore.title} subtitle={dict.explore.subtitle} />
      </Reveal>

      <div className="mt-10 space-y-4">
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
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {dict.explore.filters.price}
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
      </div>

      <div className="mt-8 flex items-center justify-between border-y border-border py-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {dict.explore.filters.results}
        </p>
        <div className="flex items-center gap-1 rounded-full border border-border p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
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
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              view === "map" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {dict.explore.view.map}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-24 text-center text-muted-foreground">{dict.explore.filters.noResults}</p>
      ) : view === "grid" ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => {
            const selected = compareSlugs.includes(place.slug);
            return (
              <div key={place.slug} className="relative">
                <PlaceCard place={place} />
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1 lg:max-h-[720px]">
            {filtered.map((place) => {
              const selected = compareSlugs.includes(place.slug);
              return (
                <div
                  key={place.slug}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3",
                    selected ? "border-secondary bg-secondary/10" : "border-border"
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
          <GoogleMap
            places={mapPlaces}
            highlightSlugs={compareSlugs}
            showRoute={compareSlugs.length > 1}
            className="h-[400px] lg:h-[720px]"
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
              onClick={() => setView("map")}
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
    </div>
  );
}
