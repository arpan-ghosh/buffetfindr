import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { Restaurant } from "@/lib/types";
import { REGION_DEFS, ALL_REGION_FILES, inRegionBounds, type Box } from "@/lib/regions";

// GET /api/restaurants
//
//   state=all|<region key>     region filter (default all)
//   min_score, buffets_only, confidence, search, limit      — unchanged
//   bbox=minLng,minLat,maxLng,maxLat    optional; only rows inside the box (edges inclusive)
//   fields=lite|full                    optional; `lite` returns only LITE_FIELDS (default full)
//   place_id=ChIJ…                      optional; that one restaurant, always the full row,
//                                       ignoring every other filter
//
// Response: { restaurants: Row[], total: number }. `total` counts matches before `limit`.
// Malformed bbox / fields / place_id → 400 { error }.
//
// The shipped iOS app (1.1.0) sends none of the optional params and must keep getting
// the full row shape, so everything new is opt-in.

const USE_DB = !!process.env.DATABASE_URL;

// Floor on results per request. The shipped iOS app (1.1.0) and the web page ask for
// 500, which silently dropped the lowest-scoring buffets from the "All" view once the
// dataset passed 500. Old app builds can only be fixed from here.
const MIN_LIMIT = 1000;
/** Keeps a nonsense `limit` (1e30) from reaching Postgres as an out-of-range bigint. */
const MAX_SQL_LIMIT = 1_000_000;
/** Helper column of the legacy query; never part of a response. */
const RANK_COL = "_rank";

/**
 * What map pins and list cards render. Everything else (phone, website, the other photos,
 * hours_periods, types, buffet_evidence, timestamps…) waits for the detail view, which
 * asks for the full row with `place_id=`. `photo_refs` is cut to its first entry.
 */
const LITE_FIELDS = [
  "place_id", "name", "address", "state", "lat", "lng", "rating", "review_count",
  "hours", "photo_refs", "buffet_score", "buffet_confidence", "is_buffet", "buffet_schedule",
] as const;

interface BBox { minLng: number; minLat: number; maxLng: number; maxLat: number }

interface ListParams {
  state: string;
  minScore: number;
  buffetsOnly: boolean;
  confidence?: string;
  search?: string;
  limit: number;
  bbox?: BBox;
  lite: boolean;
}

type Result = { restaurants: unknown[]; total: number };

function statesForRegion(region: string): string[] | null {
  return region === "all" ? null : (REGION_DEFS[region]?.states ?? [region.toUpperCase()]);
}

// ── Param validation ──────────────────────────────────────────────────────────

const NUMBER_RE = /^-?\d{1,3}(\.\d{1,15})?$/;

/** "minLng,minLat,maxLng,maxLat" in degrees. Returns null for anything else. */
function parseBBox(raw: string): BBox | null {
  const parts = raw.split(",");
  if (parts.length !== 4 || !parts.every(s => NUMBER_RE.test(s))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts.map(Number);
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLng > maxLng || minLat > maxLat) return null;
  return { minLng, minLat, maxLng, maxLat };
}

const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,255}$/;

function inBBox(r: { lat?: number | null; lng?: number | null }, b: BBox): boolean {
  return r.lat != null && r.lng != null
      && r.lat >= b.minLat && r.lat <= b.maxLat
      && r.lng >= b.minLng && r.lng <= b.maxLng;
}

function toLite(r: Restaurant): Record<string, unknown> {
  const row = r as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of LITE_FIELDS) out[f] = row[f] ?? null;
  out.photo_refs = Array.isArray(r.photo_refs) ? r.photo_refs.slice(0, 1) : [];
  return out;
}

// ── DB path (Neon) ────────────────────────────────────────────────────────────

const LITE_SELECT = LITE_FIELDS.map(f =>
  f === "photo_refs"
    ? `CASE WHEN jsonb_typeof(photo_refs) = 'array' AND jsonb_array_length(photo_refs) > 0
            THEN jsonb_build_array(photo_refs -> 0) ELSE '[]'::jsonb END AS photo_refs`
    : f
).join(", ");

