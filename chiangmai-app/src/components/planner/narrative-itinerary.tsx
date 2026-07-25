"use client";

import type { Place } from "@/data/types";
import { buildSchedule } from "@/lib/planner/schedule";
import { transitionBucket } from "@/lib/planner/narrative";
import { useLocale } from "@/components/providers/locale-provider";

function formatDayDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Print-only, editorial-style rendering of the whole trip — flowing prose
 * per stop instead of the on-screen day-column grid. Every fact (arrival
 * time, travel minutes between stops) comes straight from buildSchedule;
 * only the connecting phrasing is templated, never invented distances or
 * times. Rendered permanently in the DOM but hidden on screen (`hidden
 * print:block`) so "Download PDF" (window.print()) picks it up in place of
 * the interactive UI.
 */
export function NarrativeItinerary({
  days,
  tripName,
  className,
}: {
  days: { dayNumber: number; date?: string; places: Place[] }[];
  tripName: string;
  className?: string;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.narrative;
  const usedDays = days.filter((d) => d.places.length > 0);

  return (
    <article className={className}>
      <h1 className="font-serif-display text-3xl">{tripName || t.defaultTitle}</h1>
      {usedDays.map((day) => {
        const schedule = buildSchedule(day.places);
        return (
          <section key={day.dayNumber} style={{ breakInside: "avoid" }} className="mt-8">
            <h2 className="font-serif-display text-xl">
              {dict.planner.day} {day.dayNumber}
              {day.date ? ` — ${formatDayDate(day.date, locale)}` : ""}
            </h2>
            {schedule.stops.map((stop, i) => (
              <p key={stop.place.slug} className="mt-3 leading-relaxed">
                {i > 0
                  ? `${t.transitions[transitionBucket(stop.travelMinutesFromPrevious)].replace("{minutes}", String(stop.travelMinutesFromPrevious))} `
                  : ""}
                <strong>
                  {stop.arrival} — {stop.place.name[locale]}.
                </strong>{" "}
                {stop.place.shortDescription[locale]}
                {stop.place.localTip[locale] ? (
                  <em className="block text-sm">
                    {dict.common.localTip}: {stop.place.localTip[locale]}
                  </em>
                ) : null}
              </p>
            ))}
          </section>
        );
      })}
    </article>
  );
}
