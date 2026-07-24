import Link from "next/link";
import { Check, Clock, Plus, Star } from "lucide-react";
import type { Place } from "@/data/types";
import type { Locale, Dictionary } from "@/i18n";
import type { AirQualityResponse } from "@/lib/weather/types";
import { AqiDot } from "@/components/weather/aqi-meter";
import { AQI_LABELS } from "@/lib/weather/aqi";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { cn } from "@/lib/utils";

export function ExplorePopupCard({
  place,
  locale,
  dict,
  isPlanned,
  onAdd,
  onRemove,
  airQuality = null,
}: {
  place: Place;
  locale: Locale;
  dict: Dictionary;
  isPlanned: boolean;
  onAdd: () => void;
  onRemove: () => void;
  airQuality?: AirQualityResponse | null;
}) {
  return (
    <div className="w-48 font-sans">
      <PlaceImage
        category={place.category}
        paletteSeed={place.paletteSeed}
        photoSrc={getPlacePhoto(place.slug)}
        sizes="192px"
        quality={70}
        className="-mx-3 -mt-3 mb-2 h-20 rounded-t-md"
      />
      <p className="font-serif-display text-sm leading-snug text-foreground">{place.name[locale]}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-accent text-accent-text" />
          {place.rating}
        </span>
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {place.durationMinutes} {dict.common.minutes}
        </span>
      </div>
      {airQuality ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <AqiDot level={airQuality.level} />
          {dict.weather.pm25} {Math.round(airQuality.pm2_5)} {dict.weather.pm25Unit} ·{" "}
          {AQI_LABELS[airQuality.level][locale]}
        </p>
      ) : null}
      <button
        type="button"
        onClick={isPlanned ? onRemove : onAdd}
        aria-pressed={isPlanned}
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          isPlanned
            ? "border-accent bg-accent text-accent-foreground"
            : "border-border-strong hover:border-accent hover:text-accent-text"
        )}
      >
        {isPlanned ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        {isPlanned ? dict.common.addedToPlan : dict.common.addToPlan}
      </button>
      <Link
        href={`/${locale}/place/${place.slug}`}
        className="mt-1.5 block text-center text-[11px] font-medium text-accent-text hover:underline"
      >
        {dict.common.viewDetails}
      </Link>
    </div>
  );
}
