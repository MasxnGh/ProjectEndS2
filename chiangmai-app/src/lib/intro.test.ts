import { describe, expect, it } from "vitest";
import { INTRO_STORAGE_KEY, introScript } from "./intro";

/** Runs the inline script against a fake browser and reports what it did. */
function run({
  path,
  reduced = false,
  seen = false,
  storageThrows = false,
}: {
  path: string;
  reduced?: boolean;
  seen?: boolean;
  storageThrows?: boolean;
}) {
  const store = new Map<string, string>(seen ? [[INTRO_STORAGE_KEY, "1"]] : []);
  const attrs = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => {
      if (storageThrows) throw new Error("blocked");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (storageThrows) throw new Error("blocked");
      store.set(k, v);
    },
  };
  const document = { documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v) } };
  const location = { pathname: path };
  const matchMedia = () => ({ matches: reduced });
  new Function("sessionStorage", "document", "location", "matchMedia", introScript(["en", "th"]))(
    sessionStorage,
    document,
    location,
    matchMedia,
  );
  return { plays: attrs.get("data-intro") === "play", flagged: store.has(INTRO_STORAGE_KEY) };
}

describe("introScript", () => {
  it("plays on the first page of a visit when it is a home page", () => {
    expect(run({ path: "/th" })).toEqual({ plays: true, flagged: true });
    expect(run({ path: "/en/" }).plays).toBe(true);
  });

  it("does not play again in the same visit", () => {
    expect(run({ path: "/th", seen: true }).plays).toBe(false);
  });

  it("does not play on other pages, but still marks the visit as started", () => {
    expect(run({ path: "/th/explore" })).toEqual({ plays: false, flagged: true });
    expect(run({ path: "/th/place/wat-phra-singh" }).plays).toBe(false);
    expect(run({ path: "/" }).plays).toBe(false);
    expect(run({ path: "/fr" }).plays).toBe(false);
  });

  it("does not play for readers who asked for reduced motion", () => {
    expect(run({ path: "/th", reduced: true }).plays).toBe(false);
  });

  it("does nothing, and throws nothing, when storage is blocked", () => {
    expect(run({ path: "/th", storageThrows: true }).plays).toBe(false);
  });
});
