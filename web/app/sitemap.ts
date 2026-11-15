import type { MetadataRoute } from "next";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { REGION_KEYS, ALL_REGION_FILES } from "@/lib/regions";

const BASE = "https://www.buffetfindr.com";
const REGIONS = REGION_KEYS;

type Row = { place_id: string; updated_at?: string | null };

/** Committed JSON snapshot, used when the database is unavailable so a build never fails on it. */
function rowsFromFiles(): Row[] {
  const seen = new Set<string>();
  return ALL_REGION_FILES.flatMap(name => {
    const f = path.join(process.cwd(), "data", `${name}_buffets.json`);
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as Row[]) : [];
  }).filter(r => !seen.has(r.place_id) && !!seen.add(r.place_id));
}

async function loadRows(): Promise<Row[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    return (await sql`SELECT place_id, updated_at FROM restaurants WHERE is_buffet = true`) as Row[];
  } catch (err) {
    console.error("[sitemap] DB failed, using JSON snapshot:", err instanceof Error ? err.message : err);
    return rowsFromFiles();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await loadRows();

  const restaurantUrls: MetadataRoute.Sitemap = rows.map(r => ({
    url:              `${BASE}/restaurant/${r.place_id}`,
    lastModified:     r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency:  "weekly",
    priority:         0.7,
  }));

  const regionUrls: MetadataRoute.Sitemap = REGIONS.map(region => ({
    url:             `${BASE}/buffets/${region}`,
    changeFrequency: "weekly",
    priority:        0.8,
  }));

  return [
    { url: BASE,               changeFrequency: "daily",  priority: 1.0 },
    { url: `${BASE}/privacy`,  changeFrequency: "yearly", priority: 0.2 },
    ...regionUrls,
    ...restaurantUrls,
  ];
}
