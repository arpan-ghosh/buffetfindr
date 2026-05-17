# BuffetFindr — CLAUDE.md

## Project overview

BuffetFindr finds Indian (and South Asian) buffet restaurants near users across the DMV, Boston, and NYC.

**Domains**: `buffetfindr.com` (primary), `indianbuffetfinder.com` (redirect/SEO)
**GitHub**: `github.com/arpan-ghosh/buffetfindr` (public)

### Components
| Directory | Purpose |
|---|---|
| `scraper/` | Python — Google Places API (New) scraper + Yelp enricher |
| `web/` | Next.js 15 web app — deployed on Vercel |
| `mobile/` | Expo (React Native) iOS app — submitted to App Store |
| `mcp/` | Node.js MCP plugin — exposes scraper tools to Claude |

---

## Credentials & IDs

| Item | Value |
|---|---|
| Google Places/Maps API key | `AIzaSyBDmaBgMYFmT6QTMvar44x_toK50GhcoTA` (in `scraper/.env` and `web/.env.local`) |
| Vercel token (Full Account) | in project memory — do not commit |
| Apple Developer Team ID | `KAYFZW7626` |
| App Store Connect App ID | `6770199090` |
| Expo Project ID | `bbedaf8c-3d34-4e1f-81da-0de0f098f2aa` |
| Expo account | `arpanghosh95s-organization` |
| Bundle ID | `com.arpanghosh.buffetfindr` |

---

## Data pipeline

```
scraper/data/*.json  →  web/data/*.json  →  Neon DB (db:seed)  →  web + mobile API
```

1. Scraper writes to `scraper/data/{state}_raw.json` and `{state}_buffets.json`
2. Copy buffets to `web/data/` manually
3. `npm run db:seed` (in `web/`) upserts into Neon
4. Web app reads from Neon in production; from JSON files in local dev (auto-detected via `DATABASE_URL`)
5. Mobile app calls the live Vercel API directly

### Scraped regions (current)
| State | Restaurants | Buffets |
|---|---|---|
| Maryland (`MD`) | 217 | 64 |
| Virginia (`VA`) | ~280 | 57 |
| DC | ~50 | 12 |
| Massachusetts (`MA`) | 145 | 42 |
| New York (`NY`) | 357 | 77 |
| **Total** | | **252** |

### Adding a new region
1. Add locations to `scraper/locations.py` → `STATE_MAP`
2. Add state key to `scraper/main.py` `--state` choices
3. Run `python scraper/main.py --state <new_state>`
4. Copy output to `web/data/`
5. Add state to `web/scripts/seed.ts` states array
6. Add region to `web/app/api/restaurants/route.ts` `REGION_FILES` and `REGION_STATES` maps
7. Run `npm run db:seed`

---

## Scraper

### Running
```bash
cd scraper
python main.py --state maryland   # maryland / virginia / dc / massachusetts / new_york / all
```

### Pipeline script (multi-state)
```bash
cd scraper
bash pipeline.sh massachusetts new_york   # scrapes, copies to web/data/, seeds, commits, pushes
```

### Scoring rubric
| Signal | Points |
|---|---|
| "buffet" in restaurant name | +50 |
| 3+ reviews mention buffet | +40 |
| 2 reviews mention buffet | +25 |
| 1 review mentions buffet | +15 |
| Website mentions buffet | +30 |
| Found via "Indian buffet" search query | +20 |
| Buffet in Google editorial summary | +15 |
| Negative buffet signal | −20 |

**Threshold**: score ≥ 30 = included · score ≥ 60 = HIGH confidence

### Re-processing without API calls
```bash
python reprocess.py --state maryland   # regenerates buffets from existing raw data
```
Use after editing `known_buffets_override.json`.

### Manual override format (`scraper/known_buffets_override.json`)
```json
[{ "place_id": "ChIJ...", "name": "...", "address": "...", "state": "MD", "notes": "..." }]
```

### Cuisine scope
**Include**: Indian, Nepali, Bangladeshi, Pakistani, Sri Lankan (all South Asian)
**Exclude**: Central Asian (Uyghur), Chinese, Thai, Japanese, etc.

---

## Web app

### Dev
```bash
cd web && npm run dev   # NEVER run `npm run build` locally — corrupts dev cache
```

Runs on port 3000 (or 3001 if taken). If you see 500 errors after accidental `npm run build`, delete `.next/` and restart.

### Environment (`web/.env.local`)
```
DATABASE_URL=postgresql://...          # Neon (auto-injected by Vercel Marketplace)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Database
```bash
npm run db:generate   # generate Drizzle migration from schema change
npm run db:migrate    # apply migrations to Neon
npm run db:seed       # upsert all web/data/*.json into Neon
```

### Deployment
```bash
cd web
vercel --prod --token <token>
```
Every `git push` to `main` also triggers auto-deploy via GitHub integration.

### Region filters (UI → API mapping)
| Filter label | States queried |
|---|---|
| All | MD, VA, DC, MA, NY |
| DMV | MD, VA, DC |
| Boston | MA |
| NYC | NY |

### Key files
| File | Purpose |
|---|---|
| `app/page.tsx` | Main page: map + list view, filters, header |
| `app/api/restaurants/route.ts` | GET restaurants — Neon in prod, JSON files in dev |
| `app/api/feedback/route.ts` | Thumbs up/down votes |
| `app/api/submissions/route.ts` | User-submitted restaurants |
| `app/privacy/page.tsx` | Privacy policy at `/privacy` |
| `components/RestaurantMap.tsx` | Google Maps with 🍛 pins, pans on region change |
| `components/RestaurantDetail.tsx` | Right-side detail panel |
| `components/FilterBar.tsx` | All/DMV/Boston/NYC + Verified/Likely pills |
| `components/FeedbackButtons.tsx` | Thumbs up/down with vote counts |
| `components/SubmitRestaurantModal.tsx` | User submission form |
| `db/schema.ts` | Drizzle schema: restaurants, restaurant_feedback, restaurant_submissions |
| `db/SCHEMA.sql` | Human-readable schema reference with annotations |
| `scripts/seed.ts` | Loads web/data/*.json → Neon |

### Color theme (Indian palette)
| Token | Value | Usage |
|---|---|---|
| `--orange` / `brand-500` | `#C94A1F` | Burnt tandoor orange — primary CTA |
| `brand-600` | `#A83A14` | Hover states |
| `--gold` / `gold-500` | `#D4891A` | Curry/saffron gold — secondary |
| `--bg` | `#FFF8F2` | Warm parchment background |
| `--text` | `#1C0A00` | Very dark warm brown |
| `--muted` | `#8C6B55` | Warm taupe |
| `--border` | `#EDE0D4` | Warm sand border |