/**
 * A region's boxes from lib/regions.ts as SQL: mins inclusive, maxes exclusive, and a row
 * without coordinates is in no box — the same rules as `inRegionBounds`. `lat`/`lng` are
 * `real` columns, so the edges are compared as `real` too; comparing against float8 would
 * move a row sitting exactly on an edge such as −121.9 to the other side.
 */
function boxesSql(boxes: Box[], bind: (v: unknown) => string): string {
  const one = (b: Box) => {
    const c = ["lat IS NOT NULL", "lng IS NOT NULL"];
    if (b.minLat !== undefined) c.push(`lat >= ${bind(b.minLat)}::real`);
    if (b.maxLat !== undefined) c.push(`lat < ${bind(b.maxLat)}::real`);
    if (b.minLng !== undefined) c.push(`lng >= ${bind(b.minLng)}::real`);
    if (b.maxLng !== undefined) c.push(`lng < ${bind(b.maxLng)}::real`);
    return `(${c.join(" AND ")})`;
  };
  return `(${boxes.map(one).join(" OR ")})`;
}

async function dbQuery(params: ListParams): Promise<Result> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  const values: unknown[] = [];
  const bind = (v: unknown) => { values.push(v); return `$${values.length}`; };
  const where: string[] = [];

  if (params.buffetsOnly && params.minScore > 0)
    // float8 so an absurd min_score is a comparison that matches nothing, not a cast error
    where.push(`buffet_score >= ${bind(params.minScore)}::float8`);
  const allowedStates = statesForRegion(params.state);
  if (allowedStates) {
    where.push(`upper(state) = ANY(${bind(allowedStates)}::text[])`);
    const boxes = REGION_DEFS[params.state]?.boxes;
    if (boxes) where.push(boxesSql(boxes, bind));
  }
  if (params.confidence)
    where.push(`buffet_confidence = ${bind(params.confidence.toUpperCase())}`);
  if (params.bbox) {
    const b = params.bbox;
    where.push(
      `lat BETWEEN ${bind(b.minLat)}::real AND ${bind(b.maxLat)}::real AND ` +
      `lng BETWEEN ${bind(b.minLng)}::real AND ${bind(b.maxLng)}::real`
    );
  }
  const buffetFlag = params.buffetsOnly ? ["is_buffet = true"] : [];
  const whereSql = (conds: string[]) => (conds.length ? ` WHERE ${conds.join(" AND ")}` : "");

  let base: string;
  if (params.lite || params.bbox) {
    // `id` breaks score ties, so the order is the same from one request to the next
    // (a map that refetches as it pans must not reshuffle its list).
    base =
      `SELECT ${params.lite ? LITE_SELECT : "*"} FROM restaurants` +
      whereSql([...buffetFlag, ...where]) +
      ` ORDER BY buffet_score DESC, id`;
  } else {
    // Requests from clients that predate bbox/fields (iOS 1.1.0 and 1.2.0). They used to
    // get `… ORDER BY buffet_score DESC` over the whole table, filtered afterwards in JS,
    // so rows with equal scores came back in whatever order that one sort left them in.
    // Numbering the rows in that same sort *before* filtering keeps their output
    // byte-for-byte the same while the filtering itself now happens in Postgres.
    base =
      `SELECT * FROM (` +
        `SELECT *, row_number() OVER (ORDER BY buffet_score DESC) AS ${RANK_COL} FROM restaurants` +
        whereSql(buffetFlag) +
      `) ranked` + whereSql(where) + ` ORDER BY ${RANK_COL}`;
  }
  const clean = (rows: Record<string, unknown>[]) => {
    for (const r of rows) delete r[RANK_COL];
    return rows;
  };

  // Search stays in JS: Postgres lower() and JS toLowerCase() can disagree on non-ASCII
  // names, and the rows it runs over are already narrowed by everything above.
  if (params.search) {
    const q = params.search;
    const rows = clean(await sql(base, values)) as unknown as Restaurant[];
    const hits = rows.filter(r =>
      r.name?.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q)
    );
    return { restaurants: hits.slice(0, params.limit), total: hits.length };
  }

  // No search: let Postgres cut the result. When the cut actually bites, count the rest.
  const limit = Math.min(params.limit, MAX_SQL_LIMIT);
  const filterValues = [...values];
  const rows = clean(await sql(`${base} LIMIT ${bind(limit)}`, values));
  let total = rows.length;
  if (rows.length === limit) {
    const counted = await sql(
      `SELECT count(*)::int AS n FROM restaurants` + whereSql([...buffetFlag, ...where]),
      filterValues,
    );
    total = (counted[0] as { n: number }).n;
  }
  return { restaurants: rows, total };
}

