import { describe, expect, it } from "vitest";
import { accountView, parseSessionProbe } from "./account-view";

describe("accountView", () => {
  it("shows the account whenever next-auth has a session", () => {
    expect(accountView("authenticated", null)).toBe("signed-in");
    expect(accountView("authenticated", "unavailable")).toBe("signed-in");
  });

  it("shows neither sign-in nor an account while next-auth is still loading", () => {
    expect(accountView("loading", null)).toBe("loading");
    expect(accountView("loading", "signed-out")).toBe("loading");
  });

  it("says the account can't be reached, not 'sign in', when the database is down", () => {
    // The bug: a signed-in visitor saw "Sign in with Google" during an outage.
    expect(accountView("unauthenticated", "unavailable")).toBe("unavailable");
  });

  it("offers sign-in once the server confirms there is no session", () => {
    expect(accountView("unauthenticated", "signed-out")).toBe("signed-out");
  });

  it("waits for the server's answer before offering sign-in", () => {
    expect(accountView("unauthenticated", null)).toBe("loading");
    expect(accountView("unauthenticated", "signed-in")).toBe("loading");
  });
});

describe("parseSessionProbe", () => {
  it("reads the three answers", () => {
    expect(parseSessionProbe({ status: "signed-in" })).toBe("signed-in");
    expect(parseSessionProbe({ status: "signed-out" })).toBe("signed-out");
    expect(parseSessionProbe({ status: "unavailable" })).toBe("unavailable");
  });

  it("treats anything else as no answer", () => {
    expect(parseSessionProbe(null)).toBeNull();
    expect(parseSessionProbe({})).toBeNull();
    expect(parseSessionProbe({ status: "authenticated" })).toBeNull();
    expect(parseSessionProbe("signed-in")).toBeNull();
  });
});
