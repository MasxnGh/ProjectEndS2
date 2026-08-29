# Where the place data came from

This documents the sourcing for the 193 places in `src/data/places/`, so anyone
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

## Award reference links (2026-08-15)

Every `awards[]` entry carries a `sourceUrl` and a `sourceName`, rendered on the
place page as "check the source at <publisher>", opening in a new tab.

| Place | Reference | Publisher |
|---|---|---|
| `khao-soi-mae-sai` | `/michelin-khao-soi-mae-sai` | ThailandAddict |
| `huen-muan-jai` | `/michelin-huen-muan-jai` | ThailandAddict |
| `meena-rice-based-cuisine` | `/michelin-meena` | ThailandAddict |
| `rote-yiam-beef-noodle` | `restaurantguru.com/Rote-Yiam-Beef-Noodle-Chiang-Mai` | Restaurant Guru |
| `blackitch-artisan-kitchen` | `wongnai.com/restaurants/130076cC-blackitch-artisan-kitchen` | Wongnai |

**These deliberately do not point at guide.michelin.com, and that was learned
the hard way.** An earlier pass linked to
`guide.michelin.com/en/th/chiang-mai-region/chiang-mai/restaurant/<slug>`,
verified only by finding the pages in a search index. The prefix was wrong —
the Guide uses `<country>/<language>`, so `en/th` is backwards — and the first
person to click the link got Michelin's 404 page.

The reason the mistake survived review is worth recording: the host cannot be
checked from here. It answers automated requests with an empty `202`,
**identically for a real slug and for the invented control
`this-restaurant-does-not-exist-12345`**, and answers a real browser automation
with a CloudFront `403`. So no fetch against that host distinguishes a working
URL from a broken one, and a "verified" link there is not verified at all.

Each URL in the table above was instead opened and confirmed to (a) return 200
with real content and (b) name both the restaurant and its Michelin
distinction. `places.test.ts` now refuses any `sourceUrl` on `michelin.com`,
and requires a `sourceName` alongside every link.

**Known discrepancy, not resolved.** Restaurant Guru and AutoReserve both
describe `rote-yiam-beef-noodle` as **Bib Gourmand**, while our `awards` entry
claims only "listed in the MICHELIN Guide". The weaker claim is kept on purpose:
it is true under either reading, and without reaching Michelin itself there is
no way to adjudicate. Understating an award is a smaller error than inventing
one.

**These are third-party write-ups, not the awarding body.** The place page says
so in as many words, so a reader is not led to believe they are clicking
Michelin.

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

`npm run fetch:photos` pulls freely-licensed photography from Wikimedia Commons
via Wikidata. A photo is used only when three independent things agree: Wikidata
attaches the image to an entity (P18), that entity's coordinates (P625) are
within 400m of ours, and its type (P31) is the same kind of thing we are
describing. Anything else keeps `<PlaceImage>`'s illustrated gradient, which
claims nothing.

This replaced a keyword search against Pexels, which asked for "specialty coffee
shop Thailand" and captioned whatever came back with a specific place's name. Of
its 26 downloads, only 4 could be shown to depict the place named; three showed
somewhere else entirely, including a temple 700km away in Pattaya, and one
street-food photo was serving as four different markets at once. All 26 were
audited and 21 deleted.

Even the replacement needed auditing. Its first run accepted 41 photos and five
were wrong — a town standing in for the temple above it, a telescope dome for
Doi Inthanon — which is what the P31 type gate and the Thai-name fix now catch.
Accepted matches, with distance and licence, are recorded in
`scripts/commons-results.json`; the rules themselves are covered by
`src/lib/commons-match.test.ts`, and every published photo is credited on
`/credits` because CC BY-SA requires it.

## Province-wide expansion — 91 places added (2026-08-20)

The catalogue went from 102 places to **193**. The earlier passes covered the
city and its immediate ring; this one was aimed at the rest of the province, so
most of what was added is an hour or more outside the moat.

### Coordinates — OpenStreetMap Nominatim, same rule as before

