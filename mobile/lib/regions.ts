// Single source of truth for the regions the app offers.
//
// To add a region, append ONE entry to REGIONS below. The region picker, the map
// pan/zoom target and the API `state` param are all derived from it.
//   key    — the `state` value understood by /api/restaurants (REGION_STATES in web)
//   label  — short name shown on the region button and in the picker
//   hint   — optional secondary line in the picker (also searchable)
//   group  — picker section; must be one of REGION_GROUPS
//   lat/lng/delta — map centre and span (degrees) to fly to when selected
//   aliases — optional extra search terms ("sf", "maryland", …)

export const REGION_GROUPS = ["Northeast", "Midwest", "South", "West"] as const;
export type RegionGroup = (typeof REGION_GROUPS)[number];

export interface RegionDef {
  key: string;
  label: string;
  hint?: string;
  group: RegionGroup;
  lat: number;
  lng: number;
  delta: number;
  aliases?: string[];
}

export const ALL_REGION_KEY = "all";

/** Map view for the "All regions" selection (continental US). */
// Wide enough to keep both Seattle (-122°) and Boston (-71°) on a portrait screen.
export const ALL_VIEW = { lat: 38.5, lng: -97.0, delta: 58 };

export const REGIONS: RegionDef[] = [
  // ── Northeast ──
  { key: "boston",  label: "Boston",       hint: "Massachusetts",              group: "Northeast", lat: 42.36, lng: -71.06,  delta: 0.7, aliases: ["ma", "cambridge"] },
  { key: "nyc",     label: "NYC",          hint: "New York City & Long Island", group: "Northeast", lat: 40.73, lng: -73.95,  delta: 0.6, aliases: ["ny", "new york", "manhattan", "queens", "brooklyn"] },
  { key: "nj",      label: "New Jersey",   hint: "Edison, Jersey City & more", group: "Northeast", lat: 40.45, lng: -74.35,  delta: 1.2, aliases: ["nj", "newark", "iselin"] },
  { key: "philly",  label: "Philadelphia", hint: "Pennsylvania",               group: "Northeast", lat: 39.95, lng: -75.25,  delta: 0.7, aliases: ["philly", "pa"] },
  { key: "dmv",     label: "DMV",          hint: "DC, Maryland & N. Virginia", group: "Northeast", lat: 38.95, lng: -77.1,   delta: 1.2, aliases: ["washington dc", "md", "va", "baltimore", "arlington"] },

  // ── Midwest ──
  { key: "chicago",    label: "Chicago",    hint: "Illinois", group: "Midwest", lat: 41.95, lng: -87.78, delta: 1.0, aliases: ["il", "schaumburg", "naperville"] },
  { key: "columbus",   label: "Columbus",   hint: "Ohio",     group: "Midwest", lat: 40.02, lng: -83.01, delta: 0.8, aliases: ["oh"] },
  { key: "cincinnati", label: "Cincinnati", hint: "Ohio & N. Kentucky", group: "Midwest", lat: 39.25, lng: -84.45, delta: 0.8, aliases: ["oh", "ky"] },
  { key: "cleveland",  label: "Cleveland",  hint: "Ohio",     group: "Midwest", lat: 41.48, lng: -81.70, delta: 0.8, aliases: ["oh", "akron"] },

  // ── South ──
  { key: "atlanta", label: "Atlanta", hint: "Georgia",            group: "South", lat: 33.90, lng: -84.30, delta: 0.9, aliases: ["ga"] },
  { key: "miami",   label: "Miami",   hint: "South Florida",      group: "South", lat: 25.85, lng: -80.25, delta: 0.8, aliases: ["fl", "fort lauderdale"] },
  { key: "dallas",  label: "Dallas",  hint: "Dallas–Fort Worth",  group: "South", lat: 32.92, lng: -96.85, delta: 0.9, aliases: ["tx", "texas", "dfw", "plano", "irving", "frisco"] },
  { key: "houston", label: "Houston", hint: "Texas",              group: "South", lat: 29.72, lng: -95.50, delta: 0.9, aliases: ["tx", "sugar land"] },

  // ── West ──
  { key: "seattle", label: "Seattle",     hint: "Washington",                group: "West", lat: 47.62, lng: -122.20, delta: 1.0, aliases: ["wa", "bellevue", "redmond"] },
  { key: "bayarea", label: "Bay Area",    hint: "San Francisco & San Jose",  group: "West", lat: 37.50, lng: -122.05, delta: 0.9, aliases: ["sf", "ca", "california", "fremont", "sunnyvale", "oakland"] },
  { key: "la",      label: "Los Angeles", hint: "Southern California",       group: "West", lat: 33.95, lng: -118.10, delta: 1.2, aliases: ["la", "ca", "california", "artesia", "orange county"] },
  { key: "phoenix", label: "Phoenix",     hint: "Arizona",                   group: "West", lat: 33.45, lng: -111.99, delta: 0.9, aliases: ["az", "tempe", "chandler"] },
];

const BY_KEY = new Map(REGIONS.map(r => [r.key, r]));

export function regionLabel(key: string): string {
  return key === ALL_REGION_KEY ? "All regions" : BY_KEY.get(key)?.label ?? key;
}

export function regionView(key: string): { lat: number; lng: number; delta: number } {
  return BY_KEY.get(key) ?? ALL_VIEW;
}

/** Derived lookup kept for backwards compatibility (`REGION_VIEW[key]`). */
export const REGION_VIEW: Record<string, { lat: number; lng: number; delta: number }> = {
  [ALL_REGION_KEY]: ALL_VIEW,
  ...Object.fromEntries(REGIONS.map(r => [r.key, { lat: r.lat, lng: r.lng, delta: r.delta }])),
};

/** Regions matching a free-text query, grouped for a SectionList. */
export function searchRegions(query: string): { title: RegionGroup; data: RegionDef[] }[] {
  const q = query.trim().toLowerCase();
  const matches = (r: RegionDef) =>
    !q ||
    r.label.toLowerCase().includes(q) ||
    r.key.includes(q) ||
    (r.hint?.toLowerCase().includes(q) ?? false) ||
    (r.aliases?.some(a => (q.length <= 2 ? a === q : a.includes(q))) ?? false);

  return REGION_GROUPS
    .map(title => ({ title, data: REGIONS.filter(r => r.group === title && matches(r)) }))
    .filter(s => s.data.length > 0);
}
