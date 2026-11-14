// Single source of truth for which restaurants belong to which region (metro).
// Used by the restaurants API (Neon + local-JSON paths), /buffets/[region],
// /restaurant/[place_id] and the sitemap.
//
// A restaurant is in a region when its `state` is one of the region's states AND,
// if the region has `boxes`, its coordinates fall inside at least one of them.
// Metros that share a state must have disjoint boxes.

/** Bounding box; every edge is optional. Mins are inclusive, maxes exclusive. */
export interface Box {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface RegionDef {
  /** State abbreviations as stored in the DB / JSON */
  states: string[];
  /** Omit when the region owns its states outright */
  boxes?: Box[];
  /** web/data/{file}_buffets.json / {file}_all.json (also the scraper + seed keys) */
  files: string[];
}

// TX split: Dallas north of 31.5°; south of it Houston is east of −96.5°, and west of
//   that Austin (≈30.3) / San Antonio (≈29.4) split at 29.85° (San Marcos | New Braunfels).
// CA split: San Diego south of 33.4° (Camp Pendleton gap), LA up to 36°, Bay Area above —
//   minus the Sacramento box (north of 38.2° and east of −121.9°, i.e. Davis/Elk Grove
//   eastwards; Vacaville, Fairfield, Napa and Santa Rosa stay Bay Area).
// FL split: Miami/South Florida south of 27.2°; north of it Tampa is west of −81.85°
//   (includes Lakeland) and Orlando east of it (includes Clermont).
// OH split: Cincinnati < 39.6° ≤ Columbus < 40.8° ≤ Cleveland. Cincinnati also has N. Kentucky.
// NC split: Charlotte west of −80.0° (plus its South Carolina suburbs), Raleigh–Durham east.
export const REGION_DEFS: Record<string, RegionDef> = {
  dmv:         { states: ["MD", "VA", "DC"], files: ["maryland", "virginia", "dc"] },
  boston:      { states: ["MA"], files: ["massachusetts"] },
  nyc:         { states: ["NY"], files: ["new_york"] },
  philly:      { states: ["PA"], files: ["philadelphia"] },
  nj:          { states: ["NJ"], files: ["new_jersey"] },
  chicago:     { states: ["IL"], files: ["illinois"] },
  seattle:     { states: ["WA"], files: ["washington"] },
  la:          { states: ["CA"], files: ["los_angeles"], boxes: [{ minLat: 33.4, maxLat: 36 }] },
  dallas:      { states: ["TX"], files: ["dallas"],      boxes: [{ minLat: 31.5 }] },
  houston:     { states: ["TX"], files: ["houston"],     boxes: [{ maxLat: 31.5, minLng: -96.5 }] },
  miami:       { states: ["FL"], files: ["miami"],       boxes: [{ maxLat: 27.2 }] },
  atlanta:     { states: ["GA"], files: ["atlanta"] },
  bayarea:     { states: ["CA"], files: ["bay_area"],    boxes: [{ minLat: 36, maxLat: 38.2 }, { minLat: 38.2, maxLng: -121.9 }] },
  phoenix:     { states: ["AZ"], files: ["phoenix"] },
  columbus:    { states: ["OH"], files: ["columbus"],    boxes: [{ minLat: 39.6, maxLat: 40.8 }] },
  cincinnati:  { states: ["OH", "KY"], files: ["cincinnati"], boxes: [{ maxLat: 39.6 }] }, // metro straddles the Ohio River
  cleveland:   { states: ["OH"], files: ["cleveland"],   boxes: [{ minLat: 40.8 }] },
  austin:      { states: ["TX"], files: ["austin"],      boxes: [{ minLat: 29.85, maxLat: 31.5, maxLng: -96.5 }] },
  sanantonio:  { states: ["TX"], files: ["san_antonio"], boxes: [{ maxLat: 29.85, maxLng: -96.5 }] },
  sandiego:    { states: ["CA"], files: ["san_diego"],   boxes: [{ maxLat: 33.4 }] },
  sacramento:  { states: ["CA"], files: ["sacramento"],  boxes: [{ minLat: 38.2, minLng: -121.9 }] },
  lasvegas:    { states: ["NV"], files: ["las_vegas"] },
  detroit:     { states: ["MI"], files: ["detroit"] },
  minneapolis: { states: ["MN"], files: ["minneapolis"] },
  denver:      { states: ["CO"], files: ["denver"] },
  tampa:       { states: ["FL"], files: ["tampa"],       boxes: [{ minLat: 27.2, maxLng: -81.85 }] },
  orlando:     { states: ["FL"], files: ["orlando"],     boxes: [{ minLat: 27.2, minLng: -81.85 }] },
  charlotte:   { states: ["NC", "SC"], files: ["charlotte"], boxes: [{ maxLng: -80.0 }] }, // metro crosses into SC (Fort Mill, Rock Hill)
  raleigh:     { states: ["NC"], files: ["raleigh"],     boxes: [{ minLng: -80.0 }] },
};

export const REGION_KEYS = Object.keys(REGION_DEFS);

/** Every data file, in seed order (same order as web/scripts/seed.ts). */
export const ALL_REGION_FILES = REGION_KEYS.flatMap(k => REGION_DEFS[k].files);

type Located = { state?: string | null; lat?: number | null; lng?: number | null };

function inBox(r: Located, b: Box): boolean {
  if (r.lat == null || r.lng == null) return false;
  return (b.minLat === undefined || r.lat >= b.minLat)
      && (b.maxLat === undefined || r.lat <  b.maxLat)
      && (b.minLng === undefined || r.lng >= b.minLng)
      && (b.maxLng === undefined || r.lng <  b.maxLng);
}

/** Coordinates only — true for regions without boxes and for unknown region keys. */
export function inRegionBounds(r: Located, region: string): boolean {
  const boxes = REGION_DEFS[region]?.boxes;
  return !boxes || boxes.some(b => inBox(r, b));
}

/** State + coordinates. */
export function inRegion(r: Located, region: string): boolean {
  const def = REGION_DEFS[region];
  return !!def && def.states.includes(r.state?.toUpperCase() ?? "") && inRegionBounds(r, region);
}

/** The region a restaurant belongs to, if any. */
export function regionFor(r: Located): string | undefined {
  return REGION_KEYS.find(k => inRegion(r, k));
}
