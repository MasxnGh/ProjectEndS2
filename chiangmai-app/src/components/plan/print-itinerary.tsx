"use client";

import type { DayTimeline } from "@/lib/planner/golden-hour";
import { transitionBucket } from "@/lib/planner/narrative";
import { minutesToClock } from "@/lib/opening-hours";
import { useLocale } from "@/components/providers/locale-provider";
import { fill } from "@/components/brand/place-text";
import { longDayDate } from "./plan-text";

/**
 * What "print or PDF" puts on paper: the trip as a few lines of prose per
 * stop, in place of the interactive planner (which carries print:hidden).
 * Every time and every minute on the road is the day's own timeline — the
 * same one the screen shows — and only the joining phrases are templated.
 */
export function PrintItinerary({
  tripName,
  days,
}: {
  tripName: string;
  days: { dayNumber: number; date?: string; timeline: DayTimeline }[];
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.narrative;
  const used = days.filter((d) => d.timeline.stops.length > 0);

  return (
    <article data-brand className="hidden bg-white font-brand text-[#1d2b28] print:block">
      <h1 className="text-[28px] leading-tight font-semibold">{tripName || dict.plan.untitled}</h1>
      {used.map((day) => (
        <section key={day.dayNumber} className="mt-8 break-inside-avoid">
          <h2 className="text-[20px] font-semibold">
            {fill(dict.plan.days.tab, { day: day.dayNumber })}
            {day.date ? ` — ${longDayDate(day.date, locale)}` : ""}
          </h2>
          {day.timeline.leaveByMinutes !== null ? (
            <p className="mt-2 text-[14px]">{fill(dict.planner.goldenHour.leaveBy, { time: minutesToClock(day.timeline.leaveByMinutes) })}</p>
          ) : null}
          {day.timeline.stops.map((stop, i) => (
            <p key={`${stop.place.slug}-${i}`} className="mt-3 text-[15px] leading-[1.7]">
              {i > 0
                ? `${fill(t.transitions[transitionBucket(stop.travelMinutesFromPrevious)], { minutes: stop.travelMinutesFromPrevious })} `
                : ""}
              <strong>
                {minutesToClock(stop.arrivalMinutes)} — {stop.place.name[locale]}.
              </strong>{" "}
              {stop.place.shortDescription[locale]}
              {stop.place.localTip[locale] ? (
                <em className="mt-1 block text-[13px]">
                  {dict.common.localTip}: {stop.place.localTip[locale]}
                </em>
              ) : null}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
