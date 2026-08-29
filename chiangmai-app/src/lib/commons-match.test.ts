import { describe, expect, it } from "vitest";
// Plain .mjs helper shared with scripts/ — imported directly so the rule that
// decides what a photo may represent is covered by the same suite as the app.
import {
  namesLookLikeTheSamePlace,
  metresBetween,
  kindIsConsistent,
  cleanArtist,
} from "../../scripts/lib/commons-match.mjs";

/**
 * These pin the rule that decides whether a photograph is allowed to represent
 * a place. Getting it wrong does not throw — it quietly publishes a picture of
 * somewhere else under a place's name, which is the exact failure the previous
 * photo pipeline shipped 22 times.
 */
describe("namesLookLikeTheSamePlace", () => {
  it("accepts the same place written slightly differently", () => {
    expect(namesLookLikeTheSamePlace("Wat Phra That Doi Suthep", "Wat Phrathat Doi Suthep")).toBe(true);
    expect(namesLookLikeTheSamePlace("Wat Chedi Luang", "Wat Chedi Luang Varavihara")).toBe(true);
  });

  it("rejects a different place that merely stands next door", () => {
    // 47m apart in reality — this is the case that would put a temple photo on
    // a noodle shop's page if distance were the only test.
    expect(namesLookLikeTheSamePlace("Khao Soi Khun Yai", "Wat Khuan Khama")).toBe(false);
    expect(namesLookLikeTheSamePlace("Huen Muan Jai", "Wat Ratcha Monthian")).toBe(false);
  });

  it("does not match on words every entry shares", () => {
    // Two unrelated temples: without stopwords they would share "wat".
    expect(namesLookLikeTheSamePlace("Wat Umong", "Wat Suan Dok")).toBe(false);
    // Two unrelated markets in the same city.
    expect(namesLookLikeTheSamePlace("Warorot Market", "Jing Jai Market")).toBe(false);
    expect(namesLookLikeTheSamePlace("Chiang Mai National Museum", "Chiang Mai City Arts Centre")).toBe(false);
  });

  it("keeps bracketed qualifiers, which are sometimes the only distinguishing part", () => {
    expect(namesLookLikeTheSamePlace("Sunday Walking Street (Tha Phae)", "Tha Phae Walking Street")).toBe(true);
    expect(namesLookLikeTheSamePlace("Sunday Walking Street (Tha Phae)", "Wua Lai Walking Street")).toBe(false);
  });

  it("refuses a name with nothing distinctive left rather than matching everything", () => {
    expect(namesLookLikeTheSamePlace("Temple", "Wat Umong")).toBe(false);
  });

  it("does not match on 'night', which every night market here shares", () => {
    // This match shipped: a Chiang Mai Night Bazaar photo, 99m away, was
    // accepted for Ploen Ruedee Night Market on the strength of one word.
    expect(namesLookLikeTheSamePlace("Ploen Ruedee Night Market", "Chiang Mai Night Bazaar")).toBe(
      false
    );
  });

  it("keeps Thai names whole instead of shattering them at vowel marks", () => {
    // Thai vowels are combining marks, not letters. When they were stripped,
    // "อุทยานแห่งชาติดอยอินทนนท์" and "หอดูดาวแห่งชาติ" both produced the
    // fragment "งชาต" — a shard of แห่งชาติ, "national" — and Doi Inthanon was
    // illustrated with a photo of a telescope dome at the Thai National
    // Observatory.
    expect(namesLookLikeTheSamePlace("อุทยานแห่งชาติดอยอินทนนท์", "หอดูดาวแห่งชาติ (ไทย)")).toBe(false);
    // The same fix must not stop a genuine Thai match from working.
    expect(namesLookLikeTheSamePlace("วัดเจดีย์หลวง", "วัดเจดีย์หลวงวรวิหาร")).toBe(true);
    expect(namesLookLikeTheSamePlace("วัดอุโมงค์", "วัดสวนดอก")).toBe(false);
  });
});

