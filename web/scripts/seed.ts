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

async function seedFile(file: string, label: string, total: { n: number }) {
  if (!fs.existsSync(file)) return;
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`  ${label}: ${rows.length}`);
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
          state:             r.state,
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
    total.n++;
  }
}

async function seed() {
  const states = ["maryland", "virginia", "dc", "massachusetts", "new_york", "philadelphia", "new_jersey", "illinois", "washington"];
  const total = { n: 0 };

  // Seed all Indian restaurants first, then buffets (buffets win on conflict)
  console.log("Seeding all restaurants:");
  for (const state of states) {
    await seedFile(path.join(DATA_DIR, `${state}_all.json`), `  ${state} (all)`, total);
  }

  console.log("\nSeeding buffets (overrides):");
  for (const state of states) {
    await seedFile(path.join(DATA_DIR, `${state}_buffets.json`), `${state} (buffets)`, total);
  }

  console.log(`\nSeeded ${total.n} restaurants.`);
}

seed().catch(console.error);
