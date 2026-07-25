import type { LocalizedText } from "./types";

export interface FestivalOccurrence {
  year: number;
  /** ISO "YYYY-MM-DD", inclusive. */
  start: string;
  end: string;
  /**
   * True only for a date confirmed against an official source (a fixed
   * national holiday, or a rule the city has consistently followed). Lunar
   * festival dates are the author's best general knowledge, not checked
   * against a live source today — always false for those, and the UI must
   * tell the user to double-check with an official calendar before relying
   * on it.
   */
  verified: boolean;
}

export interface Festival {
  id: string;
  name: LocalizedText;
  calendarType: "solar" | "lunar";
  description: LocalizedText;
  /** Practical, non-alarmist advice — crowds, pricing, closures, what to expect. */
  advice: LocalizedText[];
  occurrences: FestivalOccurrence[];
}

const YEARS_TO_PROJECT = [2025, 2026, 2027, 2028];

/** First Friday of February in a given year, in UTC to avoid timezone drift. */
function firstFridayOfFebruary(year: number): Date {
  const date = new Date(Date.UTC(year, 1, 1)); // Feb 1
  const friday = 5;
  const offset = (friday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(1 + offset);
  return date;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

const songkranOccurrences: FestivalOccurrence[] = YEARS_TO_PROJECT.map((year) => ({
  year,
  start: `${year}-04-13`,
  end: `${year}-04-15`,
  verified: true, // Thailand's national Songkran holiday is fixed to these calendar dates every year.
}));

const flowerFestivalOccurrences: FestivalOccurrence[] = YEARS_TO_PROJECT.map((year) => {
  const friday = firstFridayOfFebruary(year);
  return {
    year,
    start: toIso(friday),
    end: toIso(addDays(friday, 2)), // Friday through Sunday
    verified: true, // Chiang Mai's Flower Festival has consistently run the first Fri–Sun of February.
  };
});

/**
 * Lunar-calendar dates below are the author's best general knowledge, not
 * looked up against a live/official source as part of this work — every
 * entry is `verified: false` on purpose. See FESTIVALS-TODO.md for which
 * years most need checking before this is relied on for real trip
 * planning, especially 2026 onward.
 */
const loyKrathongOccurrences: FestivalOccurrence[] = [
  { year: 2025, start: "2025-11-05", end: "2025-11-05", verified: false },
  { year: 2026, start: "2026-11-24", end: "2026-11-24", verified: false },
];

const visakhaBuchaOccurrences: FestivalOccurrence[] = [
  { year: 2025, start: "2025-05-11", end: "2025-05-11", verified: false },
  { year: 2026, start: "2026-05-30", end: "2026-05-30", verified: false },
];

const inthakinOccurrences: FestivalOccurrence[] = [
  // Traditionally runs roughly a week after Visakha Bucha, over several
  // days — this range is a rough placeholder, not a checked date.
  { year: 2025, start: "2025-05-17", end: "2025-05-23", verified: false },
  { year: 2026, start: "2026-06-05", end: "2026-06-11", verified: false },
];

export const festivals: Festival[] = [
  {
    id: "songkran",
    name: { en: "Songkran (Thai New Year)", th: "สงกรานต์" },
    calendarType: "solar",
    description: {
      en: "Thailand's water festival and traditional new year — Chiang Mai's old-city moat becomes the country's largest water fight for several days running.",
      th: "เทศกาลสงกรานต์และวันขึ้นปีใหม่ไทย คูเมืองเก่าเชียงใหม่กลายเป็นสนามเล่นน้ำที่ใหญ่ที่สุดในประเทศต่อเนื่องหลายวัน",
    },
    advice: [
      {
        en: "Expect the old city to be extremely crowded and almost everyone (and everything you're carrying) to get soaked — pack electronics in a waterproof bag or leave them at your hotel.",
        th: "คาดว่าเมืองเก่าจะแออัดมาก และแทบทุกคน (รวมถึงของที่พกไป) จะเปียกน้ำ ควรใส่อุปกรณ์อิเล็กทรอนิกส์ในถุงกันน้ำหรือฝากไว้ที่โรงแรม",
      },
      {
        en: "Accommodation prices rise and rooms sell out early — book well ahead if travelling during this week.",
        th: "ราคาที่พักจะสูงขึ้นและห้องมักเต็มเร็ว ควรจองล่วงหน้านานๆ หากเดินทางช่วงสัปดาห์นี้",
      },
      {
        en: "Many temples adjust visiting hours or hold special ceremonies — check locally rather than assuming normal hours apply.",
        th: "หลายวัดอาจปรับเวลาเข้าชมหรือจัดพิธีพิเศษ ควรตรวจสอบในพื้นที่แทนที่จะสันนิษฐานว่าเวลาเปิดปกติ",
      },
    ],
    occurrences: songkranOccurrences,
  },
  {
    id: "flower-festival",
    name: { en: "Chiang Mai Flower Festival", th: "เทศกาลไม้ดอกไม้ประดับ" },
    calendarType: "solar",
    description: {
      en: "A flower-covered parade and exhibition through the old city, timed to early February's cool-season blooms.",
      th: "ขบวนแห่และนิทรรศการดอกไม้ผ่านเมืองเก่า จัดขึ้นช่วงต้นเดือนกุมภาพันธ์ตรงกับดอกไม้บานในฤดูหนาว",
    },
    advice: [
      {
        en: "The parade route through the old city closes to traffic for several hours — plan walking routes around it rather than through it.",
        th: "เส้นทางขบวนแห่ผ่านเมืองเก่าจะปิดการจราจรหลายชั่วโมง ควรวางแผนเส้นทางเดินอ้อมแทนที่จะผ่านกลาง",
      },
      {
        en: "Exact dates are set by the city annually and can shift by a few days — confirm the current year's schedule closer to your trip.",
        th: "วันที่แน่นอนกำหนดโดยเทศบาลในแต่ละปีและอาจขยับได้เล็กน้อย ควรยืนยันตารางปีนั้นๆ ใกล้วันเดินทาง",
      },
    ],
    occurrences: flowerFestivalOccurrences,
  },
  {
    id: "loy-krathong",
    name: { en: "Loy Krathong / Yi Peng", th: "ลอยกระทง / ยี่เป็ง" },
    calendarType: "lunar",
    description: {
      en: "Floating krathongs on the Ping River and releasing khom loi (sky lanterns) — Chiang Mai's Yi Peng lantern release is one of the most photographed festivals in Thailand.",
      th: "การลอยกระทงในแม่น้ำปิงและปล่อยโคมลอยยี่เป็ง หนึ่งในเทศกาลที่มีการถ่ายภาพมากที่สุดของไทย",
    },
    advice: [
      {
        en: "This is Chiang Mai's single busiest tourism week of the year — book flights, hotels, and any ticketed lantern-release event months ahead.",
        th: "เป็นสัปดาห์ที่นักท่องเที่ยวมาเชียงใหม่มากที่สุดของปี ควรจองตั๋วเครื่องบิน ที่พัก และงานปล่อยโคมแบบมีบัตรล่วงหน้าหลายเดือน",
      },
      {
        en: "Sky lanterns are restricted to certain nights/venues near the airport for flight safety — a free public release isn't guaranteed every night of the week.",
        th: "การปล่อยโคมลอยถูกจำกัดเฉพาะบางคืน/บางสถานที่ใกล้สนามบินเพื่อความปลอดภัยของเที่ยวบิน ไม่ใช่ทุกคืนของสัปดาห์จะมีการปล่อยโคมฟรีสาธารณะ",
      },
    ],
    occurrences: loyKrathongOccurrences,
  },
  {
    id: "visakha-bucha",
    name: { en: "Visakha Bucha", th: "วิสาขบูชา" },
    calendarType: "lunar",
    description: {
      en: "A major Buddhist holy day marking the Buddha's birth, enlightenment, and passing — candlelit processions circle temple grounds after dark.",
      th: "วันสำคัญทางพุทธศาสนา ระลึกถึงวันประสูติ ตรัสรู้ และปรินิพพานของพระพุทธเจ้า มีการเวียนเทียนรอบพระอุโบสถยามค่ำ",
    },
    advice: [
      {
        en: "Alcohol sales are restricted nationwide on this day.",
        th: "ห้ามจำหน่ายเครื่องดื่มแอลกอฮอล์ทั่วประเทศในวันนี้",
      },
      {
        en: "Temples are busiest in the evening for the candlelit procession — visit earlier in the day for a quieter look at the grounds.",
        th: "วัดจะคึกคักที่สุดช่วงเย็นสำหรับพิธีเวียนเทียน หากต้องการความเงียบสงบควรมาชมช่วงกลางวัน",
      },
    ],
    occurrences: visakhaBuchaOccurrences,
  },
  {
    id: "inthakin",
    name: { en: "Inthakin City Pillar Festival", th: "ประเพณีใส่ขันดอกเข้าอินทขิล" },
    calendarType: "lunar",
    description: {
      en: "A multi-day Chiang Mai-specific festival honouring the city's guardian pillar at Wat Chedi Luang, with locals offering flowers over several days.",
      th: "เทศกาลเฉพาะถิ่นเชียงใหม่หลายวัน สักการะเสาอินทขิลที่วัดเจดีย์หลวง ชาวบ้านนำดอกไม้มาถวายต่อเนื่องหลายวัน",
    },
    advice: [
      {
        en: "Centred entirely on Wat Chedi Luang — expect the temple grounds to be significantly more crowded than a normal visit during this window.",
        th: "จัดขึ้นที่วัดเจดีย์หลวงเป็นหลัก คาดว่าบริเวณวัดจะคึกคักกว่าปกติมากในช่วงนี้",
      },
    ],
    occurrences: inthakinOccurrences,
  },
];
