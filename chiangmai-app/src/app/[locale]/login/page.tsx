import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth-safe";
import { isLocale, getDictionary } from "@/i18n";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { LoginBackdrop } from "@/components/auth/login-backdrop";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { buildPageMetadata } from "@/lib/seo";

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
    path: "/login",
    title: dict.auth.login.title,
    description: dict.auth.login.intro,
  });
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const { callbackUrl } = await searchParams;

  const session = await safeAuth();
  const safeCallbackUrl =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : `/${loc}/planner`;
  if (session) {
    redirect(safeCallbackUrl);
  }

  return (
    <div className="relative isolate mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 lg:px-10">
      <LoginBackdrop />
      <Reveal>
        <SectionHeading as="h1" kicker={dict.auth.login.kicker} title={dict.auth.login.title} />
        <p className="mt-6 text-base leading-relaxed text-muted-foreground text-pretty">
          {dict.auth.login.intro}
        </p>

        <div className="mt-8">
          <GoogleSignInButton
            label={dict.auth.login.googleCta}
            loadingLabel={dict.auth.login.googleCtaLoading}
            callbackUrl={safeCallbackUrl}
          />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground text-pretty">
          {dict.auth.login.consentPrefix}{" "}
          <Link href={`/${loc}/privacy`} className="underline underline-offset-2 hover:text-accent-text">
            {dict.footer.privacy}
          </Link>
          {dict.auth.login.consentSuffix}
        </p>
      </Reveal>
    </div>
  );
}
