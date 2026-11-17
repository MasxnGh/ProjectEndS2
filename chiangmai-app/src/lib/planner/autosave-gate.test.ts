import { describe, expect, it } from "vitest";
import { shouldAutosave, type AutosaveGateInput } from "./autosave-gate";

const ready: AutosaveGateInput = {
  signedIn: true,
  migrationChecking: false,
  migrationPromptOpen: false,
  migrationDeclined: false,
  localPlanEmpty: false,
  remoteTripId: "trip-1",
  payloadJson: '{"title":"after"}',
  lastSavedJson: '{"title":"before"}',
};

describe("shouldAutosave", () => {
  it("saves a changed plan for a signed-in visitor", () => {
    expect(shouldAutosave(ready)).toBe(true);
  });

  it("waits while the sign-in check is still asking the server", () => {
    // The duplicate-trip bug: a guest plan, just signed in, listing not back yet.
    expect(shouldAutosave({ ...ready, remoteTripId: null, lastSavedJson: null, migrationChecking: true })).toBe(false);
  });

  it("waits while the save-as-new-or-replace question is open", () => {
    expect(shouldAutosave({ ...ready, remoteTripId: null, migrationPromptOpen: true })).toBe(false);
  });

  it("holds a plan with no trip after 'decide later'", () => {
    expect(shouldAutosave({ ...ready, remoteTripId: null, migrationDeclined: true })).toBe(false);
  });

  it("keeps saving an already-linked trip even after 'decide later'", () => {
    expect(shouldAutosave({ ...ready, migrationDeclined: true })).toBe(true);
  });

  it("creates the first trip once the check found none", () => {
    expect(shouldAutosave({ ...ready, remoteTripId: null, lastSavedJson: null })).toBe(true);
  });

  it("does nothing when signed out, the plan is empty, or nothing changed", () => {
    expect(shouldAutosave({ ...ready, signedIn: false })).toBe(false);
    expect(shouldAutosave({ ...ready, localPlanEmpty: true })).toBe(false);
    expect(shouldAutosave({ ...ready, lastSavedJson: ready.payloadJson })).toBe(false);
  });
});
