#!/usr/bin/env python3
"""
Indian Buffet Finder — Data Scraper
Usage:
    python main.py --state maryland
    python main.py --state virginia
    python main.py --state dc
    python main.py --state all
"""

import argparse
import csv
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict

from dotenv import load_dotenv

import places_api
import scorer
import website_checker
from locations import STATE_MAP

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")
SEARCH_RADIUS = 12_000   # 12 km per circle
DATA_DIR = Path(__file__).parent / "data"

SEARCH_QUERIES = [
    ("Indian restaurant",      False),
    ("Indian buffet",          True),
    ("Indian Sunday buffet",   True),
    ("Indian weekend buffet",  True),
]

OVERRIDES_FILE = Path(__file__).parent / "known_buffets_override.json"


def load_overrides() -> Dict[str, Dict]:
    """Load known_buffets_override.json → {place_id: entry}."""
    if not OVERRIDES_FILE.exists():
        return {}
    with open(OVERRIDES_FILE) as f:
        entries = json.load(f)
    return {e["place_id"]: e for e in entries if e.get("place_id")}


def scrape_state(state_key: str, overrides: Dict[str, Dict]) -> List[Dict]:
    state_cfg = STATE_MAP[state_key]
    locations = state_cfg["locations"]
    state_abbr = state_cfg["abbr"]

    seen_ids = set()  # type: ignore
    results = []  # type: List[Dict]

    # Only apply overrides that belong to this state
    state_overrides = {
        pid: ov for pid, ov in overrides.items()
        if ov.get("state", "").upper() == state_abbr.upper()
    }

    logger.info(f"{'='*60}")
    logger.info(f"Scraping {state_key.upper()} — {len(locations)} search points × {len(SEARCH_QUERIES)} queries")
    if state_overrides:
        logger.info(f"  {len(state_overrides)} manual override(s) loaded")
    logger.info(f"{'='*60}")

    for location in locations:
        for query, is_buffet_query in SEARCH_QUERIES:
            logger.info(f"  [{location['name']}] '{query}'")
            page_token = None
            page = 0

            while True:
                try:
                    data = places_api.text_search(
                        query=query,
                        location=location,
                        radius=SEARCH_RADIUS,
                        api_key=API_KEY,
                        page_token=page_token,
                    )
                except Exception as e:
                    logger.error(f"    Search error: {e}")
                    break

                # Places API (New) uses HTTP errors, not a status field
                if "error" in data:
                    err = data["error"]
                    logger.error(f"    API error {err.get('code')}: {err.get('message')}")
                    break

                places = data.get("places", [])
                if not places:
                    break

                for place in places:
                    pid = place.get("id")
                    if not pid or pid in seen_ids:
                        continue

                    # Exclude non-South-Asian cuisines that slip through
                    place_name = place.get("displayName", {}).get("text", "").lower()
                    if any(t in place_name for t in [
                        "uyghur", "uighur", "chinese", "sushi", "ramen", "thai",
                        "vietnamese", "korean", "japanese", "mexican", "italian",
                        "pizza", "burger", "taco", "mediterranean", "turkish",
                    ]):
                        continue

                    seen_ids.add(pid)
                    time.sleep(0.08)

                    try:
                        details = places_api.place_details(pid, API_KEY)
                    except Exception as e:
                        logger.error(f"    Details error for {pid}: {e}")
                        continue

                    if not details:
                        continue

                    # New API field names
                    name     = details.get("displayName", {}).get("text", "")
                    address  = details.get("formattedAddress", "")
                    lat      = details.get("location", {}).get("latitude")
                    lng      = details.get("location", {}).get("longitude")
                    phone    = details.get("nationalPhoneNumber", "")
                    website  = details.get("websiteUri", "")
                    hours_text    = details.get("regularOpeningHours", {}).get("weekdayDescriptions", [])
                    hours_periods = details.get("regularOpeningHours", {}).get("periods", [])
                    photo_refs = [
                        p.get("name") for p in details.get("photos", [])[:5] if p.get("name")
                    ]

                    # Website buffet check
                    web_has_buffet, web_kws = False, []
                    if website:
                        web_has_buffet, web_kws = website_checker.check(website)

                    # Score (scorer reads displayName and reviews from details)
                    score, evidence = scorer.score(
                        details,
                        search_was_buffet_query=is_buffet_query,
                        website_keywords=web_kws if web_has_buffet else None,
                    )
                    confidence = scorer.confidence_label(score)
                    is_buffet = score >= 30

                    # Manual override: force is_buffet regardless of score
                    if pid in state_overrides:
                        is_buffet = True
                        ov_notes = state_overrides[pid].get("notes", "")
                        evidence = [f"manually verified buffet{': ' + ov_notes if ov_notes else ''}"] + evidence
                        logger.info(f"    ★ OVERRIDE applied for {name}")

                    record = {
                        "place_id":          pid,
                        "name":              name,
                        "address":           address,
                        "lat":               lat,
                        "lng":               lng,
                        "phone":             phone,
                        "website":           website,
                        "rating":            details.get("rating"),
                        "review_count":      details.get("userRatingCount"),
                        "price_level":       details.get("priceLevel"),
                        "business_status":   details.get("businessStatus"),
                        "hours":             hours_text,
                        "hours_periods":     hours_periods,
                        "photo_refs":        photo_refs,
                        "types":             details.get("types", []),
                        "buffet_score":      score,
                        "buffet_confidence": confidence,
                        "buffet_evidence":   evidence,
                        "is_buffet":         is_buffet,
                        "state":             state_abbr,
                        "found_via":         query,
                        "search_location":   location["name"],
                        "scraped_at":        datetime.utcnow().isoformat() + "Z",
                    }

                    results.append(record)
                    tag = "✓ BUFFET" if is_buffet else "  ------"
                    logger.info(f"    {tag}  [{score:3d}]  {name}")

                page_token = data.get("nextPageToken")
                page += 1
                if not page_token or page >= 3:
                    break

    # Inject any overrides that the search never surfaced
    for pid, ov in state_overrides.items():
        if pid in seen_ids:
            continue
        logger.info(f"  Fetching override not found in search: {ov.get('name', pid)}")
        time.sleep(0.08)
        try:
            details = places_api.place_details(pid, API_KEY)
        except Exception as e:
            logger.error(f"    Override details error for {pid}: {e}")
            continue
        if not details:
            continue

        name     = details.get("displayName", {}).get("text", "") or ov.get("name", "")
        address  = details.get("formattedAddress", "") or ov.get("address", "")
        ov_notes = ov.get("notes", "")
        website  = details.get("websiteUri", "")
        web_has_buffet, web_kws = False, []
        if website:
            web_has_buffet, web_kws = website_checker.check(website)
        score, evidence = scorer.score(details, website_keywords=web_kws if web_has_buffet else None)
        evidence = [f"manually verified buffet{': ' + ov_notes if ov_notes else ''}"] + evidence

        record = {
            "place_id":          pid,
            "name":              name,
            "address":           address,
            "lat":               details.get("location", {}).get("latitude"),
            "lng":               details.get("location", {}).get("longitude"),
            "phone":             details.get("nationalPhoneNumber", ""),
            "website":           website,
            "rating":            details.get("rating"),
            "review_count":      details.get("userRatingCount"),
            "price_level":       details.get("priceLevel"),
            "business_status":   details.get("businessStatus"),
            "hours":             details.get("regularOpeningHours", {}).get("weekdayDescriptions", []),
            "hours_periods":     details.get("regularOpeningHours", {}).get("periods", []),
            "photo_refs":        [p.get("name") for p in details.get("photos", [])[:5] if p.get("name")],
            "types":             details.get("types", []),
            "buffet_score":      score,
            "buffet_confidence": scorer.confidence_label(score),
            "buffet_evidence":   evidence,
            "is_buffet":         True,
            "state":             state_abbr,
            "found_via":         "manual override",
            "search_location":   ov.get("search_location", ""),
            "scraped_at":        datetime.utcnow().isoformat() + "Z",
        }
        results.append(record)
        seen_ids.add(pid)
        logger.info(f"    ★ OVERRIDE  [{score:3d}]  {name}")

    return results


