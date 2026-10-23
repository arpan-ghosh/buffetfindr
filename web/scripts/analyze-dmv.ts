/**
 * Batch-analyze buffet schedules for all unclassified DMV restaurants (MD, VA, DC).
 * Usage: npm run analyze:dmv
 *
 * Requires in .env.local:
 *   DATABASE_URL
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *   ANTHROPIC_API_KEY
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { neon } from "@neondatabase/serverless";
import { analyzeBuffetSchedule } from "../lib/analyze-schedule";

const CONCURRENCY = 3;
const BATCH_DELAY_MS = 1000;

interface Row {
  place_id: string;
  name: string;
  state: string;
  buffet_score: number;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set in .env.local");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set in .env.local");

  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`
    SELECT place_id, name, state, buffet_score
    FROM restaurants
    WHERE state IN ('MD', 'VA', 'DC')
      AND is_buffet = true
      AND buffet_schedule_fetched_at IS NULL
    ORDER BY buffet_score DESC
  ` as Row[];

  console.log(`Found ${rows.length} unanalyzed DMV buffet restaurants\n`);
  if (!rows.length) return;

  let processed = 0;
  let errors = 0;
  const results: Record<string, number> = { BOTH: 0, WEEKEND_ONLY: 0, WEEKDAY_ONLY: 0, DISCONTINUED: 0, UNKNOWN: 0 };

  async function analyzeOne(row: Row) {
    try {
      const result = await analyzeBuffetSchedule(row.place_id);
      await sql`
        UPDATE restaurants
        SET buffet_schedule = ${result.buffet_schedule},
            buffet_schedule_fetched_at = NOW()
        WHERE place_id = ${row.place_id}
      `;
      processed++;
      results[result.buffet_schedule] = (results[result.buffet_schedule] ?? 0) + 1;
      const pct = `${processed}/${rows.length}`;
      console.log(`[${pct}] ${row.name} (${row.state}) → ${result.buffet_schedule} [${result.confidence}]`);
      if (result.reasoning) console.log(`       ${result.reasoning}`);
    } catch (err) {
      errors++;
      console.error(`  ERROR ${row.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(row => analyzeOne(row)));
    if (i + CONCURRENCY < rows.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log("\n── Summary ──────────────────────────────");
  for (const [k, v] of Object.entries(results)) {
    if (v > 0) console.log(`  ${k.padEnd(14)}: ${v}`);
  }
  if (errors > 0) console.log(`  ERRORS       : ${errors}`);
  console.log(`  Total        : ${processed + errors}/${rows.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
