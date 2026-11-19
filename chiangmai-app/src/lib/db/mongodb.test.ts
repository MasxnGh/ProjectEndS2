import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const driver = vi.hoisted(() => ({
  connect: vi.fn(),
  close: vi.fn(),
  options: [] as unknown[],
  dbNames: [] as (string | undefined)[],
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
    db(name?: string) {
      driver.dbNames.push(name);
      return { command: vi.fn().mockResolvedValue({ ok: 1 }) };
    }
  },
}));

import {
  databaseName,
  DEFAULT_DATABASE,
  FAILURE_MEMORY_MS,
  getDb,
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
    driver.dbNames.length = 0;
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

describe("databaseName", () => {
  it("uses the database named in the path", () => {
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net/chiangmai-journey?retryWrites=true")).toBe("chiangmai-journey");
    expect(databaseName("mongodb://h1:27017,h2:27017,h3:27017/trips-dev?replicaSet=rs0&tls=true")).toBe("trips-dev");
    expect(databaseName("mongodb://localhost:27017/test")).toBe("test");
  });

  it("falls back to the app's database, not the driver's `test`, when the path names none", () => {
    // Atlas's "Connect" string: how the deployed site's data ended up in `test`.
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net/?retryWrites=true&w=majority&appName=Cluster0")).toBe(DEFAULT_DATABASE);
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net?retryWrites=true")).toBe(DEFAULT_DATABASE);
    expect(databaseName("mongodb://h1:27017,h2:27017")).toBe(DEFAULT_DATABASE);
    expect(databaseName("")).toBe(DEFAULT_DATABASE);
    expect(DEFAULT_DATABASE).toBe("chiangmai-journey");
  });

  it("isn't thrown by encoded characters in the credentials", () => {
    expect(databaseName("mongodb+srv://us%2Fer:p%40ss%3Fw@cluster0.example.net/?w=majority")).toBe(DEFAULT_DATABASE);
    expect(databaseName("mongodb+srv://us%2Fer:p%40ss@cluster0.example.net/chiangmai-journey")).toBe("chiangmai-journey");
  });

  it("drops a trailing slash after the name, which the driver would keep", () => {
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net/chiangmai-journey/")).toBe("chiangmai-journey");
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net/chiangmai-journey/?retryWrites=true")).toBe("chiangmai-journey");
    expect(databaseName("mongodb+srv://u:p@cluster0.example.net//?retryWrites=true")).toBe(DEFAULT_DATABASE);
  });

  it("decodes an encoded name", () => {
    expect(databaseName("mongodb://localhost:27017/my%20db")).toBe("my db");
  });

  it("is what getDb() opens", async () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://u:p@cluster0.example.net/?retryWrites=true");
    globalThis._mongoClientPromise = undefined;
    globalThis._mongoLastFailure = undefined;
    driver.connect.mockReset().mockImplementation(async (client: unknown) => client);
    driver.dbNames.length = 0;
    await getDb();
    expect(driver.dbNames).toEqual([DEFAULT_DATABASE]);
    vi.unstubAllEnvs();
    globalThis._mongoClientPromise = undefined;
  });
});
