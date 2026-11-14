const BASE = "https://www.buffetfindr.com";

export { REGION_VIEW } from "./regions";

export type BuffetSchedule = "BOTH" | "WEEKEND_ONLY" | "WEEKDAY_ONLY" | "DISCONTINUED" | "UNKNOWN";

/**
 * List queries ask the server for its "lite" rows (`fields=lite`): everything the cards,
 * map pins and filters use, with `photo_refs` cut to the first photo. The fields marked
 * "detail only" are missing from those rows until `fetchRestaurantById` loads the full one.
 */
export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  state: string;
  lat: number;
  lng: number;
  /** Detail only. */
  phone?: string | null;
  /** Detail only. */
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  buffet_score: number;
  buffet_confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Detail only. */
  buffet_evidence?: string[];
  hours: string[];
  photo_refs: string[];
  is_buffet: boolean;
  /** null/undefined = not analysed yet; "UNKNOWN" = analysed, not enough evidence. */
  buffet_schedule?: BuffetSchedule | null;
  buffet_schedule_fetched_at?: string | null;
}

export interface RestaurantQuery {
  state?: string;
  search?: string;
  confidence?: string;
  buffetsOnly?: boolean;
}

export interface RestaurantPage {
  restaurants: Restaurant[];
  /** Matches on the server. Greater than `restaurants.length` when the result was truncated. */
  total: number;
}

// ── Fetch with in-memory cache ────────────────────────────────────────────────
// Lists are downloaded whole, once per (region, buffets-only), as lite rows: about 1 MB
// of JSON (~0.4 MB gzipped) for every buffet in the country, against ~3.7 MB for full
// rows. Identical queries are served from memory and concurrent identical requests share
// one network call. Loading by map area instead would not pay for itself at this size:
// search, "Near me" sorting and clustering all work on the complete list on the device.

const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 25_000;
// The server clamps `limit` to at least 1000 anyway; ask for it explicitly.
const LIMIT = "1000";

const pageCache = new Map<string, { at: number; page: RestaurantPage }>();
const inflight  = new Map<string, Promise<RestaurantPage>>();
/** Lite rows from list queries. */
const byId      = new Map<string, Restaurant>();
/** Full rows from `fetchRestaurantById`. */
const fullById     = new Map<string, { at: number; restaurant: Restaurant }>();
const fullInflight = new Map<string, Promise<Restaurant | null>>();

function queryString(params: RestaurantQuery): string {
  const query = new URLSearchParams({ min_score: "30", limit: LIMIT, fields: "lite" });
  query.set("state", params.state || "all");
  if (params.search)                query.set("search", params.search);
  if (params.confidence)            query.set("confidence", params.confidence);
  if (params.buffetsOnly === false) query.set("buffets_only", "false");
  return query.toString();
}

async function getJson(qs: string): Promise<{ restaurants: Restaurant[]; total: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/restaurants?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    const data = await res.json();
    const restaurants: Restaurant[] = data.restaurants ?? [];
    return { restaurants, total: typeof data.total === "number" ? data.total : restaurants.length };
  } finally {
    clearTimeout(timer);
  }
}

export function fetchRestaurantPage(params: RestaurantQuery = {}): Promise<RestaurantPage> {
  const qs = queryString({ ...params, search: params.search?.trim().toLowerCase() });

  const cached = pageCache.get(qs);
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.page);

  const pending = inflight.get(qs);
  if (pending) return pending;

  const request = getJson(qs)
    .then(page => {
      pageCache.set(qs, { at: Date.now(), page });
      // Keep the first object seen per place so detail-screen updates stay visible in lists.
      for (const r of page.restaurants) if (!byId.has(r.place_id)) byId.set(r.place_id, r);
      return page;
    })
    .finally(() => inflight.delete(qs));

  inflight.set(qs, request);
  return request;
}

export async function fetchRestaurants(params: RestaurantQuery = {}): Promise<Restaurant[]> {
  return (await fetchRestaurantPage(params)).restaurants;
}

/** Drop cached lists (used by "Retry"). */
export function clearRestaurantCache() {
  pageCache.clear();
}

/**
 * The best copy already in memory, without touching the network: the full row if the
 * detail screen has loaded it before, otherwise the lite row from a list.
 */
export function getCachedRestaurant(placeId: string): Restaurant | null {
  return fullById.get(placeId)?.restaurant ?? byId.get(placeId) ?? null;
}

/**
 * The full row for the detail screen (`?place_id=`): adds phone, website, every photo and
 * the buffet evidence to what the lists carry. If the request fails and a list already
 * loaded this restaurant, that lite row is returned instead, so the screen still works
 * offline. Resolves to null when the server doesn't know the id.
 */
export function fetchRestaurantById(placeId: string): Promise<Restaurant | null> {
  const cached = fullById.get(placeId);
  if (cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.restaurant);

  const pending = fullInflight.get(placeId);
  if (pending) return pending;

  const request = getJson(`place_id=${encodeURIComponent(placeId)}`)
    .then(({ restaurants }) => {
      // Matched by id rather than taking the first row, in case a server ignores the parameter.
      const full = restaurants.find(r => r.place_id === placeId) ?? null;
      if (full) {
        fullById.set(placeId, { at: Date.now(), restaurant: full });
        // Lists keep showing their own (lite) object; pass on a schedule it doesn't have yet.
        const lite = byId.get(placeId);
        if (lite && full.buffet_schedule) lite.buffet_schedule = full.buffet_schedule;
      }
      return full;
    })
    .catch(err => {
      const lite = byId.get(placeId);
      if (lite) return lite;
      throw err;
    })
    .finally(() => fullInflight.delete(placeId));

  fullInflight.set(placeId, request);
  return request;
}

// ── Buffet schedule ───────────────────────────────────────────────────────────

/**
 * Ask the server to classify when the buffet runs (same call the web detail panel makes).
 * The server stores the answer, so each restaurant is analysed once for all clients; only
 * call this when `buffet_schedule` is null.
 */
export async function analyzeSchedule(placeId: string): Promise<BuffetSchedule | null> {
  const res = await fetch(`${BASE}/api/analyze-schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ place_id: placeId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const schedule: BuffetSchedule | null = data.buffet_schedule ?? null;
  // Remember it for this session so reopening the screen doesn't ask again.
  if (schedule) {
    for (const cached of [byId.get(placeId), fullById.get(placeId)?.restaurant]) {
      if (cached) cached.buffet_schedule = schedule;
    }
  }
  return schedule;
}

export const SCHEDULE_LABEL: Record<BuffetSchedule, { short: string; long: string } | null> = {
  BOTH:         { short: "Daily",     long: "Buffet Daily" },
  WEEKEND_ONLY: { short: "Wknd Only", long: "Weekend Buffet Only" },
  WEEKDAY_ONLY: { short: "Wkdy Only", long: "Weekday Buffet Only" },
  DISCONTINUED: { short: "Discontinued", long: "Buffet Reportedly Discontinued" },
  UNKNOWN:      null,
};

// ── Misc ──────────────────────────────────────────────────────────────────────

export async function submitFeedback(placeId: string, vote: "up" | "down", previous?: "up" | "down" | null) {
  await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ place_id: placeId, vote, previous }),
  });
}

export function photoUrl(ref: string, width = 600) {
  // Routed through our own API so the Google key never leaves the server
  return `${BASE}/api/photo?ref=${encodeURIComponent(ref)}&w=${width}`;
}

export function mapsUrl(address: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}
