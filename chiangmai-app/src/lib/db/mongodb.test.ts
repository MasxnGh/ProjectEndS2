import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const driver = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn(),
  options: [] as unknown[],
}));

vi.mock("mongodb", () => ({
  MongoClient: class {
    constructor(_uri: string, options: unknown) {
      driver.options.push(options);
    }
    connect() {
      return driver.connect(this);
    }
    close() {
      return driver.close();
    }
    db() {
      return { command: vi.fn().mockResolvedValue({ ok: 1 }) };
    }
  },
}));

import {
  FAILURE_MEMORY_MS,
  getMongoClient,
  isDatabaseReachable,
  SERVER_SELECTION_TIMEOUT_MS,
} from "./mongodb";

describe("getMongoClient", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-17T09:00:00Z"));
    vi.stubEnv("MONGODB_URI", "mongodb://db.invalid:27017/test");
    globalThis._mongoClientPromise = undefined;
    globalThis._mongoLastFailure = undefined;
    driver.connect.mockReset();
    driver.close.mockReset().mockResolvedValue(undefined);
    driver.options.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    globalThis._mongoClientPromise = undefined;
    globalThis._mongoLastFailure = undefined;
  });

  it("tries again after a failed connect instead of failing for good", async () => {
    driver.connect
      .mockRejectedValueOnce(new Error("querySrv ECONNREFUSED"))
      .mockImplementationOnce(async (client: unknown) => client);

    await expect(getMongoClient()).rejects.toThrow("querySrv ECONNREFUSED");
    vi.setSystemTime(Date.now() + FAILURE_MEMORY_MS);
    await expect(getMongoClient()).resolves.toBeDefined();
    expect(driver.connect).toHaveBeenCalledTimes(2);
    expect(driver.close).toHaveBeenCalledTimes(1); // the failed client was released
  });

  it("answers from a failure seconds old instead of waiting out another timeout", async () => {
    driver.connect.mockRejectedValueOnce(new Error("down"));
    await expect(getMongoClient()).rejects.toThrow("down");
    vi.setSystemTime(Date.now() + FAILURE_MEMORY_MS - 1);
    await expect(getMongoClient()).rejects.toThrow("down");
    expect(driver.connect).toHaveBeenCalledTimes(1);
  });

  it("keeps a connection that worked", async () => {
    driver.connect.mockImplementation(async (client: unknown) => client);
    const first = await getMongoClient();
    const second = await getMongoClient();
    expect(second).toBe(first);
    expect(driver.connect).toHaveBeenCalledTimes(1);
  });

  it("makes callers who arrive together share one attempt", async () => {
    driver.connect.mockImplementation(async (client: unknown) => client);
    const [a, b] = await Promise.all([getMongoClient(), getMongoClient()]);
    expect(a).toBe(b);
    expect(driver.connect).toHaveBeenCalledTimes(1);
  });

  it("gives up on an unreachable server well before the driver's 30 s default", async () => {
    driver.connect.mockImplementation(async (client: unknown) => client);
    await getMongoClient();
    expect(driver.options[0]).toMatchObject({ serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
    expect(SERVER_SELECTION_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });

  it("rejects (and retries next time) when MONGODB_URI is missing", async () => {
    vi.stubEnv("MONGODB_URI", "");
    await expect(getMongoClient()).rejects.toThrow("MONGODB_URI is not set");
    expect(globalThis._mongoClientPromise).toBeUndefined();
  });

  it("reports whether the database answers", async () => {
    driver.connect.mockRejectedValueOnce(new Error("down"));
    expect(await isDatabaseReachable()).toBe(false);
    vi.setSystemTime(Date.now() + FAILURE_MEMORY_MS);
    driver.connect.mockImplementationOnce(async (client: unknown) => client);
    expect(await isDatabaseReachable()).toBe(true);
  });
});
