"use client";

import { Compass } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { ButtonLink } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { Wrap } from "@/components/brand/surface";

export default function NotFound() {
  const { locale, dict } = useLocale();

  return (
    <div data-brand className="bg-page font-brand text-ink">
      <Wrap className="grid min-h-[min(640px,calc(100dvh-72px))] content-center justify-items-center gap-4 py-16 text-center">
        <span aria-hidden className="grid size-16 place-items-center rounded-full bg-well text-brand">
          <Compass strokeWidth={ICON_STROKE} className="size-7" />
        </span>
        <p className="text-label font-semibold text-ink-soft tabular-nums">404</p>
        <h1 className="max-w-[20ch] text-[clamp(2rem,1.6rem+1.8vw,2.75rem)] leading-[1.25] font-semibold text-balance text-brand">
          {dict.notFound.title}
        </h1>
        <p className="max-w-[46ch] text-body text-pretty text-ink-soft">{dict.notFound.body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/${locale}/explore`} arrow>
            {dict.notFound.cta}
          </ButtonLink>
          <ButtonLink href={`/${locale}`} variant="ghost">
            {dict.nav.home}
          </ButtonLink>
        </div>
      </Wrap>
    </div>
  );
}
