# Where the place data came from

This documents the sourcing for the 101 places in `src/data/places/`, so anyone
grading or maintaining this project can tell verified fact from editorial
judgment. Read it alongside [PHASE0-TODO.md](../PHASE0-TODO.md), which covers the
same distinction for the original 26 places.

## Coordinates — OpenStreetMap (verified)

Every place added in this pass has coordinates taken from an
[OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) search result,
not estimated from a map by eye. Candidates whose Nominatim result fell outside a
Chiang Mai province bounding box, or matched an obviously different entity, were
**dropped rather than guessed** — that is why a few well-known venues are absent
(Tong Tem Toh, David's Kitchen, Rustic & Blue, Barn & Bed, Nakara Jardin,
Wat Ban Den, Khao Soi Mae Sai). `src/data/places.test.ts` re-checks every
coordinate against the province bounds on each test run.

OSM data is © OpenStreetMap contributors, ODbL 1.0.

## Opening hours — mixed

Two different confidence levels, distinguished by the `dataLastVerified` field:

| `dataLastVerified` | Meaning | Count |
|---|---|---|
| `"2026-08-12"` | Hours read from the `opening_hours` tag of the matching OpenStreetMap object (fetched via the Overpass API on that date), where the OSM object's name clearly matched the intended place | 26 |
| `null` | Hours are an editorial estimate from the place's own character and general knowledge — **not checked against a live source** | 75 |

Where the Overpass query returned an `opening_hours` tag belonging to a
*neighbouring* business rather than the target (a 7-Eleven next to the market, a
café beside the temple gate), that value was discarded and the place was left at
`dataLastVerified: null`. The `openingHoursText` for those places is deliberately
hedged ("roughly", "or until sold out") so the display copy does not overclaim.

**Before treating any of this as authoritative** — for example before showing a
hard "closed today" message — spot-check the highest-traffic places against the
venue's own page and set `dataLastVerified` to the date you checked.

## Michelin tags — verified against the MICHELIN Guide (2026-08-12)

The `michelin` tags were checked against the MICHELIN Guide's own Chiang Mai
Region listing (54 restaurants) and its Bib Gourmand filter (18 restaurants), not
from memory. Only these four of our restaurants appear in the Guide at all:

| Place | Distinction |
|---|---|
| `meena-rice-based-cuisine` | Bib Gourmand |
| `huen-muan-jai` | Bib Gourmand |
| `khao-soi-mae-sai` | Bib Gourmand |
| `blackitch-artisan-kitchen` | Selected (in the Guide, no Bib) |

