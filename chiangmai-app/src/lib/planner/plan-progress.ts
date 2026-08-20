import type { Place } from "@/data/types";
import { checkDayFeasibility } from "@/lib/planner/feasibility";
import { addDaysIso } from "@/lib/date-utils";

export type PlanStepId = "details" | "places" | "arrange" | "share";

export const PLAN_STEP_IDS: readonly PlanStepId[] = ["details", "places", "arrange", "share"];

export interface PlanStep {
  id: PlanStepId;
  done: boolean;
  /**
   * The one step the traveller is on — the first that is not done. Every step
   * after it is still ahead, and a completed plan has no current step at all.
   */
  current: boolean;
  /**
   * What is standing between this step and done, when that can be counted.
   * The UI turns it into a sentence; null when the step is finished or the
   * blocker is not a countable thing.
   */
  remaining: number | null;
}

export interface PlanProgress {
  steps: PlanStep[];
  /** Null once every step is done. */
  currentStepId: PlanStepId | null;
  completedCount: number;
}

export interface PlanProgressInput {
  /** "" when the traveller has not chosen a date, matching the store's own shape. */
  travelDate: string;
  /** Days in order, each with its resolved places — same shape the board already builds. */
  days: { places: Place[] }[];
  /** Places sitting in the unscheduled tray. */
  unscheduledCount: number;
  /** True once the plan is syncing to a cloud trip, or a share link has been copied. */
  savedOrShared: boolean;
}

/**
 * Counts what still stands between the plan and a day-by-day itinerary that
 * actually works: places left in the tray, days with nothing on them, and
 * stops scheduled on a date the place is shut.
 *
 * Feasibility comes from `checkDayFeasibility` rather than a second
 * implementation here — that function already knows about weekly closures,
 * seasonal closures and haze-sensitive outdoor places, and two rules for the
 * same question would drift apart.
 */
function countArrangeBlockers(input: PlanProgressInput): number {
  const { travelDate, days, unscheduledCount } = input;

  const emptyDays = days.filter((day) => day.places.length === 0).length;
  const feasibilityIssues = days.reduce((sum, day, i) => {
    // No travel date means no weekday to check against, so feasibility simply
    // has nothing to say yet — that is step 1's problem, not this step's.
    const isoDate = travelDate ? addDaysIso(travelDate, i) : null;
    return sum + checkDayFeasibility(day.places, isoDate).length;
  }, 0);

  return unscheduledCount + emptyDays + feasibilityIssues;
}

/**
 * Works out which of the four planning steps are done, so the planner can
 * show the traveller where they are instead of presenting every control at
 * once with no indication of order.
 *
 * Steps are reported independently — someone who picks places before setting
 * a date gets step 2 ticked and step 1 still open, because that is the truth
 * of their plan. Only `currentStepId` assumes an order, and it picks the
 * earliest unfinished step.
 */
export function derivePlanProgress(input: PlanProgressInput): PlanProgress {
  const { travelDate, days, unscheduledCount, savedOrShared } = input;
  const placeCount = days.reduce((sum, day) => sum + day.places.length, 0) + unscheduledCount;

  const arrangeBlockers = countArrangeBlockers(input);
  const hasAnyPlace = placeCount > 0;

  const done: Record<PlanStepId, boolean> = {
    details: travelDate !== "",
    places: hasAnyPlace,
    // An empty plan has nothing arranged, however few blockers it reports.
    arrange: hasAnyPlace && arrangeBlockers === 0,
    share: savedOrShared,
  };

  const remaining: Record<PlanStepId, number | null> = {
    details: null,
    places: null,
    arrange: done.arrange ? null : arrangeBlockers || null,
    share: null,
  };

  const currentStepId = PLAN_STEP_IDS.find((id) => !done[id]) ?? null;

  return {
    steps: PLAN_STEP_IDS.map((id) => ({
      id,
      done: done[id],
      current: id === currentStepId,
      remaining: remaining[id],
    })),
    currentStepId,
    completedCount: PLAN_STEP_IDS.filter((id) => done[id]).length,
  };
}
