/**
 * What `/api/restaurants?fields=lite` returns: enough for map pins and list cards.
 * `photo_refs` holds at most the first photo.
 */
export interface RestaurantSummary {
  place_id: string;
  name: string;
  address: string;
  state: string;
  lat: number;
  lng: number;
  rating?: number;
  review_count?: number;
  hours: string[];
  photo_refs: string[];
  buffet_score: number;
  buffet_confidence: "HIGH" | "MEDIUM" | "LOW";
  is_buffet: boolean;
  buffet_schedule?: "BOTH" | "WEEKEND_ONLY" | "WEEKDAY_ONLY" | "DISCONTINUED" | "UNKNOWN" | null;
}

/** The full row (default response shape, and what `?place_id=` returns). */
export interface Restaurant extends RestaurantSummary {
  city?: string;
  phone?: string;
  website?: string;
  price_level?: string;
  business_status?: string;
  buffet_evidence: string[];
  buffet_schedule_fetched_at?: string | null;
  scraped_at: string;
}

/** A summary that may or may not have been upgraded to the full row yet. */
export type RestaurantWithDetails = RestaurantSummary & Partial<Restaurant>;

/** Map viewport in degrees. */
export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface RestaurantFilters {
  state?: string;
  minScore?: number;
  confidence?: string;
  search?: string;
}
