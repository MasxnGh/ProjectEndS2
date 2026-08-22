/**
 * A quiet backdrop for the sign-in page, which until now sat on flat paper
 * while every other entry point to the site had some atmosphere.
 *
 * Deliberately CSS and SVG rather than a WebGL shader. The alternative was a
 * React Bits background (Aurora, Silk), which would have meant adding `ogl`
 * and running a GPU context on a page whose entire job is one button. The
 * motif here — layered ridgelines fading into haze — is the same one the home
 * hero uses, so the two read as one site rather than two demos.
 *
 * `aria-hidden` throughout: it carries no information. Motion is limited to a
 * very slow drift, and `globals.css` clamps it to nothing under
 * `prefers-reduced-motion`.
 */
export function LoginBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% 0%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 65%)",
        }}
      />
      <svg
        className="login-backdrop-ridge absolute inset-x-0 bottom-0 h-[42%] w-full text-accent/20"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          d="M0 320 L160 250 L280 300 L400 200 L520 265 L640 160 L760 250 L880 130 L1000 240 L1140 180 L1260 265 L1380 210 L1440 250 L1440 400 L0 400 Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className="login-backdrop-ridge-far absolute inset-x-0 bottom-0 h-[34%] w-full text-accent/30"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
      >
        <path
          d="M0 360 L120 320 L240 350 L380 285 L500 330 L620 255 L740 320 L880 265 L1000 340 L1120 295 L1260 350 L1380 305 L1440 330 L1440 400 L0 400 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
