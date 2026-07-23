"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export default function NotFound() {
  const { locale, dict } = useLocale();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-32 text-center lg:px-10">
      <Compass className="h-10 w-10 text-accent-text" aria-hidden />
      <p className="mt-6 font-serif-display text-7xl text-accent-text">404</p>
      <h1 className="mt-4 font-serif-display text-3xl leading-tight sm:text-4xl">{dict.notFound.title}</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">{dict.notFound.body}</p>
      <Link
        href={`/${locale}/explore`}
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-transform duration-200 hover:scale-[1.03]"
      >
        {dict.notFound.cta}
      </Link>
    </div>
  );
}
