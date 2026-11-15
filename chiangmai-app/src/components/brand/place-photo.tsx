import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n";
import { getPlacePhoto } from "@/data/photo-manifest";
import { getPlaceBlurDataURL } from "@/data/blur-manifest";
import { creditSourceName, getPhotoCredit } from "@/data/photo-credits";
import { cx } from "./cx";
import { fill } from "./place-text";
import { ICON_STROKE } from "./icons";

export type PhotoGrade = "warm" | "golden" | "none";

export function hasPlacePhoto(slug: string): boolean {
  return Boolean(getPlacePhoto(slug));
}

/**
 * A place's own photograph, checked to show that place, with the shared warm
 * grade. "golden" is for the one hero photograph of a page. When the place has
 * no verified photo, `fallback` renders instead — usually <NoPhoto>.
 *
 * The root fills its parent; give the parent the size and the corner radius.
 */
export function PlacePhoto({
  slug,
  alt,
  sizes,
  grade = "warm",
  eager = false,
  className,
  fallback = null,
}: {
  slug: string;
  alt: string;
  sizes: string;
  grade?: PhotoGrade;
  /** Above the fold: load at once and at high priority (Next 16 replaces `priority`). */
  eager?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const src = getPlacePhoto(slug);
  if (!src) return <>{fallback}</>;
  const blur = getPlaceBlurDataURL(slug);
  return (
    <div
      className={cx(
        "relative size-full overflow-hidden bg-sand-fill",
        grade === "warm" && "cmj-grade-warm",
        grade === "golden" && "cmj-grade-golden",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        placeholder={blur ? "blur" : "empty"}
        blurDataURL={blur}
        className="object-cover"
      />
    </div>
  );
}

/**
 * What a place without a verified photo shows. About two places in three have
 * none, so this is the main case, not an error: sand ground, the category's
 * icon in a ring, where it is, and the board's ridge line along the foot.
 * It never pretends to be a photograph.
 */
export function NoPhoto({
  icon: Icon,
  caption,
  label,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  /** Short visible line, usually the district. */
  caption?: string;
  /** Full accessible description, e.g. dict.ui.noPhotoLabel filled in. */
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "cmj-ridge relative grid size-full content-center justify-items-center gap-3 overflow-hidden bg-sand-fill p-3 text-center text-brand",
        className,
      )}
    >
      <span
        className={cx(
          "grid place-items-center rounded-full bg-cmj-surface/70 dark:bg-white/[0.06]",
          { sm: "size-13", md: "size-16", lg: "size-20" }[size],
        )}
      >
        <Icon aria-hidden strokeWidth={size === "lg" ? 1.5 : ICON_STROKE} className={{ sm: "size-6", md: "size-7", lg: "size-10" }[size]} />
      </span>
      {caption ? <span className="relative font-brand text-small font-medium">{caption}</span> : null}
    </div>
  );
}

/**
 * Who took the photograph and under what licence, linking to the source page
 * where the licence lives. Every photo on the site carries one.
 */
export function PhotoCredit({
  slug,
  dict,
  placeName,
  tone = "page",
  className,
}: {
  slug: string;
  dict: Dictionary;
  /** Prefixed when the credit sits away from the photo, e.g. "วัดเจดีย์หลวง — ภาพ: …". */
  placeName?: string;
  /** "photo" when the credit is set on the photograph itself, under a scrim. */
  tone?: "page" | "photo";
  className?: string;
}) {
  const credit = getPhotoCredit(slug);
  if (!credit) return null;
  return (
    <p className={cx("font-brand text-credit", tone === "page" ? "text-ink-soft" : "text-cmj-paper/90", className)}>
      {placeName ? `${placeName} — ` : null}
      {fill(dict.ui.photoCredit, { artist: credit.artist, licence: credit.licence })} ·{" "}
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cx(
          "rounded-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2",
          tone === "page"
            ? "decoration-line-strong hover:text-brand focus-visible:outline-brand"
            : "decoration-cmj-paper/50 hover:text-cmj-paper hover:decoration-cmj-paper focus-visible:outline-cmj-paper",
        )}
      >
        {creditSourceName(credit.sourceUrl)}
      </a>
    </p>
  );
}
