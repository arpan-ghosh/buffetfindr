---
description: Scrape Indian buffet restaurants for a state. Usage: /scrape [maryland|virginia|dc|all]
allowed-tools: mcp__buffet-scraper__scrape_buffets, mcp__buffet-scraper__get_buffet_results, mcp__buffet-scraper__check_scrape_status
---

Scrape Indian buffet restaurants using the Google Places API (New).

Target: $ARGUMENTS (default to "maryland" if not specified)

Steps:
1. Call `check_scrape_status` first — if the state was scraped in the last 7 days, confirm with the user before re-scraping (costs API credits)
2. Call `scrape_buffets` with the state from $ARGUMENTS
3. When done, call `get_buffet_results` and present a clean summary grouped by city:

| Score | Name | Address | Rating | Evidence |
|-------|------|---------|--------|----------|

4. Separate HIGH confidence (≥60) from MEDIUM (30–59)
5. End with one sentence: total found, how many HIGH vs MEDIUM confidence

Keep output tight — no padding, no repeating what's obvious from the table.
