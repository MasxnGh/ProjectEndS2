"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@/i18n";
import { locales } from "@/i18n";

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  otherLocale: Locale;
  switchLocale: (next: Locale) => void;
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
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
      const rest = pathname.split("/").slice(2).join("/");
      router.push(`/${next}${rest ? `/${rest}` : ""}`);
    },
    [locale, pathname, router]
  );

  const otherLocale = useMemo(
    () => locales.find((l) => l !== locale) ?? locale,
    [locale]
  );

  const value = useMemo(
    () => ({ locale, dict, otherLocale, switchLocale }),
    [locale, dict, otherLocale, switchLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
