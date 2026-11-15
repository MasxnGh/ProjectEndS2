import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * Class joiner for the brand components.
 *
 * Plain tailwind-merge does not know the type roles in brand.css, so it reads
 * `text-title` as a text colour and silently drops it when `text-ink` follows.
 * Naming them here keeps both. The same goes for the two shadows.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "headline", "title", "body", "label", "small", "credit"],
      shadow: ["float", "lift"],
    },
  },
});

export function cx(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}

/** The focus ring every control shares: 2px in the voice colour, offset 2px. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
