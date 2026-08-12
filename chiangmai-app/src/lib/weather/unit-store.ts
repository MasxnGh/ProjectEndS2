"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TempUnit = "C" | "F";

interface UnitState {
  unit: TempUnit;
  toggleUnit: () => void;
}

export const useUnitStore = create<UnitState>()(
  persist(
    (set, get) => ({
      unit: "C",
      toggleUnit: () => set({ unit: get().unit === "C" ? "F" : "C" }),
    }),
    // Pre-rename localStorage key, kept deliberately — renaming it would reset
    // every existing visitor's °C/°F choice. See the same note in trip-store.ts.
    { name: "doi-delta-temp-unit" }
  )
);

export function formatTemp(celsius: number, unit: TempUnit): number {
  return unit === "C" ? Math.round(celsius) : Math.round((celsius * 9) / 5 + 32);
}
