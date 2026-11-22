import { addDaysIso } from "@/lib/date-utils";
import { minutesToClock } from "@/lib/opening-hours";
import { checkPlanDays, planDays } from "@/lib/ai/plan-check";
import { checkDayFeasibility } from "@/lib/planner/feasibility";
import { MEAL_WINDOWS, findMealGaps } from "@/lib/planner/meals";
import { categorySpendBreakdown, estimateTripCostThb } from "@/lib/trip-calculations";
import type { AiTripPlan, ValidatedTripPlan } from "@/lib/ai/schema";
import type { EvalCase } from "./cases";

/**
 * Scores one AI answer against one eval case, using the planner's own
 * functions for every number — the same timeline, schedule, opening-hours,
 * meal, feasibility and cost code the planner page runs once a plan is
 * applied. Nothing here is a second opinion on how the planner should
 * calculate; it asks whether the AI's plan survives the planner's existing
 * checks.
 *
 * Times are the page's: `buildDayTimeline`, which times a day around a stop's
 * best window when it has one. Meal gaps and the ten-hour limit are read from
 * `buildSchedule`, forward from 09:00, because that is what the page reads
 * them from too.
 */

export const CHECK_IDS = [
  "noInvented",
  "readsRequest",
  "dayCount",
  "budget",
  "budgetWarned",
  "closedDays",
  "openingHours",
  "meals",
  "pace",
  "wants",
  "avoid",
  "reportsUnmet",
  "indoorOnly",
  "mealSlots",
  "language",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

export interface CheckResult {
  status: "pass" | "fail" | "n/a";
  detail?: string;
}

export interface PlanMetrics {
  days: number;
  stops: number;
  /** What the planner page shows once the plan is used: chosen travel mode, accommodation and party size included. */
  plannerTotalThb: number;
  /** What the AI dialog shows today (`estimatedCostThb`). */
  dialogEstimateThb: number;
  maxDayTravelMinutes: number;
  latestFinish: string | null;
  /** Restaurant stops whose visit overlaps neither meal window. Breakfast places count here too, so this is a signal, not a check. */
  restaurantsOffMealTime: number;
  /** Everything the planner page would warn about (plan-check), the fix pass's own measure. */
  plannerWarnings: number;
}

export interface PlanScore {
  checks: Record<CheckId, CheckResult>;
  metrics: PlanMetrics;
}

const pass = (detail?: string): CheckResult => ({ status: "pass", detail });
const fail = (detail?: string): CheckResult => ({ status: "fail", detail });
const skip: CheckResult = { status: "n/a" };

const THAI_SCRIPT = /[฀-๿]/;

function overlapsAnyMealWindow(start: number, end: number): boolean {
  return MEAL_WINDOWS.some((w) => end > w.startMinutes && start < w.endMinutes);
}

export function scorePlan(testCase: EvalCase, raw: AiTripPlan, plan: ValidatedTripPlan): PlanScore {
  const { input, trip, expect } = testCase;
  const planned = planDays(
    plan.days.map((day) => day.slugs),
    trip.travelDate
  );
  const days = planned.map((day) => ({ places: day.places }));
  const schedules = planned.map((day) => day.schedule);
  const timelines = planned.map((day) => day.timeline);
  const span = (stop: { arrivalMinutes: number; departureMinutes: number }) =>
    `${minutesToClock(stop.arrivalMinutes)}–${minutesToClock(stop.departureMinutes)}`;
  const planSlugs = new Set(plan.days.flatMap((day) => day.slugs));
  const rawSlugs = new Set(raw.days.flatMap((day) => day.slugs));
  const dayLabel = (i: number) => `Day ${i + 1}`;

  const plannerTotalThb = estimateTripCostThb(
    categorySpendBreakdown(days, trip.travelMode),
    Math.max(1, input.travelers),
    trip.accommodationThb
  );

  const checks = {} as Record<CheckId, CheckResult>;

  checks.noInvented =
    plan.droppedSlugs.length === 0 ? pass() : fail(`invented: ${plan.droppedSlugs.join(", ")}`);

  // An answer saved before the schema asked for a reading has none to check.
  if (expect.read && raw.read) {
    const wanted = expect.read;
    const misread = (Object.keys(wanted) as (keyof typeof wanted)[])
      .filter((key) => plan.read[key] !== wanted[key])
      .map((key) => `${key} read as ${plan.read[key] ?? "not stated"}, wanted ${wanted[key]}`);
    checks.readsRequest = misread.length === 0 ? pass() : fail(misread.join("; "));
  } else {
    checks.readsRequest = skip;
  }

  const expectedDays = expect.days ?? input.days;
  checks.dayCount =
    plan.days.length === expectedDays
      ? pass(`${plan.days.length}/${expectedDays}`)
      : fail(`${plan.days.length} day(s), wanted ${expectedDays}`);

  if (expect.budget) {
    const { amount, basis } = expect.budget;
    const limit = basis === "total" ? amount : amount * Math.max(1, input.travelers);
    const within = plannerTotalThb <= limit;
    const reading = basis === "total" ? "for the group" : basis === "perPerson" ? "per person" : "read as per person";
    checks.budget = within
      ? pass(`฿${plannerTotalThb} ≤ ฿${limit}`)
      : fail(`฿${plannerTotalThb} > ฿${limit} (฿${amount} ${reading})`);
    checks.budgetWarned = within
      ? pass()
      : plan.overBudgetByThb !== null
        ? pass("dialog shows over budget")
        : fail(`dialog shows ฿${plan.estimatedCostThb} with no over-budget warning`);
  } else {
    checks.budget = skip;
    checks.budgetWarned = skip;
  }

  if (trip.travelDate) {
    const issues = days.flatMap((day, i) =>
      checkDayFeasibility(day.places, addDaysIso(trip.travelDate!, i))
        .filter((issue) => issue.type !== "hazeSensitive")
        .map((issue) => `${dayLabel(i)} ${issue.placeSlug} (${issue.type})`)
    );
    checks.closedDays = issues.length === 0 ? pass() : fail(issues.join("; "));
  } else {
    checks.closedDays = skip;
  }

  const outside = timelines.flatMap((timeline, i) =>
    timeline.stops
      .filter((stop) => stop.outsideOpeningHours)
      .map((stop) => `${dayLabel(i)} ${stop.place.slug} ${span(stop)}`)
  );
  checks.openingHours = outside.length === 0 ? pass() : fail(outside.join("; "));

  const gaps = schedules.flatMap((schedule, i) => findMealGaps(schedule).map((gap) => `${dayLabel(i)} ${gap.meal}`));
  checks.meals = gaps.length === 0 ? pass() : fail(`no ${gaps.join("; ")}`);

  const longDays = schedules.flatMap((schedule, i) =>
    schedule.exceedsTenHours ? [`${dayLabel(i)} ${Math.round(schedule.totalMinutes / 60)} h`] : []
  );
  checks.pace = longDays.length === 0 ? pass() : fail(`over ten hours: ${longDays.join("; ")}`);

  if (expect.wants?.length) {
    const missing = expect.wants.filter((want) => !want.anyOf.some((slug) => planSlugs.has(slug)));
    checks.wants =
      missing.length === 0
        ? pass(`${expect.wants.length}/${expect.wants.length}`)
        : fail(
            `missing ${missing.map((m) => m.label).join(", ")}` +
              (raw.unmetConstraints.length > 0 ? " (unmet list not empty)" : " (not reported)")
          );
  } else {
    checks.wants = skip;
  }

  if (expect.avoid?.length) {
    const returned = expect.avoid.filter((slug) => rawSlugs.has(slug));
    checks.avoid = returned.length === 0 ? pass() : fail(`returned ${returned.join(", ")}`);
  } else {
    checks.avoid = skip;
  }

  checks.reportsUnmet = expect.reportsUnmet
    ? raw.unmetConstraints.length > 0
      ? pass(`${raw.unmetConstraints.length} item(s)`)
      : fail("unmet list empty")
    : skip;

  if (expect.indoorOnly) {
    const outdoor = days.flatMap((day) => day.places.filter((place) => place.outdoor).map((place) => place.slug));
    checks.indoorOnly = outdoor.length === 0 ? pass() : fail(`outdoor: ${outdoor.join(", ")}`);
  } else {
    checks.indoorOnly = skip;
  }

  // `meals` only asks whether some food stop covers each window; this asks
  // whether the dinner the traveller named is the one eaten at dinner.
  const slotIssues: string[] = [];
  let slotsChecked = 0;
  for (const slot of expect.mealSlots ?? []) {
    const window = MEAL_WINDOWS.find((w) => w.id === slot.meal)!;
    const stops = timelines.flatMap((timeline) => timeline.stops).filter((stop) => slot.anyOf.includes(stop.place.slug));
    if (stops.length === 0) continue;
    slotsChecked++;
    // A stop the day is timed around sits in the best window its own entry
    // gives — Khao Soi Khun Yai's is 10:00–11:30, "before the lunch queue" —
    // which is the place's say on when to eat there, so it counts.
    const atMealTime = stops.some(
      (stop) =>
        stop.isAnchor || (stop.departureMinutes > window.startMinutes && stop.arrivalMinutes < window.endMinutes)
    );
    if (!atMealTime) {
      slotIssues.push(`${slot.label} at ${stops.map(span).join(", ")}, not ${slot.meal}`);
    }
  }
  checks.mealSlots = slotsChecked === 0 ? skip : slotIssues.length === 0 ? pass() : fail(slotIssues.join("; "));

  const prose = [raw.understood, ...raw.days.map((day) => day.note)].join(" ");
  const answeredInThai = THAI_SCRIPT.test(prose);
  checks.language =
    answeredInThai === (testCase.lang === "th")
      ? pass()
      : fail(testCase.lang === "th" ? "answered without Thai" : "answered in Thai");

  const lastDepartures = timelines
    .map((timeline) => timeline.stops.at(-1)?.departureMinutes)
    .filter((minutes): minutes is number => minutes !== undefined);

  return {
    checks,
    metrics: {
      days: plan.days.length,
      stops: planSlugs.size,
      plannerTotalThb,
      dialogEstimateThb: plan.estimatedCostThb,
      maxDayTravelMinutes: Math.max(0, ...schedules.map((schedule) => schedule.totalTravelMinutes)),
      latestFinish: lastDepartures.length ? minutesToClock(Math.max(...lastDepartures)) : null,
      restaurantsOffMealTime: timelines
        .flatMap((timeline) => timeline.stops)
        .filter(
          (stop) =>
            stop.place.category === "restaurant" && !overlapsAnyMealWindow(stop.arrivalMinutes, stop.departureMinutes)
        ).length,
      plannerWarnings: checkPlanDays(planned).length,
    },
  };
}
