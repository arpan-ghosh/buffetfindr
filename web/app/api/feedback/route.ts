import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "data", "feedback.json");
const USE_DB = !!process.env.DATABASE_URL;

type Votes = Record<string, { up: number; down: number }>;

// ── DB helpers (only imported when DATABASE_URL is set) ───────────────────────

async function dbGet(ids: string[]): Promise<Votes> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT place_id, vote, COUNT(*)::int AS cnt
    FROM restaurant_feedback
    WHERE place_id = ANY(${ids})
    GROUP BY place_id, vote
  `;
  const result: Votes = {};
  for (const r of rows as { place_id: string; vote: string; cnt: number }[]) {
    if (!result[r.place_id]) result[r.place_id] = { up: 0, down: 0 };
    result[r.place_id][r.vote as "up" | "down"] = r.cnt;
  }
  return result;
}

async function dbVote(placeId: string, vote: "up" | "down") {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    INSERT INTO restaurant_feedback (place_id, vote)
    VALUES (${placeId}, ${vote})
  `;
  const rows = await sql`
    SELECT vote, COUNT(*)::int AS cnt
    FROM restaurant_feedback
    WHERE place_id = ${placeId}
    GROUP BY vote
  `;
  const counts = { up: 0, down: 0 };
  for (const r of rows as { vote: string; cnt: number }[])
    counts[r.vote as "up" | "down"] = r.cnt;
  return counts;
}

// ── File helpers (local dev only) ─────────────────────────────────────────────

function fileLoad(): Votes {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return {}; }
}
function fileSave(data: Votes) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json({});

  if (USE_DB) {
    const result = await dbGet(ids);
    for (const id of ids) if (!result[id]) result[id] = { up: 0, down: 0 };
    return NextResponse.json(result);
  }

  const all = fileLoad();
  const result: Votes = {};
  for (const id of ids) result[id] = all[id] ?? { up: 0, down: 0 };
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { place_id, vote, previous } = await req.json() as {
    place_id: string;
    vote: "up" | "down";
    previous?: "up" | "down" | null;
  };
  if (!place_id || !["up", "down"].includes(vote))
    return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (USE_DB) {
    const counts = await dbVote(place_id, vote);
    return NextResponse.json(counts);
  }

  const all = fileLoad();
  if (!all[place_id]) all[place_id] = { up: 0, down: 0 };
  if (previous && previous !== vote)
    all[place_id][previous] = Math.max(0, all[place_id][previous] - 1);
  if (previous === vote) {
    all[place_id][vote] = Math.max(0, all[place_id][vote] - 1);
    fileSave(all);
    return NextResponse.json({ ...all[place_id], cleared: true });
  }
  all[place_id][vote]++;
  fileSave(all);
  return NextResponse.json(all[place_id]);
}
