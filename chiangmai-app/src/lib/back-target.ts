/**
 * Where the header's back button goes when there is no earlier page on this
 * site to return to (you arrived from a search, a shared link, or a new tab).
 * A place belongs to Explore and a guide to the guides list; everything else
 * sits under home.
 */
export function parentPath(pathname: string, locale: string): string {
  const home = `/${locale}`;
  if (!pathname.startsWith(`${home}/`)) return home;
  const [section, slug] = pathname.slice(home.length + 1).split("/");
  if (section === "place" && slug) return `${home}/explore`;
  if (section === "guides" && slug) return `${home}/guides`;
  return home;
}
