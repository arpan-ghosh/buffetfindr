import { NextRequest, NextResponse } from "next/server";
import { analyzeBuffetSchedule, PLACE_ID_RE } from "@/lib/analyze-schedule";

// ── Cost controls ────────────────────────────────────────────────────────────
// This endpoint is public and each fresh analysis costs one Google Places call
// plus one Anthropic call. Everything below exists to bound that spend using
// only the `restaurants` table (no extra infrastructure, env vars or schema):
//
//   1. Only place_ids already in `restaurants` are accepted.
//   2. A restaurant with a classification younger than CACHE_DAYS is served
//      from the DB, never re-analyzed.
//   3. A restaurant is "claimed" by stamping buffet_schedule_fetched_at BEFORE
//      the paid calls, in one conditional UPDATE. Concurrent requests for the
//      same restaurant lose the claim and spend nothing.
//   4. The stamp doubles as the budget ledger: at most DAILY_ANALYSIS_BUDGET
//      rows may carry a stamp from the last 24h, so at most that many paid
//      analyses start per rolling 24h, site-wide, however many clients ask.
//   5. If the analysis fails the stamp is left in place and the schedule is
//      left untouched (NULL for a first attempt). A NULL schedule becomes
//      eligible again after FAILURE_RETRY_HOURS, so a failure is neither
//      cached as a result for 30 days nor retryable in a tight loop.
//
// Only POST is exported; Next.js answers every other method with 405.

const CACHE_DAYS = 30;
/** Max fresh (paid) analyses started per rolling 24h across the whole site. */
const DAILY_ANALYSIS_BUDGET = 150;
/**
 * How long a restaurant with no result (failed or in-flight attempt) waits before
 * it may be attempted again. Must stay >= 24 so each attempt is counted by the
 * 24h budget window for as long as the row is locked out.
 */
const FAILURE_RETRY_HOURS = 24;
/** Serialises claims so concurrent requests cannot overshoot the budget. */
const CLAIM_LOCK_KEY = 742_100_150;

// Best-effort per-IP throttle on fresh analyses. In-memory only: on serverless
// each instance has its own map and instances are recycled, so this merely
// slows a single noisy client. The DB-enforced budget above is the real limit.
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_FRESH = 10;
const ipHits = new Map<string, number[]>();

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  if (ipHits.size > 5000) ipHits.clear();
  const recent = (ipHits.get(ip) ?? []).filter(t => now - t < IP_WINDOW_MS);
  if (recent.length >= IP_MAX_FRESH) {
    ipHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return true;
}

type Reason = "cached" | "recently_attempted" | "in_progress" | "daily_budget_exhausted" | "rate_limited";

/** 200 response that spends nothing: whatever the DB has (possibly null) plus why. */
function skipped(schedule: unknown, reason: Reason) {
  return NextResponse.json({ buffet_schedule: schedule ?? null, analyzed: false, reason });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const place_id = (body as { place_id?: unknown } | null)?.place_id;

  if (typeof place_id !== "string" || !PLACE_ID_RE.test(place_id)) {
    return NextResponse.json({ error: "Valid place_id required" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`
    SELECT buffet_schedule,
           (buffet_schedule IS NOT NULL
             AND buffet_schedule_fetched_at > NOW() - make_interval(days => ${CACHE_DAYS})) AS fresh,
           (buffet_schedule IS NULL
             AND buffet_schedule_fetched_at > NOW() - make_interval(hours => ${FAILURE_RETRY_HOURS})) AS cooling,
           (SELECT count(*)::int FROM restaurants
             WHERE buffet_schedule_fetched_at > NOW() - interval '24 hours') AS used_24h
    FROM restaurants
    WHERE place_id = ${place_id}
  `;

  // Unknown ids stop here, before any paid call.
  if (!rows.length) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const row = rows[0];
  if (row.fresh) return skipped(row.buffet_schedule, "cached");
  if (row.cooling) return skipped(null, "recently_attempted");
  if ((row.used_24h as number) >= DAILY_ANALYSIS_BUDGET) {
    return skipped(row.buffet_schedule, "daily_budget_exhausted");
  }

  // On Vercel x-forwarded-for is set by the platform, not the client.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!ipAllowed(ip)) return skipped(row.buffet_schedule, "rate_limited");

  // Atomic claim: re-checks eligibility and the budget under an advisory lock, so
  // only one request per restaurant, and at most DAILY_ANALYSIS_BUDGET per 24h, pass.
  const [, claimed] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(${CLAIM_LOCK_KEY})`,
    sql`
      UPDATE restaurants
      SET buffet_schedule_fetched_at = NOW()
      WHERE place_id = ${place_id}
        AND (
          buffet_schedule_fetched_at IS NULL
          OR buffet_schedule_fetched_at <= NOW() - make_interval(days => ${CACHE_DAYS})
          OR (buffet_schedule IS NULL
              AND buffet_schedule_fetched_at <= NOW() - make_interval(hours => ${FAILURE_RETRY_HOURS}))
        )
        AND (SELECT count(*) FROM restaurants
              WHERE buffet_schedule_fetched_at > NOW() - interval '24 hours') < ${DAILY_ANALYSIS_BUDGET}
      RETURNING place_id
    `,
  ]);

  if (!claimed.length) {
    // Lost the race to a concurrent request (or the budget just ran out).
    return skipped(row.buffet_schedule, "in_progress");
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
    // The claim stamp is deliberately left in place: it keeps this attempt in the
    // 24h budget and blocks an immediate retry. The schedule column is untouched.
    console.error("[analyze-schedule] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Analysis failed", buffet_schedule: row.buffet_schedule ?? null, analyzed: false },
      { status: 502 },
    );
  }
}
