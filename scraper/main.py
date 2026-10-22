#!/usr/bin/env python3
"""
Indian Buffet Finder — Data Scraper
Usage:
    python main.py --state maryland
    python main.py --state virginia
    python main.py --state dc
    python main.py --state all
    python main.py --state houston --top 20   # top-N scan for a new metro
"""

import argparse
import csv
import json
import logging
import math
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

NON_SOUTH_ASIAN_TERMS = [
    "uyghur", "uighur", "chinese", "sushi", "ramen", "thai",
    "vietnamese", "korean", "japanese", "mexican", "italian",
    "pizza", "burger", "taco", "mediterranean", "turkish", "ichibanya",
]

# Name hints for South Asian places Google doesn't type as indian_restaurant
SOUTH_ASIAN_NAME_HINTS = [
    "indian", "india", "nepal", "himalaya", "bangladesh", "pakistan", "lahori",
    "sri lanka", "biryani", "tandoor", "tandoori", "curry", "masala", "dosa",
    "desi", "punjab", "mughal", "tikka", "naan", "saffron", "bombay", "delhi",
    "mumbai", "chennai", "hyderabad", "kolkata", "bengal", "kebab", "chaat",
]

MIN_REVIEWS_FOR_RANKING = 15
MIN_RATING_FOR_RANKING = 3.5


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
                    if any(t in place_name for t in NON_SOUTH_ASIAN_TERMS):
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


def _is_south_asian(place: Dict) -> bool:
    name = place.get("displayName", {}).get("text", "").lower()
    if any(t in name for t in NON_SOUTH_ASIAN_TERMS):
        return False
    if "indian_restaurant" in place.get("types", []):
        return True
    return any(h in name for h in SOUTH_ASIAN_NAME_HINTS)


def scrape_top(state_key: str, top_n: int, overrides: Dict[str, Dict]) -> List[Dict]:
    """
    Cheap metro scan: search only, rank candidates by prominence
    (rating × ln(1 + reviews)), then fetch details + score just the top N.
    """
    state_cfg = STATE_MAP[state_key]
    state_abbr = state_cfg["abbr"]
    candidates = {}  # type: Dict[str, Dict]

    logger.info(f"{'='*60}")
    logger.info(f"TOP {top_n} — {state_key.upper()} — {len(state_cfg['locations'])} anchors × {len(SEARCH_QUERIES)} queries (search only)")
    logger.info(f"{'='*60}")

    for location in state_cfg["locations"]:
        for query, is_buffet_query in SEARCH_QUERIES:
            logger.info(f"  [{location['name']}] '{query}'")
            page_token = None
            for _ in range(3):
                try:
                    data = places_api.text_search(
                        query=query, location=location, radius=SEARCH_RADIUS,
                        api_key=API_KEY, page_token=page_token,
                        field_mask=places_api.SEARCH_FIELDS_RANKED,
                    )
                except Exception as e:
                    logger.error(f"    Search error: {e}")
                    break
                if "error" in data:
                    err = data["error"]
                    logger.error(f"    API error {err.get('code')}: {err.get('message')}")
                    break
                for place in data.get("places", []):
                    pid = place.get("id")
                    if not pid or not _is_south_asian(place):
                        continue
                    c = candidates.setdefault(pid, {"place": place, "buffet_query": False, "query": query, "anchor": location["name"]})
                    if is_buffet_query and not c["buffet_query"]:
                        c.update(buffet_query=True, query=query)
                page_token = data.get("nextPageToken")
                if not page_token:
                    break

    def prominence(c: Dict) -> float:
        p = c["place"]
        return (p.get("rating") or 0) * math.log(1 + (p.get("userRatingCount") or 0))

    eligible = [
        (pid, c) for pid, c in candidates.items()
        if c["place"].get("businessStatus", "OPERATIONAL") == "OPERATIONAL"
        and (c["place"].get("userRatingCount") or 0) >= MIN_REVIEWS_FOR_RANKING
        and (c["place"].get("rating") or 0) >= MIN_RATING_FOR_RANKING
    ]
    eligible.sort(key=lambda kv: prominence(kv[1]), reverse=True)
    finalists = eligible[:top_n]
    logger.info(f"  {len(candidates)} South Asian candidates → {len(eligible)} eligible → top {len(finalists)}")

    results = []  # type: List[Dict]
    for rank, (pid, c) in enumerate(finalists, 1):
        time.sleep(0.08)
        details = places_api.place_details(pid, API_KEY)
        if not details:
            continue
        name = details.get("displayName", {}).get("text", "")
        website = details.get("websiteUri", "")
        web_has_buffet, web_kws = (website_checker.check(website) if website else (False, []))
        score, evidence = scorer.score(
            details,
            search_was_buffet_query=c["buffet_query"],
            website_keywords=web_kws if web_has_buffet else None,
        )
        is_buffet = score >= 30
        if pid in overrides and overrides[pid].get("state", "").upper() == state_abbr.upper():
            is_buffet = True
            ov_notes = overrides[pid].get("notes", "")
            evidence = [f"manually verified buffet{': ' + ov_notes if ov_notes else ''}"] + evidence

        results.append({
            "place_id":          pid,
            "name":              name,
            "address":           details.get("formattedAddress", ""),
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
            "is_buffet":         is_buffet,
            "state":             state_abbr,
            "found_via":         c["query"],
            "search_location":   c["anchor"],
            "metro_rank":        rank,
            "scraped_at":        datetime.utcnow().isoformat() + "Z",
        })
        tag = "✓ BUFFET" if is_buffet else "  ------"
        logger.info(f"    #{rank:2d} {tag}  [{score:3d}]  {name}  ({details.get('rating')}★, {details.get('userRatingCount')})")

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
        choices=[
            "maryland", "virginia", "dc", "massachusetts", "new_york",
            "philadelphia", "new_jersey", "illinois", "washington",
            "los_angeles", "dallas", "houston", "miami", "atlanta", "all",
        ],
        default="maryland",
        help="Which state to scrape (default: maryland)",
    )
    parser.add_argument(
        "--top", type=int, default=0,
        help="Search-only scan; fetch details for the top N restaurants by prominence",
    )
    args = parser.parse_args()

    states = list(STATE_MAP.keys()) if args.state == "all" else [args.state]
    overrides = load_overrides()
    if overrides:
        logger.info(f"Loaded {len(overrides)} manual override(s) from {OVERRIDES_FILE.name}")

    for state in states:
        results = scrape_top(state, args.top, overrides) if args.top else scrape_state(state, overrides)
        buffet_count = save_results(results, state)
        logger.info(
            f"\n  {state.upper()} DONE: {len(results)} Indian restaurants found, "
            f"{buffet_count} likely buffets\n"
        )


if __name__ == "__main__":
    main()
