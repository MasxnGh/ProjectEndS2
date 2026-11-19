import { afterEach, describe, expect, it, vi } from "vitest";
import { CoverUploadFailure, fitWithin, uploadCover } from "./cover-upload";

describe("fitWithin", () => {
  it("brings the longer side down to the limit, keeping the shape", () => {
    expect(fitWithin(4032, 3024, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3024, 4032, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it("leaves a small photo as it is", () => {
    expect(fitWithin(1200, 800, 2400)).toEqual({ width: 1200, height: 800 });
  });
});

describe("uploadCover", () => {
  afterEach(() => vi.unstubAllGlobals());

  function respond(status: number, body: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );
  }

  async function failure(): Promise<string> {
    try {
      await uploadCover(new Blob(["x"], { type: "image/jpeg" }));
      return "none";
    } catch (error) {
      return error instanceof CoverUploadFailure ? error.code : "other";
    }
  }

  it("answers the new cover's id", async () => {
    respond(201, { id: "AbCdEfGhIjKlMnOpQrSt_-", width: 1600, height: 900 });
    await expect(uploadCover(new Blob(["x"]))).resolves.toBe("AbCdEfGhIjKlMnOpQrSt_-");
  });

  it("turns the server's codes into the picker's", async () => {
    respond(413, { code: "too-large" });
    expect(await failure()).toBe("too-large");
    respond(415, { code: "unreadable" });
    expect(await failure()).toBe("unreadable");
    respond(409, { code: "limit" });
    expect(await failure()).toBe("limit");
    respond(401, { error: "Sign in required" });
    expect(await failure()).toBe("signed-out");
    respond(500, { error: "boom" });
    expect(await failure()).toBe("network");
  });

  it("calls a dropped connection a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    expect(await failure()).toBe("network");
  });
});
