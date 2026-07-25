# Phase 0 data TODO — for the project owner

Everything below is either `null`, an editorial estimate, or a judgment call I made from the site's *existing* description/localTip copy rather than a live source I checked today. None of it was invented from nothing, but none of it has been checked against an official source either — please verify before treating any of it as authoritative (e.g. before showing a hard "closed today" message to a user).

## 1. `dataLastVerified` — null for all 26 places

No place's practical details (hours, dress code, booking requirements) have been checked against a live source as part of this work. Every place currently has `dataLastVerified: null`. Recommend spot-checking the highest-traffic places first (temples, Doi Inthanon, the two walking streets) and setting this field to today's date once confirmed.

## 2. `seasonalClosure` — null for all 26 places

No place has a currently-known renovation/seasonal-closure window on record. If any of these close for a period (e.g. a temple's annual restoration month), add a `DateRange` here — until then, the scheduler will never warn about a seasonal closure it doesn't know about.

## 3. `openingHours` (structured) — null for 2 places

These describe a *collection* of independently-run venues rather than one place with one opening/closing time, so a single `{opens, closes}` pair would misrepresent them:

- **Nimmanhaemin** (`nimmanhaemin`) — "Shops vary; cafés from 8:00 AM" has no common closing time.
- **Northern Thai Cooking Class** (`thai-cooking-class`) — two alternative class start times (9:00 AM or 1:00 PM), not a single continuous opening window. Modeled instead as two `bestTimeWindows` entries.

Everywhere else, `openingHours` was structured directly from the site's existing `openingHoursText` copy (the display string was already there from earlier work — this just parses the same fact into `{opens, closes}` + `closedOnDays`). Worth a spot-check since a few of those source strings said "roughly" or "most" (Riverside on the Ping, Old City Coffee Trail, most spas, elephant sanctuary programmes) — I kept the stated time range as the structured value, but flag if that's too precise for what was originally a loose approximation.

## 4. Editorial-judgment fields (not verified facts)

`exposure`, `rainSensitivity`, `dustSensitivity`, `physicalIntensity`, and `dressCode` are assessments I made from each place's own description text (e.g. Doi Suthep's 306-step staircase → `physicalIntensity: 3`; Mon Cham's fog-sea being the whole point → `dustSensitivity: "high"`), in the same spirit as the pre-existing `rating`/`priceLevel` fields. They're reasonable, but they're editorial calls, not measurements — worth a pass by whoever knows these places firsthand, especially:

- **`physicalIntensity`** for the hiking-adjacent nature places (Doi Inthanon, Bua Tong, Mae Kampong) — I rated these off the description text alone, not firsthand difficulty knowledge.
- **`requiresBooking`** — set `true` only for the cooking class, elephant sanctuary, and Riverside on the Ping (each has explicit "book ahead" language in its own copy). Everything else defaults `false`; if any spa, restaurant, or homestay genuinely requires booking, flag it.
- **Mae Kampong's homestay** — the *village* itself needs no booking (`requiresBooking: false`), but an overnight homestay does. That distinction isn't captured by this single boolean; worth a dedicated field if overnight stays become a first-class feature later.

## 5. `bestTimeWindows` populated for ~12 of 26 places

Only populated where the existing description/localTip already gave a specific, concrete time recommendation (e.g. Mon Cham's sunrise fog, Wat Suan Dok's pre-sunset window, Doi Inthanon's "before 7 AM"). The other ~14 places have `bestTimeWindows: []` — not wrong, just not yet backed by a specific-enough claim to structure. Feel free to add real windows as they're identified; empty is meant to mean "nothing specific documented yet," not "no good time exists."

## 6. Architecture note: Trip data model

Per the Phase 0.2 spec, `Trip`/`TripDay`/`TripStop` types now exist in `src/data/types.ts`. The trip **store** (`src/lib/trip-store.ts`) keeps its existing `dayIds`/`containers` shape as the actual persisted/drag-and-drop storage (zero UI changes, zero migration risk to the 12 components that read it) and derives the canonical `Trip` snapshot on demand via the new `buildTripSnapshot()` function — Phase 2+ should read trip data through that function rather than reaching into `dayIds`/`containers` directly. `TripStop.plannedArrival`/`userLocked` currently always derive as `null`/`false` since no UI sets them yet (that's Phase 3.3's timeline); when that's built, the store will need real per-stop persistence for those two fields.
