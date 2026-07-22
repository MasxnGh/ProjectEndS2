"use client";

import { useLocale } from "@/components/providers/locale-provider";

const labels: Record<string, string> = { en: "EN", th: "ไทย" };

export function LocaleToggle() {
  const { locale, otherLocale, switchLocale, dict } = useLocale();

  return (
    <button
      type="button"
      onClick={() => switchLocale(otherLocale)}
      className="flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-text"
      aria-label={dict.footer.language}
    >
      {labels[locale]} <span className="mx-1.5 text-border-strong">/</span>{" "}
      <span className="text-muted-foreground">{labels[otherLocale]}</span>
    </button>
  );
}
