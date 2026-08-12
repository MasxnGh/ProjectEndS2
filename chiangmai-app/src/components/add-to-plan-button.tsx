"use client";

import { Check, Plus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, useTripStoreHydrated } from "@/lib/trip-store";
import { cn } from "@/lib/utils";

export function AddToPlanButton({ slug, className }: { slug: string; className?: string }) {
  const { dict } = useLocale();
  // Held at the server's answer until the persisted trip has rehydrated — see
  // useTripStoreHydrated.
  const hydrated = useTripStoreHydrated();
  const isPlanned = useTripStore((s) => s.isPlanned(slug)) && hydrated;
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);

  return (
    <button
      type="button"
      onClick={() => (isPlanned ? removeFromPlan(slug) : addPlace(slug))}
      aria-pressed={isPlanned}
      className={cn(
        "flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors duration-200",
        isPlanned
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-strong hover:border-accent hover:text-accent-text",
        className
      )}
    >
      {isPlanned ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {isPlanned ? dict.common.addedToPlan : dict.place.addToPlan}
    </button>
  );
}
