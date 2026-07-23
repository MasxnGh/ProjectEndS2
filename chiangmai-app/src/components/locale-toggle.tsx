"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { setLocaleCookie } from "@/lib/cookies";

const labels: Record<Locale, string> = { en: "EN", th: "ไทย" };

export function LocaleToggle() {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (target: Locale) => `/${target}${rest ? `/${rest}` : ""}`;

  function handleClick(event: React.MouseEvent, target: Locale) {
    event.preventDefault();
    if (target === locale) return;
    setLocaleCookie(target);
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.push(`${hrefFor(target)}${query}`);
  }

  return (
    <div
      role="group"
      aria-label={dict.footer.language}
      className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition-colors duration-200 hover:border-accent"
    >
      {(["en", "th"] as const).map((target, i) => (
        <span key={target} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-border-strong">/</span> : null}
          <Link
            href={hrefFor(target)}
            hrefLang={target}
            aria-current={locale === target ? "true" : undefined}
            onClick={(event) => handleClick(event, target)}
            className={cn(
              "transition-colors",
              locale === target ? "text-foreground" : "text-muted-foreground hover:text-accent-text"
            )}
          >
            {labels[target]}
          </Link>
        </span>
      ))}
    </div>
  );
}
