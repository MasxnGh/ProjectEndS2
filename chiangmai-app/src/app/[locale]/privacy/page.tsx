import type { Metadata } from "next";
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
    path: "/privacy",
    title: dict.legal.privacy.title,
    description: dict.legal.privacy.intro,
  });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.legal.privacy.title, path: "/privacy" },
          ])
        )}
      />
      <Reveal>
        <SectionHeading title={dict.legal.privacy.title} />
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.legal.updated}: {dict.legal.updatedDate}
        </p>
        <p className="mt-8 text-lg leading-relaxed text-muted-foreground text-pretty">
          {dict.legal.privacy.intro}
        </p>
      </Reveal>

      <div className="mt-10 space-y-8">
        {dict.legal.privacy.sections.map((section, i) => (
          <Reveal key={section.heading} delay={i * 0.05}>
            <h2 className="font-serif-display text-xl">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">{section.body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
