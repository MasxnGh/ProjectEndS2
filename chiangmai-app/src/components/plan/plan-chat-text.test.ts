import { describe, expect, it } from "vitest";
import { getPlaceBySlug } from "@/data/places";
import { getDictionary } from "@/i18n";
import { buildDayTimeline, type SunTimes } from "@/lib/planner/golden-hour";
import { minutesToClock } from "@/lib/opening-hours";
import { categorySpendBreakdown, dayStats, estimateTripCostThb } from "@/lib/trip-calculations";
import { baht } from "./plan-text";
import { buildPlanChatText } from "./plan-chat-text";

const SUN: SunTimes = { sunriseMinutes: 6 * 60 + 33, sunsetMinutes: 17 * 60 + 46, isEstimate: true };
const placesOf = (...slugs: string[]) => slugs.map((s) => getPlaceBySlug(s)!);
const timelineOf = (...slugs: string[]) =>
  buildDayTimeline({ order: placesOf(...slugs), sun: SUN, baseLocation: null, lockedArrivals: {} });

const URL_ = "https://example.test/th/planner?plan=abc";

describe("buildPlanChatText", () => {
  const th = getDictionary("th");
  const day1 = timelineOf("wat-pha-lat", "wat-umong", "wat-phra-that-doi-suthep");
  const day2 = timelineOf("wat-chedi-luang", "tha-phae-gate");
  const days = [
    { dayNumber: 1, date: "2026-12-19", timeline: day1 },
    { dayNumber: 2, date: "2026-12-20", timeline: day2 },
  ];
  const text = buildPlanChatText({
    title: "เชียงใหม่กับเพื่อน",
    days,
    travelers: 4,
    travelMode: "grab",
    accommodationThb: 2000,
    url: URL_,
    dict: th,
    locale: "th",
  });
  const lines = text.split("\n");

  it("opens with the trip's name, dates and party", () => {
    expect(lines[0]).toBe("เชียงใหม่กับเพื่อน");
    expect(lines[1]).toContain("4 คน");
    expect(lines[1]).toContain("2569");
  });

  it("lists each stop at the time its own timeline gives", () => {
    for (const stop of [...day1.stops, ...day2.stops]) {
      expect(lines).toContain(`${minutesToClock(stop.arrivalMinutes)} ${stop.place.name.th}`);
    }
    expect(lines[3]).toMatch(/^วันที่ 1 · /);
  });

  it("uses the day card's per-person figure and the printout's trip total", () => {
    const perPerson = baht(dayStats(day1.stops.map((s) => s.place)).budgetThb);
    expect(lines).toContain(`ใช้จ่ายที่จุดแวะ ราว ${perPerson}/คน`);
    const total = estimateTripCostThb(
      categorySpendBreakdown([day1, day2].map((d) => ({ places: d.stops.map((s) => s.place) })), "grab"),
      4,
      2000,
    );
    expect(lines).toContain(`ค่าใช้จ่ายโดยประมาณ ${baht(total)} (ทั้งทริป 4 คน รวมที่พัก)`);
  });

  it("says the numbers are estimates and ends with the link to the full plan", () => {
    expect(lines).toContain("เวลาและค่าใช้จ่ายเป็นค่าประมาณ");
    expect(lines[lines.length - 1]).toBe(`แผนเต็ม: ${URL_}`);
  });

  it("flags a stop the planner reaches outside its opening hours", () => {
    const early = timelineOf("wat-umong", "wat-phra-that-doi-suthep", "wat-pha-lat");
    const shut = early.stops.filter((s) => s.outsideOpeningHours);
    expect(shut.length).toBeGreaterThan(0);
    const flagged = buildPlanChatText({
      title: "",
      days: [{ dayNumber: 1, timeline: early }],
      travelers: 1,
      travelMode: "walk",
      accommodationThb: 0,
      url: URL_,
      dict: th,
      locale: "th",
    }).split("\n");
    for (const stop of shut) {
      expect(flagged).toContain(`${minutesToClock(stop.arrivalMinutes)} ${stop.place.name.th} (นอกเวลาเปิด)`);
    }
  });

  it("falls back to the untitled name and leaves out dates and empty days when there are none", () => {
    const plain = buildPlanChatText({
      title: "",
      days: [
        { dayNumber: 1, timeline: day1 },
        { dayNumber: 2, timeline: timelineOf() },
      ],
      travelers: 1,
      travelMode: "walk",
      accommodationThb: 0,
      url: URL_,
      dict: th,
      locale: "th",
    }).split("\n");
    expect(plain[0]).toBe(th.plan.untitled);
    expect(plain[1]).toBe("1 คน");
    expect(plain[3]).toBe("วันที่ 1");
    expect(plain).not.toContain("วันที่ 2");
    // No accommodation entered: the total says it is for the party, not "including stay".
    expect(plain.find((l) => l.startsWith("ค่าใช้จ่ายโดยประมาณ "))).toMatch(/ \(ทั้งทริป 1 คน\)$/);
  });

  it("writes English for the English site", () => {
    const en = buildPlanChatText({
      title: "",
      days: [{ dayNumber: 1, date: "2026-12-19", timeline: day1 }],
      travelers: 2,
      travelMode: "walk",
      accommodationThb: 0,
      url: URL_,
      dict: getDictionary("en"),
      locale: "en",
    });
    expect(en).toContain("Wat Pha Lat");
    expect(en).toContain("Times and costs are estimates.");
    expect(en).toContain(`Full plan: ${URL_}`);
  });
});
