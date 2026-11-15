"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { locales, type Locale } from "@/i18n/config";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { setLocaleCookie } from "@/lib/cookies";
import { chipStyles, Chip } from "./chip";
import { cx } from "./cx";
import { ICON_STROKE } from "./icons";

/** Each language is named in itself, so a reader finds theirs either way. */
const LANGUAGE_NAME: Record<Locale, string> = { th: "ไทย", en: "English" };

/**
 * Language as two chips. They are real links to the same page in the other
 * language (with hreflang), so they work without JavaScript; with it, the
 * cookie is set first so the choice sticks, and the query string comes along.
 */
export function LanguageChoice({ className }: { className?: string }) {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (target: Locale) => `/${target}${rest ? `/${rest}` : ""}`;

  function choose(event: MouseEvent, target: Locale) {
    event.preventDefault();
    if (target === locale) return;
    setLocaleCookie(target);
    router.push(`${hrefFor(target)}${window.location.search}`);
  }

  return (
    <div role="group" aria-label={dict.footer.language} className={cx("flex flex-wrap gap-2", className)}>
      {locales.map((target) => {
        const current = target === locale;
        return (
          <Link
            key={target}
            href={hrefFor(target)}
            hrefLang={target}
            lang={target}
            aria-current={current ? "true" : undefined}
            onClick={(event) => choose(event, target)}
            className={cx(chipStyles(), current && "bg-brand text-on-brand hover:bg-brand")}
          >
            {current ? <Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" /> : null}
            {LANGUAGE_NAME[target]}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Light, dark, or whatever the device is set to. The stored choice only exists
 * in the browser, so nothing is marked as chosen until after hydration.
 */
export function ThemeChoice({ className }: { className?: string }) {
  const { dict } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the stored theme is only readable after hydration
    setMounted(true);
  }, []);

  const options = [
    { value: "light", label: dict.shell.themeLight, icon: Sun },
    { value: "dark", label: dict.shell.themeDark, icon: Moon },
    { value: "system", label: dict.shell.themeSystem, icon: Monitor },
  ] as const;

  return (
    <div role="group" aria-label={dict.footer.theme} className={cx("flex flex-wrap gap-2", className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <Chip
          key={value}
          pressed={mounted ? theme === value : false}
          icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          onClick={() => setTheme(value)}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}
