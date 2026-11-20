import type { TravelMode } from "@/data/types";
import type { Dictionary, Locale } from "@/i18n";
import type { DayTimeline } from "@/lib/planner/golden-hour";
import { minutesToClock } from "@/lib/opening-hours";
import { categorySpendBreakdown, dayStats, estimateTripCostThb } from "@/lib/trip-calculations";
import { fill } from "@/components/brand/place-text";
import { baht, shortDayDate, tripRange } from "./plan-text";

export interface ChatTextDay {
  dayNumber: number;
  date?: string;
  timeline: DayTimeline;
}

/**
 * The plan as plain text for a group chat, where most of the people who need
 * it will never open the site.
 *
 * Nothing is worked out afresh: the times are each day's own timeline (the one
 * the screen and the printout show), the per-day figure is the day card's, and
 * the trip total goes through the same functions as the printout's. A stop
 * the planner reaches outside its opening hours says so here too, and the
 * text ends by saying the numbers are estimates.
 */
export function buildPlanChatText(params: {
  title: string;
  days: ChatTextDay[];
  travelers: number;
  travelMode: TravelMode;
  accommodationThb: number;
  url: string;
  dict: Dictionary;
  locale: Locale;
}): string {
  const { title, days, travelers, travelMode, accommodationThb, url, dict, locale } = params;
  const t = dict.plan.chat;
  const used = days.filter((day) => day.timeline.stops.length > 0);
  const people = travelers === 1 ? dict.plan.travellersOne : fill(dict.plan.travellers, { count: travelers });

  const lines: string[] = [title || dict.plan.untitled];
  const firstDate = used[0]?.date;
  const lastDate = used[used.length - 1]?.date;
  lines.push(firstDate && lastDate ? `${tripRange(firstDate, lastDate, locale)} · ${people}` : people);

  for (const day of used) {
    const places = day.timeline.stops.map((stop) => stop.place);
    lines.push("");
    lines.push(
      day.date
        ? fill(dict.plan.headingWithDate, { day: day.dayNumber, date: shortDayDate(day.date, locale) })
        : fill(dict.plan.heading, { day: day.dayNumber }),
    );
    for (const stop of day.timeline.stops) {
      const flag = stop.outsideOpeningHours ? ` ${t.outsideHours}` : "";
      lines.push(`${minutesToClock(stop.arrivalMinutes)} ${stop.place.name[locale]}${flag}`);
    }
    lines.push(`${dict.plan.stats.spend} ${fill(dict.plan.stats.perPerson, { amount: baht(dayStats(places).budgetThb) })}`);
  }

  if (used.length > 0) {
    const breakdown = categorySpendBreakdown(
      used.map((day) => ({ places: day.timeline.stops.map((stop) => stop.place) })),
      travelMode,
    );
    const total = estimateTripCostThb(breakdown, travelers, accommodationThb);
    const f = dict.plan.print.facts;
    lines.push("");
    lines.push(`${f.cost} ${baht(total)} (${fill(accommodationThb > 0 ? f.costNote : f.costNoteNoStay, { people })})`);
    lines.push(t.estimates);
  }

  lines.push("");
  lines.push(fill(t.fullPlan, { url }));
  return lines.join("\n");
}
