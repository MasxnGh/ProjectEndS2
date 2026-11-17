import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { safeAuth } from "@/lib/auth-safe";
import { safeCallbackPath } from "@/lib/safe-callback";
import { isLocale, getDictionary } from "@/i18n";
import { getPlaceBySlug } from "@/data/places";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { cx, focusRing } from "@/components/brand/cx";
import { BrandMark } from "@/components/brand/logo";
import { PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { Wrap } from "@/components/brand/surface";
import { buildPageMetadata } from "@/lib/seo";

/** One credited photograph beside the form on a wide screen: the hills the planner is for. */
const PHOTO_PLACE = "kew-mae-pan-nature-trail";

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
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const { callbackUrl } = await searchParams;

  const session = await safeAuth();
  const safeCallbackUrl = safeCallbackPath(callbackUrl, `/${loc}/planner`);
  if (session) {
    redirect(safeCallbackUrl);
  }

  const photo = getPlaceBySlug(PHOTO_PLACE);

  return (
    <div data-brand className="bg-page font-brand text-ink">
      <Wrap className="grid items-center gap-12 py-12 sm:py-16 lg:min-h-[calc(100dvh-72px)] lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto grid w-full max-w-[460px] justify-items-start gap-4 lg:mx-0 lg:justify-self-center">
          <BrandMark className="w-16 text-brand" />
          <h1 className="text-[clamp(2rem,1.6rem+1.8vw,2.75rem)] leading-[1.25] font-semibold text-balance text-brand">
            {dict.auth.login.title}
          </h1>
          <p className="text-body leading-[1.7] text-pretty text-ink-soft">{dict.auth.login.intro}</p>

          <GoogleSignInButton
            label={dict.auth.login.googleCta}
            loadingLabel={dict.auth.login.googleCtaLoading}
            callbackUrl={safeCallbackUrl}
            className="mt-4"
          />

          <p className="text-small text-pretty text-ink-soft">
            {dict.auth.login.consentPrefix}{" "}
            <Link
              href={`/${loc}/privacy`}
              className={cx(
                "rounded-xs font-medium text-brand underline decoration-[1.5px] underline-offset-4 hover:decoration-2",
                focusRing,
              )}
            >
              {dict.footer.privacy}
            </Link>
            {dict.auth.login.consentSuffix}
          </p>
        </div>

        {/* Wide screens only: on a phone the button should be the first thing, not below a picture. */}
        {photo ? (
          <figure className="hidden lg:block">
            <div className="relative aspect-[4/5] max-h-[calc(100dvh-72px-8rem)] w-full overflow-hidden rounded-xl">
              <PlacePhoto slug={photo.slug} alt={photo.name[loc]} sizes="(max-width: 1344px) 45vw, 600px" eager />
            </div>
            <figcaption>
              <PhotoCredit slug={photo.slug} dict={dict} placeName={photo.name[loc]} className="mt-2" />
            </figcaption>
          </figure>
        ) : null}
      </Wrap>
    </div>
  );
}
