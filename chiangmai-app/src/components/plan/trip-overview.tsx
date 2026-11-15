"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, CloudRain, Plus, Snowflake, Sun, X } from "lucide-react";
import type { Place, TravelMode } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { ASSUMED_MEAL_THB, categorySpendBreakdown, estimateTripCostThb } from "@/lib/trip-calculations";
import { suggestPackingItems } from "@/lib/planner/packing-suggestions";
import { compareVehicleModes } from "@/lib/planner/vehicle-comparison";
import { Button } from "@/components/brand/button";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDuration } from "@/components/brand/place-text";
import { baht, dayCountLabel, placeCountLabel } from "./plan-text";
import { MODE_ICON } from "./trip-head";

type Tab = "budget" | "weather" | "packing" | "transport";
const TABS: Tab[] = ["budget", "weather", "packing", "transport"];
type Season = "cool" | "hot" | "rainy";

/** Unchanged from the old summary. */
function seasonForMonth(month: number): Season {
  if (month === 11 || month === 12 || month <= 2) return "cool";
  if (month >= 3 && month <= 5) return "hot";
  return "rainy";
}
const SEASON_ICON = { cool: Snowflake, hot: Sun, rainy: CloudRain };

const inputStyles = cx(
  "h-11 w-full min-w-0 rounded-full border-0 bg-well px-4 font-brand text-label text-ink tabular-nums placeholder:text-ink-soft",
  focusRing,
);

/**
 * The trip as a whole: what it is likely to cost, what the season is like,
 * what to pack, and what each way of getting around would mean. Every figure
 * comes from the same calculations the old summary used.
 */
