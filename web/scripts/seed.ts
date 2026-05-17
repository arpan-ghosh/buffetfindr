/**
 * Seed the Neon database from scraped JSON files.
 * Run after setting DATABASE_URL:
 *   npm run db:seed
 */

import * as fs from "fs";
import * as path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { restaurants } from "../db/schema";
import { sql } from "drizzle-orm";

const db = drizzle(neon(process.env.DATABASE_URL!), {
  schema: { restaurants },
});

const DATA_DIR = path.join(__dirname, "..", "data");

async function seed() {
  const states = ["maryland", "virginia", "dc"];
  let total = 0;

  for (const state of states) {
    const file = path.join(DATA_DIR, `${state}_buffets.json`);
    if (!fs.existsSync(file)) {
      console.log(`  skip ${state} — file not found`);
      continue;
    }

    const rows = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log(`  ${state}: ${rows.length} buffets`);

    for (const r of rows) {
      await db
        .insert(restaurants)
        .values({
          place_id:         r.place_id,
          name:             r.name,
          address:          r.address,
          state:            r.state,
          lat:              r.lat,
          lng:              r.lng,
          phone:            r.phone,
          website:          r.website,
          rating:           r.rating,
          review_count:     r.review_count,
          price_level:      r.price_level,
          business_status:  r.business_status,
          hours:            r.hours,
          hours_periods:    r.hours_periods,
          photo_refs:       r.photo_refs,
          types:            r.types,
          buffet_score:     r.buffet_score,
          buffet_confidence: r.buffet_confidence,
          buffet_evidence:  r.buffet_evidence,
          is_buffet:        r.is_buffet,
          scraped_at:       r.scraped_at ? new Date(r.scraped_at) : null,
        })
        .onConflictDoUpdate({
          target: restaurants.place_id,
          set: {
            buffet_score:      r.buffet_score,
            buffet_confidence: r.buffet_confidence,
            buffet_evidence:   r.buffet_evidence,
            is_buffet:         r.is_buffet,
            rating:            r.rating,
            review_count:      r.review_count,
            hours:             r.hours,
            updated_at:        sql`now()`,
          },
        });
      total++;
    }
  }

  console.log(`\nSeeded ${total} restaurants.`);
}

seed().catch(console.error);
