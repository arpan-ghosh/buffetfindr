"""Google Places API (New) wrapper."""

import time
import logging
import requests
from typing import Dict, Optional

logger = logging.getLogger(__name__)

BASE = "https://places.googleapis.com/v1/places"

SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.types,places.businessStatus"

DETAIL_FIELDS = ",".join([
    "id",
    "displayName",
    "formattedAddress",
    "location",
    "nationalPhoneNumber",
    "websiteUri",
    "regularOpeningHours",
    "rating",
    "userRatingCount",
    "reviews",
    "photos",
    "priceLevel",
    "types",
    "businessStatus",
    "editorialSummary",
])


def text_search(query: str, location: dict, radius: int, api_key: str, page_token: Optional[str] = None) -> dict:
    if page_token:
        time.sleep(2)

    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": SEARCH_FIELDS,
        "Content-Type": "application/json",
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": location["lat"], "longitude": location["lng"]},
                "radius": float(radius),
            }
        },
        "maxResultCount": 20,
        "includedType": "restaurant",
    }
    if page_token:
        body["pageToken"] = page_token

    resp = requests.post(f"{BASE}:searchText", json=body, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.json()


def place_details(place_id: str, api_key: str) -> dict:
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": DETAIL_FIELDS,
    }
    resp = requests.get(f"{BASE}/{place_id}", headers=headers, timeout=15)
    if resp.status_code != 200:
        logger.warning(f"Place details {place_id}: HTTP {resp.status_code}")
        return {}
    return resp.json()


def photo_url(photo_name: str, api_key: str, max_width: int = 800) -> str:
    return f"https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx={max_width}&key={api_key}"
