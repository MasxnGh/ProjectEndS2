"use client";

import { Check, Clock, Copy, MapPin, Plus, Repeat } from "lucide-react";
import type { Place } from "@/data/types";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { formatMinutes } from "@/lib/trip-calculations";
import { useToast } from "@/components/toast/toast-provider";

export function PlacePickerCard({ place, dayId, dayNumber }: { place: Place; dayId: string; dayNumber: number }) {
  const { locale, dict } = useLocale();
  const { showToast } = useToast();
  const dayIds = useTripStore((s) => s.dayIds);
  const location = useTripStore((s) => s.locationOf(place.slug));
  const moveToDay = useTripStore((s) => s.moveToDay);
  const duplicateToDay = useTripStore((s) => s.duplicateToDay);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);

  const t = dict.planner.toast;
  const isHere = location === dayId;
  const elsewhereDayNumber =
    location && location !== dayId && location !== UNSCHEDULED ? dayIds.indexOf(location) + 1 : null;

  function handleAdd() {
    moveToDay(place.slug, dayId);
    showToast({
      message: t.addedToDay.replace("{day}", String(dayNumber)),
      actions: [{ label: t.undo, onClick: () => removeFromPlan(place.slug, dayId) }],
    });
  }

  function handleRemove() {
    removeFromPlan(place.slug, dayId);
    showToast({
      message: t.removedFromDay.replace("{day}", String(dayNumber)),
      actions: [{ label: t.undo, onClick: () => moveToDay(place.slug, dayId) }],
    });
  }

  function handleDuplicate() {
    duplicateToDay(place.slug, dayId);
    showToast({
      message: t.duplicated.replace("{day}", String(dayNumber)),
      actions: [{ label: t.undo, onClick: () => removeFromPlan(place.slug, dayId) }],
    });
  }

  function handleMove() {
    moveToDay(place.slug, dayId);
    showToast({
      message: t.moved.replace("{day}", String(dayNumber)),
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5">
      <PlaceImage
        category={place.category}
        paletteSeed={place.paletteSeed}
        photoSrc={getPlacePhoto(place.slug)}
        sizes="56px"
        quality={70}
        className="h-14 w-14 shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{place.name[locale]}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{dict.common.categories[place.category]}</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {dict.common.districts[place.district]}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatMinutes(place.durationMinutes)}
          </span>
        </div>
      </div>

      {elsewhereDayNumber ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="max-w-[9rem] text-right text-[11px] leading-snug text-muted-foreground">
            {dict.planner.picker.duplicateWarning.replace("{day}", String(elsewhereDayNumber))}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent-text"
            >
              <Copy className="h-3 w-3" />
              {dict.planner.picker.addDuplicate}
            </button>
            <button
              type="button"
              onClick={handleMove}
              className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
            >
              <Repeat className="h-3 w-3" />
              {dict.planner.picker.moveHere}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={isHere ? handleRemove : handleAdd}
          aria-pressed={isHere}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors duration-200 ${
            isHere
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border-strong hover:border-accent hover:text-accent-text"
          }`}
        >
          {isHere ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isHere ? dict.planner.picker.inThisDay : dict.planner.picker.add}
        </button>
      )}
    </div>
  );
}
