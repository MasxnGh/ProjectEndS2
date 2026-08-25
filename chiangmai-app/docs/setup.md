# Environment setup

The app works fully without any of these — each feature gracefully falls back
(generated art instead of photos, a schematic map, Haversine-estimated travel
times) when its key is missing. Set them to unlock the real versions.

## Variables

| Variable | Required? | What it's for | Get a key |
|---|---|---|---|
| `SITE_URL` | No | Canonical URL for `metadataBase`, `sitemap.xml`, `robots.txt`, OG tags. Falls back to Vercel's own production URL if unset. | — (your production domain) |
| `MAPTILER_API_KEY` | No | Vector map tiles for Place Detail / Explore / Trip Planner. Server-only, proxied through `/api/map/*`. | https://cloud.maptiler.com/ |
| `OPENROUTESERVICE_API_KEY` | No | Real driving/cycling/walking directions, travel-time matrices, and isochrones for the Trip Planner. Server-only, proxied through `/api/routing/*`. Without it, routing uses a Haversine + terrain-detour-factor estimate instead (labeled as an estimate in the UI). | https://openrouteservice.org/dev/#/signup (free tier) |
| `GEMINI_API_KEY` | No² | Powers **Plan with AI** in the Trip Planner — turns a plain-language request ("temples and a Michelin restaurant, ฿1,000, one day") into a day plan built from this site's places. The default provider, and free. Server-only, proxied through `/api/ai/plan-trip`. | https://aistudio.google.com/apikey (free, no card) |
| `ANTHROPIC_API_KEY` | No² | The alternative provider for the same feature — stronger on hard multi-constraint requests, but **metered and paid**. | https://console.anthropic.com/ |
| `AI_PROVIDER` | No | Pins the provider: `gemini` or `anthropic`. Unset, whichever key is present wins — Gemini first when both are. | — |
| `GEMINI_MODEL` / `ANTHROPIC_MODEL` | No | Override the model. Defaults: `gemini-3.6-flash`, `claude-opus-5`. | — |
| `MONGODB_URI` | No¹ | Connection string for saved trips & favourites. | https://cloud.mongodb.com/ (free M0 tier) |
| `AUTH_SECRET` | No¹ | Signs Auth.js session/CSRF tokens. | `openssl rand -base64 33` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No¹ | Google OAuth client for "Sign in with Google". | https://console.cloud.google.com/apis/credentials |

¹ These four are only needed for **Sign in**, **Save plan**, and the
favourite/heart buttons. Everything else — the Trip Planner itself, Explore,
Guides, Place details — works fully as a guest with none of them set.

² Set **one** of these two — they power the same feature through the same
prompt, so switching providers changes only which model chooses the places.

- **Gemini (default, free).** On the free tier `gemini-3.6-flash` charges
  nothing for input, output, or thinking tokens. The limit is requests per
  minute and per day, not money, so a public deployment can't run up a bill.
- **Anthropic (paid).** Metered: about ฿1–2 per plan request (roughly
  $0.02–0.05). The place catalogue is prompt-cached, so repeat requests cost
  about four times less than the first.

Either way `/api/ai/plan-trip` is rate-limited to 5 requests per 5 minutes per
IP. With neither key set, the **Plan with AI** button never renders and the rest
of the planner is unaffected.

None of these start with `NEXT_PUBLIC_` — they're read server-side only and
never sent to the browser. Every third-party call goes through this app's own
Route Handlers (`/api/map/*`, `/api/routing/*`, `/api/ai/*`, `/api/auth/*`),
which attach the key server-side, so the key itself is never present in client
JS.

## Local setup

1. Copy the template: `cp .env.local.example .env.local`
2. Fill in whichever keys you have — leave the rest blank.
3. Restart `npm run dev` if it was already running (env vars are only read at process start).
4. If `OPENROUTESERVICE_API_KEY` is missing, the server logs a one-line startup warning
   (`src/instrumentation.ts`) so it's obvious routing is running on estimates, not silent.

## Accounts: MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com/ (the M0 tier is enough for this project).
2. **Database Access** → add a database user (username + password, or SCRAM auth) —
   this is separate from your Atlas login. Give it read/write on the database you'll use.
