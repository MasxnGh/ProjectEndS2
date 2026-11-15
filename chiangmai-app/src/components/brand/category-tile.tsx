import Link from "next/link";
import type { PlaceCategory } from "@/data/types";
import { cx, focusRing } from "./cx";
import { categoryIcon } from "./icons";
import { PlacePhoto } from "./place-photo";

/*
 * Which picture stands for each category. Five have a real, credited photo of
 * a real place in that category; the other three have no photo we would put
 * our name to, so they get a flat tone from the palette instead of a stock or
 * generated image.
 */
const CATEGORY_ART: Record<PlaceCategory, { photo: string } | { tone: "sand" | "leaf" | "lavender" }> = {
  temple: { photo: "wat-phra-singh" },
  nature: { photo: "kew-mae-pan-nature-trail" },
  village: { photo: "wiang-kum-kam" },
  market: { photo: "saturday-walking-street-wualai" },
  museum: { photo: "chiang-mai-city-arts-cultural-centre" },
  cafe: { tone: "sand" },
  restaurant: { tone: "leaf" },
  activity: { tone: "lavender" },
};

/*
 * Tone tiles keep the same colours in both themes, like the photo tiles.
 * Green text on them: sand 8.76, leaf 7.32, lavender 8.20.
 */
const TONE = {
  sand: "bg-cmj-sand",
  leaf: "bg-[color-mix(in_oklab,var(--cmj-leaf)_55%,var(--cmj-surface))]",
  lavender: "bg-[color-mix(in_oklab,var(--cmj-lavender)_60%,var(--cmj-surface))]",
};

/**
 * The board's category tile: icon, name and how many places, over a photo
 * under a measured scrim, or on a flat tone.
 */
export function CategoryTile({
  category,
  href,
  name,
  countLabel,
  className,
}: {
  category: PlaceCategory;
  href: string;
  name: string;
  /** e.g. "37 แห่ง" — always the real count. */
  countLabel: string;
  className?: string;
}) {
  const art = CATEGORY_ART[category];
  const Icon = categoryIcon[category];
  const hasPhoto = "photo" in art;
  return (
    <Link
      href={href}
      className={cx(
        "group/tile relative isolate grid aspect-[3/4] content-center justify-items-center gap-3 overflow-hidden rounded-lg p-3 text-center font-brand",
        "transition-transform duration-300 ease-brand hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        hasPhoto ? "text-cmj-paper" : cx("text-cmj-green", TONE[art.tone]),
        focusRing,
        className,
      )}
    >
      {hasPhoto ? (
        <>
          <PlacePhoto
            slug={art.photo}
            alt=""
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 23vw, 160px"
            className="absolute inset-0 -z-20 transition-transform duration-[600ms] ease-brand group-hover/tile:scale-[1.04] motion-reduce:transition-none"
          />
          {/* Measured against the 99th-percentile pixel under each label, at 375 and
              1440: the worst of the five photos is 5.26:1. A lighter scrim failed
              (2.64:1 on the white temple of the village tile). */}
          <span aria-hidden className="absolute inset-0 -z-10 bg-[rgb(20_42_39/0.7)]" />
        </>
      ) : null}
      <Icon aria-hidden strokeWidth={1.5} className="size-10" />
      <span className="text-title text-balance">{name}</span>
      <span className="text-small tabular-nums">{countLabel}</span>
    </Link>
  );
}
