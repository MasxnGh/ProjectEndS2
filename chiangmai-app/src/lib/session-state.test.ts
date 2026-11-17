import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeAuth: vi.fn(),
  isDatabaseReachable: vi.fn(),
  cookieNames: [] as string[],
}));

vi.mock("@/lib/auth-safe", () => ({ safeAuth: mocks.safeAuth }));
vi.mock("@/lib/db/mongodb", () => ({ isDatabaseReachable: mocks.isDatabaseReachable }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => mocks.cookieNames.map((name) => ({ name, value: "x" })) }),
}));

import { getSessionState } from "./session-state";

describe("getSessionState", () => {
  beforeEach(() => {
    mocks.safeAuth.mockReset();
    mocks.isDatabaseReachable.mockReset();
    mocks.cookieNames = [];
  });

  it("is signed in when Auth.js returns a session with a user id", async () => {
    mocks.safeAuth.mockResolvedValue({ user: { id: "u1" }, expires: "2099-01-01" });
    await expect(getSessionState()).resolves.toMatchObject({ status: "signed-in", userId: "u1" });
    expect(mocks.isDatabaseReachable).not.toHaveBeenCalled();
  });

  it("is signed out without a session cookie, without touching the database", async () => {
    mocks.safeAuth.mockResolvedValue(null);
    mocks.cookieNames = ["locale", "authjs.csrf-token"];
    await expect(getSessionState()).resolves.toEqual({ status: "signed-out" });
    expect(mocks.isDatabaseReachable).not.toHaveBeenCalled();
  });

  it("is unavailable, not signed out, when the cookie is there but the database isn't", async () => {
    // The original bug: this case redirected to the sign-in page.
    mocks.safeAuth.mockResolvedValue(null);
    mocks.cookieNames = ["authjs.session-token"];
    mocks.isDatabaseReachable.mockResolvedValue(false);
    await expect(getSessionState()).resolves.toEqual({ status: "unavailable" });
  });

  it("is signed out when the database answers but the cookie's session is gone", async () => {
    mocks.safeAuth.mockResolvedValue(null);
    mocks.cookieNames = ["authjs.session-token"];
    mocks.isDatabaseReachable.mockResolvedValue(true);
    await expect(getSessionState()).resolves.toEqual({ status: "signed-out" });
  });

  it("recognises the https and chunked cookie names", async () => {
    mocks.safeAuth.mockResolvedValue(null);
    mocks.isDatabaseReachable.mockResolvedValue(false);
    for (const name of ["__Secure-authjs.session-token", "authjs.session-token.0"]) {
      mocks.cookieNames = [name];
      await expect(getSessionState()).resolves.toEqual({ status: "unavailable" });
    }
  });
});
