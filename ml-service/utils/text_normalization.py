import re
from typing import Optional, Tuple

ISO_8583_PATTERNS = {
    "05": "AUTHENTICATION_FAILED",
    "14": "INVALID_DETAILS",
    "51": "INSUFFICIENT_FUNDS",
    "54": "CARD_EXPIRED",
    "57": "INVALID_DETAILS",
    "59": "FRAUD_SUSPECTED",
    "61": "LIMIT_EXCEEDED",
    "65": "LIMIT_EXCEEDED",
    "82": "AUTHENTICATION_FAILED",
    "91": "SYSTEM_ERROR",
    "96": "SYSTEM_ERROR",
}

def normalize_text(text: str) -> str:
    """
    Cleans and normalizes raw gateway failure messages:
    - Lowercases text
    - Replaces underscores, hyphens, and slashes with spaces
    - Removes punctuation
    - Strips redundant whitespaces
    """
    if not text:
        return ""
    
    cleaned = text.lower()
    cleaned = re.sub(r"[_\-/\\]", " ", cleaned)
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def extract_iso_code(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts 2-digit ISO 8583 codes from raw or normalized text.
    Returns (iso_code, matching_category) or (None, None)
    """
    if not text:
        return None, None
    
    cleaned = normalize_text(text)
    match = re.search(r"\b(?:iso|code)?\s*([0-9]{2})\b", cleaned)
    if match:
        code = match.group(1)
        if code in ISO_8583_PATTERNS:
            return code, ISO_8583_PATTERNS[code]
            
    return None, None
