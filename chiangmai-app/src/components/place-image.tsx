import Image from "next/image";
import type { PlaceCategory } from "@/data/types";
import { cn } from "@/lib/utils";

const categoryGradients: Record<PlaceCategory, string> = {
  temple:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-accent) 55%, transparent), color-mix(in srgb, var(--color-tertiary) 35%, transparent) 55%, var(--color-surface-muted) 100%)",
  nature:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-secondary) 60%, transparent), color-mix(in srgb, var(--color-accent) 25%, transparent) 60%, var(--color-surface-muted) 100%)",
  village:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-tertiary) 50%, transparent), color-mix(in srgb, var(--color-secondary) 30%, transparent) 55%, var(--color-surface-muted) 100%)",
  cafe: "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-foreground) 22%, transparent), color-mix(in srgb, var(--color-accent) 30%, transparent) 60%, var(--color-surface-muted) 100%)",
  restaurant:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-accent) 50%, transparent), color-mix(in srgb, var(--color-foreground) 20%, transparent) 55%, var(--color-surface-muted) 100%)",
  market:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-accent) 45%, transparent), color-mix(in srgb, var(--color-tertiary) 40%, transparent) 60%, var(--color-surface-muted) 100%)",
  museum:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-tertiary) 45%, transparent), color-mix(in srgb, var(--color-foreground) 18%, transparent) 55%, var(--color-surface-muted) 100%)",
  activity:
    "linear-gradient(var(--angle, 135deg), color-mix(in srgb, var(--color-secondary) 45%, transparent), color-mix(in srgb, var(--color-accent) 35%, transparent) 60%, var(--color-surface-muted) 100%)",
};

const motifs: Record<PlaceCategory, string> = {
  temple:
    "M4 88 L20 88 L20 70 L26 70 L26 55 L32 55 L32 40 L36 26 L40 40 L40 55 L46 55 L46 70 L52 70 L52 88 M36 8 L36 20 M30 14 L42 14",
  nature: "M2 82 L20 48 L32 64 L48 30 L62 56 L74 40 L98 82 Z",
  village:
    "M6 86 L6 58 L22 40 L38 58 L38 86 M46 86 L46 62 L60 48 L74 62 L74 86 M82 86 L82 66 L92 56 L100 66 L100 86",
  cafe: "M20 40 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0 M35 40 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0",
  restaurant:
    "M14 56 L86 56 M22 56 A28 28 0 0 0 78 56 M34 86 L66 86 M38 42 C34 34 42 30 38 22 M50 42 C46 32 54 28 50 18 M62 42 C58 34 66 30 62 22",
  market:
    "M10 30 L90 30 M18 30 L14 90 M34 30 L32 90 M50 30 L50 90 M66 30 L68 90 M82 30 L86 90 M10 30 L50 8 L90 30",
  museum:
    "M8 44 L50 18 L92 44 M4 88 L96 88 M8 78 L92 78 M18 44 L18 78 M34 44 L34 78 M50 44 L50 78 M66 44 L66 78 M82 44 L82 78",
  activity:
    "M50 90 C50 60 30 55 30 30 C30 15 42 6 50 6 C58 6 70 15 70 30 C70 55 50 60 50 90 Z M50 50 C50 50 40 40 40 28 M50 50 C50 50 60 40 60 28",
};

const DEFAULT_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

export function PlaceImage({
  category,
  paletteSeed = 1,
  className,
  label,
  photoSrc,
  priority,
  sizes = DEFAULT_SIZES,
  quality,
  placeholder,
  blurDataURL,
}: {
  category: PlaceCategory;
  paletteSeed?: number;
  className?: string;
  label?: string;
  photoSrc?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
}) {
  const angle = 100 + ((paletteSeed * 23) % 140);

  return (
    <div
      className={cn("relative isolate overflow-hidden bg-surface-muted", className)}
      style={{ ["--angle" as string]: `${angle}deg` }}
      role={photoSrc ? undefined : "img"}
      aria-label={photoSrc ? undefined : (label ?? `${category} illustration`)}
    >
      {photoSrc ? (
        <Image
          src={photoSrc}
          alt={label ?? ""}
          fill
          priority={priority}
          sizes={sizes}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: categoryGradients[category] }} />
          <div
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--color-foreground) 1px, transparent 0)",
              backgroundSize: "14px 14px",
            }}
          />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMax slice"
            className="absolute inset-x-0 bottom-0 h-[70%] w-full opacity-30"
            aria-hidden
          >
            <path
              d={motifs[category]}
              fill="none"
              stroke="var(--color-background)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    </div>
  );
}
