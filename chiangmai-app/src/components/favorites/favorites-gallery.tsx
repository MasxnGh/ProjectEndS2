"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Map as MapIcon, Plus } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import type { PlaceCategory } from "@/data/types";
import { PlaceCard } from "@/components/place-card";
import { PlannerMapLoader } from "@/components/planner/planner-map-loader";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import { useTripStore } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/i18n";

export function FavoritesGallery({
  initialSlugs,
  loadFailed,
  locale,
}: {
  initialSlugs: string[];
  loadFailed: boolean;
  locale: Locale;
}) {
  const { dict } = useLocale();
  const t = dict.favorites;
  const { slugs } = useFavorites();
  const { showToast } = useToast();
  const addPlace = useTripStore((s) => s.addPlace);
  const containers = useTripStore((s) => s.containers);

  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [mapOpen, setMapOpen] = useState(false);

  // The server render is the source of truth until the provider has loaded;
  // after that the live set wins, so removing a heart updates this page
  // immediately instead of leaving a card for something no longer saved.
  const activeSlugs = useMemo(
    () => (slugs ? initialSlugs.filter((slug) => slugs.has(slug)) : initialSlugs),
    [slugs, initialSlugs]
  );

  const places = useMemo(
    () => activeSlugs.map(getPlaceBySlug).filter((place) => place !== undefined),
    [activeSlugs]
  );

  const categories = useMemo(() => {
    const present = new Set<PlaceCategory>();
    for (const place of places) present.add(place.category);
    return [...present];
  }, [places]);

  const visible = useMemo(
    () => (category === "all" ? places : places.filter((place) => place.category === category)),
    [places, category]
  );

  // One synthetic day, so the existing planner map renders these exactly the
  // way it renders an itinerary — no second map implementation to keep in
  // sync. These are favourites, not a route, so the line the map draws
  // between them is meaningless; that's the tradeoff for reusing it, and it
  // still answers the question the brief asks — where these places sit
  // relative to each other.
  const mapDays = useMemo(
    () => [{ id: "favorites", dayNumber: 1, places: visible }],
    [visible]
  );

  function addAllToPlan() {
    const alreadyPlanned = new Set(Object.values(containers).flat());
    const toAdd = visible.filter((place) => !alreadyPlanned.has(place.slug));
    if (toAdd.length === 0) {
      showToast({ message: t.alreadyInPlan });
      return;
    }
    // Lands in Unscheduled, same as adding from Explore — the traveller
    // decides which day each one belongs to.
    for (const place of toAdd) addPlace(place.slug);
    showToast({
      message:
        toAdd.length === 1
          ? t.addedToPlanOne
          : t.addedToPlan.replace("{count}", String(toAdd.length)),
    });
  }

  if (places.length === 0) {
    return (
      <section className="mt-12 rounded-lg border border-dashed border-border-strong p-10 text-center">
        <h2 className="font-serif-display text-2xl">{t.empty.title}</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground text-pretty">
          {loadFailed ? t.loadFailed : t.empty.body}
        </p>
        <Link
          href={`/${locale}/explore`}
          className="mt-6 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          {t.empty.cta}
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          {t.filterAll}
        </FilterChip>
        {categories.map((value) => (
          <FilterChip key={value} active={category === value} onClick={() => setCategory(value)}>
            {dict.common.categories[value]}
          </FilterChip>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {visible.length === 1 ? t.countOne : t.count.replace("{count}", String(visible.length))}
        </p>
        <button
          type="button"
          onClick={addAllToPlan}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t.addAllToPlan}
        </button>
        <button
          type="button"
          onClick={() => setMapOpen((open) => !open)}
          aria-expanded={mapOpen}
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text"
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          {mapOpen ? t.hideMap : t.showMap}
        </button>
      </div>

      {mapOpen ? (
        <div className="mt-6">
          <PlannerMapLoader days={mapDays} className="h-[420px] w-full rounded-lg" />
        </div>
      ) : null}

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((place) => (
          <li key={place.slug}>
            <PlaceCard place={place} className="h-full pb-14" />
          </li>
        ))}
      </ul>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-foreground/80 hover:border-accent hover:text-accent-text"
      }`}
    >
      {children}
    </button>
  );
}
