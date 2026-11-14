import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { Restaurant } from "@/lib/types";
import { REGION_DEFS, ALL_REGION_FILES, inRegionBounds } from "@/lib/regions";

const USE_DB = !!process.env.DATABASE_URL;

// Floor on results per request. The shipped iOS app (1.1.0) and the web page ask for
// 500, which silently dropped the lowest-scoring buffets from the "All" view once the
// dataset passed 500. Old app builds can only be fixed from here.
const MIN_LIMIT = 1000;

function statesForRegion(region: string): string[] | null {
  return region === "all" ? null : (REGION_DEFS[region]?.states ?? [region.toUpperCase()]);
}

// ── DB path (Neon) ────────────────────────────────────────────────────────────

async function dbQuery(params: {
  state: string;
  minScore: number;
  buffetsOnly: boolean;
  confidence?: string;
  search?: string;
  limit: number;
}): Promise<{ restaurants: Restaurant[]; total: number }> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  const rows = params.buffetsOnly
    ? await sql`SELECT * FROM restaurants WHERE is_buffet = true ORDER BY buffet_score DESC`
    : await sql`SELECT * FROM restaurants ORDER BY buffet_score DESC`;

  let restaurants = rows as unknown as Restaurant[];

  const allowedStates = statesForRegion(params.state);
  if (allowedStates)
    restaurants = restaurants.filter(r => allowedStates.includes(r.state?.toUpperCase() ?? "") && inRegionBounds(r, params.state));
  if (params.buffetsOnly && params.minScore > 0)
    restaurants = restaurants.filter(r => (r.buffet_score ?? 0) >= params.minScore);
  if (params.confidence)
    restaurants = restaurants.filter(r => r.buffet_confidence === params.confidence!.toUpperCase());
  if (params.search)
    restaurants = restaurants.filter(r =>
      r.name?.toLowerCase().includes(params.search!) ||
      r.address?.toLowerCase().includes(params.search!)
    );

  return { restaurants: restaurants.slice(0, params.limit), total: restaurants.length };
}

// ── File path (local dev) ─────────────────────────────────────────────────────

function loadFile(name: string): Restaurant[] {
  const file = path.join(process.cwd(), "data", `${name}_buffets.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fileQuery(params: {
  state: string;
  minScore: number;
  buffetsOnly: boolean;
  confidence?: string;
  search?: string;
  limit: number;
}): { restaurants: Restaurant[]; total: number } {
  const suffix = params.buffetsOnly ? "buffets" : "all";
  const regionFiles = REGION_DEFS[params.state]?.files ?? ALL_REGION_FILES;
  const allFiles = regionFiles.flatMap(name => [
    path.join(process.cwd(), "data", `${name}_${suffix}.json`),
  ]);

  let restaurants: Restaurant[] = allFiles
    .filter(f => fs.existsSync(f))
    .flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")));

  const seen = new Set<string>();
  restaurants = restaurants.filter(r => { if (seen.has(r.place_id)) return false; seen.add(r.place_id); return true; });
  restaurants = restaurants.filter(r => inRegionBounds(r, params.state));
  if (params.buffetsOnly)
    restaurants = restaurants.filter(r => r.buffet_score >= params.minScore);
  restaurants = restaurants
    .filter(r => !params.confidence || r.buffet_confidence === params.confidence.toUpperCase())
    .filter(r => !params.search || r.name.toLowerCase().includes(params.search!) || r.address?.toLowerCase().includes(params.search!));
  restaurants.sort((a, b) => b.buffet_score - a.buffet_score);

  return { restaurants: restaurants.slice(0, params.limit), total: restaurants.length };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const params = {
    state:       p.get("state")        ?? "all",
    minScore:    parseInt(p.get("min_score") ?? "30"),
    buffetsOnly: p.get("buffets_only") !== "false",
    confidence:  p.get("confidence")   ?? undefined,
    search:      p.get("search")?.toLowerCase() ?? undefined,
    limit:       Math.max(parseInt(p.get("limit") ?? "") || 0, MIN_LIMIT),
  };

  const result = USE_DB ? await dbQuery(params) : fileQuery(params);
  return NextResponse.json(result);
}
