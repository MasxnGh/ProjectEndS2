import type { Metadata, Viewport } from "next";
import { Trirong, Anuphan, IBM_Plex_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { PwaRegister } from "@/components/pwa-register";
import { locales, isLocale, getDictionary } from "@/i18n";
import { SITE_URL } from "@/lib/site";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { FavoritesProvider } from "@/lib/favorites/favorites-provider";

/*
 * Both scripts come from one foundry.
 *
 * This replaces four faces — Fraunces and Inter for Latin, Noto Serif Thai and
 * IBM Plex Sans Thai for Thai — which meant every bilingual line was set in two
 * unrelated designs. Trirong and Anuphan are drawn by Cadson Demak with Thai
 * and Latin together, so each loads one file covering both and the pairing is
 * the designers' own rather than ours. It also drops two font downloads.
 */
const trirong = Trirong({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-trirong",
  display: "swap",
});

const anuphan = Anuphan({
  subsets: ["latin", "thai"],
  variable: "--font-anuphan",
  display: "swap",
});

/** Figures only — distances, prices, opening hours, coordinates. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#171613" },
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${trirong.variable} ${anuphan.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
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
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
                  >
                    Skip to content
                  </a>
                  <NavBar />
                  <main id="main-content">{children}</main>
                  <Footer />
                  <PwaRegister />
                </SmoothScrollProvider>
                </FavoritesProvider>
              </ToastProvider>
            </LocaleProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
