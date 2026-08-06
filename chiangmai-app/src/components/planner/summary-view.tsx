"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Snowflake, Sun, CloudRain, X } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { categorySpendBreakdown, estimateTripCostThb, formatMinutes, formatThb } from "@/lib/trip-calculations";
import { suggestPackingItems } from "@/lib/planner/packing-suggestions";
import { compareVehicleModes } from "@/lib/planner/vehicle-comparison";
import { cn } from "@/lib/utils";

type SummaryTab = "budget" | "weather" | "packing" | "transport";
type Season = "cool" | "hot" | "rainy";

function seasonForMonth(month: number): Season {
  if (month === 11 || month === 12 || month <= 2) return "cool";
  if (month >= 3 && month <= 5) return "hot";
  return "rainy";
}

const seasonIcons: Record<Season, typeof Snowflake> = {
  cool: Snowflake,
  hot: Sun,
  rainy: CloudRain,
};

function BudgetPanel({ days }: { days: { places: Place[] }[] }) {
  const { dict } = useLocale();
  const t = dict.planner.summary.budget;
  const budgetThb = useTripStore((s) => s.budgetThb);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const setAccommodationThb = useTripStore((s) => s.setAccommodationThb);
  const travelers = useTripStore((s) => s.travelers);

  const breakdown = useMemo(() => categorySpendBreakdown(days), [days]);
  const entry = breakdown.entry * travelers;
  const food = breakdown.food * travelers;
  const transport = breakdown.transport;
  // Same formula the top stats bar uses (lib/trip-calculations.ts) — these two numbers must never drift apart.
  const totalWithStay = estimateTripCostThb(breakdown, travelers, accommodationThb);
  const hasBudget = budgetThb > 0;
  const remaining = budgetThb - totalWithStay;

  const categories = [
    { key: "entry", label: t.categories.entry, amount: entry },
    { key: "transport", label: t.categories.transport, amount: transport },
    { key: "food", label: t.categories.food, amount: food },
    ...(accommodationThb > 0 ? [{ key: "accommodation", label: t.accommodation, amount: accommodationThb }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.estimated}</p>
          <p className="mt-1 font-serif-display text-2xl">~{formatThb(totalWithStay)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.setBudget}</p>
          <p className="mt-1 font-serif-display text-2xl">{formatThb(budgetThb)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <label htmlFor="accommodation" className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.accommodation}
          </label>
          <input
            id="accommodation"
            type="number"
            min={0}
            step={100}
            value={accommodationThb || ""}
            onChange={(e) => setAccommodationThb(Number(e.target.value) || 0)}
            placeholder="0"
            className="mt-1 w-full bg-transparent font-serif-display text-2xl outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <div
          className={cn(
            "rounded-lg border p-4",
            !hasBudget ? "border-border" : remaining >= 0 ? "border-secondary bg-secondary/10" : "border-destructive bg-destructive/10"
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {!hasBudget || remaining >= 0 ? t.remaining : t.overBudget}
          </p>
          <p className="mt-1 font-serif-display text-2xl">{formatThb(hasBudget ? Math.abs(remaining) : 0)}</p>
        </div>
      </div>

      {!hasBudget ? <p className="text-sm text-muted-foreground">{t.noBudget}</p> : null}

      <div className="space-y-3">
        {categories.map((c) => {
          const percent = totalWithStay > 0 ? Math.round((c.amount / totalWithStay) * 100) : 0;
          return (
            <div key={c.key}>
              <div className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-medium">{formatThb(c.amount)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherPanel() {
  const { dict } = useLocale();
  const t = dict.planner.summary.weather;
  const travelDate = useTripStore((s) => s.travelDate);

  const activeSeason = travelDate ? seasonForMonth(new Date(travelDate).getMonth() + 1) : null;
  const seasons: Season[] = ["cool", "hot", "rainy"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.disclaimer}</p>
      {!travelDate ? <p className="text-sm text-accent-text">{t.pickDateHint}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {seasons.map((season) => {
          const Icon = seasonIcons[season];
          const isActive = activeSeason === season;
          return (
            <div
              key={season}
              className={cn(
                "rounded-lg border p-5 transition-colors",
                isActive ? "border-accent bg-accent/10" : "border-border"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-accent-text" : "text-muted-foreground")} />
              <h3 className="mt-3 font-serif-display text-lg">{t[season].label}</h3>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t[season].months}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t[season].body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PackingPanel({ places }: { places: Place[] }) {
  const { dict } = useLocale();
  const t = dict.planner.summary.packing;
  const packingItems = useTripStore((s) => s.packingItems);
  const togglePackingItem = useTripStore((s) => s.togglePackingItem);
  const addPackingItem = useTripStore((s) => s.addPackingItem);
  const addPackingItemByKey = useTripStore((s) => s.addPackingItemByKey);
  const removePackingItem = useTripStore((s) => s.removePackingItem);
  const [newItem, setNewItem] = useState("");

  const checkedCount = packingItems.filter((i) => i.checked).length;
  const percent = packingItems.length > 0 ? Math.round((checkedCount / packingItems.length) * 100) : 0;

  const existingKeys = new Set(packingItems.map((item) => item.labelKey).filter(Boolean));
  const suggestions = suggestPackingItems(places)
    .map((id) => ({ id, label: t.items[id] }))
    .filter((s) => !existingKeys.has(s.id));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addPackingItem(newItem);
    setNewItem("");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {checkedCount}/{packingItems.length} {t.ready}
        </p>
        <p className="text-sm text-muted-foreground">{percent}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-6 space-y-2">
        {packingItems.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => togglePackingItem(item.id)}
              className="h-4 w-4 shrink-0 accent-secondary"
              id={`pack-${item.id}`}
            />
            <label
              htmlFor={`pack-${item.id}`}
              className={cn("flex-1 text-sm", item.checked && "text-muted-foreground line-through")}
            >
              {item.labelKey ? t.items[item.labelKey as keyof typeof t.items] : item.label}
            </label>
            <button
              type="button"
              onClick={() => removePackingItem(item.id)}
              className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              aria-label={t.remove}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.suggestedTitle}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => addPackingItemByKey(s.id)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 py-1.5 text-xs hover:border-accent hover:text-accent-text"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={t.addPlaceholder}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-accent"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-2 text-sm font-medium hover:border-accent hover:text-accent-text"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.add}
        </button>
      </form>
    </div>
  );
}

function TransportPanel({ days }: { days: { places: Place[] }[] }) {
  const { dict } = useLocale();
  const t = dict.planner.summary.transport;
  const travelMode = useTripStore((s) => s.travelMode);
  const setTravelMode = useTripStore((s) => s.setTravelMode);

  const rows = useMemo(() => compareVehicleModes(days), [days]);

  return (
    <div>
      <p className="text-xs text-muted-foreground">{t.disclaimer}</p>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const isSelected = row.mode === travelMode;
          return (
            <li
              key={row.mode}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5",
                isSelected ? "border-accent bg-accent/10" : "border-border"
              )}
            >
              <div>
                <p className="text-sm font-medium">{t.modes[row.mode]}</p>
                <p className="text-xs text-muted-foreground">
                  {t.totalTime}: {formatMinutes(row.totalTravelMinutes)} · {t.totalCost}: {formatThb(row.totalCostThb)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTravelMode(row.mode)}
                disabled={isSelected}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                  isSelected
                    ? "border-accent text-accent-text"
                    : "border-border-strong hover:border-accent hover:text-accent-text"
                )}
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                {isSelected ? t.selected : t.select}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SummaryView({ days }: { days: { places: Place[] }[] }) {
  const { dict } = useLocale();
  const [tab, setTab] = useState<SummaryTab>("budget");
  const tabs: SummaryTab[] = ["budget", "weather", "packing", "transport"];
  const allPlaces = useMemo(() => days.flatMap((d) => d.places), [days]);

  return (
    <div>
      <div className="flex items-center gap-1 rounded-full border border-border p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb}
            type="button"
            onClick={() => setTab(tb)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              tab === tb ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            {dict.planner.summary.tabs[tb]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "budget" ? <BudgetPanel days={days} /> : null}
        {tab === "weather" ? <WeatherPanel /> : null}
        {tab === "packing" ? <PackingPanel places={allPlaces} /> : null}
        {tab === "transport" ? <TransportPanel days={days} /> : null}
      </div>
    </div>
  );
}
