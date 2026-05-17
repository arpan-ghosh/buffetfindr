# Buffet Findr — CLAUDE.md

## Project overview

Buffet Findr maps Indian restaurant buffets across DC, Maryland, and Virginia. Three parts:

- **`scraper/`** — Python scripts that query the Google Places API (New), score restaurants for buffet likelihood, and write JSON output
- **`web/`** — Next.js 15 app (App Router) with a Neon/Drizzle Postgres backend and a Google Maps frontend
- **`mcp/`** — MCP server that exposes scraper tools so Claude can call them directly

---

## Data pipeline

```
scraper/data/*.json  →  web/data/*.json  →  Neon DB (via db:seed)  →  web app
```

1. Scraper writes to `scraper/data/{state}_raw.json` and `scraper/data/{state}_buffets.json`
2. Files must be **manually copied** to `web/data/` before seeding
3. `npm run db:seed` (inside `web/`) upserts all buffets into Neon Postgres
4. The web app reads exclusively from Neon — not from JSON files at runtime

---

## Scraper

### Running
```bash
cd scraper
python main.py --state maryland   # or virginia / dc / all
```

Requires `GOOGLE_PLACES_API_KEY` in `scraper/.env`.

### Search queries (4 per location point)
- `"Indian restaurant"` — broad pass (no score bonus)
- `"Indian buffet"` — +20 score bonus
- `"Indian Sunday buffet"` — +20 score bonus (catches weekend-only buffets)
- `"Indian weekend buffet"` — +20 score bonus (catches weekend-only buffets)

### Scoring (`scraper/scorer.py`)
| Signal | Points |
|---|---|
| "buffet" in restaurant name | +50 |
| 3+ reviews mention buffet | +40 |
| 2 reviews mention buffet | +25 |
| 1 review mentions buffet | +15 |
| Website mentions buffet | +30 |
| Found via buffet search query | +20 |
| Buffet in Google editorial summary | +15 |
| Negative signal in review | −20 |

**Threshold: score ≥ 30 = flagged as buffet.**

### Re-processing without API calls
```bash
cd scraper
python reprocess.py                  # all states
python reprocess.py --state maryland
```

Applies the override file and regenerates buffet JSON from existing raw data. Zero API cost. Run this after editing `known_buffets_override.json`, then copy to `web/data/` and re-seed.

### Manual overrides (`scraper/known_buffets_override.json`)
Add restaurants you've personally verified here. Format:
```json
[
  {
    "place_id": "ChIJ...",
    "name": "Restaurant Name",
    "address": "123 Main St, City, MD 12345",
    "state": "MD",
    "notes": "Sunday lunch buffet only, manually verified"
  }
]
```

The scraper and reprocess script will force `is_buffet=true` for any matching `place_id`, and directly fetch + inject any `place_id` that search never surfaced.

To find a `place_id`: look it up in `scraper/data/{state}_raw.json` — all scraped restaurants are stored there, even those that scored below 30.

---

## Web app

### Dev
```bash
cd web
npm run dev
```

Requires `web/.env.local`:
- `DATABASE_URL` — Neon Postgres connection string
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps JS API key

### Database commands
```bash
cd web
npm run db:seed      # upsert all restaurants from web/data/*.json into Neon
npm run db:migrate   # run pending Drizzle migrations
npm run db:generate  # generate migration from schema changes
```

`onConflictDoUpdate` in `web/scripts/seed.ts` updates these fields on re-seed:
`buffet_score`, `buffet_confidence`, `buffet_evidence`, `is_buffet`, `rating`, `review_count`, `hours`

### Key files
- `app/page.tsx` — main page: map + list view, filter bar, header with info sheet
- `components/RestaurantMap.tsx` — Google Maps with clustered pins
- `components/RestaurantCard.tsx` — card used in list and bottom-sheet scroll
- `components/RestaurantDetail.tsx` — sidebar shown when a restaurant is selected
- `components/FilterBar.tsx` — state, confidence, and search filters
- `components/SubmitRestaurantModal.tsx` — "know a buffet we're missing?" submission form
- `db/schema.ts` — single `restaurants` table, keyed on `place_id`
- `scripts/seed.ts` — reads from `web/data/*.json`, upserts into Neon

---

## Adding a missed restaurant (full workflow)

1. Look up the restaurant in `scraper/data/{state}_raw.json`, copy its `place_id`
2. Add an entry to `scraper/known_buffets_override.json`
3. Run `python scraper/reprocess.py --state {state}`
4. Copy updated JSON: `cp scraper/data/{state}_buffets.json web/data/`
5. Run `cd web && npm run db:seed`

---

## MCP tools (available to Claude via `/scrape`, `/review-results`)

- `scrape_buffets` — run the scraper for a state
- `get_buffet_results` — read scraped results with optional score filter
- `reprocess_buffets` — apply overrides and regenerate buffet files without hitting the API

---

## Known issues / decisions

- **Cross-state duplicates**: 20 restaurants appear in multiple state result sets because 12 km search circles overlap near state borders. The DB deduplicates by `place_id` but the `state` field reflects whichever search circle caught it first.
- **False positives**: Eerkins Uyghur Cuisine (Rockville MD), RASA (fast-casual bowl chain), and Choolaah (fast-casual rotisserie) scored 30 via website keyword match but are not traditional buffets.
- **Weekend-only buffets score low**: Restaurants with a Sunday-only buffet get fewer review mentions and typically land at 15–25 — below the 30 threshold. Use the override file for these. Current confirmed overrides: Biryani Joint (Burtonsville MD), The Mint Room (Ellicott City MD).
