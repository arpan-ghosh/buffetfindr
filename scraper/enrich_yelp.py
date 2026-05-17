#!/usr/bin/env python3
"""
Yelp enrichment pipeline — no API key required.

Two things it does:
  1. Cross-verifies existing restaurants: finds their Yelp page, scrapes
     reviews, boosts buffet_score if reviews mention buffet.
  2. Discovery pass: searches Yelp directly for "Indian buffet" in each
     area to find restaurants our Google scraper missed.

Usage:
    python enrich_yelp.py --state maryland
    python enrich_yelp.py --state all
"""

import argparse
import json
import logging
import time
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

import yelp_scraper as yelp
from locations import STATE_MAP

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"

# Yelp search areas per state — city, state string Yelp understands
YELP_LOCATIONS = {
    "maryland": [
        "Rockville, MD", "Gaithersburg, MD", "Germantown, MD",
        "Silver Spring, MD", "Bethesda, MD", "Columbia, MD",
        "Baltimore, MD", "Ellicott City, MD", "Laurel, MD",
        "Bowie, MD", "Frederick, MD", "Annapolis, MD",
    ],
    "virginia": [
        "Fairfax, VA", "Herndon, VA", "Sterling, VA", "Ashburn, VA",
        "Reston, VA", "Vienna, VA", "Springfield, VA", "Alexandria, VA",
        "Arlington, VA", "Manassas, VA", "Woodbridge, VA",
        "Richmond, VA", "Virginia Beach, VA",
    ],
    "dc": [
        "Washington, DC",
    ],
}


def name_similarity(a: str, b: str) -> float:
    a = a.lower().strip()
    b = b.lower().strip()
    # Exact match
    if a == b:
        return 1.0
    # Remove common suffixes before comparing
    for suffix in [" restaurant", " indian cuisine", " cuisine", " bar", " grill", " & bar"]:
        a = a.replace(suffix, "")
        b = b.replace(suffix, "")
    return SequenceMatcher(None, a.strip(), b.strip()).ratio()


def address_overlap(a: str, b: str) -> bool:
    """Return True if addresses share a meaningful token (street number or zip)."""
    a_parts = set(a.lower().replace(",", "").split())
    b_parts = set(b.lower().replace(",", "").split())
    # Street numbers are strong matches
    nums_a = {p for p in a_parts if p.isdigit() and len(p) >= 4}
    nums_b = {p for p in b_parts if p.isdigit() and len(p) >= 4}
    if nums_a & nums_b:
        return True
    # ZIP codes
    zips_a = {p for p in a_parts if len(p) == 5 and p.isdigit()}
    zips_b = {p for p in b_parts if len(p) == 5 and p.isdigit()}
    return bool(zips_a & zips_b)


def find_match(yelp_name: str, yelp_address: str, google_restaurants: list) -> Optional[dict]:
    """Find the best matching Google restaurant for a Yelp result."""
    best = None
    best_score = 0.0

    for r in google_restaurants:
        name_sim = name_similarity(yelp_name, r.get("name", ""))
        if name_sim < 0.55:
            continue
        addr_ok = address_overlap(yelp_address, r.get("address", ""))
        combined = name_sim * (1.4 if addr_ok else 1.0)
        if combined > best_score:
            best_score = combined
            best = r

    return best if best_score >= 0.65 else None


