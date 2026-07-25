"use client";

import { useId } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import type { LocalizedText } from "@/data/types";

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

export function BaseLocationPicker({ className }: { className?: string }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.baseLocation;
  const baseLocation = useTripStore((s) => s.baseLocation);
  const setBaseLocation = useTripStore((s) => s.setBaseLocation);
  const selectId = useId();

  const selectedPresetId = AREA_PRESETS.find(
    (preset) => preset.lat === baseLocation?.lat && preset.lng === baseLocation?.lng
  )?.id ?? "";

  function handleChange(value: string) {
    if (!value) {
      setBaseLocation(null);
      return;
    }
    const preset = AREA_PRESETS.find((p) => p.id === value);
    if (!preset) return;
    setBaseLocation({ lat: preset.lat, lng: preset.lng, label: preset.label[locale] });
  }

  return (
    <div className={className}>
      <label htmlFor={selectId} className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t.label}
      </label>
      <select
        id={selectId}
        value={selectedPresetId}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
      >
        <option value="">{t.placeholder}</option>
        {AREA_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label[locale]}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
    </div>
  );
}
