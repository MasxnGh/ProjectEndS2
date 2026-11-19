import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Place } from "@/data/types";
import type { Dictionary, Locale } from "@/i18n";
import { locateInSquare } from "@/lib/city-square";
import { cx } from "./cx";
import { categoryIcon, ICON_STROKE } from "./icons";
import { NoPhoto, PlacePhoto } from "./place-photo";
import { fill, placeMeta, placeWhere } from "./place-text";
import { ThaiName } from "./thai-name";

/**
 * `row`: photo on the left, as on the board. `stack`: photo on top, for grids.
 * `auto`: a row on a phone, where a stacked card would make a list of 24 run
 * to some twenty screens, and a stack from 640px up.
 */
export type PlaceCardLayout = "row" | "stack" | "auto";

const GRID: Record<PlaceCardLayout, string> = {
  row: "grid-cols-[minmax(104px,34%)_1fr] gap-3 sm:grid-cols-[40%_1fr] sm:gap-4",
  stack: "grid-cols-1 gap-3",
  auto: "grid-cols-[minmax(104px,34%)_1fr] gap-3 sm:grid-cols-1",
};
const MEDIA: Record<PlaceCardLayout, string> = {
  row: "aspect-[4/3.4] min-h-full",
  stack: "aspect-[4/3]",
  auto: "aspect-[4/3.4] min-h-full sm:aspect-[4/3] sm:min-h-0",
};
const BODY: Record<PlaceCardLayout, string> = {
  row: "py-1",
  stack: "px-1.5 pb-1",
  auto: "py-1 sm:px-1.5 sm:pt-0 sm:pb-1",
};

/**
 * The board's place card: photo, name, where, and a round arrow. The whole card
 * is one link (the name's link is stretched over it), so a keyboard user meets
 * one stop per card and the focus ring outlines the card.
 *
 * Controls sit above that link: `favorite` on the photo's corner, and `footer`
 * — add to plan, compare — along the bottom, which replaces the decorative
 * arrow. `note` is an extra line of fact, such as the distance from a point;
 * `summary` is the place's one-line description, shown from 640px up.
 * `active` rings the card, e.g. while its dot is pointed at on the map.
 */
export function PlaceCard({
  href,
  name,
  where,
  meta,
  media,
  favorite,
  footer,
  note,
  summary,
  active = false,
  layout = "row",
  headingLevel = "h3",
  className,
  ...rest
}: {
  href: string;
  name: string;
  where: string;
  meta: string;
  /** A <PlacePhoto> or <NoPhoto>; it fills the media box. */
  media: ReactNode;
  favorite?: ReactNode;
  footer?: ReactNode;
  note?: ReactNode;
  /** One line about the place, for a card with room to spare (the home page's picks). */
  summary?: string;
  active?: boolean;
  layout?: PlaceCardLayout;
  headingLevel?: "h2" | "h3" | "h4";
  className?: string;
} & Omit<ComponentProps<"article">, "children" | "className">) {
  const Heading = headingLevel;
  return (
    <article
      {...rest}
      className={cx(
        "group/card relative grid rounded-lg border border-line bg-panel p-3 font-brand shadow-float",
        "transition-[translate,box-shadow,border-color] duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        active && "border-brand shadow-lift",
        GRID[layout],
        className,
      )}
    >
      {/* w-full: a grid item with an aspect-ratio does not stretch to its column;
          without a set width it takes height × ratio and runs over the text. */}
      <div className={cx("relative w-full min-w-0 overflow-hidden rounded-md", MEDIA[layout])}>{media}</div>
      {favorite ? <div className="absolute top-5 left-5 z-10">{favorite}</div> : null}
      <div className={cx("flex min-w-0 flex-col gap-1.5", BODY[layout])}>
        <Heading className="text-[1.125rem] leading-[1.4] font-semibold text-pretty text-ink">
          <Link
            href={href}
            className="rounded-lg outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          >
            <ThaiName text={name} />
          </Link>
        </Heading>
        <p className="flex items-start gap-1.5 text-small text-ink-soft">
          <MapPin aria-hidden strokeWidth={ICON_STROKE} className="mt-[3px] size-4 flex-none" />
          {where}
        </p>
        {summary ? (
          // From 640px only: a row card on a phone has no room for it, and there
          // the card's text column would end up taller than its photo.
          <p className="hidden text-small text-pretty text-ink-soft sm:line-clamp-2">{summary}</p>
        ) : null}
        {note ? <div className="text-small text-brand tabular-nums">{note}</div> : null}
        <p className={cx("overflow-hidden text-small text-ink-soft tabular-nums", footer ? "" : "mt-auto pr-13")}>
          {/* Each fact stays on one line, so "1 ชม. 30 นาที" never leaves "นาที"
              alone. Each carries its dot in front, and the row is pulled left
              by that width under the paragraph's clip: the dot of whichever
              fact starts a line is cut off, so a wrapped line neither ends nor
              begins with one. */}
          <Facts parts={meta.split(" · ")} />
        </p>
        {footer ? (
          // Above the stretched link, so these are their own targets.
          <div className="relative z-10 mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">{footer}</div>
        ) : null}
      </div>
      {footer ? null : (
        <span
          aria-hidden
          className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-brand text-on-brand transition-transform duration-150 ease-brand group-hover/card:translate-x-0.5 motion-reduce:transition-none"
        >
          <ArrowRight strokeWidth={ICON_STROKE} className="size-4" />
        </span>
      )}
    </article>
  );
}