async function dbById(placeId: string): Promise<Result> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM restaurants WHERE place_id = ${placeId} LIMIT 1`;
  return { restaurants: rows, total: rows.length };
}

// ── File path (local dev) ─────────────────────────────────────────────────────

function readFiles(names: string[], suffix: "buffets" | "all"): Restaurant[] {
  return names
    .map(name => path.join(process.cwd(), "data", `${name}_${suffix}.json`))
    .filter(f => fs.existsSync(f))
    .flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));
}

function fileQuery(params: ListParams): Result {
  const regionFiles = REGION_DEFS[params.state]?.files ?? ALL_REGION_FILES;
  let restaurants = readFiles(regionFiles, params.buffetsOnly ? "buffets" : "all");

  const seen = new Set<string>();
  restaurants = restaurants.filter(r => { if (seen.has(r.place_id)) return false; seen.add(r.place_id); return true; });
  restaurants = restaurants.filter(r => inRegionBounds(r, params.state));
  if (params.buffetsOnly)
    restaurants = restaurants.filter(r => r.buffet_score >= params.minScore);
  restaurants = restaurants
    .filter(r => !params.confidence || r.buffet_confidence === params.confidence.toUpperCase())
    .filter(r => !params.search || r.name.toLowerCase().includes(params.search!) || r.address?.toLowerCase().includes(params.search!));
  if (params.bbox) {
    const bbox = params.bbox;
    restaurants = restaurants.filter(r => inBBox(r, bbox));
  }
  restaurants.sort((a, b) => b.buffet_score - a.buffet_score);

  const page = restaurants.slice(0, params.limit);
  return { restaurants: params.lite ? page.map(toLite) : page, total: restaurants.length };
}

function fileById(placeId: string): Result {
  for (const suffix of ["buffets", "all"] as const) {
    const hit = readFiles(ALL_REGION_FILES, suffix).find(r => r.place_id === placeId);
    if (hit) return { restaurants: [hit], total: 1 };
  }
  return { restaurants: [], total: 0 };
}

// ── Route ─────────────────────────────────────────────────────────────────────

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Neon in production, JSON files in dev. If the database call fails (outage, exceeded
 * quota), serve the committed JSON snapshot instead of a 500; it lacks DB-only fields such
 * as buffet_schedule, so responses are marked with x-data-source: files.
 */
async function withFallback(fromDb: () => Promise<Result>, fromFiles: () => Result) {
  if (!USE_DB) return NextResponse.json(fromFiles());
  try {
    return NextResponse.json(await fromDb());
  } catch (err) {
    console.error("[restaurants] DB failed, serving JSON snapshot:", err instanceof Error ? err.message : err);
    return NextResponse.json(fromFiles(), { headers: { "x-data-source": "files" } });
  }
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const placeId = p.get("place_id");
  if (placeId !== null) {
    if (!PLACE_ID_RE.test(placeId)) return badRequest("Invalid place_id");
    return withFallback(() => dbById(placeId), () => fileById(placeId));
  }

  const fields = p.get("fields");
  if (fields !== null && fields !== "lite" && fields !== "full")
    return badRequest("fields must be 'lite' or 'full'");

  const rawBBox = p.get("bbox");
  const bbox = rawBBox === null ? undefined : parseBBox(rawBBox);
  if (bbox === null)
    return badRequest("bbox must be minLng,minLat,maxLng,maxLat in degrees, with min <= max");

  const params: ListParams = {
    state:       p.get("state")        ?? "all",
    minScore:    parseInt(p.get("min_score") ?? "30"),
    buffetsOnly: p.get("buffets_only") !== "false",
    confidence:  p.get("confidence")   ?? undefined,
    search:      p.get("search")?.toLowerCase() ?? undefined,
    limit:       Math.max(parseInt(p.get("limit") ?? "") || 0, MIN_LIMIT),
    bbox,
    lite:        fields === "lite",
  };

  return withFallback(() => dbQuery(params), () => fileQuery(params));
}
