import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { places } from "@/data/places";
import { guides } from "@/data/guides";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const staticPaths = ["", "/explore", "/planner", "/guides"];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
      });
    }
    for (const place of places) {
      entries.push({
        url: `${SITE_URL}/${locale}/place/${place.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    for (const guide of guides) {
      entries.push({
        url: `${SITE_URL}/${locale}/guides/${guide.slug}`,
        changeFrequency: "monthly",
        priority: 0.5,
        lastModified: guide.publishedAt,
      });
    }
  }

  return entries;
}