3. **Network Access** → add an IP entry. Vercel's serverless functions don't have a
   fixed IP range, so the practical options are:
   - **Allow access from anywhere (`0.0.0.0/0`)** — this is what Atlas's own Vercel
     integration guide recommends, because you can't allowlist Vercel's IPs directly.
     It's safe **only** because the connection itself is still gated by the database
     username/password in your connection string — `0.0.0.0/0` opens the *network*
     path, not the database. Don't reuse that database user's password anywhere else,
     and don't skip step 2.
   - If you want tighter control, look at Atlas's **Vercel integration** (via the
     Vercel Marketplace) or a **private network** offering — both exist specifically
     to avoid the open network rule, at the cost of more setup.
4. **Connect** → **Drivers** → copy the connection string (`mongodb+srv://...`),
   put your database user's username/password in it, and add a database name to the
   path, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/doi-and-delta?retryWrites=true&w=majority`.
   That's your `MONGODB_URI`.

**Security notes:**
- Never commit `.env.local` (it already isn't — see `.gitignore`) or paste the
  connection string anywhere public; anyone with it has full read/write on that database.
- Rotate the database user's password (Atlas → Database Access → Edit) if it's ever exposed.
- The free M0 tier has a hard connection-count ceiling — this is exactly why
  `lib/db/mongodb.ts` caches one `MongoClient` per warm server instance instead of
  opening a new connection per request (see the comment in that file).

## Accounts: Google OAuth

1. https://console.cloud.google.com/ → create or select a project.
2. **APIs & Services → OAuth consent screen** — set it up (External user type is fine
   for a public site), fill in the app name/logo/support email.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application**.
4. Add **Authorized redirect URIs** — this is the exact path Auth.js expects, one entry per environment:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<your-domain>/api/auth/callback/google`
   - Any Vercel preview domains you actually use the same way, if you test OAuth on previews.
5. Copy the generated **Client ID** and **Client secret** into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

**Do not run `npx auth secret` expecting Auth.js's own tool** — `auth` is a
published npm package name for an unrelated project ("Better Auth"), so `npx auth`
installs and runs *that* CLI, not anything from `next-auth`. Generate `AUTH_SECRET`
with `openssl rand -base64 33` instead (any OS with OpenSSL, including macOS/Linux
terminals and Git Bash on Windows).

## Vercel setup

1. Project → **Settings → Environment Variables**.
2. Add each variable, and tick **all three** of Production, Preview, and Development —
   a variable added with only one scope checked silently won't exist in the others,
   which shows up as "works locally, broken on the deployed preview."
3. **Redeploy** after adding or changing a variable — Vercel does not hot-reload env
   vars into already-running deployments; the next build has to pick them up.

## Verifying it worked

- **MapTiler**: open `/en/explore`, the map should render actual streets/labels
  instead of the plain schematic placeholder.
- **OpenRouteService**: open the Trip Planner with 2+ stops on a day, check the
  Map tab's per-day distance — a real key gives an exact routed distance with
  no `~`; the fallback estimate is prefixed with `~` everywhere it's shown
  (Map tab, day cards, Timeline, Summary → Transport). If you don't see the
  startup warning in the server log and figures are unprefixed, it's wired up.
- **Place photos**: run `npm run fetch:photos` — it pulls freely-licensed images
  from Wikimedia Commons via Wikidata. No key is needed. It accepts a photo only
  when the entity's name, coordinates and type all match the place, so most
  entries are skipped and keep their illustrated placeholder; that is the
  intended result, not a failure. Every accepted photo is recorded in
  `scripts/commons-results.json` and credited on `/credits`.
- **Accounts**: open any page — the nav should show a **Sign in** link. Click it,
  then **Continue with Google**. If `MONGODB_URI`/`AUTH_SECRET`/`AUTH_GOOGLE_ID`/
  `AUTH_GOOGLE_SECRET` are all set correctly, you land on Google's consent screen,
  and after approving, you're redirected back signed in with your avatar showing
  in the nav. A "server configuration" error at this step means one of the four
  is missing or wrong — check the server log, which names the specific problem.