describe("kindIsConsistent", () => {
  it("rejects a town that shares its name with the temple above it", () => {
    // Wat Tha Ton and the tambon of Tha Ton are named identically, so no name
    // rule can separate them. This one accepted a panorama of the town.
    expect(kindIsConsistent("Wat Tha Ton", ["tambon"])).toBe(false);
    expect(kindIsConsistent("Wat Tha Ton", ["wat"])).toBe(true);
  });

  it("rejects a temple standing in for something that is not a temple", () => {
    // Both of these sit inside a temple compound, so the nearest mapped entity
    // is a wat — but neither page is about that wat.
    expect(kindIsConsistent("Chiang Dao Cave", ["wat"])).toBe(false);
    expect(kindIsConsistent("Jaeng Si Phum Corner", ["wat"])).toBe(false);
  });

  it("judges by the name, not our own category bucket", () => {
    // Ban Haw Mosque is filed under "village" in our catalogue. A rule keyed on
    // category would have thrown away a correct photo of it.
    expect(kindIsConsistent("Ban Haw Mosque", ["mosque"])).toBe(true);
    expect(kindIsConsistent("Bhubing Palace", ["Phra Tamnak"])).toBe(true);
    expect(kindIsConsistent("Mae Sa Waterfall", ["waterfall"])).toBe(true);
  });

  it("rejects a business that borrowed the landmark's name", () => {
    // The nearest name-matching entity to Jaeng Si Phum Corner is the "Si Phum
    // Heritage Boutique Bed & Breakfast". It was let through by every other
    // gate and stopped only by having no photo attached.
    expect(kindIsConsistent("Jaeng Si Phum Corner", ["hotel"])).toBe(false);
    expect(kindIsConsistent("Warorot Market", ["restaurant"])).toBe(false);
  });

  it("lets unfamiliar kinds through rather than demanding a full vocabulary", () => {
    expect(kindIsConsistent("Wiang Tha Kan", ["archaeological site"])).toBe(true);
    expect(kindIsConsistent("Three Kings Monument", [])).toBe(true);
  });
});

describe("cleanArtist", () => {
  it("keeps an ordinary credit untouched", () => {
    expect(cleanArtist("Vyacheslav Argenberg")).toBe("Vyacheslav Argenberg");
    expect(cleanArtist("jon collier from waltham, ma, usa")).toBe("jon collier from waltham, ma, usa");
    expect(cleanArtist("กสิณธร ราชโอรส")).toBe("กสิณธร ราชโอรส");
  });

  it("pulls the name out of a photographer's re-use policy", () => {
    // Wat Chiang Man's credit arrived as ~400 characters of instructions.
    const raw =
      "This Photo was taken by Supanut Arunoprayote.\n\nFeel free to use any of my images, " +
      "but please mention me as the author and may send me a message.";
    expect(cleanArtist(raw)).toBe("Supanut Arunoprayote");
  });

  it("takes the name off the end when the front is an upload description", () => {
    // Doi Suthep's credit rendered as a truncated Thai sentence ending in "…"
    // because the photographer's name comes last.
    expect(
      cleanArtist("ผู้สร้างสรรค์ผลงาน/ส่งข้อมูลเก็บในคลังข้อมูลเสรีวิกิมีเดียคอมมอนส์ - เทวประภาส มากคล้าย")
    ).toBe("เทวประภาส มากคล้าย");
    // But a short head is the name, and the tail is the job title.
    expect(cleanArtist("Jane Doe - photographer")).toBe("Jane Doe - photographer");
  });

  it("never returns something too long to sit under a photo", () => {
    const rambling = "A".repeat(200);
    expect(cleanArtist(rambling).length).toBeLessThanOrEqual(60);
  });

  it("falls back rather than returning an empty credit", () => {
    expect(cleanArtist("")).toBe("unknown");
    expect(cleanArtist(null)).toBe("unknown");
  });
});

describe("metresBetween", () => {
  it("measures a short city distance", () => {
    // Wat Phra Singh as we hold it, against Wikidata's own coordinate for it.
    const d = metresBetween(18.7889, 98.9817, 18.78875, 98.98121111);
    expect(d).toBeLessThan(60);
  });

  it("measures a same-name trap as far away", () => {
    // The other Wat Chedi Luang, ~200km off.
    const d = metresBetween(18.7873, 98.9853, 19.9, 99.83);
    expect(d).toBeGreaterThan(100_000);
  });
});
