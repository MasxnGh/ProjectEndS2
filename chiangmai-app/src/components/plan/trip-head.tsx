"use client";

import { useId, useState, type ReactNode } from "react";
import {
  Bike,
  Bus,
  Car,
  CarTaxiFront,
  CircleCheck,
  CircleDashed,
  CloudSun,
  Footprints,
  Minus,
  Pencil,
  Plus,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TravelMode } from "@/data/types";
import type { PlanProgress } from "@/lib/planner/plan-progress";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { Button } from "@/components/brand/button";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { Popover, fieldChipStyles } from "@/components/brand/popover";
import { cx, focusRing } from "@/components/brand/cx";
import { fill } from "@/components/brand/place-text";
import { DateRangeField } from "./date-range-field";
import { BaseLocationField } from "./base-location-field";
import { baht } from "./plan-text";

export const MODE_ICON: Record<TravelMode, LucideIcon> = {
  walk: Footprints,
  songthaew: Bus,
  grab: CarTaxiFront,
  "rented-bike": Bike,
  "rented-car": Car,
};

const MODES: TravelMode[] = ["walk", "songthaew", "grab", "rented-bike", "rented-car"];

const inputStyles = cx(
  "h-11 w-full min-w-0 rounded-full border-0 bg-well px-4 font-brand text-label text-ink tabular-nums placeholder:text-ink-soft",
  focusRing,
);

/**
 * The top of the planner: what the trip is called, the five things that
 * shape every day (dates, people, budget, how you get around, where you
 * sleep), how far along the plan is, and the two ways to fill it.
 */
export function TripHead({
  progress,
  placeCount,
  saveIndicator,
  aiEnabled,
  canReflow,
  onOpenAi,
  onAddPlace,
  onReflow,
  onRequestMapPin,
}: {
  progress: PlanProgress;
  placeCount: number;
  saveIndicator: ReactNode;
  aiEnabled: boolean;
  canReflow: boolean;
  onOpenAi: () => void;
  onAddPlace: (trigger: HTMLElement) => void;
  onReflow: () => void;
  onRequestMapPin: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.plan;
  const tripName = useTripStore((s) => s.tripName);
  const travelDate = useTripStore((s) => s.travelDate);
  const dayIds = useTripStore((s) => s.dayIds);
  const addDay = useTripStore((s) => s.addDay);
  const removeDay = useTripStore((s) => s.removeDay);
  const setTravelDate = useTripStore((s) => s.setTravelDate);

  // Unchanged from the old details form: days are added or trimmed at the
  // end, so day 1..n keep their places; a trimmed day's places go back to
  // the tray (removeDay does that).
  function handleRangeChange(startIso: string, dayCount: number) {
    setTravelDate(startIso);
    const delta = dayCount - dayIds.length;
    if (delta > 0) {
      for (let i = 0; i < delta; i++) addDay();
    } else if (delta < 0) {
      for (let i = 0; i < -delta; i++) removeDay(dayIds[dayIds.length - 1 - i]);
    }
  }

  return (
    <header className="grid gap-4">
      <TripTitle name={tripName} />
      {saveIndicator}

      <div role="group" aria-label={t.fields} className="flex flex-wrap gap-2">
        <DateRangeField startDate={travelDate || null} dayCount={dayIds.length} onRangeChange={handleRangeChange} />
        <TravellersField />
        <BudgetField />
        <ModeField />
        <BaseLocationField onRequestMapPin={onRequestMapPin} />
      </div>

      <Checklist progress={progress} placeCount={placeCount} />

      {/* An empty plan offers the same two ways in, with the example day, just
          below (PlanEmpty); showing them here as well put each on screen twice. */}
      <div className={cx("flex flex-wrap gap-2", placeCount === 0 && "hidden")}>
        {aiEnabled ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAi}
            icon={<Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          >
            {dict.planner.ai.button}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => onAddPlace(event.currentTarget)}
          icon={<Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {dict.planner.addPlace}
        </Button>
        {canReflow ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReflow}
            icon={<CloudSun aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          >
            {t.reflow}
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function TripTitle({ name }: { name: string }) {
  const { dict } = useLocale();
  const t = dict.plan;
  const setTripName = useTripStore((s) => s.setTripName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputId = useId();

  if (editing) {
    return (
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setTripName(draft.trim());
          setEditing(false);
        }}
      >
        <label htmlFor={inputId} className="text-small text-ink-soft">
          {t.renameLabel}
        </label>
        <input
          id={inputId}
          autoFocus
          value={draft}
          maxLength={120}
          placeholder={t.untitled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            }
          }}
          className={cx(inputStyles, "h-12 text-title")}
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            {t.renameSave}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            {t.renameCancel}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <h1 className="min-w-0 text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] leading-[1.3] font-semibold text-pretty text-brand">
        {name || t.untitled}
      </h1>
      <IconButton
        label={t.rename}
        tone="plain"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        <Pencil aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </IconButton>
    </div>
  );
}

function TravellersField() {
  const { dict } = useLocale();
  const t = dict.plan;
  const travelers = useTripStore((s) => s.travelers);
  const setTravelers = useTripStore((s) => s.setTravelers);
  const inputId = useId();

  return (
    <Popover
      label={t.travellersLabel}
      buttonClassName={fieldChipStyles}
      button={
        <>
          <Users aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-brand" />
          <span className="tabular-nums">
            {travelers === 1 ? t.travellersOne : fill(t.travellers, { count: travelers })}
          </span>
        </>
      }
    >
      {(close) => (
        <div className="grid gap-3">
          <label htmlFor={inputId} className="text-label text-brand">
            {t.travellersLabel}
          </label>
          <div className="flex items-center gap-2">
            <IconButton label={t.fewer} disabled={travelers <= 1} onClick={() => setTravelers(travelers - 1)}>
              <Minus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
            <input
              id={inputId}
              data-autofocus
              type="number"
              inputMode="numeric"
              min={1}
              value={travelers}
              onChange={(event) => setTravelers(Number(event.target.value) || 1)}
              className={cx(inputStyles, "text-center")}
            />
            <IconButton label={t.more} onClick={() => setTravelers(travelers + 1)}>
              <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
          </div>
          <Button size="sm" onClick={() => close()} className="justify-self-end">
            {t.done}
          </Button>
        </div>
      )}
    </Popover>
  );
}

function BudgetField() {
  const { dict } = useLocale();
  const t = dict.plan;
  const budgetThb = useTripStore((s) => s.budgetThb);
  const setBudgetThb = useTripStore((s) => s.setBudgetThb);
  const inputId = useId();
  const hintId = useId();

  return (
    <Popover
      label={t.budgetLabel}
      buttonClassName={fieldChipStyles}
      button={
        <>
          <Wallet aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-brand" />
          {budgetThb > 0 ? (
            <span className="tabular-nums">{fill(t.budget, { amount: baht(budgetThb) })}</span>
          ) : (
            <span className="font-normal text-ink-soft">{t.budgetNone}</span>
          )}
        </>
      }
    >
      {(close) => (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <label htmlFor={inputId} className="text-label text-brand">
            {t.budgetLabel}
          </label>
          <input
            id={inputId}
            data-autofocus
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            placeholder="0"
            aria-describedby={hintId}
            value={budgetThb || ""}
            onChange={(event) => setBudgetThb(Number(event.target.value) || 0)}
            className={inputStyles}
          />
          <p id={hintId} className="text-small text-ink-soft">
            {t.budgetHint}
          </p>
          <Button type="submit" size="sm" className="justify-self-end">
            {t.done}
          </Button>
        </form>
      )}
    </Popover>
  );
}

function ModeField() {
  const { dict } = useLocale();
  const t = dict.plan;
  const modes = dict.planner.summary.transport.modes;
  const travelMode = useTripStore((s) => s.travelMode);
  const setTravelMode = useTripStore((s) => s.setTravelMode);
  const Icon = MODE_ICON[travelMode];
  const groupId = useId();

  return (
    <Popover
      label={t.modeLabel}
      buttonClassName={fieldChipStyles}
      button={
        <>
          <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-brand" />
          {modes[travelMode]}
        </>
      }
    >
      {(close) => (
        <div className="grid gap-3">
          <p id={groupId} className="text-label text-brand">
            {t.modeLabel}
          </p>
          <div role="radiogroup" aria-labelledby={groupId} className="grid gap-1">
            {MODES.map((mode) => {
              const ModeIcon = MODE_ICON[mode];
              const checked = mode === travelMode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  data-autofocus={checked ? "" : undefined}
                  onClick={() => {
                    setTravelMode(mode);
                    close();
                  }}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-label transition-colors duration-150",
                    focusRing,
                    checked ? "bg-brand text-on-brand" : "hover:bg-well",
                  )}
                >
                  <ModeIcon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                  {modes[mode]}
                </button>
              );
            })}
          </div>
          <p className="text-small text-ink-soft">{t.modeHint}</p>
        </div>
      )}
    </Popover>
  );
}

