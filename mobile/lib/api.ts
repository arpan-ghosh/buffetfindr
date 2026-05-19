const BASE = "https://www.buffetfindr.com";

export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  state: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  buffet_score: number;
  buffet_confidence: "HIGH" | "MEDIUM" | "LOW";
  buffet_evidence: string[];
  hours: string[];
  photo_refs: string[];
  is_buffet: boolean;
}

export async function fetchRestaurants(params: {
  state?: string;
  search?: string;
  confidence?: string;
  buffetsOnly?: boolean;
} = {}): Promise<Restaurant[]> {
  const query = new URLSearchParams({ min_score: "30", limit: "500" });
  if (params.state)               query.set("state", params.state);
  if (params.search)              query.set("search", params.search);
  if (params.confidence)          query.set("confidence", params.confidence);
  if (params.buffetsOnly === false) query.set("buffets_only", "false");
  const res = await fetch(`${BASE}/api/restaurants?${query}`);
  const data = await res.json();
  return data.restaurants ?? [];
}

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

export const REGION_VIEW: Record<string, { lat: number; lng: number; delta: number }> = {
  all:     { lat: 39.8,  lng: -90.0,   delta: 50  },
  dmv:     { lat: 38.95, lng: -77.1,   delta: 1.2 },
  boston:  { lat: 42.36, lng: -71.06,  delta: 0.7 },
  nyc:     { lat: 40.73, lng: -73.95,  delta: 0.6 },
  philly:  { lat: 39.95, lng: -75.25,  delta: 0.7 },
  nj:      { lat: 40.45, lng: -74.35,  delta: 1.2 },
  chicago: { lat: 41.95, lng: -87.78,  delta: 1.0 },
  seattle: { lat: 47.62, lng: -122.20, delta: 1.0 },
};
