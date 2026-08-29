"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { places } from "@/data/places";
import type { LocalizedText } from "@/data/types";
import { cn } from "@/lib/utils";

interface AreaPreset {
  id: string;
  label: LocalizedText;
  lat: number;
  lng: number;
}

/** Well-known Chiang Mai neighbourhood centers — approximate area centers for planning purposes, not a specific address. */
const AREA_PRESETS: AreaPreset[] = [
  { id: "old-city", label: { en: "Old City", th: "เมืองเก่า" }, lat: 18.7883, lng: 98.9853 },
  { id: "nimman", label: { en: "Nimmanhaemin", th: "นิมมานเหมินท์" }, lat: 18.8002, lng: 98.9675 },
  { id: "night-bazaar", label: { en: "Night Bazaar / Chang Klan", th: "ไนท์บาซาร์ / ช้างคลาน" }, lat: 18.786, lng: 98.993 },
  { id: "riverside", label: { en: "Riverside (Ping River)", th: "ริมแม่น้ำปิง" }, lat: 18.792, lng: 99.001 },
  { id: "santitham", label: { en: "Santitham", th: "สันติธรรม" }, lat: 18.805, lng: 98.98 },
];

const MAX_PLACE_RESULTS = 6;

interface ComboOption {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  group: "district" | "place";
}

export function BaseLocationPicker({
  className,
  onRequestMapPin,
}: {
  className?: string;
  /** Opens map-click "pin mode" — the parent owns this since it has to reach the map (sticky sidebar on desktop, its own tab on mobile). */
  onRequestMapPin?: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.baseLocation;
  const baseLocation = useTripStore((s) => s.baseLocation);
  const setBaseLocation = useTripStore((s) => s.setBaseLocation);

  const savedLabel = baseLocation?.label ?? "";
  const [query, setQuery] = useState(savedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const listboxId = useId();

  // A closed input always shows the saved base location, so it has to catch up
  // both when the dropdown closes over half-typed text and when the location
  // changes from outside this component (a map pin drop, a cleared trip).
  // Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastSync, setLastSync] = useState({ savedLabel, isOpen });
  if (lastSync.savedLabel !== savedLabel || lastSync.isOpen !== isOpen) {
    setLastSync({ savedLabel, isOpen });
    if (!isOpen) setQuery(savedLabel);
  }

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const districtOptions = useMemo<ComboOption[]>(() => {
    const q = query.trim().toLowerCase();
    return AREA_PRESETS.filter((p) => !q || p.label[locale].toLowerCase().includes(q)).map((p) => ({
      id: `district-${p.id}`,
      label: p.label[locale],
      lat: p.lat,
      lng: p.lng,
      group: "district" as const,
    }));
  }, [query, locale]);

  const placeOptions = useMemo<ComboOption[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return places
      .filter((p) => p.name[locale].toLowerCase().includes(q))
      .slice(0, MAX_PLACE_RESULTS)
      .map((p) => ({
        id: `place-${p.slug}`,
        label: p.name[locale],
        sublabel: dict.common.districts[p.district],
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        group: "place" as const,
      }));
  }, [query, locale, dict.common.districts]);

  const options = useMemo(() => [...districtOptions, ...placeOptions], [districtOptions, placeOptions]);
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;

  function selectOption(option: ComboOption) {
    setBaseLocation({ lat: option.lat, lng: option.lng, label: option.label });
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleClear() {
    setBaseLocation(null);
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (activeOption) {
        event.preventDefault();
        selectOption(activeOption);
      }
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setQuery(savedLabel);
      }
    }
  }

  return (
    <div className={className} ref={rootRef}>
      <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t.label}
      </label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? activeOption.id : undefined}
          value={query}
          placeholder={t.searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-9 text-sm focus:border-accent focus:outline-none"
        />
        {baseLocation ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t.clearAria}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-accent-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
            <ul id={listboxId} role="listbox" aria-label={t.label}>
              {districtOptions.length > 0 ? (
                <li role="presentation" className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.groupDistricts}
                </li>
              ) : null}
              {districtOptions.map((option) => {
                const index = options.indexOf(option);
                return (
                  <li key={option.id} role="presentation">
                    <button
                      id={option.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                        index === activeIndex ? "bg-accent/10 text-accent-text" : "hover:bg-surface-muted"
                      )}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}

              {placeOptions.length > 0 ? (
                <li role="presentation" className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.groupPlaces}
                </li>
              ) : null}
              {placeOptions.map((option) => {
                const index = options.indexOf(option);
                return (
                  <li key={option.id} role="presentation">
                    <button
                      id={option.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                        index === activeIndex ? "bg-accent/10 text-accent-text" : "hover:bg-surface-muted"
                      )}
                    >
                      <span>{option.label}</span>
                      {option.sublabel ? <span className="text-xs text-muted-foreground">{option.sublabel}</span> : null}
                    </button>
                  </li>
                );
              })}

              {query.trim() && options.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">{dict.planner.picker.noResults}</li>
              ) : null}
            </ul>

            {onRequestMapPin ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsOpen(false);
                  onRequestMapPin();
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-accent-text hover:bg-surface-muted"
              >
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.pinOnMap}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
    </div>
  );
}