function Checklist({ progress, placeCount }: { progress: PlanProgress; placeCount: number }) {
  const { dict } = useLocale();
  const t = dict.plan.checklist;
  const hints = dict.planner.progress.hints;

  const label = (id: string, done: boolean, remaining: number | null) => {
    switch (id) {
      case "details":
        return done ? t.details : t.detailsTodo;
      case "places":
        return done ? (placeCount === 1 ? t.placesOne : fill(t.places, { count: placeCount })) : t.placesTodo;
      case "arrange":
        // With nothing in the plan, the one "blocker" counted is the empty first
        // day — there is nothing to arrange yet, so say that instead.
        if (done) return t.arrange;
        return placeCount > 0 && remaining ? fill(t.arrangeTodo, { count: remaining }) : t.arrangeWaiting;
      default:
        return done ? t.share : t.shareTodo;
    }
  };

  const current = progress.steps.find((step) => step.current);

  return (
    <div className="grid gap-2">
      <ul aria-label={t.label} className="flex flex-wrap gap-x-4 gap-y-2 text-small">
        {progress.steps.map((step) => (
          <li
            key={step.id}
            className={cx("inline-flex items-center gap-1.5", step.done ? "font-medium text-brand" : "text-ink-soft")}
          >
            {step.done ? (
              <CircleCheck aria-hidden strokeWidth={2} className="size-[18px]" />
            ) : (
              <CircleDashed aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
            )}
            {label(step.id, step.done, step.remaining)}
          </li>
        ))}
      </ul>
      {current ? (
        <p className="text-small text-pretty text-ink-soft">
          {fill(hints[current.id], { count: current.remaining ?? "" })}
        </p>
      ) : (
        <p className="text-small text-brand">{dict.planner.progress.allDone}</p>
      )}
    </div>
  );
}
