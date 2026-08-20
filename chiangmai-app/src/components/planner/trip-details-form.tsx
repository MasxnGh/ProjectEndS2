"use client";

import type { ReactNode } from "react";
import { Pencil, Users, Wallet } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { DateRangePicker } from "@/components/planner/date-range-picker";

export function TripDetailsForm({ actions }: { actions?: ReactNode }) {
  const { dict } = useLocale();
  const t = dict.planner.details;

  const tripName = useTripStore((s) => s.tripName);
  const travelDate = useTripStore((s) => s.travelDate);
  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const dayIds = useTripStore((s) => s.dayIds);
  const setTripName = useTripStore((s) => s.setTripName);
  const setTravelDate = useTripStore((s) => s.setTravelDate);
  const setTravelers = useTripStore((s) => s.setTravelers);
  const setBudgetThb = useTripStore((s) => s.setBudgetThb);
  const addDay = useTripStore((s) => s.addDay);
  const removeDay = useTripStore((s) => s.removeDay);

  function handleRangeChange(startIso: string, dayCount: number) {
    setTravelDate(startIso);
    const delta = dayCount - dayIds.length;
    if (delta > 0) {
      for (let i = 0; i < delta; i++) addDay();
    } else if (delta < 0) {
      // Trim from the end so Day 1..dayCount keep their identity and places;
      // removeDay already safely moves any places on a trimmed day back to Unscheduled.
      for (let i = 0; i < -delta; i++) removeDay(dayIds[dayIds.length - 1 - i]);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="trip-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.tripName}
          </label>
          <div className="mt-1.5 flex items-center gap-2 border-b border-border pb-1.5 focus-within:border-accent">
            <input
              id="trip-name"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder={t.tripNamePlaceholder}
              className="w-full min-w-0 bg-transparent font-serif-display text-2xl outline-none placeholder:text-muted-foreground/60 sm:text-3xl"
            />
            <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.travelDate}
          </label>
          <DateRangePicker
            startDate={travelDate || null}
            dayCount={dayIds.length}
            onRangeChange={handleRangeChange}
            className="mt-1.5"
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
    </div>
  );
}
