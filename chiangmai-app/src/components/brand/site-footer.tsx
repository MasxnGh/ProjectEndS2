import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { CONTACT_EMAIL } from "@/lib/site";
import { cx } from "./cx";
import { CATEGORY_ORDER } from "./icons";
import { Logo } from "./logo";
import { Wrap } from "./surface";

/** On the forest band the green focus ring would vanish, so it turns sand here. */
const footerFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cmj-sand";

/**
 * The site footer on the forest band: the sand logo and the line the site
 * stands for, then the site map in three columns (two on a phone), then who made it and whose
 * data it shows. The weather and map credits are licence terms, so they live
 * here, on every page.
 */
export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const home = `/${locale}`;
  // Thai readers count years in the Buddhist era.
  const year = new Date().getFullYear() + (locale === "th" ? 543 : 0);

  const columns = [
    {
      heading: dict.shell.footerExplore,
      links: CATEGORY_ORDER.slice(0, 5).map((category) => ({
        href: `${home}/explore?category=${category}`,
        label: dict.common.categories[category],
      })),
    },
    {
      heading: dict.shell.footerPlan,
      links: [
        { href: `${home}/planner`, label: dict.nav.planner },
        { href: `${home}/my-trips`, label: dict.myTrips.navLabel },
        { href: `${home}/favorites`, label: dict.favorites.navLabel },
        { href: `${home}/account`, label: dict.account.navLabel },
      ],
    },
    {
      heading: dict.shell.footerAbout,
      links: [
        { href: `${home}/about`, label: dict.nav.about },
        { href: `${home}/guides`, label: dict.nav.guides },
        { href: `${home}/credits`, label: dict.credits.navLabel },
        { href: `${home}/privacy`, label: dict.footer.privacy },
        { href: `${home}/terms`, label: dict.footer.terms },
      ],
    },
  ];

  return (
    <footer data-brand className="no-print bg-forest font-brand text-on-forest">
      {/* Two columns of links on a phone: in one, fourteen 44px rows made the
          footer three screens long. */}
      <Wrap className="grid grid-cols-2 gap-x-6 gap-y-8 pt-16 pb-8 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-6">
        <div className="col-span-2 md:col-span-1">
          <Logo href={home} label={dict.ui.logoHome} tone="sand" className={footerFocus} />
          <p className="mt-4 max-w-[32ch] text-body text-pretty text-on-forest-soft">{dict.shell.tagline}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            {/* h2: beside the page's own content these are top-level groups. */}
            <h2 className="mb-2 text-[1rem] leading-[1.4] font-semibold">{column.heading}</h2>
            <ul className="grid gap-0.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cx(
                      "inline-flex min-h-11 items-center rounded-sm text-label font-normal text-on-forest-soft transition-colors duration-150 ease-brand hover:text-on-forest md:min-h-9",
                      footerFocus,
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Wrap>
      <Wrap>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-cmj-paper/14 py-6 text-small text-on-forest-soft">
          <span>
            © {year} Chiangmai Journey · {dict.shell.madeAt}
          </span>
          <span>
            {dict.shell.contact}{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={cx(
                "rounded-sm text-on-forest underline decoration-[1px] underline-offset-4 hover:decoration-2",
                footerFocus,
              )}
            >
              {CONTACT_EMAIL}
            </a>
          </span>
          <span>{dict.shell.dataCredit}</span>
        </div>
      </Wrap>
    </footer>
  );
}
