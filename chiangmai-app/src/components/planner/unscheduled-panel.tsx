"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Place } from "@/data/types";
import { SortablePlaceItem } from "@/components/planner/sortable-place-item";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";

export function UnscheduledPanel({ places }: { places: Place[] }) {
  const { dict } = useLocale();
  const { showToast } = useToast();
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);
  const moveItem = useTripStore((s) => s.moveItem);
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED });

  const targetDayId = dayIds[0];
  const quickAddLabel = `${dict.planner.addTo} ${dict.planner.day} 1`;
  const t = dict.planner.toast;

  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {dict.planner.unscheduled}
      </p>
      <div
        ref={setNodeRef}
        className={`mt-3 grid min-h-[72px] grid-cols-1 gap-2 rounded-md transition-colors sm:grid-cols-2 lg:grid-cols-3 ${
          isOver ? "bg-accent/10" : ""
        }`}
      >
        <SortableContext items={places.map((p) => p.slug)} strategy={rectSortingStrategy}>
          {places.map((place) => (
            <SortablePlaceItem
              key={place.slug}
              place={place}
              onRemove={() => {
                removeFromPlan(place.slug, UNSCHEDULED);
                showToast({
                  message: t.removed,
                  actions: [
                    {
                      label: t.undo,
                      onClick: () =>
                        moveItem({ slug: place.slug, toContainer: UNSCHEDULED, toIndex: 0 }),
                    },
                  ],
                });
              }}
              onQuickAdd={
                targetDayId
                  ? () => {
                      const toIndex = containers[targetDayId]?.length ?? 0;
                      moveItem({ slug: place.slug, toContainer: targetDayId, toIndex });
                      showToast({
                        message: t.addedToDay.replace("{day}", "1"),
                        actions: [
                          { label: t.undo, onClick: () => removeFromPlan(place.slug, targetDayId) },
                        ],
                      });
                    }
                  : undefined
              }
              quickAddLabel={quickAddLabel}
            />
          ))}
        </SortableContext>
        {places.length === 0 ? (
          <p className="col-span-full p-3 text-center text-xs text-muted-foreground">
            {dict.planner.unscheduledBody}
          </p>
        ) : null}
      </div>
    </div>
  );
}
