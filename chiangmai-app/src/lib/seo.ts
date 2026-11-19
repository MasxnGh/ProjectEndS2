import type { Metadata } from "next";
import type { Locale } from "@/i18n";
import { SITE_URL } from "@/lib/site";

/**
 * Self-referencing canonical + full hreflang set for a given path (no locale prefix, e.g. "/place/wat-umong").
 *
 * Language codes without a region: the pages are for anyone who reads the
 * language, not one country ("en-US" left every reader outside the US
 * unmatched, and the English copy is British anyway). x-default is English
 * because that is where the proxy sends a browser that asks for neither.
 */
export function buildAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const en = `${SITE_URL}/en${path}`;
  const th = `${SITE_URL}/th${path}`;
  return {
    canonical: locale === "th" ? th : en,
    languages: {
      en,
      th,
      "x-default": en,
    },
  };
}

export function ogLocale(locale: Locale): { locale: string; alternateLocale: string } {
  return locale === "th"
    ? { locale: "th_TH", alternateLocale: "en_US" }
    : { locale: "en_US", alternateLocale: "th_TH" };
}

/** Composes the openGraph + twitter + alternates block shared by every page's generateMetadata. */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}${path}`,
      ...ogLocale(locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
