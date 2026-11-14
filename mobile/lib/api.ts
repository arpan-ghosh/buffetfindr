const BASE = "https://www.buffetfindr.com";

export { REGION_VIEW } from "./regions";

export type BuffetSchedule = "BOTH" | "WEEKEND_ONLY" | "WEEKDAY_ONLY" | "DISCONTINUED" | "UNKNOWN";

export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  state: string;
  lat: number;
  lng: number;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  buffet_score: number;
  buffet_confidence: "HIGH" | "MEDIUM" | "LOW";
  buffet_evidence: string[];
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
// The "All" payload is ~2.7 MB, so identical queries are served from memory and
// concurrent identical requests share one network call.

const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 25_000;
// The server clamps `limit` to at least 1000 anyway; ask for it explicitly.
const LIMIT = "1000";

const pageCache = new Map<string, { at: number; page: RestaurantPage }>();
const inflight  = new Map<string, Promise<RestaurantPage>>();
const byId      = new Map<string, Restaurant>();

function queryString(params: RestaurantQuery): string {
  const query = new URLSearchParams({ min_score: "30", limit: LIMIT });
  query.set("state", params.state || "all");
  if (params.search)                query.set("search", params.search);
  if (params.confidence)            query.set("confidence", params.confidence);
  if (params.buffetsOnly === false) query.set("buffets_only", "false");
  return query.toString();
}

async function requestPage(qs: string): Promise<RestaurantPage> {
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

  const request = requestPage(qs)
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

/** A restaurant already loaded by any list query, without touching the network. */
export function getCachedRestaurant(placeId: string): Restaurant | null {
  return byId.get(placeId) ?? null;
}

/** Look a restaurant up by id, falling back to the network (e.g. cold deep link). */
export async function fetchRestaurantById(placeId: string): Promise<Restaurant | null> {
  const hit = byId.get(placeId);
  if (hit) return hit;
  const buffets = await fetchRestaurants();
  const found = buffets.find(r => r.place_id === placeId);
  if (found) return found;
  // Non-buffet restaurants only exist in the unfiltered list (truncated to the top 1000).
  const everything = await fetchRestaurants({ buffetsOnly: false });
  return everything.find(r => r.place_id === placeId) ?? null;
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
  const cached = byId.get(placeId);
  if (cached && schedule) cached.buffet_schedule = schedule;
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