Every one of the 91 new places was geocoded through
[Nominatim](https://nominatim.openstreetmap.org/), searched inside a Chiang Mai
province bounding box, and **anything that did not resolve was dropped rather
than estimated**. Around 130 distinct candidates were queried across four passes; roughly 30 never
returned a usable match and are not in the data — among them Ban Pa Bong Piang's
rice terraces, the San Pa Tong buffalo market, Somphet market, the Doi Pui Hmong
village, Mae Kuang dam, and a long list of named cafés and restaurants (Tong Tem
Toh, Kiat Ocha, David's Kitchen, Rustic & Blue, The Barn, Omnia, Akha Ama Living
Factory, Graph Ground, Pun Pun, The Riverside). That is why this pass added 26
nature places and only 6 cafés: OSM covers public landmarks well and Thai
shopfronts badly.

A further six results were **rejected after inspection** because the returned
object was the wrong entity even though it was inside the bounding box:

| Query | What Nominatim returned | Why rejected |
|---|---|---|
| วัดเม็งราย | Wat Sri Suphan | Different temple, already in the catalogue |
| น้ำพุร้อนโป่งเดือด (pass 3 wording) | ดอยผาสามเส้า, Mae Taeng | Unrelated feature |
| ดอยเวียงผา | A point in Mae Suai | Chiang Rai province, not Chiang Mai |
| อุทยานแห่งชาติแม่ปิง | A point in Li | Lamphun province |
| ตลาดแม่มาลัย | "มาลัย", Doi Saket | Wrong place, wrong district |
| Paak Dang | บ้านริมปิง | Name did not match |

Three coordinates are **deliberately approximate and flagged here** rather than
presented as exact:

- **`ang-ka-luang-nature-trail`** uses the Doi Inthanon summit pin. The boardwalk
  starts a couple of hundred metres from it; no separate OSM object for the trail
  could be resolved.
- **`tham-tap-tao-forest-park`** uses the pin for Ban Tham Tap Tao, the village
  beside the forest park, for the same reason.
- **`kad-suan-kaew`** matched a police service point inside the mall complex. The
  coordinate is the mall; the OSM object's name is not.

### Opening hours

17 of the new places carry an `opening_hours` tag from the matching OSM object
and are marked `dataLastVerified: "2026-08-20"`. Everything else keeps `null`,
with `openingHoursText` hedged ("roughly", "or until sold out") so the display
copy does not overclaim. Two judgment calls worth recording:

- **`chiang-mai-gate-market`** — OSM tags it `Th-Mo`, i.e. closed Tuesday and
  Wednesday. That does not match a market this size and a wrong "closed today"
  banner is worse than a vague one, so the tag was **not** used: hours are stored
  open-daily and `dataLastVerified` stays `null`.
- **`dara-pirom-palace-museum`** — the tag is written with German day
  abbreviations (`Mi-So`), i.e. Wednesday–Sunday. Mixed-locale tagging is a
  quality signal, but the value is at least internally coherent, so it was used
  as `closedOnDays: [1, 2]`. Re-check before relying on it.

### Ratings are editorial, not scraped

`rating` on every new place is an editorial judgment in the 4.0–4.8 band, the
same convention the existing catalogue uses. These are **not** Google or TripAdvisor
scores and should not be presented as aggregate review data anywhere in the UI.

### New districts

Thirteen amphoe were added to the `District` union, with en/th labels and explore
filter pills: Mae Ai, Fang, Chai Prakan, Wiang Haeng, Phrao, Mae Taeng, Doi
Saket, Mae On, Galyani Vadhana, San Pa Tong, Hot, Omkoi and Doi Tao. Every one of
them has at least one place — a district pill that filters to zero results would
be a bug, so none were added speculatively. Mae Chaem was considered and left
out for exactly that reason: its candidate places (Pa Bong Piang, the teen jok
weaving centre) did not geocode, and the Doi Inthanon summit places are filed
under the existing `doi-inthanon` district because that is how a visitor
navigates to them, even though the ridge itself is administratively in Mae Chaem.

### Depth fields

`story`, `awards` and `signatureDishes` remain filled only where something was
actually confirmed. The three new restaurants that carry `signatureDishes` name
the dish and leave `priceThb: null` — no current price could be verified for any
of them. **No new `awards` entries were written**: none of the new restaurants
was checked against the MICHELIN Guide in this pass, and an unverified award
claim is the one thing this file exists to prevent.
