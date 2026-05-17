import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { Restaurant } from "@/lib/types";

const USE_DB = !!process.env.DATABASE_URL;

// Region → state abbreviations (matches what's stored in DB / JSON)
const REGION_STATES: Record<string, string[]> = {
  dmv:     ["MD", "VA", "DC"],
  boston:  ["MA"],
  nyc:     ["NY"],
  philly:  ["PA"],
  nj:      ["NJ"],
  chicago: ["IL"],
  seattle: ["WA"],
};

// JSON file names per region
const REGION_FILES: Record<string, string[]> = {
  all:     ["maryland", "virginia", "dc", "massachusetts", "new_york", "philadelphia", "new_jersey", "illinois", "washington"],
  dmv:     ["maryland", "virginia", "dc"],
  boston:  ["massachusetts"],
  nyc:     ["new_york"],
  philly:  ["philadelphia"],
  nj:      ["new_jersey"],
  chicago: ["illinois"],
  seattle: ["washington"],
};

function statesForRegion(region: string): string[] | null {
  return region === "all" ? null : (REGION_STATES[region] ?? [region.toUpperCase()]);
}

// ── DB path (Neon) ────────────────────────────────────────────────────────────

async function dbQuery(params: {
  state: string;
  minScore: number;
  confidence?: string;
  search?: string;
  limit: number;
}): Promise<{ restaurants: Restaurant[]; total: number }> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`
    SELECT * FROM restaurants
    WHERE is_buffet = true
    ORDER BY buffet_score DESC
  `;

  let restaurants = rows as unknown as Restaurant[];

  const allowedStates = statesForRegion(params.state);
  if (allowedStates)
    restaurants = restaurants.filter(r => allowedStates.includes(r.state?.toUpperCase() ?? ""));
  if (params.minScore > 0)
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
  confidence?: string;
  search?: string;
  limit: number;
}): { restaurants: Restaurant[]; total: number } {
  const files = REGION_FILES[params.state] ?? REGION_FILES.all;
  let restaurants: Restaurant[] = files.flatMap(loadFile);

  const seen = new Set<string>();
  restaurants = restaurants.filter(r => { if (seen.has(r.place_id)) return false; seen.add(r.place_id); return true; });
  restaurants = restaurants
    .filter(r => r.buffet_score >= params.minScore)
    .filter(r => !params.confidence || r.buffet_confidence === params.confidence.toUpperCase())
    .filter(r => !params.search || r.name.toLowerCase().includes(params.search!) || r.address?.toLowerCase().includes(params.search!));
  restaurants.sort((a, b) => b.buffet_score - a.buffet_score);

  return { restaurants: restaurants.slice(0, params.limit), total: restaurants.length };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const params = {
    state:      p.get("state")      ?? "all",
    minScore:   parseInt(p.get("min_score") ?? "30"),
    confidence: p.get("confidence") ?? undefined,
    search:     p.get("search")?.toLowerCase() ?? undefined,
    limit:      parseInt(p.get("limit") ?? "300"),
  };

  const result = USE_DB ? await dbQuery(params) : fileQuery(params);
  return NextResponse.json(result);
}