---

## Mobile app (iOS)

### Dev
```bash
cd mobile
npx expo run:ios         # builds native app + installs on simulator (~10 min first time)
# Press 'r' in Metro to hot-reload JS changes
# Native module changes (new packages) require full expo run:ios rebuild
```

> **Note**: `npm install` in `mobile/` requires `--legacy-peer-deps` due to react@19.1.0 vs react-dom@19.2.6 peer conflict. The `.npmrc` file handles this automatically.

### Key files
| File | Purpose |
|---|---|
| `app/_layout.tsx` | Expo Router root layout |
| `app/index.tsx` | Home: full-screen map + list overlay, floating header, bottom tab bar, zoom buttons |
| `app/restaurant/[id].tsx` | Restaurant detail modal |
| `app/submit.tsx` | Submit a buffet form |
| `components/RestaurantCard.tsx` | Horizontal restaurant card for list view |
| `lib/api.ts` | Fetches from live Vercel API; defines `REGION_VIEW` for map pan targets |
| `assets/icon.png` | App icon (1024×1024, Indian thali image) |
| `app.json` | Expo config — bundle ID, plugins, EAS project ID |
| `eas.json` | EAS Build profiles + App Store submit config |
| `.npmrc` | `legacy-peer-deps=true` for EAS build compatibility |

### App Store submission
```bash
cd mobile

# Build production .ipa on Expo cloud (~15-20 min)
npx eas-cli@latest build --platform ios --profile production --auto-submit

# Or submit a specific finished build manually
npx eas-cli@latest submit --platform ios --id <build-id>

# Check build status
npx eas-cli@latest build:list --platform ios --limit 5
```

EAS auto-creates provisioning profiles and signing certs using the App Store Connect API Key (`XB58UNGHLW`) stored on Expo's servers.

### App info
- **App name**: BuffetFindr
- **Bundle ID**: `com.arpanghosh.buffetfindr`
- **Apple Team ID**: `KAYFZW7626`
- **ASC App ID**: `6770199090`
- **Privacy policy URL**: `https://www.buffetfindr.com/privacy`
- **Category**: Food & Drink
- **Price**: Free (ads planned via AdMob in future)

### Mobile API base URL
Currently hardcoded to the Vercel preview URL in `mobile/lib/api.ts`. Update to `https://www.buffetfindr.com` once the custom domain is fully propagated.

---

## MCP plugin

```bash
# Tools available via /scrape, /review-results, /review-submissions
cd mcp && node server.js    # starts MCP server (Claude Code auto-starts via .claude/settings.json)
```

Tools: `scrape_buffets`, `get_buffet_results`, `check_scrape_status`

---

## Adding a missed restaurant (full workflow)

1. Find `place_id` in `scraper/data/{state}_raw.json`
2. Add to `scraper/known_buffets_override.json`
3. `python scraper/reprocess.py --state {state}`
4. `cp scraper/data/{state}_buffets.json web/data/`
5. `cd web && export $(cat .env.local | xargs) && npm run db:seed`
6. Change is live immediately (API reads from Neon on every request)

---

## Known issues / decisions

- **Cross-state duplicates**: Border restaurants appear in multiple raw files; `place_id` deduplication in the API prevents double-display.
- **Uyghur exclusion**: `scraper/main.py` has a name-based blocklist for non-South-Asian cuisines.
- **Weekend-only buffets score low**: Sunday-only buffets get few review mentions → score 15–25 (below 30 threshold). Add to override file.
- **Verified overrides**: The Mint Room (Ellicott City MD, `ChIJcaSB9fEhyIkR_s8lKKOY6rw`) and Biryani Joint (Burtonsville MD) are in `known_buffets_override.json`.
- **React peer dep conflict**: `react@19.1.0` vs `react-dom@19.2.6` — resolved via `.npmrc` `legacy-peer-deps=true`.
- **Mobile API URL**: `mobile/lib/api.ts` hardcodes a Vercel preview URL. Update to `buffetfindr.com` after domain propagation.
- **`npm run build` in web/**: NEVER run locally. Corrupts dev server cache. Delete `.next/` + restart if accidentally run.

---

## Planned features (backlog)

- [ ] Yelp enrichment (blocked: Yelp returns 403 to scrapers; needs Playwright headless browser)
- [ ] Google/Apple Sign In via Clerk (Vercel Marketplace) — sync "Been Here" across devices
- [ ] AdMob ads (free app monetization) — requires `react-native-google-mobile-ads` + ATT consent
- [ ] Android app (Google Play) — Expo already configured for Android, just needs Play Console setup
- [ ] Expand to more cities (Chicago, Bay Area, Houston next)
- [ ] Admin dashboard to review/approve user submissions
- [ ] Weekly email digest of new buffets
