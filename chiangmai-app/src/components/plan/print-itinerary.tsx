"use client";

import { Fragment, useEffect, useMemo, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Place } from "@/data/types";
import type { DayTimeline } from "@/lib/planner/golden-hour";
import { minutesToClock } from "@/lib/opening-hours";
import { buildSchedule } from "@/lib/planner/schedule";
import { suggestPackingItems } from "@/lib/planner/packing-suggestions";
import { farthestWalkLeg } from "@/lib/planner/walk-check";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";
import { googleMapsPlaceUrl } from "@/lib/google-maps";
import { categorySpendBreakdown, dayStats, estimateTripCostThb, placeSpendThb } from "@/lib/trip-calculations";
import { useTripStore } from "@/lib/trip-store";
import { useLocale } from "@/components/providers/locale-provider";
import { BrandMark } from "@/components/brand/logo";
import { fill, formatDistance, formatDuration, placeWhere } from "@/components/brand/place-text";
import { dayMapsLink } from "./maps-link";
import { shareUrlFor } from "./finish-section";
import { QrSvg } from "./qr-svg";
import { baht, dayCountLabel, fullDayDate, madeOnDate, placeCountLabel, shortDayDate, stopsLabel, tripRange } from "./plan-text";

/** A hop at least this long is marked on paper as a long drive. */
const LONG_LEG_MINUTES = 60;
/** Same line as the place page's elevation note: from here a place is noticeably cooler than town. */
const COOLER_FROM_M = 1000;
/** Past this the share link's QR code gets too dense to scan off paper, so the summary leaves it out. */
const SHARE_QR_MAX_CHARS = 1400;
/** National numbers, the same anywhere in Thailand. */
const EMERGENCY = [
  { number: "1155", key: "touristPolice" },
  { number: "1669", key: "medical" },
  { number: "191", key: "police" },
] as const;

