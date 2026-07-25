import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

function getPreferredLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("locale")?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const wantsThai = acceptLanguage.toLowerCase().includes("th");
  return wantsThai ? "th" : defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (pathnameHasLocale) return NextResponse.next();

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|apple-icon|sitemap.xml|robots.txt|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
