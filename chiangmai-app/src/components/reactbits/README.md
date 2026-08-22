# Vendored from React Bits

Source components copied from https://reactbits.dev (TS + Tailwind flavour),
fetched from https://github.com/DavidHDev/react-bits on 2026-08-15.

React Bits is not a package dependency — its model is that the code lands in
your repo and becomes yours. These files are ours to edit; upstream will not
patch them.

| File | Upstream path |
|---|---|
| `ClickSpark.tsx` | `src/ts-tailwind/Animations/ClickSpark/ClickSpark.tsx` |

`ClickSpark` uses only `react`, already in this project — vendoring it added no
new dependency.

## Deliberately not vendored

- **GradualBlur** — 13 `any`s and ~300 lines to fade a scroll edge, which
  `mask-image: linear-gradient(...)` does in two lines of CSS.
- **AnimatedList** — its API is `items?: string[]`, a list of plain strings
  with its own scroll container and keyboard navigation. Day columns render
  rich `SortablePlaceItem` children inside a dnd-kit `SortableContext`, which
  it cannot host. The stagger-on-add and smooth-reorder we actually wanted
  come from `motion/react`'s `AnimatePresence` + `layout`, already used in 33
  files here.
- **Stepper** — `plan-progress-bar.tsx` was already built on Stepper's visual
  language (its own comment cites the React Bits page) and adapted it to be
  non-linear, which suits trip planning better than a wizard. Vendoring the
  real thing would have been a second, worse copy.
- **CountUp** — this repo already animates running totals with its own
  `useCountUp` hook (see `trip-summary-bar.tsx`). A second implementation of
  the same idea is the kind of duplication this redesign exists to remove.
- **WebGL backgrounds** (Aurora, Silk, Plasma, …) — they need `ogl`, and the
  planner already runs MapLibre's WebGL context. Two contexts on one page is a
  real mobile performance risk. If we want one of these, the landing page is
  the place for it.
