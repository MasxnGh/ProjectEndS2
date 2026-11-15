"use client";

import { useMemo, useState } from "react";
import { Heart, Map as MapIcon, Plus } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import type { PlaceCategory } from "@/data/types";
import { Button, ButtonLink } from "@/components/brand/button";
import { Chip, ChipRow } from "@/components/brand/chip";
import { cx } from "@/components/brand/cx";
import { FavoriteToggle } from "@/components/brand/favorite-toggle";
import { CATEGORY_ORDER, categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { PlaceCardFor } from "@/components/brand/place-card";
import { fill } from "@/components/brand/place-text";
import { PlanToggle } from "@/components/brand/plan-toggle";
import { ExploreMapLoader } from "@/components/map/explore-map-loader";
import { useFavorites } from "@/lib/favorites/favorites-provider";
import { useTripStore } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
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
  const m = useMotionTokens();
  const addPlace = useTripStore((s) => s.addPlace);
  const containers = useTripStore((s) => s.containers);

  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [mapOpen, setMapOpen] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

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

  // Only the kinds this list holds, in the site's usual order, each with its count.
  const categories = useMemo(() => {
    const counts = new Map<PlaceCategory, number>();
    for (const place of places) counts.set(place.category, (counts.get(place.category) ?? 0) + 1);
    return CATEGORY_ORDER.filter((value) => counts.has(value)).map((value) => ({
      value,
      count: counts.get(value) ?? 0,
    }));
  }, [places]);

  // A filter whose last place was un-hearted would show an empty grid; fall back to all.
  const activeCategory = category !== "all" && categories.some((c) => c.value === category) ? category : "all";

  const visible = useMemo(
    () => (activeCategory === "all" ? places : places.filter((place) => place.category === activeCategory)),
    [places, activeCategory]
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
      <section className="grid justify-items-center gap-3 rounded-lg bg-well px-6 py-12 text-center">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-panel text-brand">
          <Heart strokeWidth={ICON_STROKE} className="size-6" />
        </span>
        <h2 className="text-title font-semibold text-brand">{t.empty.title}</h2>
        <p className="max-w-[44ch] text-body text-pretty text-ink-soft">{loadFailed ? t.loadFailed : t.empty.body}</p>
        <ButtonLink href={`/${locale}/explore`} arrow className="mt-2">
          {t.empty.cta}
        </ButtonLink>
      </section>
    );
  }

  return (
    <>
      {categories.length > 1 ? (
        <ChipRow scroll label={dict.explore.filters.category} className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <Chip pressed={activeCategory === "all"} onClick={() => setCategory("all")} count={places.length}>
            {t.filterAll}
          </Chip>
          {categories.map(({ value, count }) => {
            const Icon = categoryIcon[value];
            return (
              <Chip
                key={value}
                pressed={activeCategory === value}
                onClick={() => setCategory(value)}
                icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                count={count}
              >
                {dict.common.categories[value]}
              </Chip>
            );
          })}
        </ChipRow>
      ) : null}

      <div className={cx("flex flex-wrap items-center gap-3", categories.length > 1 ? "mt-5" : null)}>
        {/* Its own line on a phone, so the two buttons can sit side by side under it. */}
        <p aria-live="polite" className="w-full text-label text-ink-soft tabular-nums sm:mr-auto sm:w-auto">
          {visible.length === 1 ? t.countOne : fill(t.count, { count: visible.length })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMapOpen((open) => !open)}
          aria-expanded={mapOpen}
          aria-controls="favorites-map"
          icon={<MapIcon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {mapOpen ? t.hideMap : t.showMap}
        </Button>
        <Button size="sm" onClick={addAllToPlan} icon={<Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
          {t.addAllToPlan}
        </Button>
      </div>

      <div id="favorites-map">
        {/* The Explore map, with these places as pins: favourites are a set, not
            a route, so nothing is drawn between them. */}
        {mapOpen ? (
          <div className="no-print mt-6 h-[min(420px,60dvh)] overflow-hidden rounded-xl shadow-float">
            <ExploreMapLoader
              className="size-full"
              places={visible}
              framePlaces={visible}
              hoveredSlug={hoveredSlug}
              onHoverPlace={setHoveredSlug}
            />
          </div>
        ) : null}
      </div>

      {/* Un-hearting a place removes its card from this grid, so the exit
          animation is what tells the traveller which one left — otherwise the
          grid just reflows and it is easy to think you removed the wrong one. */}
      <ul className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {visible.map((place, index) => {
            const name = place.name[locale];
            return (
              <motion.li
                key={place.slug}
                layout={m.reduced ? false : "position"}
                initial={{ opacity: 0, y: m.reduced ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: m.reduced ? 1 : 0.96 }}
                transition={{ ...m.tween("base"), delay: Math.min(index, 8) * m.stagger(0.05) }}
                className="min-w-0"
              >
                <PlaceCardFor
                  place={place}
                  locale={locale}
                  dict={dict}
                  layout="auto"
                  className="h-full"
                  active={mapOpen && hoveredSlug === place.slug}
                  onPointerEnter={mapOpen ? () => setHoveredSlug(place.slug) : undefined}
                  onPointerLeave={mapOpen ? () => setHoveredSlug(null) : undefined}
                  favorite={<FavoriteToggle slug={place.slug} placeName={name} />}
                  footer={<PlanToggle slug={place.slug} placeName={name} />}
                />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </>
  );
}
