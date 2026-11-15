"use client";

import { useId, useMemo, useState } from "react";
import { BedDouble, MapPin, Search, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { places } from "@/data/places";
import type { LocalizedText } from "@/data/types";
import { ICON_STROKE } from "@/components/brand/icons";
import { Popover, fieldChipStyles } from "@/components/brand/popover";
import { Button } from "@/components/brand/button";
import { cx, focusRing } from "@/components/brand/cx";
import { fill } from "@/components/brand/place-text";

/** Well-known neighbourhood centres, unchanged from the old picker: approximate, for planning, not an address. */
const AREA_PRESETS: { id: string; label: LocalizedText; lat: number; lng: number }[] = [
  { id: "old-city", label: { en: "Old City", th: "เมืองเก่า" }, lat: 18.7883, lng: 98.9853 },
  { id: "nimman", label: { en: "Nimmanhaemin", th: "นิมมานเหมินท์" }, lat: 18.8002, lng: 98.9675 },
  { id: "night-bazaar", label: { en: "Night Bazaar / Chang Klan", th: "ไนท์บาซาร์ / ช้างคลาน" }, lat: 18.786, lng: 98.993 },
  { id: "riverside", label: { en: "Riverside (Ping River)", th: "ริมแม่น้ำปิง" }, lat: 18.792, lng: 99.001 },
  { id: "santitham", label: { en: "Santitham", th: "สันติธรรม" }, lat: 18.805, lng: 98.98 },
];

const MAX_PLACE_RESULTS = 6;

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  group: "district" | "place";
}

/**
 * Where the traveller is staying, which is what the "leave by" time is
 * worked out from. A neighbourhood, one of the catalogue's places, or a pin
 * dropped on the map.
 */
export function BaseLocationField({ onRequestMapPin }: { onRequestMapPin: () => void }) {
  const { dict } = useLocale();
  const baseLocation = useTripStore((s) => s.baseLocation);

  return (
    <Popover
      label={dict.planner.baseLocation.label}
      buttonClassName={fieldChipStyles}
      button={
        <>
          <BedDouble aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-brand" />
          {baseLocation ? (
            <span className="max-w-[16rem] truncate">{fill(dict.plan.base, { label: baseLocation.label })}</span>
          ) : (
            <span className="font-normal text-ink-soft">{dict.plan.baseNone}</span>
          )}
        </>
      }
    >
      {(close) => (
        <BaseLocationSearch
          onDone={close}
          onRequestMapPin={() => {
            close();
            onRequestMapPin();
          }}
        />
      )}
    </Popover>
  );
}

function BaseLocationSearch({ onDone, onRequestMapPin }: { onDone: () => void; onRequestMapPin: () => void }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.baseLocation;
  const baseLocation = useTripStore((s) => s.baseLocation);
  const setBaseLocation = useTripStore((s) => s.setBaseLocation);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const inputId = useId();
  const listId = useId();

  const districts = useMemo<Option[]>(() => {
    const q = query.trim().toLowerCase();
    return AREA_PRESETS.filter((p) => !q || p.label[locale].toLowerCase().includes(q)).map((p) => ({
      id: `${listId}-d-${p.id}`,
      label: p.label[locale],
      lat: p.lat,
      lng: p.lng,
      group: "district",
    }));
  }, [query, locale, listId]);

  const matches = useMemo<Option[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) => p.name[locale].toLowerCase().includes(q))
      .slice(0, MAX_PLACE_RESULTS)
      .map((p) => ({
        id: `${listId}-p-${p.slug}`,
        label: p.name[locale],
        sublabel: dict.common.districts[p.district],
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        group: "place",
      }));
  }, [query, locale, dict.common.districts, listId]);

  const options = [...districts, ...matches];
  const activeOption = active >= 0 ? options[active] : undefined;

  function choose(option: Option) {
    setBaseLocation({ lat: option.lat, lng: option.lng, label: option.label });
    onDone();
  }

  function renderOption(option: Option) {
    const index = options.indexOf(option);
    return (
      <li key={option.id} role="presentation">
        <button
          id={option.id}
          type="button"
          role="option"
          aria-selected={index === active}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          className={cx(
            "grid min-h-11 w-full content-center rounded-md px-3 py-2 text-left text-label",
            index === active ? "bg-leaf-fill text-brand" : "hover:bg-well",
          )}
        >
          <span>{option.label}</span>
          {option.sublabel ? <span className="text-small text-ink-soft">{option.sublabel}</span> : null}
        </button>
      </li>
    );
  }

  return (
    <div className="grid gap-3">
      <label htmlFor={inputId} className="text-label text-brand">
        {t.label}
      </label>
      <div className="relative">
        <Search
          aria-hidden
          strokeWidth={ICON_STROKE}
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-soft"
        />
        <input
          id={inputId}
          data-autofocus
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption?.id}
          value={query}
          placeholder={t.searchPlaceholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter" && activeOption) {
              event.preventDefault();
              choose(activeOption);
            }
          }}
          className={cx(
            "h-11 w-full rounded-full border-0 bg-well pr-4 pl-11 font-brand text-label text-ink placeholder:text-ink-soft",
            focusRing,
          )}
        />
      </div>

      <ul id={listId} role="listbox" aria-label={t.label} className="grid max-h-64 gap-0.5 overflow-y-auto">
        {districts.length > 0 ? (
          <li role="presentation" className="px-3 pt-1 text-small text-ink-soft">
            {t.groupDistricts}
          </li>
        ) : null}
        {districts.map(renderOption)}
        {matches.length > 0 ? (
          <li role="presentation" className="px-3 pt-2 text-small text-ink-soft">
            {t.groupPlaces}
          </li>
        ) : null}
        {matches.map(renderOption)}
        {query.trim() && options.length === 0 ? (
          <li role="presentation" className="px-3 py-2 text-small text-ink-soft">
            {dict.planner.picker.noResults}
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRequestMapPin}
          icon={<MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {t.pinOnMap}
        </Button>
        {baseLocation ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBaseLocation(null);
              onDone();
            }}
            icon={<X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          >
            {t.clearAria}
          </Button>
        ) : null}
      </div>
      <p className="text-small text-ink-soft">{t.hint}</p>
    </div>
  );
}
