"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { places } from "@/data/places";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { coverSlug } from "@/lib/trip-cover";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { PlacePhoto, hasPlacePhoto } from "@/components/brand/place-photo";
import { cx, focusRing } from "@/components/brand/cx";
import { CoverUploadPanel } from "./cover-upload-panel";

/** Every place with a photograph, in the guide's own order. */
const PHOTOGRAPHED = places.filter((place) => hasPlacePhoto(place.slug));

const TABS = ["places", "mine"] as const;
type Tab = (typeof TABS)[number];

/**
 * "Trip cover", in two tabs: the guide's place photos, and the traveller's
 * own photo (cover-upload-panel.tsx; signed in only). It opens on the tab the
 * current cover came from.
 *
 * Place photos: the trip's own places first, then the rest of the guide's
 * photographs. Choosing only marks a tile; "Use this photo" sets it. With
 * nothing chosen the trip keeps the automatic cover (the first stop that has
 * a photo), and once something is chosen the footer offers that automatic
 * cover back. The tiles are one group of native radio buttons across both
 * sections, so the arrow keys walk the whole grid and the browser does the
 * announcing.
 */
export function CoverPickerDialog({
  open,
  onClose,
  daySlugs,
  traySlugs,
}: {
  open: boolean;
  onClose: () => void;
  /** The plan's stops, day by day, in order: what the automatic cover is chosen from. */
  daySlugs: readonly string[];
  /** Places waiting in the tray: in the trip, but on no day yet. */
  traySlugs: readonly string[];
}) {
  const { dict } = useLocale();
  const t = dict.plan.cover;
  const titleId = useId();
  const groupName = useId();
  const tabsId = useId();
  const tabListRef = useRef<HTMLDivElement>(null);
  const cover = useTripStore((s) => s.cover);
  const setCover = useTripStore((s) => s.setCover);

  // An uploaded cover marks no tile: its fallback is not a choice anyone made.
  const current = cover?.kind === "upload" ? null : coverSlug(cover, daySlugs);
  const startTab: Tab = cover?.kind === "upload" ? "mine" : "places";
  const [selected, setSelected] = useState(current);
  const [tab, setTab] = useState<Tab>(startTab);
  // Each opening starts from the cover the trip has now (adjusted during
  // render, as the place picker does for a new day).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(current);
      setTab(startTab);
    }
  }

  function focusTab(index: number) {
    const next = TABS[(index + TABS.length) % TABS.length];
    setTab(next);
    tabListRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus();
  }

  const { inTrip, elsewhere } = useMemo(() => {
    const ordered = [...new Set([...daySlugs, ...traySlugs])];
    const inTrip = ordered
      .map((slug) => PHOTOGRAPHED.find((place) => place.slug === slug))
      .filter((place): place is Place => Boolean(place));
    const taken = new Set(inTrip.map((place) => place.slug));
    return {
      inTrip,
      elsewhere: PHOTOGRAPHED.filter((place) => !taken.has(place.slug)),
    };
  }, [daySlugs, traySlugs]);

  function apply() {
    if (selected) setCover({ kind: "place", slug: selected });
    onClose();
  }

  function resetToAutomatic() {
    setCover(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      placement="sheet"
      className="w-[min(480px,100vw)] print:hidden"
    >
      {/* Drawn only while open, so the photos load when someone opens it, not
          with every visit to the planner. The sheet's own column only has a
          minimum height, so it would grow with the grid and push the footer
          off screen; pinned to the screen's height, only the grid scrolls and
          "Use this photo" stays in reach. */}
      {open ? (
        <div className="flex h-dvh flex-col">
          <div className="grid gap-3 border-b border-line px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-title font-semibold text-pretty text-brand">
                {t.title}
              </h2>
              <IconButton label={t.close} tone="plain" size="sm" onClick={onClose} className="-mt-1 -mr-2">
                <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              </IconButton>
            </div>
            {/* The same tabs as the trip summary's: the arrow keys move between them. */}
            <div
              ref={tabListRef}
              role="tablist"
              aria-labelledby={titleId}
              className="grid grid-cols-2 gap-1 rounded-full bg-well p-1"
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
                  id={`${tabsId}-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`${tabsId}-${id}-panel`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => setTab(id)}
                  className={cx(
                    "min-h-11 rounded-full px-3 text-label whitespace-nowrap transition-colors duration-150",
                    focusRing,
                    tab === id ? "bg-panel text-brand shadow-float" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {id === "places" ? t.tabPlaces : t.tabMine}
                </button>
              ))}
            </div>
          </div>

          {/* Both panels stay mounted while the sheet is open, so a photo
              picked under "Your photo" is still there after a look at the
              place photos. */}
          <div
            role="tabpanel"
            id={`${tabsId}-mine-panel`}
            aria-labelledby={`${tabsId}-mine`}
            hidden={tab !== "mine"}
            className={cx("min-h-0 flex-1 flex-col", tab === "mine" ? "flex" : "hidden")}
          >
            <CoverUploadPanel onClose={onClose} />
          </div>

          <div
            role="tabpanel"
            id={`${tabsId}-places-panel`}
            aria-labelledby={`${tabsId}-places`}
            hidden={tab !== "places"}
            className={cx("min-h-0 flex-1 flex-col", tab === "places" ? "flex" : "hidden")}
          >
            <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto overscroll-contain px-5 py-4">
              {inTrip.length > 0 ? (
                <TileSection
                  heading={t.inTrip}
                  places={inTrip}
                  name={groupName}
                  selected={selected}
                  onSelect={setSelected}
                  eager
                />
              ) : null}
              <TileSection
                heading={t.elsewhere}
                places={elsewhere}
                name={groupName}
                selected={selected}
                onSelect={setSelected}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line p-4">
              {cover ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToAutomatic}
                  className="-ml-3 underline underline-offset-4"
                >
                  {t.auto}
                </Button>
              ) : (
                <p className="min-w-0 flex-1 basis-48 text-small text-pretty text-ink-soft">{t.autoNote}</p>
              )}
              <Button onClick={apply} disabled={!selected} className="ml-auto">
                {t.use}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function TileSection({
  heading,
  places,
  name,
  selected,
  onSelect,
  eager = false,
}: {
  heading: string;
  places: Place[];
  name: string;
  selected: string | null;
  onSelect: (slug: string) => void;
  /** The first rows on screen: load them with the sheet, not as it scrolls. */
  eager?: boolean;
}) {
  const { locale } = useLocale();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <h3 id={headingId} className="text-small text-ink-soft">
        {heading}
      </h3>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4">
        {places.map((place) => {
          const checked = place.slug === selected;
          return (
            <li key={place.slug}>
              <label className="grid cursor-pointer gap-1.5 text-small leading-snug text-ink">
                <input
                  type="radio"
                  name={name}
                  value={place.slug}
                  checked={checked}
                  onChange={() => onSelect(place.slug)}
                  className="peer sr-only"
                />
                <span
                  className={cx(
                    "relative block aspect-[16/10] overflow-hidden rounded-md outline-offset-2 transition-[outline-color] duration-150",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-brand",
                    checked && "outline-3 outline-brand peer-focus-visible:outline-3",
                  )}
                >
                  <PlacePhoto slug={place.slug} alt="" sizes="(max-width: 480px) 45vw, 210px" eager={eager} />
                  {checked ? (
                    <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-cmj-green text-cmj-paper shadow-float">
                      <Check aria-hidden strokeWidth={2.5} className="size-4" />
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-2 text-pretty">{place.name[locale]}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