export function TripOverview({
  days,
  totalMinutes,
  estimatedCostThb,
}: {
  days: { places: Place[] }[];
  totalMinutes: number;
  estimatedCostThb: number;
}) {
  const { dict } = useLocale();
  const t = dict.plan.overview;
  const [tab, setTab] = useState<Tab>("budget");
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const allPlaces = useMemo(() => days.flatMap((d) => d.places), [days]);
  const placeCount = allPlaces.length;

  function focusTab(index: number) {
    const next = TABS[(index + TABS.length) % TABS.length];
    setTab(next);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  }

  return (
    <section aria-labelledby={`${baseId}-title`} className="grid gap-4 border-t border-line pt-6">
      <div className="grid gap-1">
        <h2 id={`${baseId}-title`} className="text-title font-semibold text-brand">
          {t.title}
        </h2>
        <p className="text-small text-ink-soft tabular-nums">
          {fill(t.totals, {
            days: dayCountLabel(days.length, dict),
            places: placeCountLabel(placeCount, dict),
            cost: baht(estimatedCostThb),
          })}
          {" · "}
          {dict.planner.estimatedTime} {formatDuration(totalMinutes, dict)}
        </p>
        <p className="text-credit text-pretty text-ink-soft">{dict.common.hints.estimatedCost.text}</p>
      </div>

      <div
        ref={listRef}
        role="tablist"
        aria-label={t.title}
        className="grid grid-cols-2 gap-1 rounded-[26px] bg-well p-1 sm:flex sm:rounded-full"
        onKeyDown={(event) => {
          const index = TABS.indexOf(tab);
          if (event.key === "ArrowRight") focusTab(index + 1);
          else if (event.key === "ArrowLeft") focusTab(index - 1);
          else return;
          event.preventDefault();
        }}
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-tab={id}
            id={`${baseId}-${id}`}
            aria-selected={tab === id}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={cx(
              "min-h-11 flex-1 rounded-full px-4 text-label whitespace-nowrap transition-colors duration-150",
              focusRing,
              tab === id ? "bg-panel text-brand shadow-float" : "text-ink-soft hover:text-ink",
            )}
          >
            {dict.planner.summary.tabs[id]}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-${tab}`}>
        {tab === "budget" ? <BudgetPanel days={days} /> : null}
        {tab === "weather" ? <SeasonPanel /> : null}
        {tab === "packing" ? <PackingPanel places={allPlaces} /> : null}
        {tab === "transport" ? <TransportPanel days={days} /> : null}
      </div>
    </section>
  );
}

function Figure({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "good" | "over" }) {
  return (
    <div
      className={cx(
        "grid gap-0.5 rounded-md border border-line p-3",
        tone === "good" && "border-transparent bg-leaf-fill",
        tone === "over" && "border-transparent bg-[color-mix(in_oklab,var(--cmj-sunset)_24%,var(--cmj-panel))]",
      )}
    >
      <span className="text-small text-ink-soft">{label}</span>
      <span className="text-title font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}

function BudgetPanel({ days }: { days: { places: Place[] }[] }) {
  const { dict } = useLocale();
  const t = dict.planner.summary.budget;
  const budgetThb = useTripStore((s) => s.budgetThb);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const setAccommodationThb = useTripStore((s) => s.setAccommodationThb);
  const travelers = useTripStore((s) => s.travelers);
  const travelMode = useTripStore((s) => s.travelMode);
  const stayId = useId();

  const breakdown = useMemo(() => categorySpendBreakdown(days, travelMode), [days, travelMode]);
  const total = estimateTripCostThb(breakdown, travelers, accommodationThb);
  const hasBudget = budgetThb > 0;
  const remaining = budgetThb - total;
  const assumedMeals = breakdown.assumedMeals * travelers;

  const rows = [
    { key: "entry", label: t.categories.entry, amount: breakdown.entry * travelers },
    { key: "transport", label: t.categories.transport, amount: breakdown.transport },
    { key: "food", label: t.categories.food, amount: breakdown.food * travelers },
    ...(assumedMeals > 0 ? [{ key: "meals", label: t.categories.assumedMeals, amount: assumedMeals }] : []),
    ...(accommodationThb > 0 ? [{ key: "stay", label: t.accommodation, amount: accommodationThb }] : []),
  ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Figure label={t.estimated} value={`~${baht(total)}`} />
        <Figure label={t.setBudget} value={hasBudget ? baht(budgetThb) : "—"} />
        <div className="grid gap-1 rounded-md border border-line p-3">
          <label htmlFor={stayId} className="text-small text-ink-soft">
            {t.accommodation}
          </label>
          <input
            id={stayId}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            placeholder="0"
            value={accommodationThb || ""}
            onChange={(event) => setAccommodationThb(Number(event.target.value) || 0)}
            className={inputStyles}
          />
        </div>
        <Figure
          label={!hasBudget || remaining >= 0 ? t.remaining : t.overBudget}
          value={hasBudget ? baht(Math.abs(remaining)) : "—"}
          tone={!hasBudget ? "plain" : remaining >= 0 ? "good" : "over"}
        />
      </div>
      {!hasBudget ? <p className="text-small text-ink-soft">{t.noBudget}</p> : null}
      {assumedMeals > 0 ? (
        <p className="text-small text-pretty text-ink-soft">
          {fill(t.assumedMealsNote, { amount: ASSUMED_MEAL_THB.toLocaleString("en-US") })}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {rows.map((row) => {
          const percent = total > 0 ? Math.round((row.amount / total) * 100) : 0;
          return (
            <li key={row.key} className="grid gap-1.5">
              <span className="flex items-baseline justify-between gap-3 text-small">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums">{baht(row.amount)}</span>
              </span>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-well">
                <span className="block h-full rounded-full bg-cmj-leaf" style={{ width: `${percent}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeasonPanel() {
  const { dict } = useLocale();
  const t = dict.planner.summary.weather;
  const travelDate = useTripStore((s) => s.travelDate);
  const active = travelDate ? seasonForMonth(new Date(travelDate).getMonth() + 1) : null;

  return (
    <div className="grid gap-3">
      <p className="text-small text-pretty text-ink-soft">{t.disclaimer}</p>
      {!travelDate ? <p className="text-small text-brand">{t.pickDateHint}</p> : null}
      <ul className="grid gap-2">
        {(["cool", "hot", "rainy"] as Season[]).map((season) => {
          const Icon = SEASON_ICON[season];
          const current = active === season;
          return (
            <li
              key={season}
              aria-current={current ? "true" : undefined}
              className={cx("grid gap-1 rounded-md p-4", current ? "bg-leaf-fill" : "border border-line")}
            >
              <span className="flex items-center gap-2 text-label font-semibold text-brand">
                <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                {t[season].label}
                {current ? <Check aria-hidden strokeWidth={2} className="size-4" /> : null}
              </span>
              <span className="text-small text-ink-soft">{t[season].months}</span>
              <span className="text-small text-pretty">{t[season].body}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PackingPanel({ places }: { places: Place[] }) {
  const { dict } = useLocale();
  const t = dict.planner.summary.packing;
  const items = useTripStore((s) => s.packingItems);
  const toggle = useTripStore((s) => s.togglePackingItem);
  const add = useTripStore((s) => s.addPackingItem);
  const addByKey = useTripStore((s) => s.addPackingItemByKey);
  const remove = useTripStore((s) => s.removePackingItem);
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const checked = items.filter((i) => i.checked).length;
  const percent = items.length > 0 ? Math.round((checked / items.length) * 100) : 0;
  const existing = new Set(items.map((i) => i.labelKey).filter(Boolean));
  const suggestions = suggestPackingItems(places)
    .map((id) => ({ id, label: t.items[id] }))
    .filter((s) => !existing.has(s.id));

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="flex justify-between text-small">
          <span className="font-medium tabular-nums">
            {checked}/{items.length} {t.ready}
          </span>
          <span className="text-ink-soft tabular-nums">{percent}%</span>
        </p>
        <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-well">
          <span className="block h-full rounded-full bg-cmj-leaf transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </span>
      </div>

      <ul className="grid gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-md px-1 hover:bg-well">
            <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 px-2 text-small">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item.id)}
                className="size-5 flex-none accent-[var(--cmj-brand)]"
              />
              <span className={cx(item.checked && "text-ink-soft line-through")}>
                {item.labelKey ? t.items[item.labelKey as keyof typeof t.items] : item.label}
              </span>
            </label>
            <IconButton label={t.remove} tone="plain" size="sm" onClick={() => remove(item.id)}>
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </IconButton>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-small text-ink-soft">{t.suggestedTitle}</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => addByKey(s.id)}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-line-strong px-4 text-left text-small text-brand hover:bg-well",
                    focusRing,
                  )}
                >
                  <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4 flex-none" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {t.addPlaceholder}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.addPlaceholder}
          className={inputStyles}
        />
        <Button type="submit" variant="secondary" size="sm" icon={<Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
          {t.add}
        </Button>
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
    <div className="grid gap-3">
      <p className="text-small text-pretty text-ink-soft">{t.disclaimer}</p>
      <ul className="grid gap-2">
        {rows.map((row) => {
          const selected = row.mode === travelMode;
          const Icon = MODE_ICON[row.mode as TravelMode];
          return (
            <li
              key={row.mode}
              className={cx(
                "flex flex-wrap items-center justify-between gap-3 rounded-md p-3",
                selected ? "bg-leaf-fill" : "border border-line",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-brand" />
                <span className="grid">
                  <span className="text-label">{t.modes[row.mode]}</span>
                  <span className="text-small text-ink-soft tabular-nums">
                    {t.totalTime} {formatDuration(row.totalTravelMinutes, dict)} · {t.totalCost} {baht(row.totalCostThb)}
                  </span>
                </span>
              </span>
              {selected ? (
                <span className="inline-flex min-h-11 items-center gap-1.5 px-2 text-small font-semibold text-brand">
                  <Check aria-hidden strokeWidth={2} className="size-4" />
                  {t.selected}
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setTravelMode(row.mode)} className="px-3">
                  {t.select}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
