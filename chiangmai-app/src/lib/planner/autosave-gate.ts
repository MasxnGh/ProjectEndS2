export interface AutosaveGateInput {
  signedIn: boolean;
  /** The sign-in check for an existing trip is still waiting on the server. */
  migrationChecking: boolean;
  /** The "save as new / replace" question is on screen. */
  migrationPromptOpen: boolean;
  /** They chose "decide later", or the check couldn't tell whether a trip exists. */
  migrationDeclined: boolean;
  localPlanEmpty: boolean;
  remoteTripId: string | null;
  payloadJson: string;
  /** The payload last written to, or opened from, the account. */
  lastSavedJson: string | null;
}

/**
 * Whether the planner may write the plan on screen to the account now.
 *
 * The rule the sign-in check depends on: while it is still finding out
 * whether the account already has a trip, nothing is written. Without that,
 * a slow answer (a cold server, a weak connection) let the debounced save
 * create a new trip first, and the "save as new or replace?" question
 * arrived after the duplicate already existed.
 */
export function shouldAutosave(input: AutosaveGateInput): boolean {
  if (!input.signedIn) return false;
  if (input.migrationChecking || input.migrationPromptOpen) return false;
  if (input.localPlanEmpty) return false;
  if (!input.remoteTripId && input.migrationDeclined) return false;
  return input.payloadJson !== input.lastSavedJson;
}