def enrich_state(state_key: str):
    state_cfg  = STATE_MAP[state_key]
    state_abbr = state_cfg["abbr"]
    raw_path   = DATA_DIR / f"{state_key}_raw.json"
    out_path   = DATA_DIR / f"{state_key}_raw.json"  # update in-place

    if not raw_path.exists():
        logger.error(f"No raw data for {state_key}. Run scraper first.")
        return

    with open(raw_path) as f:
        restaurants = json.load(f)

    logger.info(f"{'='*60}")
    logger.info(f"Enriching {state_key.upper()} — {len(restaurants)} restaurants")
    logger.info(f"{'='*60}")

    # ── Phase 1: Discovery — find new buffets via Yelp search ───────────────
    yelp_locations = YELP_LOCATIONS.get(state_key, [])
    yelp_candidates = []
    seen_yelp_urls = set()

    for location in yelp_locations:
        logger.info(f"  [DISCOVERY] Searching Yelp: '{location}'")
        results = yelp.search_buffets(location)
        for r in results:
            if r["yelp_url"] not in seen_yelp_urls:
                seen_yelp_urls.add(r["yelp_url"])
                yelp_candidates.append(r)
        logger.info(f"    → {len(results)} results ({len(yelp_candidates)} unique so far)")
        time.sleep(1.5)

    logger.info(f"\n  Discovery found {len(yelp_candidates)} unique Yelp buffet listings")

    # ── Phase 2: Cross-reference & enrich ───────────────────────────────────
    matched_count = 0
    new_count = 0

    for yelp_biz in yelp_candidates:
        match = find_match(yelp_biz["name"], yelp_biz["address"], restaurants)

        if match:
            # Existing restaurant — scrape Yelp reviews and boost score
            logger.info(f"  [MATCH] {match['name']} ↔ {yelp_biz['name']}")
            time.sleep(1)
            reviews = yelp.get_reviews(yelp_biz["yelp_url"])
            found, kws = yelp.has_buffet(reviews)

            if found:
                boost = min(20 + (len(kws) - 1) * 5, 30)
                match["buffet_score"] = min(match.get("buffet_score", 0) + boost, 100)
                evidence_str = f"Yelp: buffet in reviews ({', '.join(kws[:2])})"
                if evidence_str not in match.get("buffet_evidence", []):
                    match.setdefault("buffet_evidence", []).append(evidence_str)
                if match["buffet_score"] >= 30:
                    match["is_buffet"] = True
                match["buffet_confidence"] = (
                    "HIGH" if match["buffet_score"] >= 60 else "MEDIUM"
                )
                logger.info(f"    ✓ Buffet confirmed via Yelp — new score: {match['buffet_score']}")
            else:
                logger.info(f"    → No buffet keywords in Yelp reviews")

            match["yelp_url"] = yelp_biz["yelp_url"]
            matched_count += 1

        else:
            # Not in our Google data — flag as a new candidate
            logger.info(f"  [NEW]   {yelp_biz['name']} ({yelp_biz['address']}) — not in Google data")
            new_count += 1
            # Add to raw as a Yelp-sourced candidate for manual review
            yelp_entry = {
                "place_id":          f"YELP_{hash(yelp_biz['yelp_url']) & 0xFFFFFFFF:08x}",
                "name":              yelp_biz["name"],
                "address":           yelp_biz["address"],
                "lat":               None,
                "lng":               None,
                "phone":             None,
                "website":           None,
                "rating":            yelp_biz.get("rating"),
                "review_count":      yelp_biz.get("review_count"),
                "price_level":       None,
                "business_status":   "OPERATIONAL",
                "hours":             [],
                "hours_periods":     [],
                "photo_refs":        [],
                "types":             ["restaurant"],
                "buffet_score":      45,
                "buffet_confidence": "MEDIUM",
                "buffet_evidence":   ["found via Yelp 'Indian buffet' search"],
                "is_buffet":         True,
                "yelp_url":          yelp_biz["yelp_url"],
                "state":             state_abbr,
                "found_via":         "yelp_discovery",
                "search_location":   yelp_biz.get("address", ""),
                "scraped_at":        None,
                "needs_google_lookup": True,
            }
            restaurants.append(yelp_entry)

    # ── Save updated raw JSON ────────────────────────────────────────────────
    with open(out_path, "w") as f:
        json.dump(restaurants, f, indent=2)

    # Regenerate buffets file
    buffets = [r for r in restaurants if r.get("is_buffet")]
    with open(DATA_DIR / f"{state_key}_buffets.json", "w") as f:
        json.dump(buffets, f, indent=2)

    logger.info(f"\n  {state_key.upper()} enrichment done:")
    logger.info(f"    {matched_count} existing restaurants boosted with Yelp data")
    logger.info(f"    {new_count} new Yelp-only candidates added")
    logger.info(f"    Total buffets: {len(buffets)}")

    # Print new candidates for review
    new_candidates = [r for r in restaurants if r.get("found_via") == "yelp_discovery"]
    if new_candidates:
        logger.info(f"\n  New candidates (needs_google_lookup=True):")
        for r in new_candidates:
            logger.info(f"    - {r['name']} | {r['address']} | {r['yelp_url']}")


def main():
    parser = argparse.ArgumentParser(description="Enrich buffet data with Yelp reviews")
    parser.add_argument(
        "--state",
        choices=["maryland", "virginia", "dc", "all"],
        default="maryland",
    )
    args = parser.parse_args()

    states = list(STATE_MAP.keys()) if args.state == "all" else [args.state]
    for state in states:
        enrich_state(state)


if __name__ == "__main__":
    main()
