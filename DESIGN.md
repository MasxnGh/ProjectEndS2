---
name: Chiangmai Journey
description: A warm, photo-led Chiang Mai guide and trip planner in deep forest green, lanna sand and golden-hour light.
colors:
  chiang-mai-green: "#1D3835"
  chiang-mai-green-deep: "#142A27"
  nature-leaf: "#8AA189"
  lanna-sand: "#EFD3B1"
  sunset-orange: "#EB9D56"
  sky-lavender: "#BDADD9"
  ink: "#17221F"
  stone-ink: "#4F5A57"
  paper: "#F9F3F0"
  surface: "#FFFCFA"
  mist: "#ECE6E3"
typography:
  display:
    fontFamily: "Prompt, sans-serif"
    fontSize: "clamp(2.75rem, 2rem + 4vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0em"
  headline:
    fontFamily: "Prompt, sans-serif"
    fontSize: "clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0em"
  title:
    fontFamily: "Prompt, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  body:
    fontFamily: "Prompt, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0em"
  label:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  tagline-latin:
    fontFamily: "Prompt, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.chiang-mai-green}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.chiang-mai-green-deep}"
  button-secondary:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.chiang-mai-green}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    height: "48px"
  icon-button:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.chiang-mai-green}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.chiang-mai-green}"
    textColor: "{colors.paper}"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 8px 0 20px"
    height: "56px"
  place-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
  category-tile:
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
  nav-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "72px"
---

<!-- SEED: established with the owner from the brand board at docs/redesign/reference/brand-board.webp (2026-11-14), before implementation. Colour values were sampled from the board's palette swatches; sizes are read off the board and scaled to a 1440px desktop. The site is being rebuilt from scratch under this system (docs/rebuild/README.md); the Phase 1 prototypes in docs/rebuild/phase-1-design/ are its first full expression. Re-run `impeccable document` once the tokens are in code to capture the real values. -->

# Design System: Chiangmai Journey

## Overview

**Creative North Star: "Golden Hour on the Doi"**

The site should feel like the last hour of light on the mountain above the city: a deep forest green that holds everything steady, warm sand and paper underneath, and one spark of sunset orange. It is photo-led and calm. Real photographs of Chiang Mai carry the emotion; the interface around them is quiet, rounded and easy to hold in one hand.

The owner chose this direction from a brand board (`docs/redesign/reference/brand-board.webp`). The board is the visual authority for colour, type, shape and component character. It is not the authority for content: where the board shows something the product cannot truthfully show (a review score, a generated photograph of a real temple), the product rule wins and the component keeps its shape with true content in it.

The board names three values. Each maps to something visible:

- **Local, authentic** → only real photographs of the place named, each with its credit; the 203 hand-picked places, never padded.
- **Easy to explore** → search first, categories one tap away, every control at least 44px, the planner reachable from every page.
- **Inspiring journey** → golden-hour photography, generous hero, small hand-drawn accents (the four-point sparkle, the orange brush underline).

**Key Characteristics:**
- Deep green as the voice: logo, headings, primary buttons, selected states.
- Warm light grounds (paper and surface), never pure grey, never pure white page.
- Pill-shaped controls: buttons, chips, search, icon buttons.
- Rounded photo cards and tiles (16px), soft green-tinted shadow only on things that float.
- One family, Prompt, for Thai and Latin; hierarchy by weight and size, not letter-spacing.
- Line icons in soft circles (lucide, already in the codebase).

## Colors

A forest-and-sunset palette: one deep green that does the work, three warm or soft accents that only ever appear as fills and marks, and a warm paper ground.

