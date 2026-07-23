import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { GuidesIndexClient } from "./guides-index-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  return buildPageMetadata({
    locale: loc,
    path: "/guides",
    title: dict.guides.title,
    description: dict.guides.subtitle,
  });
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);

  return (
    <>
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.guides, path: "/guides" },
          ])
        )}
      />
      <GuidesIndexClient />
    </>
  );
}
