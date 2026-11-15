"use client";

import Link from "next/link";
import { ArrowRight, Plus, Route, Sparkles } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { Button } from "@/components/brand/button";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { NoPhoto, PlacePhoto } from "@/components/brand/place-photo";
import { cx, focusRing } from "@/components/brand/cx";
import { placeWhere } from "@/components/brand/place-text";

/** The old planner's example day, unchanged. */
export const EXAMPLE_TRIP_SLUGS = ["wat-phra-that-doi-suthep", "wat-chedi-luang", "wat-phra-singh"];

/**
 * A plan with nothing in it: three ways in (the example day, an AI draft, or
 * picking places), and the example day itself, so "start from the example"
 * shows what it will put in before anyone presses it.
 */
export function PlanEmpty({
  aiEnabled,
  onOpenAi,
  onAddPlace,
}: {
  aiEnabled: boolean;
  onOpenAi: () => void;
  onAddPlace: (trigger: HTMLElement) => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.plan.empty;
  const addPlace = useTripStore((s) => s.addPlace);
  const moveItem = useTripStore((s) => s.moveItem);
  const sample = EXAMPLE_TRIP_SLUGS.map((slug) => getPlaceBySlug(slug)).filter((p): p is Place => Boolean(p));

  function startFromExample() {
    const targetDay = useTripStore.getState().dayIds[0];
    EXAMPLE_TRIP_SLUGS.forEach((slug, index) => {
      addPlace(slug);
      moveItem({ slug, toContainer: targetDay, toIndex: index });
    });
  }

  return (
    <section aria-labelledby="planner-empty-title" className="grid gap-5 rounded-lg border border-dashed border-line-strong p-5 sm:p-6">
      <div className="grid gap-2">
        <h2 id="planner-empty-title" className="text-title font-semibold text-brand">
          {t.title}
        </h2>
        <p className="text-body text-pretty text-ink-soft">{t.body}</p>
      </div>

      <div className="grid gap-2 rounded-md bg-sand-fill p-3">
        <p className="px-1 text-small font-medium text-brand">{t.preview}</p>
        <ol className="grid gap-2">
          {sample.map((place, i) => {
            const Icon = categoryIcon[place.category];
            return (
              <li key={place.slug} className="flex items-center gap-3 rounded-sm bg-panel p-2">
                <span className="grid size-7 flex-none place-items-center rounded-full bg-brand text-credit font-semibold text-on-brand tabular-nums">
                  {i + 1}
                </span>
                <div className="size-11 flex-none overflow-hidden rounded-sm">
                  <PlacePhoto
                    slug={place.slug}
                    alt=""
                    sizes="44px"
                    fallback={<NoPhoto icon={Icon} label={dict.common.categories[place.category]} size="sm" className="p-0" />}
                  />
                </div>
                <p className="grid min-w-0">
                  <span className="text-label leading-[1.4] font-medium">{place.name[locale]}</span>
                  <span className="text-small text-ink-soft">{placeWhere(place, dict)}</span>
                </p>
              </li>
            );
          })}
        </ol>
        <Button onClick={startFromExample} className="mt-1 w-full justify-center" icon={<Route aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
          {dict.planner.exampleTripCta}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {aiEnabled ? (
          <Button variant="secondary" onClick={onOpenAi} icon={<Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
            {dict.planner.ai.button}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={(event) => onAddPlace(event.currentTarget)}
          icon={<Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {dict.planner.emptyCta}
        </Button>
      </div>

      <Link
        href={`/${locale}/explore`}
        className={cx(
          "inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-label font-medium text-brand underline-offset-4 hover:underline",
          focusRing,
        )}
      >
        {dict.planner.exploreButton}
        <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      </Link>
    </section>
  );
}
