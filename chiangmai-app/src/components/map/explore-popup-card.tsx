"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { Place } from "@/data/types";
import type { Dictionary, Locale } from "@/i18n";
import type { AirQualityResponse } from "@/lib/weather/types";
import { AqiNote } from "@/components/brand/aqi";
import { cx, focusRing } from "@/components/brand/cx";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { NoPhoto, PlacePhoto } from "@/components/brand/place-photo";
import { PlanToggle, type PlannerDay } from "@/components/brand/plan-toggle";
import { fill, placeMeta, placeWhere } from "@/components/brand/place-text";
import { ThaiName } from "@/components/brand/thai-name";

/**
 * What a dot opens: the place in small — photo, name, where, the same true
 * meta the card shows (no rating), air quality when that layer is on — with
 * add-to-plan and a link to the page.
 */
export function ExplorePopupCard({
  place,
  locale,
  dict,
  airQuality = null,
  plannerDay = null,
  onClose,
}: {
  place: Place;
  locale: Locale;
  dict: Dictionary;
  airQuality?: AirQualityResponse | null;
  plannerDay?: PlannerDay | null;
  onClose: () => void;
}) {
  const name = place.name[locale];
  const where = placeWhere(place, dict);
  return (
    <div className="grid w-[244px] gap-2.5 p-2.5 font-brand text-ink">
      <div className="relative aspect-[16/9] overflow-hidden rounded-md">
        <PlacePhoto
          slug={place.slug}
          alt=""
          sizes="244px"
          fallback={
            <NoPhoto
              icon={categoryIcon[place.category]}
              size="sm"
              label={fill(dict.ui.noPhotoLabel, { category: dict.common.categories[place.category], where })}
            />
          }
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={dict.browse.close}
          title={dict.browse.close}
          className={cx(
            "absolute top-1.5 right-1.5 grid size-9 cursor-pointer place-items-center rounded-full bg-cmj-surface/92 text-cmj-green",
            focusRing,
          )}
        >
          <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </button>
      </div>
      <div className="grid gap-1 px-1">
        <p className="text-[1rem] leading-[1.4] font-semibold text-pretty">
          <ThaiName text={name} />
        </p>
        <p className="text-small text-ink-soft">{where}</p>
        <p className="text-small text-ink-soft tabular-nums">{placeMeta(place, dict)}</p>
        {airQuality ? <AqiNote reading={airQuality} locale={locale} dict={dict} className="text-small" /> : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <Link
          href={`/${locale}/place/${place.slug}`}
          className={cx(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full text-label text-brand underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          {dict.browse.popupView}
          <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </Link>
        <PlanToggle slug={place.slug} placeName={name} plannerDay={plannerDay} />
      </div>
    </div>
  );
}
