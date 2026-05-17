---
description: Analyze scraped buffet results and flag anything needing manual verification. Usage: /review-results [state]
allowed-tools: mcp__buffet-scraper__get_buffet_results, mcp__buffet-scraper__check_scrape_status
---

Analyze scraped Indian buffet results for: $ARGUMENTS (default: "maryland")

1. Call `get_buffet_results` for the state with min_score=0 to see everything
2. Analyze and report:
   - **HIGH confidence** (score ≥60): ready to publish
   - **MEDIUM confidence** (30–59): needs manual verification — call these out by name
   - **Thin evidence** (only 1 review mention, no website confirmation): flag individually
   - **Suspicious entries**: very few reviews (<10), closed businesses, duplicate names
3. Output a verification checklist — which restaurants to call/visit before launch
4. Suggest any follow-up scraping (e.g. nearby cities with no results)

Be direct. The goal is a list of what's ready to publish vs what needs a phone call.
