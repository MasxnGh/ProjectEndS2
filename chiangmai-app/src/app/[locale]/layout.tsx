import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { locales, isLocale, getDictionary } from "@/i18n";
import { SITE_URL } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-thai",
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
      className={`${fraunces.variable} ${inter.variable} ${plexThai.variable} ${notoSerifThai.variable}`}
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <LocaleProvider locale={locale} dict={dict}>
            <ToastProvider>
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
              </SmoothScrollProvider>
            </ToastProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
