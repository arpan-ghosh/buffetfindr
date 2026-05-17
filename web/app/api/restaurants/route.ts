import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { Restaurant } from "@/lib/types";

function loadState(state: string): Restaurant[] {
  const file = path.join(process.cwd(), "data", `${state}_buffets.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateParam  = searchParams.get("state") ?? "all";
  const minScore    = parseInt(searchParams.get("min_score") ?? "30");
  const confidence  = searchParams.get("confidence");
  const search      = searchParams.get("search")?.toLowerCase();
  const limit       = parseInt(searchParams.get("limit") ?? "200");

  const states = stateParam === "all" ? ["maryland", "virginia", "dc"] : [stateParam.toLowerCase()];

  let restaurants: Restaurant[] = states.flatMap(loadState);

  // Deduplicate by place_id (overlap from border searches)
  const seen = new Set<string>();
  restaurants = restaurants.filter(r => {
    if (seen.has(r.place_id)) return false;
    seen.add(r.place_id);
    return true;
  });

  // Filter
  restaurants = restaurants
    .filter(r => r.buffet_score >= minScore)
    .filter(r => !confidence || r.buffet_confidence === confidence.toUpperCase())
    .filter(r => !search || r.name.toLowerCase().includes(search) || r.address?.toLowerCase().includes(search));

  // Sort by score desc
  restaurants.sort((a, b) => b.buffet_score - a.buffet_score);

  return NextResponse.json({
    restaurants: restaurants.slice(0, limit),
    total: restaurants.length,
  });
}
