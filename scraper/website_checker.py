"""Scrape restaurant websites to check for buffet mentions."""

import logging
from typing import Optional, Tuple, List
import requests
from bs4 import BeautifulSoup
from scorer import BUFFET_KEYWORDS, NON_BUFFET_SIGNALS

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

TIMEOUT = 10


def check(url: str) -> Tuple[bool, List[str]]:
    """
    Returns (has_buffet, matched_keywords).
    Checks homepage and /menu path if homepage is inconclusive.
    """
    if not url:
        return False, []

    text = _fetch_text(url)
    if text is None:
        return False, []

    found = _scan(text)
    if found:
        return True, found

    # Try /menu page as a second attempt
    menu_url = _menu_url(url)
    if menu_url and menu_url != url:
        menu_text = _fetch_text(menu_url)
        if menu_text:
            found = _scan(menu_text)
            if found:
                return True, found

    return False, []


def _fetch_text(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if resp.status_code != 200:
            return None
        content_type = resp.headers.get("content-type", "")
        if "html" not in content_type:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        # Remove script/style noise
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        return soup.get_text(" ", strip=True).lower()
    except Exception as e:
        logger.debug(f"Website fetch failed {url}: {e}")
        return None


def _scan(text: str) -> List[str]:
    lower = text.lower()
    # Negative signals cancel out
    for neg in NON_BUFFET_SIGNALS:
        if neg in lower:
            return []
    return [kw for kw in BUFFET_KEYWORDS if kw in lower]


def _menu_url(base_url: str) -> Optional[str]:
    try:
        from urllib.parse import urlparse, urljoin
        parsed = urlparse(base_url)
        root = f"{parsed.scheme}://{parsed.netloc}"
        return urljoin(root, "/menu")
    except Exception:
        return None
