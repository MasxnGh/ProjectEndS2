import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Map as MapIcon,
  MapPin,
  Printer,
  Route,
  Share2,
  type LucideIcon,
} from "lucide-react";
import type { Place } from "@/data/types";
import type { Guide } from "@/data/types";
import type { Dictionary, Locale } from "@/i18n";
import type { DaySchedule } from "@/lib/planner/schedule";
import { ButtonLink } from "@/components/brand/button";
import { CategoryTile } from "@/components/brand/category-tile";
import { ChipLink, ChipRow } from "@/components/brand/chip";
import { cx } from "@/components/brand/cx";
import { CATEGORY_ORDER, categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { Phrases } from "@/components/brand/phrases";
import { PlaceCardFor } from "@/components/brand/place-card";
import { PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { fill, formatDuration, placeMeta, placeWhere } from "@/components/brand/place-text";
import { SearchField } from "@/components/brand/search-field";
import { SectionHeading } from "@/components/brand/section-heading";
import { Wrap } from "@/components/brand/surface";
import { GuideCover } from "@/components/guides/guide-cover";
import { BlurFade } from "@/components/magicui/blur-fade";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Reveal } from "@/components/magicui/reveal";
import { TextAnimate } from "@/components/magicui/text-animate";
import { CategoryRail } from "./category-rail";
import { ThaiName } from "@/components/brand/thai-name";

/*
 * The home page, top to bottom: arrive (hero and search), choose a kind of
 * trip, see a few places we stand behind, see what the planner does with a
 * real day, read before you go, and leave on the board's last line.
 *
 * Photographs here are dark under a fixed green scrim in both themes, so text
 * on them is always paper, never the theme's ink.
 */

/** On a photograph or the forest band the green focus ring would vanish. */
const lightFocus = "focus-visible:outline-cmj-paper";

type Props = { locale: Locale; dict: Dictionary };

export function HomeHero({
  locale,
  dict,
  total,
  hero,
  photo,
}: Props & { total: number; hero: Place; /** The hero's own photo key (data/home-hero.ts). */ photo: string }) {
  const t = dict.homepage;
  const explore = `/${locale}/explore`;
  const quick = ["nature", "temple", "cafe", "market"] as const;
  return (
    <section aria-label={t.heroLabel} className="pt-3 sm:pt-4">
      <Wrap>
        <div className="relative isolate grid min-h-[620px] grid-rows-[1fr_auto] items-end overflow-hidden rounded-lg text-cmj-paper sm:min-h-[clamp(560px,78svh,760px)] sm:rounded-xl">
          {/* The arrival (DESIGN.md, "Motion"): the photograph settles like a
              camera coming to rest while the title rises out of a soft blur,
              then the subtitle, the search and the chips. CSS keyframes only,
              so none of it waits for scripts, and the photo (the page's
              largest paint) is never hidden: it only scales. */}
          <div className="cmj-settle absolute inset-0 -z-20">
            {/* A photograph taken at golden hour, so the shared warm grade is
                enough: the golden grade's added glow is for overcast photos.
                Phone: the right of the frame, where the light is. Wider: low,
                so both pagodas stand on the ridge. */}
            <PlacePhoto
              slug={photo}
              alt={t.heroAlt}
              sizes="(max-width: 1344px) calc(100vw - 32px), 1280px"
              eager
              className="[&_img]:object-[85%_50%] sm:[&_img]:object-[60%_85%]"
            />
          </div>
          {/* The scrim is the board's deep green (#142a27). Phone and tablet:
              the words sit over most of the photo, so it is nearly even (a
              side-only scrim left the subtitle at 1.8:1 over the sunset at
              640px). From a laptop up: the words keep to the left and the
              right of the photo stays open. Written out in full because
              Tailwind only sees literal class names. */}
          <div
            aria-hidden
            className={cx(
              "absolute inset-0 -z-10",
              "bg-[image:linear-gradient(0deg,rgb(20_42_39/0.92)_0%,rgb(20_42_39/0.84)_62%,rgb(20_42_39/0.35)_100%)]",
              "lg:bg-[image:linear-gradient(90deg,rgb(20_42_39/0.9)_0%,rgb(20_42_39/0.84)_40%,rgb(20_42_39/0.36)_60%,rgb(20_42_39/0)_76%),linear-gradient(0deg,rgb(20_42_39/0.55)_0%,rgb(20_42_39/0)_40%)]",
            )}
          />
          {/* 704px from lg: with the 64px side padding there, 640 left the four
              chips 47px short of one row, so the last dropped to a line of its
              own. The title, subtitle and search keep their own narrower caps. */}
          <div className="grid min-w-0 max-w-[640px] gap-4 px-4 pt-8 pb-3 sm:px-8 sm:pt-12 sm:pb-8 lg:max-w-[704px] lg:px-16 lg:pt-24 lg:pb-16">
            <TextAnimate
              as="h1"
              by="line"
              lang="en"
              className="text-display leading-[1.02] tracking-[-0.01em] text-cmj-paper"
            >
              {"Chiangmai\nJourney"}
            </TextAnimate>
            <p className="cmj-arrive max-w-[30ch] [--cmj-delay:300ms] text-[clamp(1.125rem,1rem+0.6vw,1.375rem)] leading-[1.6] text-pretty">
              <Phrases text={fill(t.heroSub, { count: total })} />
            </p>
            <SearchField
              action={explore}
              label={dict.ui.search.label}
              placeholder={dict.ui.search.placeholder}
              submitLabel={dict.ui.search.submit}
              className="cmj-arrive mt-3 max-w-[520px] [--cmj-delay:420ms] dark:border-line-strong"
            />
            <ChipRow scroll className="cmj-arrive -mr-4 items-center [--cmj-delay:540ms] pr-4 sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
              <span className="mr-1 flex-none text-small text-cmj-paper/90">{t.tryLabel}</span>
              {quick.map((category) => (
                <ChipLink
                  key={category}
                  tone="on-photo"
                  href={`${explore}?category=${category}`}
                  className={lightFocus}
                >
                  {dict.common.categories[category]}
                </ChipLink>
              ))}
            </ChipRow>
          </div>
          {/* From a laptop up the credit sits on the open, bright side of the
              photo, so it gets its own scrim (the category tiles' 70%). Below
              that it follows the words: on a tablet the corner is where the
              category chips wrap to, and the two overlapped. */}
          <PhotoCredit
            slug={photo}
            dict={dict}
            tone="photo"
            placeName={`${hero.name[locale]} · ${t.heroWhere}`}
            className="cmj-arrive-fade px-4 pb-4 [--cmj-delay:1000ms] sm:px-8 sm:pb-6 lg:absolute lg:right-4 lg:bottom-4 lg:max-w-[46ch] lg:rounded-md lg:bg-[rgb(20_42_39/0.7)] lg:px-3 lg:py-1.5 lg:text-right"
          />
        </div>
      </Wrap>
    </section>
  );
}

export function HomeCategories({ locale, dict, counts }: Props & { counts: Record<string, number> }) {
  const t = dict.homepage;
  const explore = `/${locale}/explore`;
  return (
    <section aria-labelledby="home-categories" className="pt-16 sm:pt-24">
      <Wrap>
        <SectionHeading
          id="home-categories"
          action={
            <ButtonLink href={explore} variant="ghost" size="sm" arrow>
              {dict.ui.seeAll}
            </ButtonLink>
          }
        >
          {t.categoriesTitle}
        </SectionHeading>
        <CategoryRail nextLabel={t.railNext}>
          {CATEGORY_ORDER.map((category) => (
            <li key={category} className="snap-start">
              <CategoryTile
                category={category}
                href={`${explore}?category=${category}`}
                name={dict.common.categories[category]}
                countLabel={fill(dict.ui.placeCount, { count: counts[category] ?? 0 })}
              />
            </li>
          ))}
        </CategoryRail>
      </Wrap>
    </section>
  );
}

export function HomeFeatured({ locale, dict, picks }: Props & { picks: Place[] }) {
  const t = dict.homepage;
  const [big, ...rest] = picks;
  const bigName = big.name[locale];
  const bigHref = `/${locale}/place/${big.slug}`;
  return (
    <section aria-labelledby="home-featured" className="pt-16 sm:pt-24">
      <Wrap>
        <SectionHeading id="home-featured">{t.featuredTitle}</SectionHeading>
        <p className="-mt-3 mb-6 max-w-[60ch] text-body text-ink-soft sm:-mt-4 sm:mb-8">{t.featuredLead}</p>
        <div className="grid gap-6 lg:grid-cols-[1.08fr_1fr] lg:gap-12">
          <BlurFade as="article" className="group/big relative grid content-start gap-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:rounded-xl">
              <PlacePhoto
                slug={big.slug}
                alt={bigName}
                sizes="(max-width: 1024px) calc(100vw - 32px), 640px"
                className="transition-transform duration-500 ease-brand group-hover/big:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover/big:scale-100"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="grid min-w-0 gap-2">
                <h3 className="text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] leading-[1.35] font-semibold text-pretty text-ink">
                  <Link
                    href={bigHref}
                    className="rounded-xl outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                  >
                    {bigName}
                  </Link>
                </h3>
                <p className="max-w-[52ch] text-body text-pretty text-ink-soft">{big.shortDescription[locale]}</p>
                <p className="flex items-start gap-1.5 text-small text-ink-soft tabular-nums">
                  <MapPin aria-hidden strokeWidth={ICON_STROKE} className="mt-[3px] size-4 flex-none" />
                  {placeWhere(big, dict)} · {placeMeta(big, dict)}
                </p>
                {/* Above the stretched link, so the source link stays clickable. */}
                <PhotoCredit slug={big.slug} dict={dict} className="relative z-10" />
              </div>
              <span
                aria-hidden
                className="grid size-11 flex-none place-items-center rounded-full bg-brand text-on-brand transition-transform duration-150 ease-brand group-hover/big:translate-x-0.5 motion-reduce:transition-none"
              >
                <ArrowRight strokeWidth={ICON_STROKE} className="size-5" />
              </span>
            </div>
          </BlurFade>
          <BlurFade as="ul" stagger={0.1} delay={0.15} className="grid content-start gap-4">
            {rest.map((place) => (
              <li key={place.slug}>
                <PlaceCardFor place={place} locale={locale} dict={dict} summary={place.shortDescription[locale]} />
              </li>
            ))}
          </BlurFade>
        </div>
      </Wrap>
    </section>
  );
}

/** The board's mountain line, along the foot of the planner band. */
function Ridge() {
  return (
    <svg
      viewBox="0 0 1200 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[90px] w-full opacity-[0.08]"
    >
      <path d="M0 90V60l160-40 120 30 200-50 180 45 140-25 200 40 200-20v50z" fill="#f9f3f0" />
    </svg>
  );
}

export function HomePlanner({
  locale,
  dict,
  schedule,
  budgetThb,
}: Props & {
  /** The sample day, timed by the planner's own scheduler. */
  schedule: DaySchedule;
  /** The same day's spend estimate, from the planner's own calculation. */
  budgetThb: number;
}) {
  const t = dict.homepage;
  const tools: [LucideIcon, string][] = [
    [CalendarDays, t.tools.days],
    [MapIcon, t.tools.map],
    [Share2, t.tools.share],
    [Printer, t.tools.print],
  ];
  return (
    <section aria-labelledby="home-planner" className="pt-16 sm:pt-24">
      <Wrap>
        <div className="relative isolate -mx-2 grid gap-8 overflow-hidden rounded-lg bg-forest px-4 pt-8 pb-6 text-on-forest sm:mx-0 sm:gap-12 sm:rounded-xl sm:p-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:p-16">
          <BlurFade className="grid content-start gap-6">
            <h2 id="home-planner" className="max-w-[16ch] text-headline text-balance text-on-forest">
              <Phrases text={t.plannerTitle} />
            </h2>
            <p className="max-w-[44ch] text-body text-pretty text-on-forest-soft">{t.plannerBody}</p>
            <div>
              <ButtonLink
                href={`/${locale}/planner`}
                arrow
                className={cx("bg-cmj-sand text-cmj-green-deep hover:bg-[#f6e2c9]", "focus-visible:outline-cmj-sand")}
              >
                {t.plannerCta}
              </ButtonLink>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-4">
              {tools.map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-3 text-small text-on-forest-soft">
                  <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-cmj-paper/10 text-cmj-sand">
                    <Icon strokeWidth={ICON_STROKE} className="size-5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </BlurFade>

          {/* The sample day draws itself as it comes into view: stop one, the
              leg down to stop two, stop two, and so on, then the totals, with
              the budget counting up and an evening light running along the
              card's edge (app/motion.css, ".cmj-route"). */}
          <Reveal className="cmj-route relative z-10 rounded-lg bg-panel p-4 text-ink shadow-lift sm:p-6">
            <BorderBeam outside size={140} borderWidth={2} duration={11} fadeInDelay={schedule.stops.length * 0.7} />
            <div className="mb-4 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <h3 className="text-title text-brand">{t.sampleDay}</h3>
              <span className="text-small text-ink-soft">{t.sampleTag}</span>
            </div>
            <ol>
              {schedule.stops.map((stop, i) => {
                const name = stop.place.name[locale];
                const Icon = categoryIcon[stop.place.category];
                return (
                  <li key={stop.place.slug}>
                    {i > 0 ? (
                      <p
                        data-leg
                        style={{ "--i": i } as CSSProperties}
                        className="my-1.5 ml-[13px] flex items-center gap-2 border-l-2 border-dashed border-line-strong py-1.5 pl-[27px] text-small text-ink-soft tabular-nums">
                        <Route aria-hidden strokeWidth={ICON_STROKE} className="size-4 flex-none" />
                        {fill(t.sampleLeg, { duration: formatDuration(stop.travelMinutesFromPrevious, dict) })}
                      </p>
                    ) : null}
                    <div
                      data-stop
                      style={{ "--i": i } as CSSProperties}
                      className="grid grid-cols-[28px_56px_1fr] items-center gap-2.5 sm:grid-cols-[28px_64px_1fr] sm:gap-3">
                      <span className="grid size-7 place-items-center rounded-full bg-brand text-[0.8125rem] font-semibold text-on-brand tabular-nums">
                        {i + 1}
                      </span>
                      <div className="relative h-12 w-14 overflow-hidden rounded-sm sm:h-[52px] sm:w-16">
                        <PlacePhoto
                          slug={stop.place.slug}
                          alt=""
                          sizes="64px"
                          fallback={
                            <span className="grid size-full place-items-center bg-sand-fill text-brand">
                              <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                            </span>
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[1rem] leading-[1.4] font-medium text-pretty">
                          <ThaiName text={name} />
                        </p>
                        <p className="text-small text-ink-soft tabular-nums">
                          {stop.arrival}–{stop.departure} · {dict.common.districts[stop.place.district]}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <dl
              data-route-after
              style={{ "--i": schedule.stops.length } as CSSProperties}
              className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-small text-ink-soft tabular-nums">
              <div className="flex gap-1.5">
                <dt>{t.totalTravel}</dt>
                <dd className="font-semibold text-ink">{formatDuration(schedule.totalTravelMinutes, dict)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>{t.totalVisit}</dt>
                <dd className="font-semibold text-ink">{formatDuration(schedule.totalVisitMinutes, dict)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>{t.budgetLabel}</dt>
                <dd>
                  <span className="font-semibold text-ink">
                    ฿
                    <NumberTicker
                      value={budgetThb}
                      revealWith=".cmj-route"
                      delay={schedule.stops.length * 0.7 + 0.2}
                    />
                  </span>{" "}
                  {t.budgetUnit}
                </dd>
              </div>
            </dl>
          </Reveal>

          <Ridge />
        </div>
      </Wrap>
    </section>
  );
}

export function HomeGuides({ locale, dict, guides }: Props & { guides: Guide[] }) {
  const t = dict.homepage;
  return (
    <section aria-labelledby="home-guides" className="pt-16 sm:pt-24">
      <Wrap>
        <SectionHeading
          id="home-guides"
          action={
            <ButtonLink href={`/${locale}/guides`} variant="ghost" size="sm" arrow>
              {t.allGuides}
            </ButtonLink>
          }
        >
          {t.guidesTitle}
        </SectionHeading>
        <BlurFade as="ul" stagger={0.1} className="grid gap-8 md:grid-cols-3 md:gap-6">
          {guides.map((guide) => {
            return (
              <li key={guide.slug}>
                <article className="group/guide relative grid gap-3">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg">
                    <GuideCover guide={guide} locale={locale} dict={dict} sizes="(max-width: 768px) calc(100vw - 32px), 400px" />
                  </div>
                  <h3 className="text-title text-pretty text-ink group-hover/guide:text-brand group-hover/guide:underline group-hover/guide:decoration-[1.5px] group-hover/guide:underline-offset-4">
                    <Link
                      href={`/${locale}/guides/${guide.slug}`}
                      className="rounded-lg outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                    >
                      {guide.title[locale]}
                    </Link>
                  </h3>
                  <p className="text-[1rem] leading-[1.6] text-pretty text-ink-soft">{guide.dek[locale]}</p>
                  <p className="flex items-center gap-1.5 text-small text-ink-soft tabular-nums">
                    <BookOpen aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                    {fill(t.readTime, { minutes: guide.readMinutes })}
                  </p>
                </article>
              </li>
            );
          })}
        </BlurFade>
      </Wrap>
    </section>
  );
}

export function HomeClosing({ locale, dict, place }: Props & { place: Place }) {
  const t = dict.homepage;
  return (
    <section aria-label={t.closingLabel} className="pt-16 pb-16 sm:pt-24 sm:pb-24">
      <Wrap>
        <div className="relative isolate grid min-h-[420px] grid-rows-[1fr_auto] overflow-hidden rounded-lg text-cmj-paper sm:rounded-xl">
          <Reveal className="cmj-settle-view absolute inset-0 -z-20">
            <PlacePhoto slug={place.slug} alt="" sizes="(max-width: 1344px) calc(100vw - 32px), 1280px" />
          </Reveal>
          <div
            aria-hidden
            className={cx(
              "absolute inset-0 -z-10",
              "bg-[image:linear-gradient(rgb(20_42_39/0.84),rgb(20_42_39/0.84))]",
              "sm:bg-[image:linear-gradient(90deg,rgb(20_42_39/0.9)_0%,rgb(20_42_39/0.84)_48%,rgb(20_42_39/0.3)_78%,rgb(20_42_39/0.1))]",
            )}
          />
          <div className="grid max-w-[760px] content-center gap-4 self-center px-4 pt-12 pb-4 sm:px-8 sm:py-12 lg:p-16">
            {/* Written by hand, left to right, as it comes into view. The
                reveal watches the <p>; only the inner block is clipped (see
                .cmj-write in motion.css for why). */}
            <Reveal
              as="p"
              lang="en"
              className="cmj-write font-script text-[clamp(2.5rem,1.9rem+2.6vw,4rem)] leading-[1.15] text-cmj-paper"
            >
              <span className="cmj-write-ink block">{t.closingScript}</span>
            </Reveal>
            <BlurFade as="p" delay={0.9} className="max-w-[34ch] text-[1.125rem] leading-[1.6] text-pretty">
              <Phrases text={t.closingBody} />
            </BlurFade>
            <BlurFade delay={1.05}>
              <ButtonLink href={`/${locale}/planner`} variant="on-photo" arrow className={lightFocus}>
                {t.closingCta}
              </ButtonLink>
            </BlurFade>
          </div>
          <PhotoCredit
            slug={place.slug}
            dict={dict}
            tone="photo"
            placeName={place.name[locale]}
            className="px-4 pb-4 sm:mr-8 sm:mb-4 sm:justify-self-end sm:rounded-md sm:bg-[rgb(20_42_39/0.7)] sm:px-3 sm:py-1.5 sm:text-right"
          />
        </div>
      </Wrap>
    </section>
  );
}
