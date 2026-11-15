import fs from "fs";
import path from "path";
import type { Restaurant } from "@/lib/types";

/**
 * Buffets from the committed web/data JSON, for pages to use when the database is
 * unavailable. De-duplicated by place_id; lacks DB-only fields such as buffet_schedule.
 */
export function snapshotBuffets(files: string[]): Restaurant[] {
  const seen = new Set<string>();
  return files
    .map(name => path.join(process.cwd(), "data", `${name}_buffets.json`))
    .filter(f => fs.existsSync(f))
    .flatMap(f => JSON.parse(fs.readFileSync(f, "utf8")) as Restaurant[])
    .filter(r => !seen.has(r.place_id) && !!seen.add(r.place_id));
}