const FACT = "relative min-w-0 pl-[1em] before:absolute before:left-0 before:w-[1em] before:text-center before:content-['·']";

/**
 * The meta line's facts, dot-separated, wrapping between facts. Each fact is a
 * flex item, so it moves to the next line whole ("1 ชม. 30 นาที" stays together)
 * and breaks inside only when it is wider than the line by itself, as on a
 * 320px phone, instead of running under the arrow or being cut off.
 *
 * The last two (how long, what it costs) wrap as a pair first, so the price
 * symbol is not left on a line by itself while there is room to keep it beside
 * the duration; only when the pair is wider than the whole line does it split.
 */
function Facts({ parts }: { parts: string[] }) {
  const lead = parts.length > 2 ? parts.slice(0, -2) : [];
  const pair = parts.length > 2 ? parts.slice(-2) : parts;
  return (
    <span className="-ml-[1em] flex flex-wrap">
      {lead.map((part, i) => (
        <span key={i} className={FACT}>
          {part}
        </span>
      ))}
      <span className={cx(FACT, "max-w-full")}>
        <span className="block overflow-hidden">
          <span className="-ml-[1em] flex flex-wrap">
            {pair.map((part, i) => (
              <span key={i} className={FACT}>
                {part}
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

const SIZES: Record<PlaceCardLayout, string> = {
  row: "(max-width: 640px) 34vw, 220px",
  stack: "(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 400px",
  auto: "(max-width: 640px) 34vw, (max-width: 1024px) 45vw, 360px",
};

/** A PlaceCard filled from a place's own data: its photo or the no-photo art, and true meta. */
export function PlaceCardFor({
  place,
  locale,
  dict,
  layout = "row",
  sizes,
  ...rest
}: {
  /** Only what the card shows; Explore passes its trimmed places. */
  place: Pick<Place, "slug" | "name" | "category" | "district" | "coordinates" | "durationMinutes" | "priceLevel">;
  locale: Locale;
  dict: Dictionary;
  layout?: PlaceCardLayout;
  /** Defaults suit the layout: a three-column grid on desktop and a full-width card on phones. */
  sizes?: string;
} & Omit<ComponentProps<typeof PlaceCard>, "href" | "name" | "where" | "meta" | "media" | "layout">) {
  const name = place.name[locale];
  const where = placeWhere(place, dict);
  const { bucket } = locateInSquare(place.coordinates);
  const district = dict.common.districts[place.district] ?? dict.square.zones[bucket];
  return (
    <PlaceCard
      {...rest}
      href={`/${locale}/place/${place.slug}`}
      name={name}
      where={where}
      meta={placeMeta(place, dict)}
      layout={layout}
      media={
        <PlacePhoto
          slug={place.slug}
          alt={name}
          sizes={sizes ?? SIZES[layout]}
          fallback={
            <NoPhoto
              icon={categoryIcon[place.category]}
              caption={district}
              size={layout === "stack" ? "md" : "sm"}
              label={fill(dict.ui.noPhotoLabel, { category: dict.common.categories[place.category], where })}
            />
          }
        />
      }
    />
  );
}
