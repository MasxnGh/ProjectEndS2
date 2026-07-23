import { SITE_URL } from "@/lib/site";
import type { Locale } from "@/i18n";

export function breadcrumbJsonLd(locale: Locale, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}/${locale}${item.path}`,
    })),
  };
}

export function websiteJsonLd(locale: Locale, siteName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: `${SITE_URL}/${locale}`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${locale}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

const DAILY_HOURS_PATTERN = /Daily,\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;

/**
 * Best-effort parse of the site's free-text "Daily, 6:00 AM – 6:00 PM"-style
 * opening-hours strings into a schema.org OpeningHoursSpecification. Returns
 * null (rather than guessing) for any string that doesn't match that exact
 * shape, since publishing wrong structured hours is worse than omitting them.
 */
export function parseDailyOpeningHours(text: string) {
  const match = DAILY_HOURS_PATTERN.exec(text);
  if (!match) return null;

  const to24Hour = (hour: string, minute: string, meridiem: string) => {
    let h = parseInt(hour, 10) % 12;
    if (meridiem.toUpperCase() === "PM") h += 12;
    return `${String(h).padStart(2, "0")}:${minute}`;
  };

  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: to24Hour(match[1], match[2], match[3]),
    closes: to24Hour(match[4], match[5], match[6]),
  };
}

/** Renders a JSON-LD payload as a native <script> tag from a Server Component. */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    suppressHydrationWarning: true as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  };
}