### Primary
- **Chiang Mai Green** (#1D3835): logo and wordmark, all headings on light grounds, primary buttons, selected chips, the search submit button, active nav underline, the planner route line. Also the dark ground for the footer and any reversed band (paper text on it measures 11.45:1).
- **Chiang Mai Green Deep** (#142A27): hover and pressed state of anything green.

### Secondary
- **Nature Leaf** (#8AA189): nature category, map park areas, quiet fills behind green icons, progress that is complete. Never text on light grounds (2.53:1 on paper).
- **Lanna Sand** (#EFD3B1): warm fill for the no-photo place tile, highlighted rows in the planner, the selected day. Green text on sand measures 8.76:1.

### Tertiary
- **Sunset Orange** (#EB9D56): the spark. The four-point sparkle, the brush underline, the map pin of the selected stop, a "new" or "golden hour" marker. Never text on light grounds (2.01:1). Green text on orange passes (5.68:1) for a small highlight badge.
- **Sky Lavender** (#BDADD9): twilight. Weather and sky information (golden-hour timeline, forecast), and as a soft fill. Never text on light grounds (1.88:1).

### Neutral
- **Ink** (#17221F): body text and card titles (14.87:1 on paper).
- **Stone Ink** (#4F5A57): secondary text such as the location line on a card, captions and photo credits. Must stay at or above 4.5:1 on every ground it sits on.
- **Paper** (#F9F3F0): the page ground, a warm blush off-white.
- **Surface** (#FFFCFA): cards, the search field, the nav bar when it sits over a photo, dialogs.
- **Mist** (#ECE6E3): chips, secondary buttons, icon circles, input fills, dividers at low emphasis.

**Dark theme (provisional, to be measured in Phase 2).** The board shows light only; PRODUCT.md requires both themes at WCAG AA. Dark is derived, not invented: the ground becomes a deepened Chiang Mai Green, surfaces step up in lightness from it, text becomes Paper, and the four accents stay as they are, since sand, orange and leaf already pass on green (8.76, 5.68 and 4.52:1). Exact values are set and measured with the tokens.

### Named Rules
**The Green Holds the Words Rule.** On any light ground, text is Ink, Stone Ink or Chiang Mai Green. Leaf, sand, orange and lavender are fills and marks only; they measure 1.31–2.53:1 as text on paper.

**The One Sunset Rule.** Sunset Orange covers no more than about 5% of a screen. It marks the one thing that matters on that screen. If two things are orange, one of them is wrong.

## Typography

**Display Font:** Prompt (with sans-serif)
**Body Font:** Prompt (with sans-serif)
**Signature script:** a Latin handwritten face for the single closing line in the board ("Chiang Mai… A Journey that stays with you"). Allura (Google Fonts), one line per page at most, Latin only, chosen in the Phase 1 prototypes.

**Character:** Prompt is a loopless Thai and geometric Latin from Cadson Demak, so Thai and English sit on one consistent rhythm. It replaces Trirong + Anuphan and the mono face. It is rounded enough to match the pill controls and firm enough to read from the back of a classroom.

### Hierarchy
- **Display** (600, clamp 44–88px, line-height 1.25): the hero title only, one per page at most.
- **Headline** (600, clamp 28–40px, 1.3): section titles. In the board each is followed by a thin hairline running to the right edge of its column ("Visual Style ———").
- **Title** (500, 20px, 1.4): card titles, category tile names, day headings in the planner.
- **Body** (400, 17px, 1.7): paragraphs, descriptions, tips. Measure 60–72ch. Thai needs the extra leading for stacked vowels and tone marks.
- **Label** (500, 15px, 1.4): buttons, chips, nav links, form labels, card meta. Nothing in the interface is set below 14px.
- **Tagline, Latin only** (500, 14px, letter-spacing 0.18em, uppercase): "EXPLORE • EXPERIENCE • ENJOY" under the wordmark in English contexts.

### Named Rules
**The Thai Is Never Spaced Rule.** Letter-spacing and uppercase apply to Latin text only. Thai is always set at 0 tracking. The Thai counterpart of the Latin tagline is a plain Prompt line, as the board does with "ออกเดินทางไปเชียงใหม่ ในแบบที่เป็นคุณ" under a brush underline.

**The One Script Rule.** The handwritten face appears at most once per page, in Latin, as decoration. It never carries information and never sets Thai.

## Layout

- **Container:** 1280px max content width; side gutters 16px on phones, 24px on tablets, 32px on desktop. No horizontal page scroll at 320px.
- **Hero (board's centre panel):** the nav bar sits above a full-width photograph; title, one-line subtitle and the search pill are left-aligned in the left half, over the quiet part of the photo. The hero is a share of the viewport (about 80svh on desktop, shorter on phones), not `100dvh`, so the next section shows.
- **Section rhythm:** heading with its hairline, then content. Vertical gaps step with content (48px between related blocks, 96px between sections on desktop, 64px on phones) rather than one large gap everywhere.
- **Category row:** tiles in a horizontal row with a round "next" button at the end (board: four tiles and an arrow on desktop). On phones the row scrolls with a snap and the next tile peeks in at the edge.
- **Place card:** horizontal, photo left (about 40%), text right, round arrow button bottom-right. In a list on phones it stays horizontal; in a grid on desktop it may stack photo-over-text at the same radius.
- **Phone first:** the board's phone shows the order of the home page on a phone: logo and menu, hero with search, then "Popular destinations" with "See all".
- **Spacing scale:** 4, 8, 16, 24, 32, 48, 64, 96px.

## Elevation & Depth

Mostly flat with tonal layers: paper page, surface cards, mist controls. Shadow is used only for things that float above a photograph or the page: the search pill on the hero, a place card, a dropdown, a dialog, a floating action bar on the planner. Shadows are soft and tinted with the green, never grey-black.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 10px 30px -12px rgba(29, 56, 53, 0.25)`): search pill on a photo, place cards, the planner's floating bar.
- **Lift** (`box-shadow: 0 18px 40px -16px rgba(29, 56, 53, 0.30)`): menus, dialogs, a card being dragged.

### Named Rules
**The No Frosted Glass Rule.** No `backdrop-filter` on cards, chips or buttons. The nav bar is solid (Surface or Paper); over the hero it may sit on Surface at full opacity.

## Shapes

- **Pills** (9999px) for every control a finger presses: buttons, chips, search, icon buttons, the round arrow on a card.
- **Soft rectangles** for content: place cards and category tiles at 16px, the photo inside a card at 12px, the hero frame and large media at 24px on desktop.
- **Circles** hold icons: a line icon (lucide, 1.75px stroke) centred in a 44px Mist circle.
- **Hand-drawn accents**: the four-point sparkle (orange) and a single brush underline (orange) under a tagline. At most one of each per page.
- No card inside another card. A day in the planner is a surface; the stops inside it are rows separated by space and hairlines, not nested cards.

## Components

Specified by the board and drawn in full in the Phase 1 prototypes (`docs/rebuild/phase-1-design/assets/system.css`). Phase 2 turns them into code in the app.

### Buttons
- **Shape:** full pill (9999px), 48px tall, label weight 500, optional trailing arrow icon.
- **Primary:** Chiang Mai Green fill, Paper text ("Plan Your Trip →" / "วางแผนทริป →"). One primary per view.
- **Secondary:** Mist fill with a 1.5px Chiang Mai Green border and green text ("Learn More →").
- **Hover / Focus:** hover deepens to Chiang Mai Green Deep and nudges the arrow 2px right. Focus shows the existing always-on focus ring, offset 2px, in Chiang Mai Green on light and Lanna Sand on dark.
- **Icon button:** 44px Mist circle, green line icon (pin, calendar, camera, heart, share). Always has an accessible name.

### Chips
- **Style:** Mist pill, Ink label, 44px tall (board: Nature, Culture, Food, Lifestyle, Travel Tips).
- **State:** selected is Chiang Mai Green fill with Paper text and a check icon, so selection does not rely on colour alone.

### Cards / Containers
- **Place card:** Surface ground, 16px radius, Float shadow, 12px inner padding. Photo left at 12px radius. Title in Title style; a location line with a pin icon in Stone Ink; one line of true meta (zone · typical time there · price level); round green arrow button bottom-right.
- **No-photo place card:** about two-thirds of places have no photograph. Their image area becomes a Lanna Sand tile with the category's line icon in a green circle and the zone name. It is the normal case, designed as carefully as the photo case.
- **Category tile:** photograph filling a 16px-radius tile, a centred line icon and the category name in Paper. A scrim sits under the label so the text measures at least 4.5:1 against the brightest pixel beneath it.

### Inputs / Fields
- **Search:** Surface pill, 56px tall, search icon left, placeholder in Stone Ink, round Chiang Mai Green submit button with an arrow on the right. Float shadow when it sits on a photo.
- **Other fields:** Mist fill, 12px radius, 48px tall, Ink text, label above in Label style.
- **Focus:** 2px Chiang Mai Green border plus the focus ring. Errors use text and an icon, not colour alone.

### Navigation
- **Desktop:** wordmark left; links centre (หน้าแรก, สำรวจ ▾, คู่มือ, เกี่ยวกับเรา), Label style, active link underlined in green; search icon and the primary "วางแผนทริป →" pill on the right. The planner is that pill, not a second link. Links that open a menu carry a chevron.
- **Phone:** wordmark left, menu button right; the primary action stays visible in the hero rather than hidden behind the menu. Every page but home puts a back chevron (44px, plain) before the logo: it goes back when the previous page is on this site and replaces the page with its parent otherwise, so it never leaves the site. Below 360px those pages show the mark without the wordmark so the bar still fits at 320px.
- Secondary controls (language, theme, sign-in) live in the menu, not the bar.

### Hero
Real photograph, title in Display, one-line subtitle, search pill. Photo caption with place name and credit in the lower corner. No autoplay carousel: if more than one hero photo is offered, the viewer changes it.

## Motion

**Motion thesis: "The light settles, the path draws itself."** Movement on this site is the last hour of light on the mountain: things arrive softly, out of a slight blur, and come to rest. Two authored moments carry the voice; everything else is quiet support. Magic UI components are used where they fit, installed with `npx shadcn@latest add @magicui/<name>` into `src/components/magicui/` and then reworked to these rules (Magic UI's model is that you own the copied code). Keyframes and reveal styles live in `src/app/motion.css`.

### The two authored moments
- **Arrival (home hero).** The photograph settles like a camera coming to rest (scale 1.07 → 1 over 2.4s). The title rises out of a soft blur line by line (Magic UI TextAnimate, `by="line"`), then the subtitle (300ms), search (420ms) and chips (540ms). Everything is usable by about 1.4s. The place page, guide and About page use a shorter version of the same arrival.
- **The day draws itself (home planner band).** When the sample day scrolls into view: stop one, the dashed leg drawn down to stop two, stop two, and so on, then the totals, with the budget counting up (Magic UI NumberTicker). A slow light in sunset and sand runs around the card on the green band (Magic UI BorderBeam), only while it is on screen.

### Quiet support
- **The mark** in the header draws its ridge in one stroke and lights the sparkle last, once per page load. Pointing at the logo turns the sparkle a quarter.
- **Section hairlines** draw out from the title as the section comes into view. **The brush** is painted on from left to right. **The script line** on the home closing is written by hand, left to right.
- **Lists that appear as lists** (category tiles, featured places, guides, About values and sources) arrive one by one (Magic UI BlurFade, `stagger`), capped at the sixth item so nothing waits long.
- **Reading:** a guide shows how far through you are in a 3px bar along the foot of the header (Magic UI ScrollProgress), in the voice colour.
- **Feedback:** saving a place pops the heart and sends one ring out from it. Buttons nudge their arrow; tiles lift; photos in cards zoom slightly.

### Loading
**Waiting is the light passing over the valley, and the path being walked.** The pieces live in `src/components/brand/loaders.tsx` and `nav-progress.tsx`; their CSS is the "Waiting" block of `motion.css`. Every loop is one pass and then a rest, on a 2.4s rhythm, never a constant throb.

- **Skeleton (`<Skeleton>`).** The shape of what is coming, in the well colour (maps use the map style's own paper). One soft band of sand-warmed light crosses the screen; it is fixed to the viewport, so it passes over every block together instead of each block flickering on its own. Used by the planner before the saved plan is read and by the place page's weather. Replaces Tailwind's `animate-pulse`.
- **The walked mark (`<MarkLoader>`).** The brand mark rests faint; a short stretch of light walks the ridge from the left foot over the summit and down, and the sparkle catches the light as the walker crosses under it. Shown in a map's frame while MapLibre loads (with the label, after 400ms, so a quick map shows only the skeleton) and beside the AI planner's "putting your places into days" line.
- **The label (Magic UI AnimatedShinyText).** The words that say what is being waited for, resting in Stone Ink with a highlight in the voice colour crossing them. Reworked so contrast never drops: the original fades the text to 70% and sweeps black or white across it.
- **Route dots (`<RouteDots>`).** Three stops joined by a dashed leg, lighting in turn, the width of an icon. They take the icon's place in a button that is working (saving, copying, signing in, deleting, optimising the route, asking the AI) instead of a spinning circle. A working button is `aria-busy` and keeps its full colour: busy is not unavailable.
- **The page line (`<NavProgress>`).** When a link to another page is clicked and that page takes longer than 120ms, a 3px line in the voice colour runs along the top edge of the window, slowing as it goes; it finishes and fades when the page lands. A prefetched page that arrives at once shows nothing.

There is deliberately **no `loading.tsx`** and **no splash screen**. A `loading.tsx` streams every page, which locks the response at 200, so a missing place or trip could no longer answer 404 (the brand 404 page and the trip-token 404s depend on it). A splash would hide the hero photograph, the page's largest paint. The page line is the navigation feedback instead.

### Timing and curves
| Use | Duration | Curve |
|---|---|---|
| Feedback (hover, press, toggle) | 150–200ms | `--ease-brand` |
| Heart pop and ring | 420–560ms | `--cmj-ease-out` |
| Reveal on scroll | 800ms, 80–100ms between items | `--cmj-ease-out` (0.16, 1, 0.3, 1) |
| Focal entrance (title, route step) | 650–900ms per step | `--cmj-ease-out` |
| Lines drawn or written | 480ms–1.7s | `--cmj-ease-draw` (0.45, 0, 0.2, 1) |
| Photo settling | 2–2.4s | `--cmj-ease-out` |
| Waiting loops (skeleton light, label, walked mark) | 2.4s: one pass, then a rest | `--cmj-ease-draw` or (0.4, 0, 0.2, 1) |
| Route dots | 1.2s, 180ms between stops | `--cmj-ease-draw` |
| Page line | shown after 120ms, runs 10s towards 92%, finishes in 260ms | (0.08, 0.7, 0.2, 1), then `--cmj-ease-out` |

No bounce or elastic curves. Exits are not animated.

### Named Rules
**The Fail Visible Rule.** Nothing is hidden in the server's HTML by a script. Arrivals above the fold are CSS keyframes that end opaque and never wait for hydration. Reveals on scroll hide only what is still below the fold after hydration. With JavaScript off, every element is present (checked: 27 of 27 visible). Magic UI's originals start at `opacity: 0` until React runs; ours do not.

**The Largest Paint Moves, Never Hides Rule.** The hero photograph is the page's largest paint. It may scale, but it is never faded or delayed.

**The Reduced Motion Rule.** Under `prefers-reduced-motion`, every entrance, draw, settle, beam and pop is switched off outright, delays included, so nothing waits to appear. The reading bar stays, because it only follows the reader's own scrolling. Waits stand still: the skeleton is its plain shape, the label plain text, the mark whole, the route dots all lit; the page line appears in place and fades, without travelling.

**The Operate Quietly Rule.** Explore, the planner, my trips and account are places to work. They get feedback only, never load choreography.

**The One Sunset Rule applies to motion too.** The moving sunset things (the beam, the sparkle, the heart ring) never move on one screen at the same time.

### Don't
- **Don't** use Magic UI's loud effects here: particles, meteors, globe, confetti, rainbow or shimmer buttons, marquees, sparkles around text. They break the calm, photo-led character.
- **Don't** add light rays, flares or glow over a real photograph. The photo is a record of a real place; the hero's warm grade is colour only.
- **Don't** reveal every section on scroll. Reveal lists that appear as lists, and leave reading text still.
- **Don't** loop anything that is off screen.
- **Don't** use a spinning circle or a pulsing block for a wait. Use the route dots, the skeleton's light, or the walked mark, and always say in words what is being waited for.

## Do's and Don'ts

### Do:
- **Do** use only real photographs of the place they are labelled with, graded with one shared warm, golden-hour treatment so the set reads as one series.
- **Do** keep text on light grounds in Ink, Stone Ink or Chiang Mai Green (The Green Holds the Words Rule).
- **Do** make every pressable control at least 44 × 44px and pill-shaped.
- **Do** design the no-photo card (Lanna Sand tile + icon + zone) as the main case.
- **Do** put a measured scrim under any text that sits on a photograph, and limit text-on-photo to the hero and category tiles.
- **Do** set all Thai with zero letter-spacing and body text at 17px or larger.

### Don't:
- **Don't** copy the board's star score "4.8 (12k+)". The product has no public reviews; the card's meta line shows true facts instead.
- **Don't** use the board's photographs on the site. They are illustrations of a mood, and the product never shows a generated image of a real place.
- **Don't** use leaf, sand, orange or lavender as text colours on paper or surface.
- **Don't** add frosted glass, autoplay carousels, kickers above headings, or a dark gradient over a whole card photo.
- **Don't** track or uppercase Thai, and don't set the handwritten script in Thai.
- **Don't** ship the board's mountain-and-sparkle mark as the logo before the owner approves it. The Phase 1 prototypes use it, redrawn as SVG, because the owner asked for everything to start fresh; it replaces the city-wall mark only after approval at the Phase 1 gate, and PRODUCT.md's Brand Commitments are updated then.