def save_results(results: List[Dict], state_key: str):
    DATA_DIR.mkdir(exist_ok=True)
    prefix = DATA_DIR / state_key

    # Full raw JSON
    raw_path = prefix.parent / f"{state_key}_raw.json"
    with open(raw_path, "w") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Saved {len(results)} restaurants → {raw_path}")

    # Buffets only JSON
    buffets = [r for r in results if r["is_buffet"]]
    buffets_path = prefix.parent / f"{state_key}_buffets.json"
    with open(buffets_path, "w") as f:
        json.dump(buffets, f, indent=2)
    logger.info(f"Saved {len(buffets)} buffets → {buffets_path}")

    # Buffets CSV (human-readable for review)
    csv_path = prefix.parent / f"{state_key}_buffets.csv"
    csv_fields = [
        "name", "address", "phone", "website", "rating",
        "review_count", "buffet_score", "buffet_confidence",
        "buffet_evidence", "hours", "state",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        for r in buffets:
            writer.writerow({
                **{k: r.get(k) for k in csv_fields},
                "buffet_evidence": "; ".join(r.get("buffet_evidence", [])),
                "hours": " | ".join(r.get("hours", [])),
            })
    logger.info(f"Saved CSV → {csv_path}")

    return len(buffets)


def main():
    if not API_KEY:
        logger.error("GOOGLE_PLACES_API_KEY not set. Copy .env.example → .env and add your key.")
        return

    parser = argparse.ArgumentParser(description="Indian Buffet Finder scraper")
    parser.add_argument(
        "--state",
        choices=["maryland", "virginia", "dc", "massachusetts", "new_york", "all"],
        default="maryland",
        help="Which state to scrape (default: maryland)",
    )
    args = parser.parse_args()

    states = list(STATE_MAP.keys()) if args.state == "all" else [args.state]
    overrides = load_overrides()
    if overrides:
        logger.info(f"Loaded {len(overrides)} manual override(s) from {OVERRIDES_FILE.name}")

    for state in states:
        results = scrape_state(state, overrides)
        buffet_count = save_results(results, state)
        logger.info(
            f"\n  {state.upper()} DONE: {len(results)} Indian restaurants found, "
            f"{buffet_count} likely buffets\n"
        )


if __name__ == "__main__":
    main()
