import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { isLocale, getDictionary } from "@/i18n";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  return buildPageMetadata({
    locale: loc,
    path: "/contact",
    title: dict.legal.contact.title,
    description: dict.legal.contact.intro,
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.legal.contact.title, path: "/contact" },
          ])
        )}
      />
      <Reveal>
        <SectionHeading title={dict.legal.contact.title} />
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          {dict.legal.contact.intro}
        </p>
        <a
          href={`mailto:${dict.legal.contact.email}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent-text"
        >
          <Mail className="h-4 w-4" aria-hidden />
          <span className="sr-only">{dict.legal.contact.emailLabel}:</span>
          {dict.legal.contact.email}
        </a>
      </Reveal>
    </div>
  );
}
