import { Fragment } from "react";

/**
 * Keeps each space-separated phrase of a line on one line.
 *
 * Thai is written without spaces between words; the space marks the end of a
 * phrase. Browsers break Thai with a dictionary, which can split a heading at
 * any word ("จัดทริปทีละวัน ให้ / มันต่อกันได้จริง"). Holding each phrase
 * together makes the line break only where a Thai writer would. For Latin text
 * it changes nothing, since there every word is already its own phrase.
 *
 * Use it on short display lines only: a phrase can never break, so one wider
 * than the column would overflow.
 */
export function Phrases({ text }: { text: string }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className="inline-block">{part}</span>
        </Fragment>
      ))}
    </>
  );
}
