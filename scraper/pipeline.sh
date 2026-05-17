#!/bin/bash
# Full scrape + seed pipeline for new cities.
# Usage: bash pipeline.sh massachusetts new_york
# Runs scrapes sequentially, copies data to web/, re-seeds Neon, commits + pushes.

set -e
cd "$(dirname "$0")"

STATES=("$@")
if [ ${#STATES[@]} -eq 0 ]; then
  echo "Usage: bash pipeline.sh <state1> [state2] ..."
  exit 1
fi

echo "=== Pipeline: ${STATES[*]} ==="

# 1. Scrape each state
for STATE in "${STATES[@]}"; do
  echo ""
  echo ">>> Scraping $STATE..."
  python3 main.py --state "$STATE"
done

# 2. Copy buffet files to web/data/
echo ""
echo ">>> Copying data to web/data/..."
for STATE in "${STATES[@]}"; do
  SRC="data/${STATE}_buffets.json"
  DST="../web/data/${STATE}_buffets.json"
  if [ -f "$SRC" ]; then
    cp "$SRC" "$DST"
    COUNT=$(python3 -c "import json; print(len(json.load(open('$SRC'))))")
    echo "    $STATE: $COUNT buffets → $DST"
  else
    echo "    WARNING: $SRC not found, skipping"
  fi
done

# 3. Re-seed Neon
echo ""
echo ">>> Seeding Neon database..."
cd ../web
export $(grep -v '^#' .env.local | xargs)
npm run db:seed

# 4. Commit + push
echo ""
echo ">>> Committing to git..."
cd ..
git add web/data/ scraper/locations.py scraper/main.py
git commit -m "Add scraper data: ${STATES[*]}

$(for STATE in "${STATES[@]}"; do
  COUNT=$(python3 -c "import json; print(len(json.load(open('scraper/data/${STATE}_buffets.json'))))" 2>/dev/null || echo "?")
  echo "- $STATE: $COUNT buffets"
done)

Co-Authored-By: Claude Sonnet 4.6 (1M context) <noreply@anthropic.com>"
git push

echo ""
echo "=== Pipeline complete ==="
