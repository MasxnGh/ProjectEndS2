// Resolution order:
// 1. SITE_URL — set this once a custom production domain is live.
// 2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable production domain
//    (the *.vercel.app URL, unaffected by preview deploys), auto-populated
//    on every Vercel build. Used so canonical/OG/sitemap URLs are always
//    real and crawlable instead of pointing at a placeholder domain.
// 3. localhost — local dev only, never deployed.
function resolveSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
