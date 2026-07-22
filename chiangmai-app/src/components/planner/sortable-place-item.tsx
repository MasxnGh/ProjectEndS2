"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, GripVertical, X } from "lucide-react";
import type { Place } from "@/data/types";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { useLocale } from "@/components/providers/locale-provider";
import { SPEND_ESTIMATE_THB, formatMinutes, formatThb } from "@/lib/trip-calculations";
import { cn } from "@/lib/utils";

export function SortablePlaceItem({
  place,
  onRemove,
  index,
  onQuickAdd,
  quickAddLabel,
}: {
  place: Place;
  onRemove: () => void;
  index?: number;
  onQuickAdd?: () => void;
  quickAddLabel?: string;
}) {
  const { locale, dict } = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.slug,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-border bg-background no-print",
        isDragging && "z-10 opacity-60 shadow-elevated"
      )}
    >
      <div className="flex items-center gap-3 p-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {typeof index === "number" ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            {index + 1}
          </span>
        ) : null}

        <PlaceImage
          category={place.category}
          paletteSeed={place.paletteSeed}
          photoSrc={getPlacePhoto(place.slug)}
          className="h-10 w-10 shrink-0 rounded"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{place.name[locale]}</p>
          <p className="truncate text-xs text-muted-foreground">
            {dict.common.districts[place.district]} · {place.openingHours[locale]}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatMinutes(place.durationMinutes)} · {formatThb(SPEND_ESTIMATE_THB[place.priceLevel])}{" "}
            {dict.planner.perPerson}
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-destructive"
          aria-label={dict.planner.remove}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {onQuickAdd ? (
        <button
          type="button"
          onClick={onQuickAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-b-md border-t border-border bg-surface-muted py-2 text-xs font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground"
        >
          {quickAddLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
