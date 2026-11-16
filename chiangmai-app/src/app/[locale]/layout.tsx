import type { Metadata, Viewport } from "next";
import { Prompt, Allura } from "next/font/google";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { SiteHeader } from "@/components/brand/site-header";
import { NavProgress } from "@/components/brand/nav-progress";
import { Intro } from "@/components/brand/intro";
import { IntroControl } from "@/components/brand/intro-control";
import { introScript } from "@/lib/intro";
import { SiteFooter } from "@/components/brand/site-footer";
import { places } from "@/data/places";
import type { PlaceCategory } from "@/data/types";
import { PwaRegister } from "@/components/pwa-register";
import { locales, isLocale, getDictionary } from "@/i18n";
import { SITE_URL } from "@/lib/site";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { FavoritesProvider } from "@/lib/favorites/favorites-provider";

/*
 * The rebuild's faces (DESIGN.md). Prompt covers Thai and Latin in one family;
 * the three weights are the only ones the design uses. Allura sets a single
 * Latin script line on a few pages, so it is not preloaded on every route.
 */
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  variable: "--font-prompt",
  display: "swap",
});

const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-allura",
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.titleSuffix, template: `%s — ${dict.meta.siteName}` },
    description: dict.home.intro.body,
    alternates: {
      languages: { en: "/en", th: "/th" },
    },
    openGraph: {
      title: dict.meta.titleSuffix,
      description: dict.home.intro.body,
      locale: locale === "th" ? "th_TH" : "en_US",
      type: "website",
      siteName: dict.meta.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.titleSuffix,
      description: dict.home.intro.body,
    },
    robots: { index: true, follow: true },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: dict.meta.siteName,
    },
  };
}

export const viewport: Viewport = {
  // The header's own surface, so the browser bar runs into it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#172a27" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  // Counted here, on the server, so the header's Explore menu shows real
  // numbers without the place catalogue shipping to the browser.
  const counts = {} as Record<PlaceCategory, number>;
  for (const place of places) counts[place.category] = (counts[place.category] ?? 0) + 1;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${prompt.variable} ${allura.variable}`}
    >
      <body className="min-h-dvh bg-page text-ink antialiased">
        {/*
          A raw <script>, on purpose.

          React logs "Encountered a script tag while rendering React component"
          for this in development. Two things are worth knowing before anyone
          tries to silence it.

          **When it actually fires.** Not on page load, and not on in-app
          navigation within one locale — only when switching language, because
          `router.push()` in LocaleToggle re-renders this `[locale]` layout on
          the client and re-creates the element. (ThemeProvider already
          compensates for the same re-render by re-applying the theme class in
          a layout effect.) The warning is also development-only: the string
          lives in react-dom-client.development.js and is absent from the
          production build, so it never reaches a user.

          **What does not work.** `next/script` with
          `strategy="beforeInteractive"` looks like the answer and is worse:
          Next serialises an inline script of that strategy into a queue —

            <script>(self.__next_s=self.__next_s||[]).push([0,{"children":"…"}])</script>

          — drained by its runtime after boot, i.e. after first paint, so every
          dark-theme visitor would see a white flash. Moving this into <head>
          does not help either; React reconciles the element wherever it sits.
          Giving it a non-JavaScript `type` silences React (see
          isScriptDataBlock in react-dom) but stops the browser executing it.

          The narrow fix, if the warning ever becomes worth removing, is to let
          LocaleToggle do a full navigation instead of a client-side push.

          `suppressHydrationWarning` is separate: the script mutates
          documentElement before React hydrates, so the class it adds would
          otherwise be reported as a server/client mismatch.
        */}
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`,
          }}
        />
        {/* The first-visit intro decides before the first paint whether to
            play (lib/intro.ts), so the page never shows and then gets covered.
            A raw <script> for the same reasons as theme-init above. The intro
            itself sits first in <body>, outside every provider, so nothing on
            the page can rise above it. */}
        <script id="intro-init" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: introScript(locales) }} />
        <Intro />
        <MotionProvider>
        <AuthSessionProvider>
          <ThemeProvider>
            <LocaleProvider locale={locale} dict={dict}>
              <ToastProvider>
                {/* Inside ToastProvider and LocaleProvider: it reports failed
                    saves through toasts in the reader's language. */}
                <FavoritesProvider>
                <SmoothScrollProvider>
                  <a
                    href="#main-content"
                    data-brand
                    className="sr-only rounded-full bg-brand font-brand text-label text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:px-5 focus:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {dict.shell.skip}
                  </a>
                  <NavProgress />
                  <IntroControl />
                  <SiteHeader counts={counts} total={places.length} />
                  <main id="main-content">{children}</main>
                  <SiteFooter locale={locale} dict={dict} />
                  <PwaRegister />
                </SmoothScrollProvider>
                </FavoritesProvider>
              </ToastProvider>
            </LocaleProvider>
          </ThemeProvider>
        </AuthSessionProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
