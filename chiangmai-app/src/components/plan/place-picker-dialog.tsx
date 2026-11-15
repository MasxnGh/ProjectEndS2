"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Plus, Repeat, Search, X } from "lucide-react";
import { places } from "@/data/places";
import type { Place, PlaceCategory } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { Button, buttonStyles } from "@/components/brand/button";
import { Chip, ChipRow } from "@/components/brand/chip";
import { Dialog } from "@/components/brand/dialog";
import { IconButton, iconButtonStyles } from "@/components/brand/icon-button";
import { CATEGORY_ORDER, categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { NoPhoto, PlacePhoto } from "@/components/brand/place-photo";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDuration, placeWhere } from "@/components/brand/place-text";
import { ThaiName } from "@/components/brand/thai-name";

/**
 * "Add a place to day N": search, a type filter, and one card per place that
 * knows where the place already is — here (remove), on another day (copy it
 * here or move it), or nowhere yet (add). The old panel's rules, in a dialog.
 */
export function PlacePickerDialog({
  dayId,
  dayNumber,
  onClose,
}: {
  dayId: string | null;
  dayNumber: number | null;
  onClose: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.picker;
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  // A new day starts with a clean search, adjusted during render (as before).
  const [prevDayId, setPrevDayId] = useState(dayId);
  if (dayId !== prevDayId) {
    setPrevDayId(dayId);
    setQuery("");
    setCategory(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => {
      if (category && place.category !== category) return false;
      if (!q) return true;
      const haystack =
        `${place.name.en} ${place.name.th} ${place.shortDescription.en} ${place.shortDescription.th}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  const open = Boolean(dayId && dayNumber);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      placement="sheet"
      className="w-[min(480px,100vw)] print:hidden"
    >
      {dayId && dayNumber ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 pt-5 pb-4">
            <h2 id={titleId} className="text-title font-semibold text-pretty text-brand">
              {fill(t.title, { day: dayNumber })}
            </h2>
            <IconButton label={t.close} tone="plain" size="sm" onClick={onClose} className="-mt-1 -mr-2">
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
          </div>

          <div className="grid gap-3 border-b border-line px-5 py-4">
            <div
              role="search"
              className={cx(
                "flex h-12 min-w-0 items-center gap-3 rounded-full border border-line bg-panel pr-1 pl-4 dark:border-line-strong",
                "focus-within:border-brand focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--cmj-brand)_18%,transparent)]",
              )}
            >
              <Search aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-ink-soft" />
              <input
                type="search"
                data-autofocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchAriaLabel}
                autoComplete="off"
                enterKeyHint="search"
                className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-soft placeholder:opacity-100 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={dict.browse.clearSearch}
                  title={dict.browse.clearSearch}
                  className={cx("grid size-11 flex-none cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-well", focusRing)}
                >
                  <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </button>
              ) : null}
            </div>
            <ChipRow scroll label={dict.explore.filters.category}>
              <Chip pressed={category === null} onClick={() => setCategory(null)}>
                {t.allCategories}
              </Chip>
              {CATEGORY_ORDER.map((c) => {
                const Icon = categoryIcon[c];
                return (
                  <Chip
                    key={c}
                    pressed={category === c}
                    onClick={() => setCategory(category === c ? null : c)}
                    icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                  >
                    {dict.common.categories[c]}
                  </Chip>
                );
              })}
            </ChipRow>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <p aria-live="polite" className="sr-only">
              {fill(dict.browse.count, { count: filtered.length })}
            </p>
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-small text-ink-soft">{t.noResults}</p>
            ) : (
              <ul className="grid gap-2">
                {filtered.map((place) => (
                  <PickerCard key={place.slug} place={place} dayId={dayId} dayNumber={dayNumber} />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line p-4">
            <Link
              href={`/${locale}/explore?from=planner&day=${dayNumber}`}
              className={cx(buttonStyles({ variant: "secondary" }), "w-full justify-center")}
            >
              {t.viewAll}
              <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            </Link>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}

function PickerCard({ place, dayId, dayNumber }: { place: Place; dayId: string; dayNumber: number }) {
  const { locale, dict } = useLocale();
  const { showToast } = useToast();
  const dayIds = useTripStore((s) => s.dayIds);
  const location = useTripStore((s) => s.locationOf(place.slug));
  const moveToDay = useTripStore((s) => s.moveToDay);
  const duplicateToDay = useTripStore((s) => s.duplicateToDay);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const t = dict.planner.toast;
  const p = dict.planner.picker;
  const name = place.name[locale];
  const Icon = categoryIcon[place.category];

  const isHere = location === dayId;
  const elsewhereDayNumber =
    location && location !== dayId && location !== UNSCHEDULED ? dayIds.indexOf(location) + 1 : null;

  function add() {
    moveToDay(place.slug, dayId);
    showToast({
      message: fill(t.addedToDay, { day: dayNumber }),
      actions: [{ label: t.undo, onClick: () => removeFromPlan(place.slug, dayId) }],
    });
  }
  function remove() {
    removeFromPlan(place.slug, dayId);
    showToast({
      message: fill(t.removedFromDay, { day: dayNumber }),
      actions: [{ label: t.undo, onClick: () => moveToDay(place.slug, dayId) }],
    });
  }
  function duplicate() {
    duplicateToDay(place.slug, dayId);
    showToast({
      message: fill(t.duplicated, { day: dayNumber }),
      actions: [{ label: t.undo, onClick: () => removeFromPlan(place.slug, dayId) }],
    });
  }
  function move() {
    moveToDay(place.slug, dayId);
    showToast({ message: fill(t.moved, { day: dayNumber }) });
  }

  return (
    <li className="grid gap-3 rounded-md border border-line bg-panel p-2.5">
      <div className="flex items-center gap-3">
        <div className="size-14 flex-none overflow-hidden rounded-sm">
          <PlacePhoto
            slug={place.slug}
            alt=""
            sizes="56px"
            fallback={<NoPhoto icon={Icon} label={dict.common.categories[place.category]} size="sm" className="p-0" />}
          />
        </div>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-label leading-[1.4] font-medium">
            <ThaiName text={name} />
          </p>
          <p className="text-small text-ink-soft">
            {dict.common.categories[place.category]} · {placeWhere(place, dict)} · {formatDuration(place.durationMinutes, dict)}
          </p>
          {isHere ? (
            <p className="inline-flex items-center gap-1 text-small font-medium text-brand">
              <Check aria-hidden strokeWidth={2} className="size-3.5" />
              {p.inThisDay}
            </p>
          ) : null}
        </div>
        {elsewhereDayNumber ? null : (
          // The round add button of the explore cards. A pill with words took
          // half a phone-width card and broke Thai names mid-word; the state is
          // in words under the name instead.
          <button
            type="button"
            onClick={isHere ? remove : add}
            aria-pressed={isHere}
            aria-label={`${isHere ? p.inThisDay : p.add}: ${name}`}
            title={`${isHere ? p.inThisDay : p.add}: ${name}`}
            className={cx(
              iconButtonStyles({ tone: "brand" }),
              "aria-pressed:bg-leaf-fill aria-pressed:text-brand aria-pressed:shadow-[inset_0_0_0_1.5px_var(--cmj-brand)]",
            )}
          >
            {isHere ? (
              <Check aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            ) : (
              <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            )}
          </button>
        )}
      </div>
      {elsewhereDayNumber ? (
        <div className="grid gap-2 rounded-sm bg-sand-fill p-3">
          <p className="text-small text-pretty text-ink">{fill(p.duplicateWarning, { day: elsewhereDayNumber })}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={move}
              aria-label={`${p.moveHere}: ${name}`}
              icon={<Repeat aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            >
              {p.moveHere}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={duplicate}
              aria-label={`${p.addDuplicate}: ${name}`}
              icon={<Copy aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            >
              {p.addDuplicate}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
