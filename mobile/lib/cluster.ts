// Dependency-free grid clustering for map markers.
//
// Rendering 600+ custom-view markers at once makes the map janky, so we only
// build markers for the visible area and merge nearby ones into count bubbles.
// The grid is anchored to absolute coordinates and its cell size snaps to
// power-of-two zoom levels, so clusters don't reshuffle while panning.

import type { Restaurant } from "./api";

export interface ViewRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export type MapItem =
  | { type: "pin"; key: string; restaurant: Restaurant }
  | {
      type: "cluster";
      key: string;
      lat: number;
      lng: number;
      count: number;
      hasHigh: boolean;
      minLat: number; maxLat: number; minLng: number; maxLng: number;
    };

/** Below this longitude span (≈ a few city blocks) every restaurant gets its own pin. */
const NO_CLUSTER_DELTA = 0.03;
/** Roughly how many grid cells span the screen width. */
const CELLS_ACROSS = 9;
/** Hard cap on individual pins when clustering is off. Input order decides who wins. */
const MAX_PINS = 150;

export function clusterRestaurants(list: Restaurant[], view: ViewRegion): MapItem[] {
  const padLat = view.latitudeDelta * 0.25;
  const padLng = view.longitudeDelta * 0.25;
  const south = view.latitude  - view.latitudeDelta  / 2 - padLat;
  const north = view.latitude  + view.latitudeDelta  / 2 + padLat;
  const west  = view.longitude - view.longitudeDelta / 2 - padLng;
  const east  = view.longitude + view.longitudeDelta / 2 + padLng;

  const visible: Restaurant[] = [];
  for (const r of list) {
    if (r.lat == null || r.lng == null) continue;
    if (r.lat < south || r.lat > north || r.lng < west || r.lng > east) continue;
    visible.push(r);
  }

  if (view.longitudeDelta <= NO_CLUSTER_DELTA) {
    return visible.slice(0, MAX_PINS).map(r => ({ type: "pin", key: r.place_id, restaurant: r }));
  }

  const zoom = Math.max(0, Math.min(20, Math.round(Math.log2(360 / view.longitudeDelta))));
  const cellLng = 360 / Math.pow(2, zoom) / CELLS_ACROSS;
  // A degree of latitude is taller on screen than a degree of longitude is wide.
  const cellLat = cellLng * Math.max(0.2, Math.cos((view.latitude * Math.PI) / 180));

  const cells = new Map<string, Restaurant[]>();
  for (const r of visible) {
    const key = `${zoom}:${Math.floor(r.lng / cellLng)}:${Math.floor(r.lat / cellLat)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(r);
    else cells.set(key, [r]);
  }

  const items: MapItem[] = [];
  for (const [key, bucket] of cells) {
    if (bucket.length === 1) {
      items.push({ type: "pin", key: bucket[0].place_id, restaurant: bucket[0] });
      continue;
    }
    let sumLat = 0, sumLng = 0, hasHigh = false;
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const r of bucket) {
      sumLat += r.lat; sumLng += r.lng;
      if (r.buffet_score >= 60) hasHigh = true;
      if (r.lat < minLat) minLat = r.lat;
      if (r.lat > maxLat) maxLat = r.lat;
      if (r.lng < minLng) minLng = r.lng;
      if (r.lng > maxLng) maxLng = r.lng;
    }
    items.push({
      type: "cluster",
      // Count is part of the key so a bubble is re-created (not stale) when it changes.
      key: `c:${key}:${bucket.length}`,
      lat: sumLat / bucket.length,
      lng: sumLng / bucket.length,
      count: bucket.length,
      hasHigh,
      minLat, maxLat, minLng, maxLng,
    });
  }
  return items;
}

/** Region that zooms in far enough to split a cluster apart. */
export function regionForCluster(c: Extract<MapItem, { type: "cluster" }>, view: ViewRegion): ViewRegion {
  const latSpan = Math.max((c.maxLat - c.minLat) * 1.8, 0.02);
  const lngSpan = Math.max((c.maxLng - c.minLng) * 1.8, 0.02);
  return {
    latitude:  (c.minLat + c.maxLat) / 2,
    longitude: (c.minLng + c.maxLng) / 2,
    // Never zoom out, and always make visible progress.
    latitudeDelta:  Math.min(latSpan, view.latitudeDelta  / 2),
    longitudeDelta: Math.min(lngSpan, view.longitudeDelta / 2),
  };
}

/** Great-circle distance in miles. */
export function distanceMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
