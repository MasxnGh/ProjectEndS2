"use client";

import { createContext, useContext, useMemo } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { locales } from "@/i18n";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  otherLocale: Locale;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const otherLocale = useMemo(
    () => locales.find((l) => l !== locale) ?? locale,
    [locale]
  );

  const value = useMemo(() => ({ locale, dict, otherLocale }), [locale, dict, otherLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