/** A string as a CSS string literal, safe inside a <style> element. */
function cssString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").replace(/</g, "\\3c ")}"`;
}

/** "หน้า {page} / {pages}" as CSS `content`: the slots become page counters. */
function pageCounterContent(template: string): string {
  return template
    .split(/(\{page\}|\{pages\})/)
    .filter(Boolean)
    .map((part) => (part === "{page}" ? "counter(page)" : part === "{pages}" ? "counter(pages)" : cssString(part)))
    .join(" ");
}

function Sep() {
  return <span className="tp-sep">·</span>;
}

/** Parts of one line, with a quiet dot between them. */
function Line({ parts }: { parts: ReactNode[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <Sep /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}

export interface PrintDay {
  dayNumber: number;
  date?: string;
  timeline: DayTimeline;
}

/**
 * What "Print or PDF" puts on paper, in place of the interactive planner
 * (which carries print:hidden): a summary sheet — the trip, the numbers, the
 * days at a glance, the money and what to pack — then one sheet per day.
 *
 * Nothing here is worked out afresh. Times are each day's own timeline, the
 * one the screen shows; the money goes through the same functions as the
 * Budget panel; distances and hop times are the planner's estimates.
 */
export function PrintItinerary({ tripName, days }: { tripName: string; days: PrintDay[] }) {
  const { locale, dict } = useLocale();
  const t = dict.plan.print;
  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const travelMode = useTripStore((s) => s.travelMode);
  const packingItems = useTripStore((s) => s.packingItems);
  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);

  const title = tripName || dict.plan.untitled;

  // Saving as PDF names the file after the page title: make it the trip's
  // name for as long as the print dialog is open.
  useEffect(() => {
    let saved: string | null = null;
    const before = () => {
      saved = document.title;
      document.title = title;
    };
    const after = () => {
      if (saved !== null) document.title = saved;
      saved = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [title]);

  const shareUrl = useMemo(() => {
    const url = shareUrlFor(dayIds, containers);
    return url.length <= SHARE_QR_MAX_CHARS ? url : null;
  }, [dayIds, containers]);

  const plan = useMemo(() => {
    const all = days.map((day) => {
      const places = day.timeline.stops.map((stop) => stop.place);
      return { ...day, places, stats: dayStats(places), km: buildSchedule(places).totalDistanceKm };
    });
    const breakdown = categorySpendBreakdown(all, travelMode);
    return {
      used: all.filter((day) => day.places.length > 0),
      breakdown,
      total: estimateTripCostThb(breakdown, travelers, accommodationThb),
    };
  }, [days, travelMode, travelers, accommodationThb]);

  const { used, breakdown, total } = plan;
  const people = travelers === 1 ? dict.plan.travellersOne : fill(dict.plan.travellers, { count: travelers });
  const perHead = (amount: number) => fill(t.perHead, { amount: baht(amount), people });
  const stopCount = used.reduce((n, day) => n + day.places.length, 0);
  const roadMinutes = used.reduce((n, day) => n + day.stats.travelMinutes, 0);
  const roadKm = used.reduce((n, day) => n + day.km, 0);
  const hasBudget = budgetThb > 0;
  const remaining = budgetThb - total;
  const firstDate = used[0]?.date;
  const lastDate = used[used.length - 1]?.date;
  const modeLabel = dict.planner.summary.transport.modes[travelMode];

  const packingLabels = dict.planner.summary.packing.items;
  const listed = new Set(packingItems.map((item) => item.labelKey).filter(Boolean));
  const packing = [
    ...packingItems.map((item) => ({
      id: item.id,
      label: item.labelKey ? packingLabels[item.labelKey as keyof typeof packingLabels] : (item.label ?? ""),
      checked: item.checked,
    })),
    ...suggestPackingItems(used.flatMap((day) => day.places))
      .filter((id) => !listed.has(id))
      .map((id) => ({ id, label: packingLabels[id], checked: false })),
  ].filter((item) => item.label);

  const moneyRows = [
    { key: "entry", label: dict.planner.summary.budget.categories.entry, note: perHead(breakdown.entry), amount: breakdown.entry * travelers },
    {
      key: "transport",
      label: dict.planner.summary.budget.categories.transport,
      note: fill(t.transportNote, { mode: modeLabel }),
      amount: breakdown.transport,
    },
    { key: "food", label: dict.planner.summary.budget.categories.food, note: perHead(breakdown.food), amount: breakdown.food * travelers },
    ...(breakdown.assumedMeals > 0
      ? [
          {
            key: "meals",
            label: dict.planner.summary.budget.categories.assumedMeals,
            note: perHead(breakdown.assumedMeals),
            amount: breakdown.assumedMeals * travelers,
          },
        ]
      : []),
    ...(accommodationThb > 0
      ? [{ key: "stay", label: dict.planner.summary.budget.accommodation, note: t.stayNote, amount: accommodationThb }]
      : []),
  ];

  const pageCss = `@page {
  margin: 14mm 15mm 17mm;
  @top-left { content: ""; }
  @top-right { content: ""; }
  @bottom-left { content: ${cssString(`Chiangmai Journey · ${title}`)}; font: 400 7.5pt var(--font-prompt), sans-serif; color: #4f5a57; }
  @bottom-right { content: ${pageCounterContent(t.pageOf)}; font: 400 7.5pt var(--font-prompt), sans-serif; color: #4f5a57; }
}`;

  return (
    <article data-brand className="trip-print hidden font-brand print:block">
      {/* Empty top boxes: with Chrome's "Headers and footers" ticked, its own date and page title would print there. */}
      <style>{pageCss}</style>

      <header className="tp-masthead">
        <div className="tp-brand">
          <BrandMark />
          <span lang="en" className="tp-wordmark">
            Chiangmai
            <span>Journey</span>
          </span>
        </div>
        <p className="tp-kind">
          <strong>{t.kind}</strong>
          {fill(t.made, { date: madeOnDate(locale) })}
        </p>
      </header>

      <div className="tp-cover">
        <div>
          <h1>{title}</h1>
          <p className="tp-trip-line">
            <Line
              parts={[
                firstDate && lastDate ? tripRange(firstDate, lastDate, locale) : null,
                dayCountLabel(days.length, dict),
                people,
                modeLabel,
              ].filter(Boolean)}
            />
          </p>
        </div>
        {shareUrl && stopCount > 0 ? (
          <div className="tp-qr-block tp-share">
            <QrSvg value={shareUrl} />
            <span>{t.shareQr}</span>
          </div>
        ) : null}
      </div>

      {stopCount > 0 ? (
        <>
          <dl className="tp-facts">
            <div>
              <dt>{t.facts.stops}</dt>
              <dd>{placeCountLabel(stopCount, dict)}</dd>
            </div>
            <div>
              <dt>{t.facts.road}</dt>
              <dd>
                {formatDuration(roadMinutes, dict)}
                <small>{fill(t.facts.roadKm, { km: formatDistance(roadKm, dict) })}</small>
              </dd>
            </div>
            <div>
              <dt>{t.facts.cost}</dt>
              <dd>
                {baht(total)}
                <small>{fill(accommodationThb > 0 ? t.facts.costNote : t.facts.costNoteNoStay, { people })}</small>
              </dd>
            </div>
            <div>
              <dt>{t.facts.budget}</dt>
              <dd>
                {hasBudget ? baht(budgetThb) : "—"}
                <small>
                  {!hasBudget ? (
                    dict.plan.budgetNone
                  ) : remaining < 0 ? (
                    <b>
                      <span aria-hidden className="tp-mark-dot" />
                      {fill(t.facts.over, { amount: baht(-remaining) })}
                    </b>
                  ) : (
                    fill(t.facts.left, { amount: baht(remaining) })
                  )}
                </small>
              </dd>
            </div>
          </dl>

          <h2 className="tp-section">{t.overview}</h2>
          <table className="tp-overview">
            <thead>
              <tr>
                <th scope="col">{t.columns.day}</th>
                <th scope="col">{t.columns.time}</th>
                <th scope="col">{t.columns.route}</th>
                <th scope="col">{t.columns.road}</th>
              </tr>
            </thead>
            <tbody>
              {used.map((day) => {
                const stops = day.timeline.stops;
                return (
                  <tr key={day.dayNumber}>
                    <th scope="row">
                      {fill(dict.plan.days.tab, { day: day.dayNumber })}
                      {day.date ? <small>{shortDayDate(day.date, locale)}</small> : null}
                    </th>
                    <td className="tp-num">
                      {minutesToClock(stops[0].arrivalMinutes)} – {minutesToClock(stops[stops.length - 1].departureMinutes)}
                    </td>
                    <td>{day.places.map((place) => place.name[locale]).join(" → ")}</td>
                    <td className="tp-num">
                      {day.places.length > 1 ? (
                        <>
                          {formatDuration(day.stats.travelMinutes, dict)}
                          <small>{formatDistance(day.km, dict)}</small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="tp-cols">
            <section>
              <h2 className="tp-block-title">{t.money}</h2>
              <table className="tp-money">
                <tbody>
                  {moneyRows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {row.label}
                        <small>{row.note}</small>
                      </td>
                      <td>{baht(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="tp-total">
                    <td>{t.total}</td>
                    <td>{baht(total)}</td>
                  </tr>
                  {hasBudget ? (
                    <>
                      <tr className="tp-after">
                        <td>{dict.planner.summary.budget.setBudget}</td>
                        <td>{baht(budgetThb)}</td>
                      </tr>
                      <tr className={remaining < 0 ? "tp-after tp-over" : "tp-after"}>
                        <td>
                          {remaining < 0 ? <span aria-hidden className="tp-mark-dot" /> : null}
                          {remaining < 0 ? dict.planner.summary.budget.overBudget : dict.planner.summary.budget.remaining}
                        </td>
                        <td>{baht(Math.abs(remaining))}</td>
                      </tr>
                    </>
                  ) : null}
                </tbody>
              </table>
              <p className="tp-fine">{t.moneyNote}</p>
            </section>

            <section>
              <h2 className="tp-block-title">{t.packing}</h2>
              <ul className="tp-check">
                {packing.map((item) => (
                  <li key={item.id}>
                    <span aria-hidden className="tp-box">
                      {item.checked ? <Check strokeWidth={3} /> : null}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="tp-sos">
            <h2>{t.emergency}</h2>
            <dl>
              {EMERGENCY.map((line) => (
                <div key={line.number}>
                  <dt>{line.number}</dt>
                  <dd>{t.emergencyList[line.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      ) : null}

      {used.map((day) => (
        <PrintDaySheet key={day.dayNumber} day={day} />
      ))}
    </article>
  );
}

function PrintDaySheet({ day }: { day: PrintDay & { places: Place[]; stats: ReturnType<typeof dayStats>; km: number } }) {
  const { locale, dict } = useLocale();
  const t = dict.plan.print;
  const travelMode = useTripStore((s) => s.travelMode);
  const stops = day.timeline.stops;
  const route = dayMapsLink(day.places, dict);
  const farWalk = farthestWalkLeg(day.places, travelMode);
  const dayLabel = fill(dict.plan.days.tab, { day: day.dayNumber });
  const perPerson = (amount: number) => fill(dict.plan.stats.perPerson, { amount: baht(amount) });

  return (
    <section className="tp-day">
      <header className="tp-day-head">
        <div>
          {day.date ? <p className="tp-day-no">{dayLabel}</p> : null}
          <h2>{day.date ? fullDayDate(day.date, locale) : dayLabel}</h2>
          <p className="tp-day-sum">
            <Line
              parts={[
                `${minutesToClock(stops[0].arrivalMinutes)} – ${minutesToClock(stops[stops.length - 1].departureMinutes)}`,
                stopsLabel(stops.length, dict),
                stops.length > 1
                  ? fill(t.dayRoad, { duration: formatDuration(day.stats.travelMinutes, dict), km: formatDistance(day.km, dict) })
                  : null,
                day.stats.budgetThb > 0 ? perPerson(day.stats.budgetThb) : null,
                day.timeline.leaveByMinutes !== null
                  ? fill(dict.planner.goldenHour.leaveBy, { time: minutesToClock(day.timeline.leaveByMinutes) })
                  : null,
                day.date
                  ? fill(t.sun, { rise: minutesToClock(day.timeline.sun.sunriseMinutes), set: minutesToClock(day.timeline.sun.sunsetMinutes) })
                  : null,
              ].filter(Boolean)}
            />
          </p>
          {farWalk ? (
            <p className="tp-flag">
              {fill(dict.plan.farWalk, {
                from: farWalk.from.name[locale],
                to: farWalk.to.name[locale],
                km: formatDistance(farWalk.distanceKm, dict),
                walk: formatDuration(farWalk.walkMinutes, dict),
              })}
            </p>
          ) : null}
        </div>
        {route ? (
          <a href={route.href} className="tp-qr-block tp-day-qr">
            <QrSvg value={route.href} />
            <span>{route.label}</span>
          </a>
        ) : null}
      </header>

      <ol className="tp-stops">
        {stops.map((stop, i) => {
          const place = stop.place;
          const prev = i > 0 ? stops[i - 1].place : null;
          const spend = placeSpendThb(place);
          const dress = place.dressCode;
          const dressDetail =
            dress && (dress.coverShoulders || dress.coverKnees)
              ? fill(t.dress, {
                  dress: dict.placePage.dress,
                  detail:
                    dress.coverShoulders && dress.coverKnees
                      ? dict.placePage.dressDetail.both
                      : dress.coverShoulders
                        ? dict.placePage.dressDetail.shoulders
                        : dict.placePage.dressDetail.knees,
                })
              : null;
          const details = [
            fill(dict.plan.open, { hours: place.openingHoursText[locale] }),
            dressDetail,
            dress?.removeShoes ? dict.placePage.shoes : null,
            place.requiresBooking ? <b key="booking">{dict.placePage.booking}</b> : null,
          ].filter(Boolean);
          const flags = [
            stop.outsideOpeningHours ? dict.planner.route.outsideHours : null,
            stop.conflict ? dict.planner.goldenHour.conflict : null,
            stop.waitMinutes > 0 ? fill(dict.plan.wait, { duration: formatDuration(stop.waitMinutes, dict) }) : null,
          ].filter(Boolean);
          const meta = [
            dict.common.categories[place.category],
            placeWhere(place, dict),
            place.elevation !== null && place.elevation >= COOLER_FROM_M
              ? fill(dict.placePage.elevation, { m: place.elevation.toLocaleString(locale === "th" ? "th-TH" : "en-GB") })
              : null,
          ].filter(Boolean);
          const isLong = stop.travelMinutesFromPrevious >= LONG_LEG_MINUTES;

          return (
            <Fragment key={`${place.slug}-${i}`}>
              {prev ? (
                <li className={isLong ? "tp-leg tp-long" : "tp-leg"}>
                  <p>
                    {fill(dict.plan.leg, { duration: formatDuration(stop.travelMinutesFromPrevious, dict) })}
                    <Sep />
                    {formatDistance(estimateRoadDistanceKm(prev.coordinates, place.coordinates, terrainBetween(prev, place)), dict)}
                    {isLong ? <b>{t.longLeg}</b> : null}
                  </p>
                </li>
              ) : null}
              <li className="tp-stop">
                <div className="tp-when">
                  <span className="tp-time">{minutesToClock(stop.arrivalMinutes)}</span>
                  <span>– {minutesToClock(stop.departureMinutes)}</span>
                  <span>{formatDuration(stop.departureMinutes - stop.arrivalMinutes, dict)}</span>
                  {stop.userLocked ? <span>{dict.plan.locked}</span> : null}
                </div>
                <div className="tp-what">
                  <div className="tp-row1">
                    <h3>
                      <a href={googleMapsPlaceUrl(place)}>{place.name[locale]}</a>
                    </h3>
                    <span className="tp-cost">{spend > 0 ? perPerson(spend) : t.free}</span>
                  </div>
                  <p className="tp-meta">{meta.join(" · ")}</p>
                  <p className="tp-desc">{place.shortDescription[locale]}</p>
                  <p className="tp-details">
                    <Line parts={details} />
                  </p>
                  {dress?.note ? <p className="tp-details">{dress.note[locale]}</p> : null}
                  {flags.length > 0 ? <p className="tp-flag">{flags.join(" · ")}</p> : null}
                  {place.localTip[locale] ? (
                    <p className="tp-tip">
                      <b>{t.tip}</b>
                      {place.localTip[locale]}
                    </p>
                  ) : null}
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}