> **Correction (2026-08-13):** the line below originally listed `rote-yiam-beef-noodle`
> among the places *not* in the Guide. That was wrong. The Guide has a full
> inspector entry for it ("For over 30 years, this renowned shop has been famous
> for its beef noodles… don't miss the coconut ice cream!"), so it is listed and
> now carries an `awards` entry. The 2026-08-12 pass missed it because the Guide's
> region listing was read as a page of results rather than searched per restaurant.
> Huen Phen, SP Chicken, Cherng Doi and Lert Ros were re-checked on 2026-08-13 and
> still show no Guide entry.

Everything else on our restaurant list is **deliberately untagged** — several
places widely described online as "Michelin restaurants" (Huen Phen, SP Chicken,
Cherng Doi, Lert Ros) are not in the Guide's Chiang Mai listing, and
tagging them would make the site assert something false. Tags distinguish
`michelin bib gourmand` from `michelin selected` because they are not the same
award; both also carry a bare `michelin` tag plus Thai search terms so the explore
search and the AI planner match either spelling.

**`khao-soi-mae-sai` coordinate note:** this place was dropped in the earlier pass
because its name did not geocode. The Guide lists its address (29/1 Ratchaphruek
Road, Chang Phueak), so the coordinate here is a geocode of that **street
address**, accurate to the road rather than the shopfront — no OSM POI exists for
it. Its Michelin status and address are verified; its opening hours are still an
estimate, which is why `dataLastVerified` remains `null`.

## Restaurant depth fields — `story`, `signatureDishes`, `awards`, `insiderNotes` (2026-08-13)

These four optional fields are filled for the 16 `restaurant` places only. Every
claim below came from a source checked on 2026-08-13; **where nothing could be
confirmed the field was left empty rather than filled in plausibly.** That is why
some restaurants have a founding year and others do not.

| Place | What was confirmed | Source used |
|---|---|---|
| `khao-soi-lamduan-faham` | Opened 1943 (พ.ศ. 2486), 2nd-generation heir Wanida Mahadilok | Bangkok Biznews (two features) |
| `huen-phen` | "More than 62 years" in business | The restaurant's own site + its Nimman branch page |
| `huen-muan-jai` | Opened 2011 by former TV chef Charan Thipeung; name means "happy home"; Bib Gourmand in the 2026 Guide | MICHELIN Guide entry |
| `khao-soi-mae-sai` | Passed down from the owner's grandparents, ~30 years; Bib Gourmand in the 2025 *and* 2026 Guides | MICHELIN Guide entries (two editions) + Wongnai owner interview |
| `rote-yiam-beef-noodle` | Over 30 years; Chinese-herb broth; offal and beef balls made daily | MICHELIN Guide entry |
| `blackitch-artisan-kitchen` | 16 seats; 10+ course seasonal tasting menu; chef Phanuphol Bulsuwan ferments in-house, taught by his grandmother | MICHELIN Guide entry |
| `meena-rice-based-cuisine` | In the Lhong Him Kaw creative community; five-coloured rice | MICHELIN Guide entry |
| `sp-chicken` | 39 years; rotisserie | The shop's own Facebook page |
| `cherng-doi-roast-chicken` | Crispy-skin chicken at ฿85 | TrueID food review |
| `lert-ros` | Trading since 1986; down an unmarked lane off Ratchadamnoen | The restaurant's Facebook page (`LertRosRestaurant1986`) |
| `aroon-rai` | Widely called the city's oldest northern restaurant; grinds its own pastes | "เชียงใหม่มีเรื่องเล่า" feature + Wongnai |
| `free-bird-cafe` | Charity café funding Thai Freedom House; founded by Lisa Nesser; vegan | Grassroots Volunteering, Chiang Mai Citylife, Read The Cloud |
| `ginger-farm-kitchen` | Began as a farm in Saraphi; "farm to city"; no MSG | The company's own site + Facebook |
| `khum-khantoke` | Founded by Dr Watchara Tantranon; 20+ years; nine performance sets | Review Chiang Mai + the venue's own page |
| `khao-soi-khun-yai` | Beside Wat Kuan Kama at Sri Poom Soi 8; 10:00–14:00 | MGR Online + Wongnai reviews |
| `kao-soy-nimman` | Over a decade in Nimman Soi 7 | LINE Today feature |

**Award years are mostly `null` on purpose.** The Guide publishes one edition at a
time and Thai coverage says things like "five years running" without naming the
first year. `firstYear: null` means *we know it holds this, not since when* —
back-computing a year from a press phrase and printing it as fact is exactly the
error this field exists to avoid. `khao-soi-mae-sai` is confirmed in two separate
editions (2025 and 2026) but its first year is still unknown.

**Claims deliberately not recorded:**

- `kao-soy-nimman` is described as a Michelin Guide restaurant by Trip.com and at
  least one blog, but no `guide.michelin.com` entry was found for it. No `awards`
  entry was added.
- `huen-muan-jai` is said by one Thai review site to have started in Sydney. The
  Guide's own entry says former TV chef, opened 2011, and says nothing about
  Sydney — so the Sydney detail is omitted.
- Founding years for `khao-soi-khun-yai`, `kao-soy-nimman` (beyond "over a
  decade"), `cherng-doi-roast-chicken` and `aroon-rai` could not be confirmed and
  are absent.

**Also found, not yet in the catalogue:** `Khao Soi Mae Manee` has a MICHELIN Guide
entry in Chiang Mai and is a candidate for a future pass.

## Ratings — editorial

The `rating` field is an editorial score in the same spirit as the original 26
places. It is *not* a scraped aggregate from any review platform, and should not
be presented as one.

## Judgment-call fields

`exposure`, `rainSensitivity`, `dustSensitivity`, `physicalIntensity`,
`priceLevel`, `durationMinutes`, `bestTime` and `bestTimeWindows` are all
assessments made from each place's character, exactly as described in
PHASE0-TODO.md section 4. They are reasonable, not measured.

## Known modelling compromises

- **Huen Phen** runs two separate services (daytime rice-and-curry counter,
  evening antique dining room). `Place.openingHours` holds a single window, so it
  is set to the evening service — the one the restaurant is known for — with the
  daytime counter expressed as a `bestTimeWindows` entry and both spelled out in
  `openingHoursText`.
- **Khagee** is widely documented as opening only Thursday–Sunday, but that was
  not confirmable against a live source here. `closedOnDays` reflects the
  documented pattern with `dataLastVerified: null`, and the localTip tells the
  visitor to check the shop's own page rather than trust this listing.
- **Doi Luang Chiang Dao** and **Kew Mae Pan** both close for much of the wet
  season. `seasonalClosure` is left `null` because the exact annual dates shift
  and could not be verified; the closure is stated prominently in the description
  and localTip instead. If you can confirm the dates, add a `DateRange` so the
  planner's feasibility check can warn about it.
- **Chang Phueak Gate Night Market** covers the famous khao kha moo stall (the
  "cowboy hat lady") within its own entry rather than as a separate place —
  Nominatim could not resolve the stall to a trustworthy coordinate of its own.

## Deliberate exclusions

- Pubs, bars and nightclubs, per the project owner's scope for this pass.
- Elephant riding and tiger attractions, consistent with the site's existing
  `ethical-elephant-sanctuary` framing.

## Photos

`Place.photoQuery` drives `npm run fetch:photos`. It is set only for public
landmarks a stock photo can honestly depict (temples, waterfalls, gates,
markets) and is **deliberately absent for named businesses** — a Pexels photo of
a generic "Thai coffee shop" captioned as Ristr8to would misinform the visitor.
Those places fall back to `<PlaceImage>`'s illustrated gradient, which claims
nothing.
