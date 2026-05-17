-- ============================================================
-- Indian Buffet Finder — Database Schema Reference
-- Dialect: PostgreSQL (Neon)
-- ORM: Drizzle ORM  →  db/schema.ts
-- ============================================================

CREATE TABLE restaurants (

  -- Identity
  id               SERIAL          PRIMARY KEY,
  place_id         TEXT            UNIQUE NOT NULL,   -- Google Places place_id (stable identifier)

  -- Basic info
  name             TEXT            NOT NULL,
  address          TEXT,                              -- Full formatted address from Google
  state            TEXT,                              -- 'MD' | 'VA' | 'DC'
  lat              REAL,                              -- Latitude  (WGS84)
  lng              REAL,                              -- Longitude (WGS84)
  phone            TEXT,                              -- National format e.g. "(301) 555-0123"
  website          TEXT,

  -- Google ratings
  rating           REAL,                              -- 1.0 – 5.0
  review_count     INTEGER,
  price_level      TEXT,                              -- Google enum e.g. "PRICE_LEVEL_MODERATE"

  -- Operational status
  business_status  TEXT,                              -- 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'

  -- Hours (from Google Places regularOpeningHours)
  hours            JSONB,                             -- string[]  e.g. ["Monday: 11:00 AM – 10:00 PM", ...]
  hours_periods    JSONB,                             -- Raw periods array for programmatic open/closed checks

  -- Photos
  photo_refs       JSONB,                             -- string[]  Google Places photo name refs (up to 5)
                                                      -- Resolve to URL: https://places.googleapis.com/v1/{ref}/media?maxWidthPx=800&key=...

  -- Google place types
  types            JSONB,                             -- string[]  e.g. ["restaurant", "food", "point_of_interest"]

  -- Buffet detection (from scraper)
  buffet_score     INTEGER         DEFAULT 0,         -- 0–100 confidence score
                                                      --   100 = name + reviews + website + query match
                                                      --    60 = HIGH threshold
                                                      --    30 = MEDIUM threshold (minimum shown in app)
  buffet_confidence TEXT,                             -- 'HIGH' | 'MEDIUM' | 'LOW'
  buffet_evidence  JSONB,                             -- string[]  human-readable evidence list
                                                      --   e.g. ["buffet mentioned in 3/5 reviews",
                                                      --         "buffet on website: lunch buffet",
                                                      --         "matched 'Indian buffet' search query"]
  is_buffet        BOOLEAN         DEFAULT TRUE,      -- buffet_score >= 30

  -- Manual curation flags
  verified         BOOLEAN         DEFAULT FALSE,     -- manually confirmed by a human
  active           BOOLEAN         DEFAULT TRUE,      -- set FALSE to soft-delete without losing data

  -- Timestamps
  scraped_at       TIMESTAMPTZ,                       -- when Google Places was queried
  created_at       TIMESTAMPTZ     DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     DEFAULT NOW()

);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_restaurants_state        ON restaurants (state);
CREATE INDEX idx_restaurants_lat_lng      ON restaurants (lat, lng);
CREATE INDEX idx_restaurants_buffet_score ON restaurants (buffet_score DESC);

-- ── Buffet score rubric ───────────────────────────────────────────────────────
--
--  +50  "buffet" appears in the restaurant name
--  +40  buffet mentioned in 3+ of the top 5 Google reviews
--  +25  buffet mentioned in 2 reviews
--  +15  buffet mentioned in 1 review
--  +30  buffet keyword found on restaurant's own website
--  +20  restaurant matched the "Indian buffet" search query directly
--  +15  Google's editorial summary mentions buffet
--  -20  negative signals found ("no buffet", "stopped doing buffet", etc.)
--
--  Score >= 60  →  HIGH confidence   (safe to show without manual check)
--  Score 30–59  →  MEDIUM confidence (phone call recommended before launch)
--  Score <  30  →  excluded from app

-- ── JSONB field shapes ────────────────────────────────────────────────────────
--
--  hours (string[]):
--    ["Monday: 11:00 AM – 3:00 PM, 5:00 PM – 10:00 PM",
--     "Tuesday: 11:00 AM – 10:00 PM", ...]
--
--  hours_periods (object[]):
--    [{ "open": { "day": 1, "hour": 11, "minute": 0 },
--       "close": { "day": 1, "hour": 22, "minute": 0 } }, ...]
--
--  photo_refs (string[]):
--    ["places/ChIJabc.../photos/AXCi2Q...",
--     "places/ChIJabc.../photos/BYDj3R..."]
--    → fetch image: GET https://places.googleapis.com/v1/{ref}/media?maxWidthPx=800&key=KEY
--
--  buffet_evidence (string[]):
--    ["buffet mentioned in 4/5 reviews",
--     "buffet on website: buffet, lunch buffet",
--     "matched 'Indian buffet' search query"]
--
--  types (string[]):
--    ["restaurant", "food", "point_of_interest", "establishment"]
