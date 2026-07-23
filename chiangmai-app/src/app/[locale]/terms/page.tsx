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
    path: "/terms",
    title: dict.legal.terms.title,
    description: dict.legal.terms.intro,
  });
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.legal.terms.title, path: "/terms" },
          ])
        )}
      />
      <Reveal>
        <SectionHeading title={dict.legal.terms.title} />
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.legal.updated}: {dict.legal.updatedDate}
        </p>
        <p className="mt-8 text-lg leading-relaxed text-muted-foreground text-pretty">
          {dict.legal.terms.intro}
        </p>
      </Reveal>

      <div className="mt-10 space-y-8">
        {dict.legal.terms.sections.map((section, i) => (
          <Reveal key={section.heading} delay={i * 0.05}>
            <h2 className="font-serif-display text-xl">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">{section.body}</p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
