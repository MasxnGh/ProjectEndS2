/**
 * The board's mark on a 64×44 grid: the orange sparkle (filled) above a
 * mountain ridge drawn in one line (stroked). Shared by <BrandMark> and the
 * share images (lib/og-image.tsx), which can't use the component.
 */
export const MARK_VIEWBOX = "0 0 64 44";

export const MARK_SPARKLE = "M32 2.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z";

export const MARK_STROKES = [
  { d: "M3 41 19 18l7.5 9.5L38 12l23 29", width: 4.2 },
  { d: "M33 19.5 38 25l4-4", width: 3 },
  { d: "M14 41 26.5 27.5", width: 3 },
] as const;
