# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: students and young Thai travellers planning a trip to Chiang Mai.** They plan on a phone, usually for one to three days, in a small group, on a student budget. Many are occasional or first-time visitors who know the famous names but not how the city fits together. Their job: turn "I want to go to Chiang Mai" into a day-by-day plan that actually works on the ground.
- **Secondary: English-speaking visitors** using the `/en` version of the same content.
- **Evaluators:** instructors and classmates at Chiang Mai Technical College (วิทยาลัยเทคนิคเชียงใหม่), who see the product presented on a desktop or projector. This is a graduation project; the planner is the feature that gets demonstrated.

## Product Purpose

Chiangmai Journey (เชียงใหม่ เจอร์นีย์) is a Chiang Mai travel guide and trip planner. It exists so a traveller can build a realistic day-by-day itinerary from their dates, budget and chosen places, ordered so that travel time between stops is shortest, then keep it, share it, or print it.

Success is a traveller leaving with a plan they trust: every stop is a real place with real opening hours, the travel times are honest, and the budget figure matches what the day will cost.

## Positioning

A hand-curated guide joined to a planner that does real arithmetic. The catalogue is 203 places chosen and written by the authors, not scraped listings; the planner orders a day by actual travel time and reports feasibility (closures, opening hours, air quality) instead of only collecting bookmarks. The stated idea, in the product's own words: "ไม่ใช่ลิสต์ให้ไล่ติ๊ก แต่เป็นบทหนึ่งของการเดินทาง" — not a checklist to tick off, but a chapter of a journey.

## Operating Context

- Used mostly on a phone, before the trip (planning at home or on campus) and during it (checking the day's order, opening a route in Google Maps).
- Presented on a large screen during the project defence, where the planner is walked through live.
- Thai is the primary language; English mirrors it at `/en`.
- Plans leave the product as a share link, a QR code, or a printed PDF.

## Capabilities and Constraints

- **Catalogue:** 203 places in 8 categories (temple, nature, village & culture, cafe, restaurant, market, museum, activity) across 7 zones defined by the old city square and the directions out from it. 3 long-form guides.
- **Planner (the hero feature):** build a trip from dates, travellers, budget and places; days ordered by shortest travel time; drag to reorder; sample trip; "Plan with AI" (Gemini by default, Anthropic optional) that only ever returns place slugs from the catalogue; per-day feasibility, pace, weather and golden-hour timeline; summary with budget and transport comparison; save, share by link/QR, print to PDF.
- **Explore:** search, category/zone/mood/budget/time filters, grid and map views, "near me", air-quality filter.
- **Place pages:** description, local tip, practical info, weather and AQI, map, compare with another place, nearby places.
- **Accounts:** Google sign-in, My Trips, Favourites, data export and account deletion. Everything except saving works as a guest.
- **Live data:** weather and air quality from Open-Meteo (attribution required); map tiles via MapTiler through the app's own `/api/map/*` proxy; routing via OpenRouteService with a labelled Haversine fallback.
- **Stack:** Next.js 16.2 App Router under `chiangmai-app/src/app/[locale]`, React 19, Tailwind v4, MapLibre, dnd-kit, next-auth v5, zustand, SWR, MongoDB.
- **Protected contracts:** all routes, slugs and query params (`?zone=`, `?category=`), `/trip/[token]`, everything under `src/app/api` (the map style's appearance excepted), auth, MongoDB, route/time/budget logic, and zustand/localStorage state keys.
- **Terminology:** "เวียง" for the old city; zones are named relative to the city wall (ในกำแพงเมือง, ริมคูเมือง, เหนือคูเมือง, …).
- **Units by locale:** Thai UI uses ชม., นาที, ฿ and พ.ศ.; English uses hr, min, ฿ and CE.

## Brand Commitments

- **Name:** Chiangmai Journey / เชียงใหม่ เจอร์นีย์. The current logo is a square mark (the city wall with its four gates) beside the wordmark. A new wordmark may be proposed but is not to be changed without the owner's approval.
- **Voice:** slow travel, personally curated, unhurried. Writes like someone who lives there telling a friend, never like a brochure. Thai copy is written as Thai, not translated word for word from English.
- **Honesty about data:** estimates are labelled as estimates; a photo is shown only when it verifiably depicts the place named.

## Evidence on Hand

- **Place data:** `chiangmai-app/src/data/places/*.ts` (203 entries with coordinates, hours, price level, duration, descriptions and tips in th/en). Sources in `chiangmai-app/docs/places-sources.md`.
- **Guides:** `chiangmai-app/src/data/guides.ts` (3 guides, th/en).
- **Photography:** 56 files in `chiangmai-app/public/images/places/` covering 56 of 203 places, all from Wikimedia Commons under CC BY / CC BY-SA. 36 were matched automatically through Wikidata by name, coordinates and entity type (`chiangmai-app/scripts/fetch-commons-photos.mjs`); 20 are hand-verified picks, each with its evidence recorded (`scripts/commons-picks.json`, `scripts/fetch-commons-picks.mjs`). Credits live in `src/data/photo-credits.ts`. Coverage is uneven: 33 of 37 temples have a photo, nature 13 of 44, villages 8 of 25, markets 1 of 19, museums 1 of 15; cafes, restaurants and activities have none, because Commons holds no free photograph of a specific named business.
- **Guide covers:** 3 files in `chiangmai-app/public/images/guides/`. Their source, photographer and licence are not recorded anywhere in the repository (open item: trace or replace).
- **UI copy:** `chiangmai-app/src/i18n/dictionaries/th.ts` and `en.ts`.
- **Absent, and not to be fabricated:** user reviews, testimonials, visitor counts, awards or "used by" claims, press, and photographs of places that have none. No AI-generated imagery of real places.

## Product Principles

1. **The plan must be true.** Times, distances, costs and closures come from the planner's own calculations and are labelled when estimated. Nothing is rounded into a nicer story.
2. **Curated, not exhaustive.** 203 places chosen by people who went. The product earns trust by what it leaves out.
3. **The city has a shape.** Chiang Mai is a walled square with a moat; orientation by that square is how the product explains where anything is.
4. **Phone first, presentation ready.** Every task completes with one thumb; the planner also has to read clearly from the back of a classroom.
5. **Thai first.** Thai is the source language for copy and the script the typography is built around; English is a full peer, not an afterthought.

## Accessibility & Inclusion

- WCAG 2.2 AA for contrast, focus visibility and keyboard operation, in both light and dark themes.
- Content must be readable with JavaScript animation disabled or stalled, and `prefers-reduced-motion` is respected.
- Drag-to-reorder must have a keyboard path.
- Existing skip link, landmarks and heading structure are kept.
