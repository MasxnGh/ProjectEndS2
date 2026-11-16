/**
 * Whether following a link leaves this page for another page of the site, so
 * the page line (components/brand/nav-progress.tsx) should run. Pure, so the
 * rules can be tested without a browser.
 *
 * It does not run for: other sites, new tabs or windows, downloads, a link to
 * the page already open (the same path, whatever its query or #fragment —
 * those are filters and anchors, handled in place), or anything that is not
 * an http(s) link (mailto:, tel:, javascript:).
 */
export function leavesPage(
  link: { href: string; target?: string | null; download?: boolean },
  current: string,
): boolean {
  if (link.download) return false;
  if (link.target && link.target !== "_self") return false;
  let from: URL;
  let to: URL;
  try {
    from = new URL(current);
    to = new URL(link.href, from);
  } catch {
    return false;
  }
  if (to.protocol !== "http:" && to.protocol !== "https:") return false;
  if (to.origin !== from.origin) return false;
  return to.pathname !== from.pathname;
}
