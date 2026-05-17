import type { MetadataRoute } from "next";
import { neon } from "@neondatabase/serverless";

const BASE = "https://www.buffetfindr.com";
const REGIONS = ["dmv","boston","nyc","philly","nj","chicago","seattle"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT place_id, updated_at FROM restaurants WHERE is_buffet = true`;

  const restaurantUrls: MetadataRoute.Sitemap = rows.map(r => ({
    url:              `${BASE}/restaurant/${r.place_id}`,
    lastModified:     r.updated_at ? new Date(r.updated_at as string) : new Date(),
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
