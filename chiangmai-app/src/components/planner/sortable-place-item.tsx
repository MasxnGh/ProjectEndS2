"use client";

import { useEffect, useRef } from "react";
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
  arrival,
  departure,
  travelMinutesFromPrevious,
  outsideOpeningHours,
  itemId,
  hovered,
  focused,
  onHover,
}: {
  place: Place;
  onRemove: () => void;
  index?: number;
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  /** Approximate schedule for this stop, when a day schedule has been computed. */
  arrival?: string;
  departure?: string;
  travelMinutesFromPrevious?: number;
  outsideOpeningHours?: boolean;
  /** Unique id used to scroll this card into view when its map pin is clicked (see PlannerBoard's highlight sync). */
  itemId?: string;
  /** True while the matching map pin is hovered — mirrors the highlight back onto this card. */
  hovered?: boolean;
  /** True right after the matching map pin is clicked — scrolls into view and flashes briefly. */
  focused?: boolean;
  onHover?: (slug: string | null) => void;
}) {
  const { locale, dict } = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.slug,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        rootRef.current = node;
      }}
      id={itemId}
      style={style}
      onMouseEnter={() => onHover?.(place.slug)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "rounded-md border border-border bg-background no-print transition-shadow duration-300",
        isDragging && "z-10 opacity-60 shadow-elevated",
        (hovered || focused) && !isDragging && "border-accent shadow-[0_0_0_2px_var(--color-accent)]"
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
          sizes="40px"
          className="h-10 w-10 shrink-0 rounded"
        />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{place.name[locale]}</p>
          <p className="text-xs text-muted-foreground">
            {dict.common.districts[place.district]} · {place.openingHoursText[locale]}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatMinutes(place.durationMinutes)} · {formatThb(SPEND_ESTIMATE_THB[place.priceLevel])}{" "}
            {dict.planner.perPerson}
          </p>
          {arrival && departure ? (
            <p
              className={cn(
                "text-xs font-medium",
                outsideOpeningHours ? "text-destructive" : "text-accent-text"
              )}
            >
              {arrival}–{departure}
              {travelMinutesFromPrevious ? ` · +${travelMinutesFromPrevious} ${dict.common.minutes}` : ""}
              {outsideOpeningHours ? ` · ${dict.planner.route.outsideHours}` : ""}
            </p>
          ) : null}
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
