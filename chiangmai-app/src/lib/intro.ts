/**
 * The first-visit intro on the home page (components/brand/intro.tsx).
 *
 * Whether it plays is decided by a tiny inline script before the first paint,
 * so the page never flashes before the panel covers it. It plays only when:
 * - this is the first page of the visit (a sessionStorage flag, set on every
 *   page, so someone who arrives on a place page and later opens the home
 *   page does not get an intro halfway through their visit);
 * - the page is a home page (`/th`, `/en`);
 * - the reader has not asked for reduced motion.
 * With scripts off, or storage blocked, it never plays.
 *
 * The script marks <html data-intro="play">; the CSS in app/motion.css does
 * the rest and ends the intro on its own, so it never depends on React.
 */

export const INTRO_STORAGE_KEY = "cmj-intro";

/**
 * The CSS animation that ends the intro (app/motion.css, after the panel has
 * lifted). <IntroControl> waits on it rather than keeping a clock of its own.
 */
export const INTRO_END_ANIMATION = "cmj-intro-end";

/** The inline script, for the locales in `locales`. */
export function introScript(locales: readonly string[]): string {
  const home = `^/(${locales.join("|")})/?$`;
  return `(function(){try{var s=sessionStorage,k=${JSON.stringify(INTRO_STORAGE_KEY)},seen=s.getItem(k);s.setItem(k,"1");if(seen)return;if(!new RegExp(${JSON.stringify(home)}).test(location.pathname))return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.setAttribute("data-intro","play");}catch(e){}})();`;
}
