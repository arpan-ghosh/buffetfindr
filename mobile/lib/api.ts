const BASE = "https://buffetfindr-asw9k6p3s-arpan-ghoshs-projects-d7c4c085.vercel.app";

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
} = {}): Promise<Restaurant[]> {
  const query = new URLSearchParams({ min_score: "30", limit: "300" });
  if (params.state)      query.set("state", params.state);
  if (params.search)     query.set("search", params.search);
  if (params.confidence) query.set("confidence", params.confidence);
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
  // Google Places (New) photo URL — key injected server-side ideally, here for now
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=AIzaSyBDmaBgMYFmT6QTMvar44x_toK50GhcoTA`;
}

export function mapsUrl(address: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
}

export const REGION_VIEW: Record<string, { lat: number; lng: number; delta: number }> = {
  all:    { lat: 39.5,  lng: -75.8,  delta: 8  },
  dmv:    { lat: 38.95, lng: -77.1,  delta: 1.2 },
  boston: { lat: 42.36, lng: -71.06, delta: 0.7 },
  nyc:    { lat: 40.73, lng: -73.95, delta: 0.6 },
};
