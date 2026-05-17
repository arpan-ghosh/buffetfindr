"""
Buffet likelihood scoring.
Score >= 30 → tagged as likely buffet.
Score >= 60 → high confidence buffet.
"""

from typing import Tuple, List, Optional

BUFFET_KEYWORDS = [
    "buffet",
    "all you can eat",
    "all-you-can-eat",
    "lunch buffet",
    "dinner buffet",
    "weekend buffet",
    "sunday buffet",
    "brunch buffet",
    "unlimited",
    "ayca",       # common abbreviation in reviews
]

NON_BUFFET_SIGNALS = [
    "no buffet",
    "no longer has buffet",
    "stopped doing buffet",
    "discontinued buffet",
    "removed buffet",
]


def _text_has_buffet(text: str) -> Tuple[bool, List[str]]:
    lower = text.lower()
    # Check for negative signals first
    for neg in NON_BUFFET_SIGNALS:
        if neg in lower:
            return False, [f"negative: '{neg}'"]
    found = [kw for kw in BUFFET_KEYWORDS if kw in lower]
    return len(found) > 0, found


def score(details: dict, search_was_buffet_query: bool = False, website_keywords: Optional[List[str]] = None) -> Tuple[int, List[str]]:
    """
    Returns (score 0–100, evidence list).
    details = Place Details API result dict.
    """
    pts = 0
    evidence = []

    display = details.get("displayName", {})
    name = (display.get("text", "") if isinstance(display, dict) else details.get("name", "")).lower()
    if "buffet" in name:
        pts += 50
        evidence.append("'buffet' in restaurant name")

    # Reviews
    reviews = details.get("reviews", [])
    buffet_reviews = 0
    negative_reviews = 0
    for r in reviews:
        # Places API (New) nests review text under text.text
        raw = r.get("text", "")
        text = raw.get("text", "") if isinstance(raw, dict) else raw
        has_buffet, kws = _text_has_buffet(text)
        if has_buffet:
            buffet_reviews += 1
        elif kws and kws[0].startswith("negative"):
            negative_reviews += 1

    if negative_reviews > 0:
        pts -= 20
        evidence.append(f"negative buffet signals in {negative_reviews} review(s)")

    if buffet_reviews >= 3:
        pts += 40
        evidence.append(f"buffet mentioned in {buffet_reviews}/5 reviews")
    elif buffet_reviews == 2:
        pts += 25
        evidence.append(f"buffet mentioned in {buffet_reviews}/5 reviews")
    elif buffet_reviews == 1:
        pts += 15
        evidence.append("buffet mentioned in 1 review")

    # Website
    if website_keywords:
        pts += 30
        evidence.append(f"buffet on website: {', '.join(website_keywords[:3])}")

    # Found via "Indian buffet" query directly
    if search_was_buffet_query:
        pts += 20
        evidence.append("matched 'Indian buffet' search query")

    # Editorial summary
    summary = details.get("editorialSummary", {}).get("text", "")
    if summary:
        has_buffet, kws = _text_has_buffet(summary)
        if has_buffet:
            pts += 15
            evidence.append(f"buffet in Google summary")

    final = max(0, min(pts, 100))
    return final, evidence


def confidence_label(score: int) -> str:
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"
