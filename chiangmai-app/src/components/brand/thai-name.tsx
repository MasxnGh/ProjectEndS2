import { Fragment } from "react";

/**
 * Keeps a Thai place name from breaking in the middle of a word.
 *
 * Browsers break Thai lines with a dictionary that does not know proper nouns,
 * so "ดอยอินทนนท์" can end up as "ดอยอิน / ทนนท์" on a phone. This splits a
 * name after the generic words places are named with (อุทยานแห่งชาติ, วัด,
 * พิพิธภัณฑ์ …) and before a few common endings (เชียงใหม่, วรวิหาร), then
 * keeps each short piece on one line. A piece too long to be sure it fits a
 * narrow card is left to the browser, so a name can never overflow.
 *
 * Non-Thai text is returned as it is: spaces already mark where it may break.
 */

/** Longest first, so "วัดพระธาตุ" wins over "วัด". */
const HEADS = [
  "พิพิธภัณฑสถานแห่งชาติ",
  "เส้นทางศึกษาธรรมชาติ",
  "สมเด็จพระนางเจ้า",
  "อุทยานแห่งชาติ",
  "หอศิลปวัฒนธรรม",
  "หอประวัติศาสตร์",
  "สถานีเกษตรหลวง",
  "เส้นทางเดินป่า",
  "สวนพฤกษศาสตร์",
  "สวนสาธารณะ",
  "สวนรุกขชาติ",
  "หอนิทรรศการ",
  "อ่างเก็บน้ำ",
  "พิพิธภัณฑ์",
  "พระตำหนัก",
  "พระมหาธาตุ",
  "วัดพระธาตุ",
  "อนุสาวรีย์",
  "ศูนย์ศึกษา",
  "ถนนคนเดิน",
  "น้ำพุร้อน",
  "ก๋วยเตี๋ยว",
  "หมู่บ้าน",
  "เส้นทาง",
  "ปางช้าง",
  "ข้าวซอย",
  "น้ำตก",
  "เขื่อน",
  "ศูนย์",
  "ตลาด",
  "วัด",
];
const TAILS = ["ราชวรวิหาร", "วรวิหาร", "เชียงใหม่"];

const THAI = /[฀-๿]/;
/** Vowel and tone marks sit above or below a letter and take no width. */
const MARKS = /[ัิ-ฺ็-๎]/g;
/** About what fits the narrowest place a name appears (a phone card's text column). */
const MAX_KEPT = 13;

const width = (s: string) => s.replace(MARKS, "").length;

function chunk(word: string): string[] {
  const open = word.startsWith("(") ? "(" : "";
  const rest = open ? word.slice(1) : word;
  for (const head of HEADS) {
    const after = rest.slice(head.length);
    if (rest.startsWith(head) && width(after) >= 2) return [open + head, ...chunk(after)];
  }
  for (const tail of TAILS) {
    const before = word.slice(0, word.length - tail.length);
    if (word.endsWith(tail) && width(before) >= 2) return [...chunk(before), tail];
  }
  return [word];
}

/** The pieces of a name, in order, joined back with nothing between them; spaces stay as their own pieces. */
export function thaiNamePieces(name: string): string[] {
  return name.split(/( )/).flatMap((part) => (part === " " || !THAI.test(part) ? [part] : chunk(part)));
}

export function ThaiName({ text }: { text: string }) {
  if (!THAI.test(text)) return <>{text}</>;
  return (
    <>
      {thaiNamePieces(text).map((piece, i) => (
        <Fragment key={i}>
          {piece !== " " && THAI.test(piece) && width(piece) <= MAX_KEPT ? (
            <span className="whitespace-nowrap">{piece}</span>
          ) : (
            piece
          )}
        </Fragment>
      ))}
    </>
  );
}
