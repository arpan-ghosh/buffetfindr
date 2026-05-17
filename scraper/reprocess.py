#!/usr/bin/env python3
"""
Re-process existing raw JSON files without hitting the API.
Applies override list and regenerates *_buffets.json / *_buffets.csv.

Usage:
    python reprocess.py                  # all states
    python reprocess.py --state maryland
"""

import argparse
import csv
import json
import logging
from pathlib import Path

import scorer
from locations import STATE_MAP

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
OVERRIDES_FILE = Path(__file__).parent / "known_buffets_override.json"


def load_overrides() -> dict:
    if not OVERRIDES_FILE.exists():
        return {}
    with open(OVERRIDES_FILE) as f:
        entries = json.load(f)
    return {e["place_id"]: e for e in entries if e.get("place_id")}


def reprocess_state(state_key: str, overrides: dict):
    state_abbr = STATE_MAP[state_key]["abbr"]
    raw_path = DATA_DIR / f"{state_key}_raw.json"

    if not raw_path.exists():
        logger.error(f"No raw data found at {raw_path} — run the scraper first.")
        return

    with open(raw_path) as f:
        results = json.load(f)

    state_overrides = {
        pid: ov for pid, ov in overrides.items()
        if ov.get("state", "").upper() == state_abbr.upper()
    }

    changed = 0
    for r in results:
        pid = r.get("place_id", "")
        was_buffet = r["is_buffet"]

        if pid in state_overrides:
            ov_notes = state_overrides[pid].get("notes", "")
            override_tag = f"manually verified buffet{': ' + ov_notes if ov_notes else ''}"
            if override_tag not in r.get("buffet_evidence", []):
                r["buffet_evidence"] = [override_tag] + r.get("buffet_evidence", [])
            r["is_buffet"] = True
            if not was_buffet:
                changed += 1
                logger.info(f"  ★ OVERRIDE → buffet: {r['name']}")

    buffets = [r for r in results if r["is_buffet"]]
    logger.info(f"{state_key.upper()}: {len(results)} total, {len(buffets)} buffets (+{changed} from overrides)")

    # Rewrite raw (with updated is_buffet / evidence)
    with open(raw_path, "w") as f:
        json.dump(results, f, indent=2)

    buffets_path = DATA_DIR / f"{state_key}_buffets.json"
    with open(buffets_path, "w") as f:
        json.dump(buffets, f, indent=2)

    csv_path = DATA_DIR / f"{state_key}_buffets.csv"
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

    logger.info(f"  Saved {buffets_path.name} and {csv_path.name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", choices=["maryland", "virginia", "dc", "all"], default="all")
    args = parser.parse_args()

    overrides = load_overrides()
    if overrides:
        logger.info(f"Loaded {len(overrides)} override(s) from {OVERRIDES_FILE.name}")

    states = list(STATE_MAP.keys()) if args.state == "all" else [args.state]
    for state in states:
        reprocess_state(state, overrides)


if __name__ == "__main__":
    main()
