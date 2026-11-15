"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { PlaceCategory } from "@/data/types";
import { Chip, ChipRow } from "@/components/brand/chip";
import { IconButton } from "@/components/brand/icon-button";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";

/** Category chips with real counts; one selected at a time, as on Explore. */
export function ChipDemo({
  allLabel,
  total,
  items,
  groupLabel,
}: {
  allLabel: string;
  total: number;
  items: { key: PlaceCategory; label: string; count: number }[];
  groupLabel: string;
}) {
  const [active, setActive] = useState<PlaceCategory | "all">("all");
  return (
    <ChipRow scroll label={groupLabel}>
      <Chip pressed={active === "all"} count={total} onClick={() => setActive("all")}>
        {allLabel}
      </Chip>
      {items.map(({ key, label, count }) => {
        const Icon = categoryIcon[key];
        return (
          <Chip
            key={key}
            pressed={active === key}
            count={count}
            icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            onClick={() => setActive(key)}
          >
            {label}
          </Chip>
        );
      })}
    </ChipRow>
  );
}

/** The favourite toggle's look. Phase 4 wires it to the real favourites store. */
export function FavoriteDemo({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  return (
    <IconButton label={label} tone="on-photo" size="xs" pressed={on} onClick={() => setOn((v) => !v)}>
      <Heart aria-hidden strokeWidth={ICON_STROKE} className="size-4" fill={on ? "currentColor" : "none"} />
    </IconButton>
  );
}
