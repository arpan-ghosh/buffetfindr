import { NextRequest, NextResponse } from "next/server";
import { analyzeBuffetSchedule } from "@/lib/analyze-schedule";

const CACHE_DAYS = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { place_id } = body as { place_id?: string };

  if (!place_id) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`
    SELECT buffet_schedule, buffet_schedule_fetched_at
    FROM restaurants
    WHERE place_id = ${place_id}
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const row = rows[0];
  const fetchedAt = row.buffet_schedule_fetched_at ? new Date(row.buffet_schedule_fetched_at as string) : null;
  const cacheValid = fetchedAt && (Date.now() - fetchedAt.getTime()) < CACHE_DAYS * 24 * 60 * 60 * 1000;

  if (cacheValid && row.buffet_schedule) {
    return NextResponse.json({ buffet_schedule: row.buffet_schedule, analyzed: false });
  }

  try {
    const result = await analyzeBuffetSchedule(place_id);

    await sql`
      UPDATE restaurants
      SET buffet_schedule = ${result.buffet_schedule},
          buffet_schedule_fetched_at = NOW()
      WHERE place_id = ${place_id}
    `;

    return NextResponse.json({
      buffet_schedule: result.buffet_schedule,
      confidence: result.confidence,
      reasoning: result.reasoning,
      analyzed: true,
    });
  } catch (err) {
    console.error("[analyze-schedule] error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
