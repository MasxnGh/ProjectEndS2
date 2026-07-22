import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { GuidesIndexClient } from "./guides-index-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");
  return { title: dict.guides.title, description: dict.guides.subtitle };
}

export default function GuidesPage() {
  return <GuidesIndexClient />;
}
