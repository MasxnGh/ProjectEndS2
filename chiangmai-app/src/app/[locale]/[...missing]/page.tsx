import { notFound } from "next/navigation";

/**
 * Any address under a locale that no route matches. The root layout lives
 * under [locale], so without this an unknown path skips the locale's
 * not-found page and gets Next's bare default; calling notFound() here
 * renders [locale]/not-found.tsx inside the site's own header and footer,
 * with a 404 status.
 */
export default function MissingPage() {
  notFound();
}
