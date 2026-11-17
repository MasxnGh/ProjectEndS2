/** A placeholder origin; a path that resolves anywhere else is not a path on this site. */
const BASE = "http://same-site.invalid";

/**
 * Where to send someone after signing in, taken from a `callbackUrl` query
 * value that anyone can write into a link. Only a path on this site gets
 * through; anything else becomes `fallback`.
 *
 * "Starts with a slash" is not enough: browsers read `//example.com` and
 * `/\example.com` as another site, and drop tabs and newlines inside a URL
 * (`/\t/example.com`), so a link to our own sign-in page could send a
 * signed-in visitor straight to a look-alike page elsewhere. Resolving the
 * value the way a browser would and checking it stayed on this origin covers
 * all of those at once.
 */
export function safeCallbackPath(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
