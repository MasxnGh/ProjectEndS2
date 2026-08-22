"use client";

import Link from "next/link";
import { Check, Clock, MapPin, Plus, Route, Star } from "lucide-react";
import type { Place } from "@/data/types";
import { PlaceImage } from "@/components/place-image";
import { FavoriteButton } from "@/components/favorite-button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { getPlacePhoto } from "@/data/photo-manifest";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, useTripStoreHydrated, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number, locale: "en" | "th", labels: { minutes: string; hours: string }) {
  if (minutes < 60) return `${minutes} ${labels.minutes}`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${labels.hours}`;
}

export function PlaceCard({
  place,
  className,
  plannerDayId,
  plannerDayNumber,
  distanceKm,
  travelMinutes,
}: {
  place: Place;
  className?: string;
  /** When set, the add button targets this specific planner day instead of the general Unscheduled inbox. */
  plannerDayId?: string;
  plannerDayNumber?: number;
  /** Real distance from a reference point (current place, or a proximity-search origin) — shown as a badge when set. */
  distanceKm?: number;
  travelMinutes?: number;
}) {
  const { locale, dict } = useLocale();
  const { showToast } = useToast();
  // Both of these come from the persisted trip, so they must stay at the
  // server's answer until the store has rehydrated — see useTripStoreHydrated.
  const hydrated = useTripStoreHydrated();
  const isPlanned = useTripStore((s) => s.isPlanned(place.slug)) && hydrated;
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const storedLocation = useTripStore((s) => s.locationOf(place.slug));
  const location = hydrated ? storedLocation : null;
  const dayIds = useTripStore((s) => s.dayIds);
  const moveToDay = useTripStore((s) => s.moveToDay);
  const duplicateToDay = useTripStore((s) => s.duplicateToDay);

  const inPlannerMode = Boolean(plannerDayId && plannerDayNumber);
  const isActive = inPlannerMode ? location === plannerDayId : isPlanned;
  const pt = dict.planner.toast;
  const pp = dict.planner.picker;

  function handlePlannerClick() {
    if (!plannerDayId || !plannerDayNumber) return;

    if (location === plannerDayId) {
      removeFromPlan(place.slug, plannerDayId);
      showToast({
        message: pt.removedFromDay.replace("{day}", String(plannerDayNumber)),
        actions: [{ label: pt.undo, onClick: () => moveToDay(place.slug, plannerDayId) }],
      });
      return;
    }

    if (location && location !== UNSCHEDULED) {
      const fromDayNumber = dayIds.indexOf(location) + 1;
      showToast({
        message: pp.duplicateWarning.replace("{day}", String(fromDayNumber)),
        durationMs: 8000,
        actions: [
          {
            label: pp.addDuplicate,
            onClick: () => {
              duplicateToDay(place.slug, plannerDayId);
              showToast({ message: pt.duplicated.replace("{day}", String(plannerDayNumber)) });
            },
          },
          {
            label: pp.moveHere,
            onClick: () => {
              moveToDay(place.slug, plannerDayId);
              showToast({ message: pt.moved.replace("{day}", String(plannerDayNumber)) });
            },
          },
        ],
      });
      return;
    }

    moveToDay(place.slug, plannerDayId);
    showToast({
      message: pt.addedToDay.replace("{day}", String(plannerDayNumber)),
      actions: [{ label: pt.undo, onClick: () => removeFromPlan(place.slug, plannerDayId) }],
    });
  }

  const m = useMotionTokens();

  return (
    <motion.div
      // The most repeated element on the site, and until now it did not react
      // to being pointed at beyond a shadow. No `layout` here on purpose: the
      // explore grid re-keys when filters change, and a layout animation on
      // top of that remount fights it.
      whileHover={m.reduced ? undefined : { y: -4 }}
      transition={m.spring("soft")}
      className="group h-full"
    >
      {/* The spotlight has to be the element that carries `bg-surface`, not a
          wrapper around it. Its glow layer sits at `-z-10`, which CSS paints
          above that element's own background but below any descendant — put an
          opaque child in between and the glow disappears entirely. The hover
          lift stays on the motion wrapper outside, so the two effects do not
          compete for the same transform.

          `className` belongs here, not on the wrapper. Callers pass spacing
          that has to be *inside* the card's border — Explore sends `pb-14` to
          reserve the band its Compare pill sits in, and when that padding
          landed on the outer wrapper instead, the card stopped 56px short of
          its grid cell and the pill floated below it on bare page background. */}
      <SpotlightCard
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow duration-300 hover:shadow-elevated",
          className
        )}
      >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlaceImage
          category={place.category}
          paletteSeed={place.paletteSeed}
          label={place.name[locale]}
          photoSrc={getPlacePhoto(place.slug)}
          quality={70}
          className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground backdrop-blur-sm">
          {dict.common.categories[place.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif-display text-xl leading-snug">{place.name[locale]}</h3>
          <span className="flex shrink-0 items-center gap-1 pt-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent-text" />
            {place.rating}
          </span>
        </div>

        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
          {place.shortDescription[locale]}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {dict.common.districts[place.district]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(place.durationMinutes, locale, dict.common)}
          </span>
          <span aria-label={dict.common.price[place.priceLevel]}>
            {"฿".repeat(place.priceLevel)}
          </span>
          {typeof distanceKm === "number" ? (
            <span className="flex items-center gap-1 text-accent-text">
              <Route className="h-3.5 w-3.5" />
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
              {typeof travelMinutes === "number" ? ` · ~${travelMinutes} ${dict.common.minutes}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={
          inPlannerMode ? handlePlannerClick : () => (isPlanned ? removeFromPlan(place.slug) : addPlace(place.slug))
        }
        className={cn(
          "absolute right-3 top-3 z-10 flex items-center justify-center gap-1.5 rounded-full border backdrop-blur-sm transition-colors duration-200",
          inPlannerMode ? "px-3.5 py-2 text-xs font-medium" : "h-9 w-9",
          isActive
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border-strong bg-background/85 text-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        aria-label={
          inPlannerMode
            ? (isActive ? dict.explore.plannerContext.inDay : dict.explore.plannerContext.addToDay).replace(
                "{day}",
                String(plannerDayNumber)
              )
            : isPlanned
              ? dict.common.addedToPlan
              : dict.common.addToPlan
        }
        aria-pressed={isActive}
      >
        {isActive ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
        {inPlannerMode
          ? (isActive ? dict.explore.plannerContext.inDay : dict.explore.plannerContext.addToDay).replace(
              "{day}",
              String(plannerDayNumber)
            )
          : null}
      </button>

      {/* Stacked under the add-to-plan control rather than beside it: that one
          grows to a labelled pill in planner mode, so a side-by-side heart
          would collide exactly when the card is busiest. */}
      <FavoriteButton
        slug={place.slug}
        placeName={place.name[locale]}
        className="absolute right-3 top-14 z-10 h-9 w-9"
      />

      <Link
        href={`/${locale}/place/${place.slug}`}
        className="absolute inset-0 z-0"
        aria-label={`${dict.common.viewDetails}: ${place.name[locale]}`}
      />
      </SpotlightCard>
    </motion.div>
  );
}
