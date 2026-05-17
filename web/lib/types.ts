export interface Restaurant {
  place_id: string;
  name: string;
  address: string;
  city?: string;
  state: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  price_level?: string;
  business_status?: string;
  hours: string[];
  photo_refs: string[];
  buffet_score: number;
  buffet_confidence: "HIGH" | "MEDIUM" | "LOW";
  buffet_evidence: string[];
  is_buffet: boolean;
  scraped_at: string;
}

export interface RestaurantFilters {
  state?: string;
  minScore?: number;
  confidence?: string;
  search?: string;
}
