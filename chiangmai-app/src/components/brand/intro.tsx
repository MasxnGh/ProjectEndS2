import { BrandMark } from "./logo";

/**
 * The first-visit intro (DESIGN.md, "Motion" → "The intro"): a deep green
 * panel where "Chiangmai Journey" fills with sand light from the bottom while
 * the count runs to 100, then the panel lifts and the home page's own arrival
 * follows. After the "loading page" pattern on Awwwards, in the brand's voice.
 *
 * It is plain markup in the layout and hidden unless the inline script in
 * lib/intro.ts marks <html data-intro="play">, so it costs nothing on other
 * pages or later visits. All timing is CSS (app/motion.css, "Intro"), and the
 * intro ends itself even if React never loads. <IntroControl> only lets a
 * tap, key or scroll end it early.
 *
 * Decoration (`aria-hidden`): the page underneath is already readable.
 */
export function Intro() {
  return (
    <div aria-hidden className="cmj-intro font-brand">
      <div className="cmj-intro-panel">
        <div className="cmj-intro-name">
          <BrandMark draw className="text-cmj-sand" />
          <p lang="en" className="cmj-intro-word">
            {"Chiangmai\nJourney"}
            <span>{"Chiangmai\nJourney"}</span>
          </p>
          <p className="cmj-intro-count" />
        </div>
      </div>
    </div>
  );
}
