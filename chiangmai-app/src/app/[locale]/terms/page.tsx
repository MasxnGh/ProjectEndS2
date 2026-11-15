import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { LegalDocument } from "@/components/legal/legal-document";
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
    <>
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.legal.terms.title, path: "/terms" },
          ])
        )}
      />
      <LegalDocument
        title={dict.legal.terms.title}
        intro={dict.legal.terms.intro}
        updatedLabel={dict.legal.updated}
        updatedDate={dict.legal.updatedDate}
        sections={dict.legal.terms.sections}
      />
    </>
  );
}
