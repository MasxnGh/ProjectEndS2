/**
 * A soft arrival on every route change.
 *
 * `template.tsx` rather than `layout.tsx` because a template is re-keyed on
 * each navigation, so this remounts and the CSS animation replays — a layout
 * persists and would animate once, on first load, and never again.
 *
 * **Why CSS and not `motion`.** The obvious version sets `initial={{opacity:0}}`
 * and animates up. That is fail-dangerous: the inline style hides the page
 * immediately and only a JS frame can reveal it, so anything that stops
 * `requestAnimationFrame` — a backgrounded tab, a throttled device, a JS error
 * — leaves the entire page invisible. This was reproduced, not theorised: in a
 * hidden tab the wrapper sat at `opacity: 0` indefinitely.
 *
 * The keyframe below puts the fade in CSS instead, with `fill-mode: forwards`,
 * so the resting style is fully opaque and a route whose animation never
 * starts still renders.
 *
 * One measured caveat, stated rather than glossed: a tab that is hidden from
 * first paint holds the wrapper at `opacity: 0`, because browsers pause CSS
 * animations there too — this was reproduced, not assumed. Nobody is looking
 * at a hidden tab, and the animation resumes when it is shown, so the blank
 * state is never seen; but "fail visible" would be too strong a claim.
 *
 * **Opacity only, deliberately.** A `transform` here would make this element a
 * containing block for the length of the animation, which breaks
 * `position: fixed` and re-anchors `position: sticky` — and this page has a
 * sticky map sidebar and a sticky summary bar. Verified: the wrapper computes
 * `transform: none`, and sticky descendants still resolve against the viewport.
 *
 * There is no exit animation. Catching the outgoing route needs the View
 * Transitions API via React's `<ViewTransition>`, which needs a React canary
 * this project is not on — react 19.2.4 exports no such component, and Next
 * does not bundle one. Entrance alone still removes the hard cut, which is the
 * part people feel.
 *
 * `prefers-reduced-motion` is handled globally in globals.css, which clamps
 * every animation duration to near-zero.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
