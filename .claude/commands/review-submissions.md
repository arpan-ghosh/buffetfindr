---
description: Review user-submitted restaurants from the queue. Approve, flag, or reject each one.
allowed-tools: mcp__buffet-scraper__check_scrape_status, Bash, Read
---

Review the user submission queue for Indian Buffet Finder.

## Steps

1. Read the submissions file:
   ```
   cat /Users/ghosh-mac-mini/Code/indianbuffetfinder/web/data/submissions.json
   ```

2. For each `pending` submission, evaluate it:
   - Search Google for the restaurant name + city to verify it exists
   - Check if the address resolves to a real location in MD/VA/DC
   - Look for any web presence confirming a buffet (website, Yelp, Google Maps)

3. Output a review table:

   | # | Name | City/State | Notes | Verdict |
   |---|------|-----------|-------|---------|
   | 1 | ... | ... | ... | ✅ Add / ❌ Reject / ⚠️ Needs more info |

4. For submissions marked ✅ **Add**:
   - Note the place name and city so it can be found via the scraper
   - Suggest running: `python3 scraper/main.py --state [state]` to pick it up automatically
   - OR note if it needs to be added to `scraper/known_buffets_override.json` manually

5. For submissions marked ❌ **Reject**:
   - State the reason (closed, not a buffet, duplicate, outside DMV, etc.)

6. For ⚠️ **Needs more info**:
   - List what's missing (address, confirmation source, etc.)

7. After the review, summarize:
   - Total pending, approved, rejected
   - Any patterns in submissions (common cities, missing areas)

Be direct. This is an operational review, not a creative task.
