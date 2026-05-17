"""
Yelp scraper — no API key required.
Extracts business listings and reviews from Yelp's server-rendered HTML.
"""

import json
import logging
import re
import time
from typing import Optional
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
    "DNT": "1",
}

BUFFET_KEYWORDS = [
    "buffet", "all you can eat", "all-you-can-eat",
    "lunch buffet", "dinner buffet", "weekend buffet",
    "sunday buffet", "unlimited",
]

_session = requests.Session()
_session.headers.update(HEADERS)


def _get(url: str, params: dict = None) -> Optional[BeautifulSoup]:
    try:
        resp = _session.get(url, params=params, timeout=15)
        if resp.status_code == 200:
            return BeautifulSoup(resp.text, "lxml")
        logger.debug(f"Yelp HTTP {resp.status_code}: {url}")
        return None
    except Exception as e:
        logger.debug(f"Yelp fetch error {url}: {e}")
        return None


def _extract_page_data(soup: BeautifulSoup) -> dict:
    """
    Yelp embeds page data in several ways depending on the page type.
    Try them all and return the first dict we can parse.
    """

    # 1. Hypernova: <script type="application/json" data-hypernova-key="..."><!--{...}--></script>
    for script in soup.find_all("script", type="application/json"):
        raw = (script.string or "").strip()
        if raw.startswith("<!--"):
            raw = raw[4:]
        if raw.endswith("-->"):
            raw = raw[:-3]
        try:
            data = json.loads(raw.strip())
            if isinstance(data, dict) and data:
                return data
        except Exception:
            pass

    # 2. JSON-LD structured data (less data but well-structured)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict) and data:
                return data
        except Exception:
            pass

    # 3. Inline JS variable pattern  __YELP_PROPS__ or __initialData__
    for script in soup.find_all("script"):
        text = script.string or ""
        for pattern in [
            r"window\.__YELP_PROPS__\s*=\s*(\{.+?\});",
            r'"searchPageProps"\s*:\s*(\{.+)',
        ]:
            m = re.search(pattern, text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass

    return {}


def _pluck_search_results(data: dict) -> list:
    """Walk a Yelp data blob looking for a list of search result businesses."""
    if not isinstance(data, dict):
        return []

    # Common key paths Yelp uses
    candidates = [
        data.get("searchPageProps", {})
            .get("searchResultsProps", {})
            .get("searchResults"),
        data.get("props", {})
            .get("pageProps", {})
            .get("searchResultBizList"),
    ]
    for c in candidates:
        if isinstance(c, list) and c:
            return c

    # Recursive search for any key that looks like a biz list
    for v in data.values():
        if isinstance(v, list) and v and isinstance(v[0], dict) and "businessName" in v[0]:
            return v
        if isinstance(v, dict):
            result = _pluck_search_results(v)
            if result:
                return result

    return []


def search_buffets(location: str, max_pages: int = 3) -> list[dict]:
    """
    Search Yelp for 'Indian buffet' in a location.
    Returns list of {name, yelp_url, address, rating, review_count}.
    """
    results = []
    seen_urls = set()

    for page in range(max_pages):
        offset = page * 10
        url = "https://www.yelp.com/search?" + urlencode({
            "find_desc": "Indian buffet",
            "find_loc": location,
            "start": offset,
        })
        logger.debug(f"  Yelp search page {page+1}: {location}")
        soup = _get(url)
        if not soup:
            break

        # Check for bot detection
        if "Access denied" in (soup.title.string or "") if soup.title else False:
            logger.warning("  Yelp bot detection triggered — stopping this location")
            break

        data = _extract_page_data(soup)
        biz_list = _pluck_search_results(data)

        if biz_list:
            for biz in biz_list:
                entry = _parse_biz_from_json(biz)
                if entry and entry["yelp_url"] not in seen_urls:
                    seen_urls.add(entry["yelp_url"])
                    results.append(entry)
        else:
            # Fallback: parse HTML business cards
            for card in _parse_html_cards(soup):
                if card["yelp_url"] not in seen_urls:
                    seen_urls.add(card["yelp_url"])
                    results.append(card)

        if not biz_list and not _parse_html_cards(soup):
            break

        time.sleep(1.5)

    return results


def get_reviews(yelp_url: str) -> list[str]:
    """
    Fetch review text from a Yelp business page.
    Returns list of review strings.
    """
    if not yelp_url:
        return []

    # Make sure it's a full URL
    if not yelp_url.startswith("http"):
        yelp_url = "https://www.yelp.com" + yelp_url

    soup = _get(yelp_url)
    if not soup:
        return []

    reviews = []

    # JSON-LD reviews (most structured)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            for rev in data.get("review", []):
                text = rev.get("reviewBody") or rev.get("description", "")
                if text:
                    reviews.append(text)
        except Exception:
            pass

    # Hypernova / Apollo data embedded in scripts
    for script in soup.find_all("script"):
        text = script.string or ""
        if "reviewBody" not in text and "review_text" not in text:
            continue
        for match in re.findall(r'"(?:reviewBody|review_text)"\s*:\s*"((?:[^"\\]|\\.)*)"', text):
            cleaned = match.replace("\\n", " ").replace('\\"', '"').strip()
            if cleaned and cleaned not in reviews:
                reviews.append(cleaned)

    # Plain HTML review elements
    for el in soup.select('[class*="reviewText"], [class*="review-content"], p[lang]'):
        text = el.get_text(" ", strip=True)
        if len(text) > 30 and text not in reviews:
            reviews.append(text)

    return reviews[:20]  # cap at 20 reviews per restaurant


def has_buffet(texts: list[str]) -> tuple[bool, list[str]]:
    """Check if any text mentions buffet. Returns (found, matched_keywords)."""
    found = []
    for text in texts:
        lower = text.lower()
        for kw in BUFFET_KEYWORDS:
            if kw in lower and kw not in found:
                found.append(kw)
    return bool(found), found


# ── Internal helpers ──────────────────────────────────────────────────────────

def _parse_biz_from_json(biz: dict) -> Optional[dict]:
    try:
        name = (
            biz.get("businessName")
            or biz.get("name")
            or biz.get("displayName", "")
        )
        url = (
            biz.get("businessUrl")
            or biz.get("url")
            or biz.get("href", "")
        )
        if not url.startswith("http"):
            url = "https://www.yelp.com" + url
        address_obj = biz.get("formattedAddress") or biz.get("address") or {}
        address = (
            address_obj if isinstance(address_obj, str)
            else ", ".join(filter(None, [
                address_obj.get("streetAddress"),
                address_obj.get("addressLocality"),
                address_obj.get("addressRegion"),
            ]))
        )
        rating = (
            biz.get("rating", {}).get("ratingValue")
            if isinstance(biz.get("rating"), dict)
            else biz.get("rating")
        )
        return {
            "name": name,
            "yelp_url": url,
            "address": address,
            "rating": rating,
            "review_count": biz.get("reviewCount") or biz.get("numReviews"),
        }
    except Exception:
        return None


def _parse_html_cards(soup: BeautifulSoup) -> list[dict]:
    """Fallback: parse business cards from raw HTML."""
    results = []
    # Yelp uses data-testid on some elements
    for card in soup.select('[data-testid="serp-ia-card"], .businessName__09f24__3Wql2'):
        name_el = card.find("a")
        if not name_el:
            continue
        name = name_el.get_text(strip=True)
        href = name_el.get("href", "")
        url = href if href.startswith("http") else "https://www.yelp.com" + href
        results.append({"name": name, "yelp_url": url, "address": "", "rating": None, "review_count": None})
    return results
