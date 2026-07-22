"use client";

import { Users, Wallet } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { formatMinutes, formatThb } from "@/lib/trip-calculations";

interface TripStats {
  days: number;
  places: number;
  minutes: number;
  budgetThb: number;
}

export function TripDetailsForm({ stats }: { stats?: TripStats }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.details;

  const tripName = useTripStore((s) => s.tripName);
  const travelDate = useTripStore((s) => s.travelDate);
  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const setTripName = useTripStore((s) => s.setTripName);
  const setTravelDate = useTripStore((s) => s.setTravelDate);
  const setTravelers = useTripStore((s) => s.setTravelers);
  const setBudgetThb = useTripStore((s) => s.setBudgetThb);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <label htmlFor="trip-name" className="sr-only">
        {t.tripName}
      </label>
      <input
        id="trip-name"
        type="text"
        value={tripName}
        onChange={(e) => setTripName(e.target.value)}
        placeholder={t.tripNamePlaceholder}
        className="w-full bg-transparent font-serif-display text-2xl outline-none placeholder:text-muted-foreground/60 sm:text-3xl"
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="travel-date" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.travelDate}
          </label>
          <input
            id="travel-date"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            lang={locale}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent"
          />
        </div>

        <div>
          <label htmlFor="travelers" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.travelers}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              id="travelers"
              type="number"
              min={1}
              value={travelers}
              onChange={(e) => setTravelers(Number(e.target.value) || 1)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="budget" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.budget}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              id="budget"
              type="number"
              min={0}
              step={100}
              value={budgetThb || ""}
              onChange={(e) => setBudgetThb(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <span className="shrink-0 text-xs text-muted-foreground">THB</span>
          </div>
        </div>
      </div>

      {stats ? (
        <div className="mt-6 grid grid-cols-2 divide-y divide-border border-t border-border pt-4 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          <div className="py-2 sm:py-0 sm:pr-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{dict.planner.totalDays}</p>
            <p className="mt-1 font-serif-display text-xl">{stats.days}</p>
          </div>
          <div className="py-2 sm:py-0 sm:px-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{dict.planner.totalPlaces}</p>
            <p className="mt-1 font-serif-display text-xl">{stats.places}</p>
          </div>
          <div className="py-2 sm:py-0 sm:px-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{dict.planner.totalTime}</p>
            <p className="mt-1 font-serif-display text-xl">{formatMinutes(stats.minutes)}</p>
          </div>
          <div className="py-2 sm:py-0 sm:pl-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{dict.planner.totalBudget}</p>
            <p className="mt-1 font-serif-display text-xl text-accent-text">{formatThb(stats.budgetThb)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
