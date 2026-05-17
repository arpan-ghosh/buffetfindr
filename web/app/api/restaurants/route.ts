import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { Restaurant } from "@/lib/types";

const USE_DB = !!process.env.DATABASE_URL;

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

  const conditions: string[] = ["is_buffet = true", `buffet_score >= ${params.minScore}`];
  if (params.state !== "all") conditions.push(`state = '${params.state.toUpperCase()}'`);
  if (params.confidence) conditions.push(`buffet_confidence = '${params.confidence.toUpperCase()}'`);
  if (params.search) {
    const s = params.search.replace(/'/g, "''");
    conditions.push(`(lower(name) LIKE '%${s}%' OR lower(address) LIKE '%${s}%')`);
  }

  const where = conditions.join(" AND ");
  const rows = await sql`
    SELECT * FROM restaurants
    WHERE ${sql.unsafe(where)}
    ORDER BY buffet_score DESC
    LIMIT ${params.limit}
  `;
  const total = await sql`SELECT COUNT(*) FROM restaurants WHERE ${sql.unsafe(where)}`;

  return {
    restaurants: rows as unknown as Restaurant[],
    total: Number((total[0] as { count: string }).count),
  };
}

// ── File path (local dev) ─────────────────────────────────────────────────────

function loadState(state: string): Restaurant[] {
  const file = path.join(process.cwd(), "data", `${state}_buffets.json`);
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
  const states = params.state === "all" ? ["maryland", "virginia", "dc"] : [params.state.toLowerCase()];
  let restaurants: Restaurant[] = states.flatMap(loadState);

  const seen = new Set<string>();
  restaurants = restaurants.filter(r => { if (seen.has(r.place_id)) return false; seen.add(r.place_id); return true; });
  restaurants = restaurants
    .filter(r => r.buffet_score >= params.minScore)
    .filter(r => !params.confidence || r.buffet_confidence === params.confidence.toUpperCase())
    .filter(r => !params.search || r.name.toLowerCase().includes(params.search) || r.address?.toLowerCase().includes(params.search));
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
    limit:      parseInt(p.get("limit") ?? "200"),
  };

  const result = USE_DB ? await dbQuery(params) : fileQuery(params);
  return NextResponse.json(result);
}
