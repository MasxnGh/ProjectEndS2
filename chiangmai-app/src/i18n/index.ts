import type { Locale } from "./config";
import en from "./dictionaries/en";
import th from "./dictionaries/th";

export type { Dictionary } from "./dictionaries/en";
export { locales, defaultLocale, isLocale } from "./config";
export type { Locale } from "./config";

const dictionaries = { en, th };

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
