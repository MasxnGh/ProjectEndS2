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
    <>
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.legal.privacy.title, path: "/privacy" },
          ])
        )}
      />
      <LegalDocument
        title={dict.legal.privacy.title}
        intro={dict.legal.privacy.intro}
        updatedLabel={dict.legal.updated}
        updatedDate={dict.legal.updatedDate}
        sections={dict.legal.privacy.sections}
        contact={{ heading: dict.legal.contactHeading, body: dict.legal.privacy.contact }}
      />
    </>
  );
}
