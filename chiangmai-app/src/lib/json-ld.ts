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

/** Renders a JSON-LD payload as a native <script> tag from a Server Component. */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    suppressHydrationWarning: true as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  };
}
